import type { INestApplication } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { appEnv } from 'src/config/env';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { OssService } from 'src/modules/files/oss.service';
import { createFullSystemRehearsal } from 'test/full-system-rehearsal';

type Detail = { id: string; name?: string; remarks?: string; categoryCode?: string; status?: string; platform?: { authorizationVersion: number } };
function data<T>(response: { body: unknown }): T { return (response.body as { data: T }).data; }

describe('Full-system master data and administration HTTP roundtrips', () => {
  let rehearsal: Awaited<ReturnType<typeof createFullSystemRehearsal>>;
  let app: INestApplication<Server>;
  let source: DataSource;
  let token: string;
  const api = () => request(app.getHttpServer());
  const get = (url: string) => api().get(`/api/v1${url}`).set('Authorization', `Bearer ${token}`);
  const post = (url: string, body: object) => api().post(`/api/v1${url}`).set('Authorization', `Bearer ${token}`).send(body);
  const patch = (url: string, body: object) => api().patch(`/api/v1${url}`).set('Authorization', `Bearer ${token}`).send(body);
  const remove = (url: string) => api().delete(`/api/v1${url}`).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    rehearsal = await createFullSystemRehearsal();
    app = rehearsal.app as INestApplication<Server>;
    source = rehearsal.source;
    token = data<{ accessToken: string }>(await api().get('/api/v1/auth/wecom/callback?code=admin').expect(200)).accessToken;
  });
  afterAll(async () => { await rehearsal?.close(); });

  it('persists editable master-data fields, returns them in detail/list and soft-deletes all four object types', async () => {
    const vessel = data<Detail>(await post('/master-data/vessels', { code: 'AUDIT-V1', name: '合成回归船舶', category: 'main_vessel' }).expect(201));
    const person = data<Detail>(await post('/master-data/personnel', { name: '合成回归人员', departmentCode: 'shipping', wecomUserId: 'w5-member', remarks: '原备注' }).expect(201));
    const vehicle = data<Detail>(await post('/master-data/vehicles', { plateNumber: '合成AUDIT1', vehicleType: 'truck', remarks: '原车辆' }).expect(201));
    const equipment = data<Detail>(await post('/master-data/equipment', { code: 'AUDIT-E1', name: '合成回归设备', categoryCode: 'audit-pump', vesselId: vessel.id, remarks: '原设备' }).expect(201));
    expect(equipment.categoryCode).toBe('audit-pump');
    for (const [kind, item] of [['vessels', vessel], ['personnel', person], ['vehicles', vehicle], ['equipment', equipment]] as const) {
      expect(data<Detail[]>(await get(`/master-data/${kind}`).expect(200))).toEqual(expect.arrayContaining([expect.objectContaining({ id: item.id })]));
      expect(data<Detail>(await patch(`/master-data/${kind}/${item.id}`, { remarks: '修改后仍可读' }).expect(200)).remarks).toBe('修改后仍可读');
      expect(data<Detail>(await get(`/master-data/${kind}/${item.id}`).expect(200)).remarks).toBe('修改后仍可读');
    }
    const imported = data<{ id: string; summary: { created: number } }>(await post('/master-data/imports', { importType: 'vessels', content: JSON.stringify([{ code: 'AUDIT-IMPORT', name: '合成导入船', category: 'main_vessel' }]) }).expect(201));
    expect(data<{ summary: { created: number } }>(await get(`/master-data/imports/${imported.id}`).expect(200)).summary.created).toBe(1);
    await remove(`/master-data/equipment/${equipment.id}`).expect(204);
    await remove(`/master-data/personnel/${person.id}`).expect(204);
    await remove(`/master-data/vehicles/${vehicle.id}`).expect(204);
    await remove(`/master-data/vessels/${vessel.id}`).expect(204);
    for (const [kind, item] of [['vessels', vessel], ['personnel', person], ['vehicles', vehicle], ['equipment', equipment]] as const) {
      await get(`/master-data/${kind}/${item.id}`).expect(404);
      expect(data<Detail[]>(await get(`/master-data/${kind}`).expect(200))).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: item.id })]));
    }
  });

  it('keeps canonical and compatibility admin routes effective with versioned edits, restoration and audit history', async () => {
    const sync = data<{ id?: string; batchId?: string }>(await post('/admin/users/sync', {}).expect(201));
    const batchId = sync.batchId ?? sync.id;
    expect(batchId).toEqual(expect.any(String));
    for (const path of [`/admin/wecom-directory-sync/${batchId}`, `/admin/users/sync/${batchId}`]) await get(path).expect(200);
    for (const path of ['/admin/wecom-departments', '/admin/departments']) {
      const result = data<{ items: Array<{ id: number }> }>(await get(path).expect(200));
      expect(result.items.some((item) => item.id === 4)).toBe(true);
    }
    const before = data<Detail>(await get('/admin/users/w5-member').expect(200));
    const version = before.platform?.authorizationVersion;
    expect(version).toEqual(expect.any(Number));
    await patch('/admin/users/w5-member', { expectedAuthorizationVersion: version, reason: '合成HTTP回归', departmentMode: 'manual', manualDepartmentIds: [4], roleMode: 'manual', manualRoles: [] }).expect(200);
    const edited = data<Detail>(await get('/admin/users/w5-member').expect(200));
    await post('/admin/users/w5-member/restore-departments', { expectedAuthorizationVersion: edited.platform?.authorizationVersion, reason: '合成恢复部门' }).expect(201);
    const restored = data<Detail>(await get('/admin/users/w5-member').expect(200));
    await post('/admin/users/w5-member/restore-roles', { expectedAuthorizationVersion: restored.platform?.authorizationVersion, reason: '合成恢复角色' }).expect(201);
    for (const path of ['/admin/wecom-users/w5-member/audits', '/admin/users/w5-member/audits']) {
      const audits = data<{ items: unknown[] }>(await get(path).expect(200));
      expect(audits.items.length).toBeGreaterThan(0);
    }
    expect((await source.getRepository(WecomUserEntity).findOneByOrFail({ userId: 'w5-member' })).departmentMode).toBe('follow_wecom');
  });

  it('verifies signed callback echoes and records a connection probe without sending a message', async () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = 'synthetic-audit-nonce';
    const echostr = 'synthetic-callback-echo';
    const signature = createHash('sha1').update([appEnv.WECOM_CALLBACK_TOKEN, timestamp, nonce, echostr].sort().join('')).digest('hex');
    for (const path of ['/api/v1/wecom/callback', '/api/v1/wecom/approval/callback']) {
      const response = await api().get(path).query({ timestamp, nonce, echostr, msg_signature: signature }).expect(200);
      expect(response.text).toBe(echostr);
      await api().get(path).query({ timestamp, nonce, echostr, msg_signature: 'invalid' }).expect(400);
    }
    await post('/settings/notification/connection-test', { agentId: '2000001', secret: 'synthetic-connect-only' }).expect(201);
    expect(rehearsal.controls.sends).toHaveLength(0);
    const probe = jest.spyOn(OssService.prototype, 'checkConnection').mockResolvedValue(undefined);
    try {
      await api().get('/api/health/ready').expect(200);
      probe.mockRejectedValue(new Error('synthetic-storage-unavailable'));
      await api().get('/api/health/ready').expect(503);
    } finally { probe.mockRestore(); }
  });
});
