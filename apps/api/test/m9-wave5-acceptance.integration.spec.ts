import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { appEnv } from 'src/config/env';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { WecomDepartmentEntity } from 'src/database/entities/wecom-department.entity';
import { AuthorizationService } from 'src/modules/auth/authorization.service';
import { RoleResolverService } from 'src/modules/auth/role-resolver.service';
import { WecomAdminService } from 'src/modules/wecom/wecom-admin.service';
import { createM9Wave5Rehearsal } from 'test/m9-wave5-rehearsal';

describe('M9 Wave 5 authentication and notification acceptance', () => {
  let rehearsal: Awaited<ReturnType<typeof createM9Wave5Rehearsal>>;
  let app: INestApplication;
  let source: DataSource;
  let adminToken: string;
  const originalEnv = { admins: appEnv.WECOM_SYSTEM_ADMIN_USER_IDS, key: appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY };
  const server = () => app.getHttpServer() as Parameters<typeof request>[0];
  const get = (url: string, token = adminToken) => request(server()).get(`/api/v1${url}`).set('Authorization', `Bearer ${token}`);
  const post = (url: string, token = adminToken) => request(server()).post(`/api/v1${url}`).set('Authorization', `Bearer ${token}`);
  const patchUser = (version: number, fields: Record<string, unknown>) => request(server()).patch('/api/v1/admin/wecom-users/w5-member/authorization').set('Authorization', `Bearer ${adminToken}`).send({ expectedAuthorizationVersion: version, reason: 'W5合成验收', ...fields });

  beforeAll(async () => {
    rehearsal = await createM9Wave5Rehearsal();
    ({ app, source } = rehearsal);
    const login = await get('/auth/wecom/callback?code=admin');
    expect(login.status).toBe(200);
    adminToken = login.body.data.accessToken as string;
  });

  afterAll(async () => {
    await rehearsal?.close();
    appEnv.WECOM_SYSTEM_ADMIN_USER_IDS = originalEnv.admins;
    appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY = originalEnv.key;
  });

  it('preserves manual authorization across sync/OAuth/refresh and independently restores departments/roles', async () => {
    const sync = await post('/admin/wecom-directory-sync');
    expect(sync.status).toBe(201);
    expect(sync.body.data).toMatchObject({ coverageStatus: 'unverified', readCount: 3, failedCount: 0 });
    const first = await get('/admin/wecom-users/w5-member');
    expect(first.body.data.source).toMatchObject({ loginStatus: 'never', lastLoginAt: null });
    const id = (await source.getRepository(WecomUserEntity).findOneByOrFail({ userId: 'w5-member' })).id;
    expect((await patchUser(1, { departmentMode: 'manual', manualDepartmentIds: [4], roleMode: 'manual', manualRoles: ['shipping'] })).status).toBe(200);
    await post('/admin/wecom-directory-sync').expect(201);
    const login = await get('/auth/wecom/callback?code=member');
    expect(login.body.data.user).toMatchObject({ departmentIds: [4], roles: ['all_authenticated', 'shipping'] });
    const token = login.body.data.accessToken as string;
    const refreshed = await post('/auth/refresh', token);
    expect(refreshed.body.data.user).toMatchObject({ departmentIds: [4], roles: ['all_authenticated', 'shipping'] });
    expect((await source.getRepository(WecomUserEntity).findOneByOrFail({ userId: 'w5-member' })).id).toBe(id);
    expect((await post('/admin/wecom-users/w5-member/restore-departments').send({ expectedAuthorizationVersion: 2, reason: '仅恢复部门' })).body.data.effective).toMatchObject({ departmentIds: [8], roles: ['all_authenticated', 'shipping'] });
    expect((await post('/admin/wecom-users/w5-member/restore-roles').send({ expectedAuthorizationVersion: 3, reason: '恢复自动' })).body.data.effective.roles).toEqual(['all_authenticated', 'crew']);
    // The old JWT now reads the updated row; source department 8 never adds shipping.
    expect((await get('/auth/me', token)).body.data.roles).toEqual(['all_authenticated', 'crew']);
    expect((await patchUser(4, { departmentMode: 'manual', manualDepartmentIds: [], roleMode: 'auto' })).body.data.effective.roles).toEqual(['all_authenticated']);
    expect((await patchUser(5, { roleMode: 'manual', manualRoles: [] })).body.data.effective.roles).toEqual(['all_authenticated']);
    expect((await get('/admin/wecom-users', token)).status).toBe(403);
  });

  it('reports a second-page failure without clearing the missing member or manual disabled state', async () => {
    expect((await patchUser(6, { platformStatus: 'disabled' })).status).toBe(200);
    rehearsal.controls.partial = true;
    const sync = await post('/admin/wecom-directory-sync');
    expect(sync.body.data).toMatchObject({ status: 'partial', coverageStatus: 'unverified', failedCount: 1 });
    expect(sync.body.data.errorSummary).toEqual(expect.arrayContaining([expect.objectContaining({ scope: 'department:8' })]));
    const detail = await get('/admin/wecom-users/w5-member');
    expect(detail.body.data.platform).toMatchObject({ status: 'disabled', roleMode: 'manual', manualRoles: [], departmentMode: 'manual', manualDepartmentIds: [] });
    expect((await get('/auth/wecom/callback?code=member')).status).toBe(403);
    const authorization = app.get(AuthorizationService);
    const member = await source.getRepository(WecomUserEntity).findOneByOrFail({ userId: 'w5-member' });
    // New service instances model all API/worker processes reloading env.
    appEnv.WECOM_SYSTEM_ADMIN_USER_IDS = 'w5-admin,w5-member';
    const promoted = new AuthorizationService(source.getRepository(WecomUserEntity), source, new RoleResolverService(), new WecomAdminService());
    expect((await promoted.toCurrentUser(member)).isAdmin).toBe(true);
    expect(member.platformStatus).toBe('disabled');
    appEnv.WECOM_SYSTEM_ADMIN_USER_IDS = 'w5-admin';
    const revoked = new AuthorizationService(source.getRepository(WecomUserEntity), source, new RoleResolverService(), new WecomAdminService());
    await expect(revoked.toCurrentUser(member)).rejects.toThrow('停用');
    member.sourceStatus = 'inactive';
    await expect(promoted.toCurrentUser(member)).rejects.toThrow('企业微信成员不可用');
    await expect(authorization.toCurrentUser(member)).rejects.toThrow('企业微信成员不可用');
    rehearsal.controls.partial = false;
  });

  it('keeps a targeted draft separate from saved settings and sends only to an effective member', async () => {
    const before = await get('/settings/notification');
    const draft = await post('/settings/notification/draft-test').send({ agentId: '2000001', secret: 'synthetic-draft-secret', testUserId: 'w5-admin' });
    expect(draft.status).toBe(201);
    expect(rehearsal.controls.sends).toEqual([{ agentid: 2000001, touser: 'w5-admin' }]);
    expect((await get('/settings/notification')).body.data).toEqual(before.body.data);
    expect((await post('/settings/notification/draft-test').send({ testUserId: 'w5-member' })).status).toBe(403);
    expect(rehearsal.controls.sends).toHaveLength(1);
  });

  it('keeps manual department previews, old JWT requests and refresh aligned with the current enterprise dictionary', async () => {
    const departments = source.getRepository(WecomDepartmentEntity);
    const department = await departments.save({ corpId: appEnv.WECOM_CORP_ID, departmentId: 99, name: '财务部' });
    await departments.save({ corpId: 'other-enterprise', departmentId: 99, name: '后勤部' });
    const update = await request(server()).patch('/api/v1/admin/wecom-users/w5-shipping/authorization').set('Authorization', `Bearer ${adminToken}`).send({
      expectedAuthorizationVersion: 1, reason: '合成部门字典回归', departmentMode: 'manual', manualDepartmentIds: [99], roleMode: 'auto',
    });
    expect(update.status).toBe(200);
    expect(update.body.data.effective).toMatchObject({ departmentIds: [99], departments: ['财务部'], roles: ['all_authenticated', 'finance'] });
    const token = await app.get(JwtService).signAsync({ sub: 'w5-shipping', corpId: appEnv.WECOM_CORP_ID, name: '合成船务成员' });
    expect((await get('/auth/me', token)).body.data).toMatchObject({ department: ['财务部'], roles: ['all_authenticated', 'finance'] });
    expect((await post('/auth/refresh', token)).body.data.user.roles).toEqual(['all_authenticated', 'finance']);
    await departments.update(department.id, { name: '业务部' });
    expect((await get('/auth/me', token)).body.data).toMatchObject({ department: ['业务部'], roles: ['all_authenticated', 'business'] });
    const detail = await get('/admin/wecom-users/w5-shipping');
    expect(detail.body.data.effective.roles).toEqual(['all_authenticated', 'business']);
    const filtered = await get('/admin/wecom-users?role=finance');
    expect(filtered.body.data.items).not.toEqual(expect.arrayContaining([expect.objectContaining({ userId: 'w5-shipping' })]));
  });
});
