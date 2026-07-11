import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { configureApp } from 'src/app.bootstrap';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { Wave4MasterData1710000018000 } from 'src/database/migrations/1710000018000-wave4-master-data';
import { MasterDataModule } from 'src/modules/master-data/master-data.module';
import { bootstrapPgTestDatabase, buildPgTypeOrmOptions, shutdownPgTestDatabase } from 'test/pg-test-container';

let currentUser = {
  userId: 'safety-manager', corpId: 'ww-test', name: '安全管理员', avatar: null,
  departments: ['船务部'], position: '经理', roles: ['all_authenticated', 'shipping'], isAdmin: false,
};

const authGuard: CanActivate = {
  canActivate(context: ExecutionContext) {
    context.switchToHttp().getRequest<{ user?: unknown }>().user = currentUser;
    return true;
  },
};

@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useFactory: async () => { await bootstrapPgTestDatabase(); return buildPgTypeOrmOptions(); } }),
    MasterDataModule,
  ],
})
class TestModule {}

describe('Master data integration', () => {
  let app: INestApplication;
  let source: DataSource;
  let vesselId: string;
  let personnelId: string;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [TestModule] }).overrideGuard(JwtAuthGuard).useValue(authGuard).compile();
    app = ref.createNestApplication(); configureApp(app); await app.init(); source = ref.get(DataSource);
  });
  afterAll(async () => { await app?.close(); await shutdownPgTestDatabase(); });

  it('enforces unique master data, excludes inactive options, and preserves historical display snapshots', async () => {
    const vessel = await request(app.getHttpServer()).post('/api/v1/master-data/vessels').send({ code: 'MD-SN012', name: '主数据苏南012', category: 'main_vessel' });
    expect(vessel.status).toBe(201); vesselId = vessel.body.data.id;
    const duplicate = await request(app.getHttpServer()).post('/api/v1/master-data/vessels').send({ code: 'MD-SN012', name: '另一名称', category: 'main_vessel' });
    expect(duplicate.status).toBe(409);

    const record = await source.getRepository(WorkbenchRecordEntity).save({ moduleCode: 'shipping_equipment_maintenance', templateCode: 'v1', recordNo: 'MD-REF-001', recordSource: 'manual', status: 'draft', approvalChannel: 'internal', title: '历史文本', summary: '原 payload 不能被覆盖', departmentCode: 'shipping', vesselId: null, ownerUserId: 'safety-manager', applicantUserId: 'safety-manager', assigneeUserId: null, reviewerUserId: null, occurredAt: new Date(), payload: { vesselName: '主数据苏南012' } });
    await request(app.getHttpServer()).post('/api/v1/master-data/references/normalize').send({ sourceRecordId: record.id, fieldKey: 'vesselName', objectType: 'vessel' });
    await request(app.getHttpServer()).patch(`/api/v1/master-data/vessels/${vesselId}`).send({ status: 'inactive' });
    const selector = await request(app.getHttpServer()).get('/api/v1/master-data/selectors/vessels?keyword=主数据');
    expect(selector.body.data).toHaveLength(0);
    const detail = await request(app.getHttpServer()).get(`/api/v1/master-data/vessels/${vesselId}`);
    expect(detail.body.data.references[0]).toEqual(expect.objectContaining({ rawValue: '主数据苏南012', displaySnapshot: '主数据苏南012', mappingStatus: 'matched' }));
    expect((await source.getRepository(WorkbenchRecordEntity).findOneByOrFail({ id: record.id })).payload).toEqual({ vesselName: '主数据苏南012' });
  });

  it('checks identity and effective assignment periods and only permits active references', async () => {
    const personnel = await request(app.getHttpServer()).post('/api/v1/master-data/personnel').send({ name: '张船员', departmentCode: 'shipping', wecomUserId: 'crew-md-1', mobile: '13800138000' });
    expect(personnel.status).toBe(201); personnelId = personnel.body.data.id;
    const duplicateIdentity = await request(app.getHttpServer()).post('/api/v1/master-data/personnel').send({ name: '李船员', departmentCode: 'shipping', wecomUserId: 'crew-md-1' });
    expect(duplicateIdentity.status).toBe(409);
    currentUser = { ...currentUser, userId: 'outside-crew', roles: ['all_authenticated'], position: '船员' };
    const redacted = await request(app.getHttpServer()).get('/api/v1/master-data/personnel');
    expect(redacted.body.data.find((item: { id: string }) => item.id === personnelId)).toBeUndefined();
    currentUser = { ...currentUser, userId: 'safety-manager', roles: ['all_authenticated', 'shipping'], position: '经理' };
    const inactiveAssignment = await request(app.getHttpServer()).post('/api/v1/master-data/assignments').send({ personnelId, vesselId, roleCode: 'captain', effectiveFrom: '2026-07-01' });
    expect(inactiveAssignment.status).toBe(422);
    await request(app.getHttpServer()).patch(`/api/v1/master-data/vessels/${vesselId}`).send({ status: 'active' });
    const assignment = await request(app.getHttpServer()).post('/api/v1/master-data/assignments').send({ personnelId, vesselId, roleCode: 'captain', effectiveFrom: '2026-07-01' });
    expect(assignment.status).toBe(201);
    const overlap = await request(app.getHttpServer()).post('/api/v1/master-data/assignments').send({ personnelId, vesselId, roleCode: 'chief_officer', effectiveFrom: '2026-07-10' });
    expect(overlap.status).toBe(409);
  });

  it('replays an import without duplicating data and returns reconciliation errors', async () => {
    await request(app.getHttpServer()).patch(`/api/v1/master-data/vessels/${vesselId}`).send({ status: 'active' });
    const content = JSON.stringify([{ code: 'EQ-001', name: '主机', categoryCode: 'engine', vesselCode: 'MD-SN012' }, { code: '', name: '无编码', categoryCode: 'engine', vesselCode: 'MD-SN012' }]);
    const first = await request(app.getHttpServer()).post('/api/v1/master-data/imports').send({ importType: 'equipment', content });
    expect(first.status).toBe(201);
    expect(first.body.data.summary).toEqual(expect.objectContaining({ failed: 1 }));
    const replay = await request(app.getHttpServer()).post('/api/v1/master-data/imports').send({ importType: 'equipment', content });
    expect(replay.status).toBe(200);
    expect(replay.body.data.id).toBe(first.body.data.id);
    const vessels = await request(app.getHttpServer()).post('/api/v1/master-data/imports').send({ importType: 'vessels', content: JSON.stringify([{ code: 'MD-IMP-1', name: '导入船', category: 'main_vessel' }]) });
    expect(vessels.body.data.summary).toEqual(expect.objectContaining({ created: 1 }));
    const people = await request(app.getHttpServer()).post('/api/v1/master-data/imports').send({ importType: 'personnel', content: JSON.stringify([{ wecomUserId: 'import-person', name: '导入人员', departmentCode: 'shipping' }]) });
    expect(people.body.data.summary).toEqual(expect.objectContaining({ created: 1 }));
  });

  it('allows a manual override to link unmatched legacy text without changing the source payload', async () => {
    const record = await source.getRepository(WorkbenchRecordEntity).save({ moduleCode: 'shipping_equipment_maintenance', templateCode: 'v1', recordNo: 'MD-REF-002', recordSource: 'manual', status: 'draft', approvalChannel: 'internal', title: '人工映射', summary: '保留错别字', departmentCode: 'shipping', vesselId: null, ownerUserId: 'safety-manager', applicantUserId: 'safety-manager', assigneeUserId: null, reviewerUserId: null, occurredAt: new Date(), payload: { vesselName: '苏南零一二' } });
    const mapped = await request(app.getHttpServer()).post('/api/v1/master-data/references/normalize').send({ sourceRecordId: record.id, fieldKey: 'vesselName', objectType: 'vessel', objectId: vesselId });
    expect(mapped.body.data).toEqual(expect.objectContaining({ objectId: vesselId, mappingStatus: 'manual_override', rawValue: '苏南零一二' }));
    expect((await source.getRepository(WorkbenchRecordEntity).findOneByOrFail({ id: record.id })).payload).toEqual({ vesselName: '苏南零一二' });
  });

  it('reverses and reapplies the Wave 4 schema without touching source workbench records', async () => {
    const runner = source.createQueryRunner(); await runner.connect();
    const migration = new Wave4MasterData1710000018000();
    try {
      await migration.down(runner);
      expect((await runner.query(`SELECT to_regclass('public.workbench_master_data_references') AS name`))[0].name).toBeNull();
      await migration.up(runner);
      expect((await runner.query(`SELECT to_regclass('public.workbench_master_data_references') AS name`))[0].name).toBe('workbench_master_data_references');
      expect(await source.getRepository(WorkbenchRecordEntity).count()).toBeGreaterThan(0);
      const equipmentId = (await runner.query(`SELECT id FROM safety_equipment LIMIT 1`))[0]?.id;
      if (equipmentId) {
        await runner.query(`INSERT INTO certificates (certificate_type_id, owner_type, owner_id, title, expiry_date, advance_days, status, created_by, updated_by) SELECT id, 'equipment', $1, '回滚保护证书', '2027-01-01', 30, 'active', 'safety-manager', 'safety-manager' FROM certificate_types LIMIT 1`, [equipmentId]);
        await expect(migration.down(runner)).rejects.toThrow('equipment certificates');
        await runner.query(`DELETE FROM certificates WHERE owner_type = 'equipment' AND owner_id = $1`, [equipmentId]);
      }
      await migration.down(runner);
      await migration.up(runner);
    } finally { await runner.release(); }
  });
});
