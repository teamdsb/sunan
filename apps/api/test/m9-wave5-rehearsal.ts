// Isolated local rehearsal only: real Nest controllers + PostgreSQL migrations,
// synthetic WeCom transport. No production database or upstream sends.
import { HttpService } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { of } from 'rxjs';
import { DataSource } from 'typeorm';

import { configureApp } from 'src/app.bootstrap';
import { appEnv } from 'src/config/env';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { SettingsModule } from 'src/modules/settings/settings.module';
import { UserDirectoryModule } from 'src/modules/user-directory/user-directory.module';
import { CertificateReminderJobService } from 'src/modules/reminder/certificate-reminder-job.service';
import { ReminderSchedulerService } from 'src/modules/reminder/reminder-scheduler.service';
import { PlanTaskSchedulerService } from 'src/modules/plan-task/plan-task-scheduler.service';
import { REDIS_CLIENT } from 'src/modules/wecom/wecom.constants';
import { WecomHttpGateway } from 'src/modules/wecom/wecom-http.gateway';
import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';
import { bootstrapPgTestDatabase, buildPgTypeOrmOptions, shutdownPgTestDatabase } from 'test/pg-test-container';

@Module({ imports: [TypeOrmModule.forRootAsync({ useFactory: async () => { await bootstrapPgTestDatabase(); return buildPgTypeOrmOptions(); } }), SettingsModule, UserDirectoryModule] })
class RehearsalModule {}

export async function createM9Wave5Rehearsal() {
  if (appEnv.NODE_ENV !== 'test') throw new Error('M9 rehearsal requires NODE_ENV=test');
  appEnv.WECOM_SYSTEM_ADMIN_USER_IDS = 'w5-admin';
  appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY = 'synthetic-w5-settings-key-000000000000000';
  const controls = { partial: false, sends: [] as Array<{ agentid: number; touser: string }> };
  const departments = [
    { id: 1, name: '公司成员', parentid: 0 }, { id: 3, name: '总经办', parentid: 1 },
    { id: 4, name: '财务部', parentid: 1 }, { id: 6, name: '船务部', parentid: 1 },
    { id: 8, name: '船员', parentid: 1 },
  ];
  const profiles = {
    'w5-admin': { userid: 'w5-admin', name: '合成管理员', department: [3], position: '员工', status: 1 },
    'w5-member': { userid: 'w5-member', name: '合成未登录船员', department: [8], position: '船长', status: 1 },
    'w5-shipping': { userid: 'w5-shipping', name: '合成船务成员', department: [6], position: '员工', status: 1 },
  };
  const gateway = {
    getUserInfo: (_token: string, code: string) => ({ UserId: code === 'member' ? 'w5-member' : 'w5-admin' }),
    getUserDetail: (_token: string, userId: keyof typeof profiles) => profiles[userId],
    listDepartments: () => ({ department: departments }),
    listUsers: (_token: string, departmentId: number, _fetchChild: number, cursor?: string) => {
      if (departmentId === 8 && !cursor) return { userlist: [profiles['w5-member']], next_cursor: 'page-2' };
      if (departmentId === 8 && cursor && controls.partial) throw new Error('synthetic second page unavailable');
      return { userlist: Object.values(profiles).filter((profile) => profile.department.includes(departmentId) && departmentId !== 8) };
    },
    getAccessToken: () => ({ access_token: 'synthetic-connection-token', expires_in: 7200 }),
  };
  const tokens = {
    getAccessToken: () => 'synthetic-main-token',
    getAccessTokenForApp: () => 'synthetic-app-token',
    refreshAccessTokenForApp: () => 'synthetic-refreshed-token',
    getCorpJsapiTicket: () => 'synthetic-corp-ticket',
    getAgentJsapiTicket: () => 'synthetic-agent-ticket',
  };
  const moduleRef = await Test.createTestingModule({ imports: [RehearsalModule] })
    .overrideProvider(REDIS_CLIENT).useValue({ get: () => null, set: () => 'OK', del: () => 0 })
    .overrideProvider(WecomHttpGateway).useValue(gateway)
    .overrideProvider(WecomTokenService).useValue(tokens)
    .overrideProvider(HttpService).useValue({ post: (_url: string, payload: { agentid: number; touser: string }) => {
      controls.sends.push({ agentid: payload.agentid, touser: payload.touser });
      return of({ data: { errcode: 0, errmsg: 'synthetic-ok' } });
    } })
    .overrideProvider(CertificateReminderJobService).useValue({})
    .overrideProvider(ReminderSchedulerService).useValue({})
    .overrideProvider(PlanTaskSchedulerService).useValue({})
    .compile();
  const app = moduleRef.createNestApplication();
  app.useLogger(false);
  configureApp(app);
  await app.init();
  const source = app.get(DataSource);
  await source.getRepository(WecomUserEntity).save({ userId: 'w5-admin', corpId: appEnv.WECOM_CORP_ID, name: '合成管理员', rawProfile: {}, sourceStatus: 'active', departmentIds: [3], departmentNames: ['总经办'], departmentCodes: ['general_office'] });
  return { app, source, controls, close: async () => { await app.close(); await shutdownPgTestDatabase(); } };
}

if (require.main === module) {
  void createM9Wave5Rehearsal().then(async (rehearsal) => {
    await rehearsal.app.listen(4319, '127.0.0.1');
    console.log('M9 W5 synthetic rehearsal API ready: http://127.0.0.1:4319');
    const close = () => { void rehearsal.close().then(() => process.exit(0)); };
    process.once('SIGTERM', close);
    process.once('SIGINT', close);
  });
}
