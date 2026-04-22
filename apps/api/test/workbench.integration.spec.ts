import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { createHash } from 'crypto';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { configureApp } from 'src/app.bootstrap';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileEntity } from 'src/database/entities/file.entity';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { WecomApprovalInstanceSyncEntity } from 'src/database/entities/wecom-approval-instance-sync.entity';
import { WorkbenchModule } from 'src/modules/workbench/workbench.module';
import { bootstrapPgTestDatabase, buildPgTypeOrmOptions, shutdownPgTestDatabase } from 'test/pg-test-container';

let currentUser = {
  userId: 'shipping-user-1',
  corpId: 'ww-test',
  name: 'Shipping User',
  avatar: null,
  departments: ['船务部'],
  position: '员工',
  roles: ['all_authenticated', 'shipping', 'business'],
  isAdmin: false,
};

const authGuard: CanActivate = {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ user?: unknown }>();
    req.user = currentUser;
    return true;
  },
};

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        await bootstrapPgTestDatabase();
        return buildPgTypeOrmOptions();
      },
    }),
    WorkbenchModule,
  ],
})
class TestModule {}

const sha1 = (raw: string) => createHash('sha1').update(raw).digest('hex');

const buildCallbackSignature = (payload: {
  eventId: string;
  processInstanceId: string;
  callbackVersion: number;
  status: 'pending' | 'approved' | 'rejected' | 'canceled' | 'terminated';
  encrypted?: boolean;
  body?: Record<string, unknown>;
}) => {
  const timestamp = `${Math.floor(Date.now() / 1000)}`;
  const nonce = 'nonce-test';
  const payloadDigest = sha1(
    JSON.stringify({
      eventId: payload.eventId,
      processInstanceId: payload.processInstanceId,
      callbackVersion: payload.callbackVersion,
      status: payload.status,
      encrypted: payload.encrypted ?? false,
      payload: payload.body ?? {},
    }),
  );
  const signature = sha1(['test-callback-token', timestamp, nonce, payloadDigest].sort().join(''));
  return { signature, timestamp, nonce };
};

describe('WorkbenchController integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [TestModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = moduleRef.get(DataSource);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await shutdownPgTestDatabase();
  });

  it('persists records, steps, attachments, print snapshots and approval sync', async () => {
    const createFlowResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/workbench/records')
      .set('Authorization', 'Bearer token')
      .send({
        moduleCode: 'business_oil_boom_operation',
        title: '围油栏布设流程',
        summary: 'B3 泊位作业闭环',
        vesselId: 'sunan-012',
        payload: {
          vesselName: '苏南012',
          berth: 'QZ-B3',
          agencyCompany: '苏南代理',
          operationFee: 1000,
          operationDate: '2026-04-21',
        },
      });

    expect(createFlowResponse.status).toBe(201);
    const flowRecordId = (createFlowResponse.body as { data: { id: string } }).data.id;

    const listFlowResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/workbench/records')
      .set('Authorization', 'Bearer token')
      .query({ moduleCode: 'business_oil_boom_operation' });

    expect(listFlowResponse.status).toBe(200);
    expect((listFlowResponse.body as { data: Array<{ id: string }> }).data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: flowRecordId })]),
    );

    const startResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/workbench/records/${flowRecordId}/actions`)
      .set('Authorization', 'Bearer token')
      .send({ actionType: 'start', comment: '开始执行' });

    expect(startResponse.status).toBe(201);
    expect((startResponse.body as { data: { status: string } }).data.status).toBe('in_progress');

    const completeStepResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/workbench/records/${flowRecordId}/actions`)
      .set('Authorization', 'Bearer token')
      .send({ actionType: 'complete_step', payload: { stepCode: 'pre_shift_meeting' } });

    expect(completeStepResponse.status).toBe(201);

    const fileRepository = dataSource.getRepository(FileEntity);
    const file = await fileRepository.save(
      fileRepository.create({
        ossKey: `workbench/${flowRecordId}/evidence.jpg`,
        fileName: 'evidence.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
        category: 'workbench_attachment',
        uploadedBy: currentUser.userId,
      }),
    );

    const uploadAttachmentResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/workbench/records/${flowRecordId}/attachments`)
      .set('Authorization', 'Bearer token')
      .send({ category: 'evidence', fileId: file.id, stepCode: 'pre_shift_meeting' });

    expect(uploadAttachmentResponse.status).toBe(201);
    expect((uploadAttachmentResponse.body as { data: { fileId: string } }).data.fileId).toBe(file.id);

    const printResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/v1/workbench/records/${flowRecordId}/print`)
      .set('Authorization', 'Bearer token');

    expect(printResponse.status).toBe(200);
    expect((printResponse.body as { data: { recordId: string; renderedFormat: string } }).data).toMatchObject({
      recordId: flowRecordId,
      renderedFormat: 'pdf',
    });

    const createApprovalRecordResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/workbench/records')
      .set('Authorization', 'Bearer token')
      .send({
        moduleCode: 'shipping_voyage_approval',
        title: '航次计划审批-苏南022',
        summary: '北海到钦州航次',
        vesselId: 'sunan-022',
        payload: {
          vesselName: '苏南022',
          voyageRoute: '北海-钦州',
          departureAt: '2026-04-21',
          safetySummary: '航前检查已完成',
        },
      });

    expect(createApprovalRecordResponse.status).toBe(201);
    const approvalRecordId = (createApprovalRecordResponse.body as { data: { id: string } }).data.id;

    const launchApprovalResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/wecom/approval/launch')
      .set('Authorization', 'Bearer token')
      .send({
        moduleCode: 'shipping_voyage_approval',
        businessRecordId: approvalRecordId,
        templateCode: 'shipping_voyage_approval_v1',
        title: '航次计划审批-苏南022',
        applicantUserId: currentUser.userId,
      });

    expect(launchApprovalResponse.status).toBe(200);
    const processInstanceId = (launchApprovalResponse.body as { data: { processInstanceId: string } }).data.processInstanceId;

    const callbackSignature = buildCallbackSignature({
      eventId: 'evt-1',
      processInstanceId,
      callbackVersion: 1,
      status: 'approved',
    });

    const callbackResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/wecom/approval/callback')
      .set('x-wecom-signature', callbackSignature.signature)
      .set('x-wecom-timestamp', callbackSignature.timestamp)
      .set('x-wecom-nonce', callbackSignature.nonce)
      .send({
        eventId: 'evt-1',
        processInstanceId,
        status: 'approved',
        callbackVersion: 1,
      });

    expect(callbackResponse.status).toBe(200);
    expect((callbackResponse.body as { data: { ignored: boolean; mirrorStatus: string } }).data.ignored).toBe(false);
    expect((callbackResponse.body as { data: { mirrorStatus: string } }).data.mirrorStatus).toBe('approval_passed');

    const duplicateCallbackSignature = buildCallbackSignature({
      eventId: 'evt-1-dup',
      processInstanceId,
      callbackVersion: 1,
      status: 'approved',
    });

    const duplicateCallbackResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/wecom/approval/callback')
      .set('x-wecom-signature', duplicateCallbackSignature.signature)
      .set('x-wecom-timestamp', duplicateCallbackSignature.timestamp)
      .set('x-wecom-nonce', duplicateCallbackSignature.nonce)
      .send({
        eventId: 'evt-1-dup',
        processInstanceId,
        status: 'approved',
        callbackVersion: 1,
      });

    expect(duplicateCallbackResponse.status).toBe(200);
    expect((duplicateCallbackResponse.body as { data: { ignored: boolean } }).data.ignored).toBe(true);

    const invalidSignatureCallback = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/wecom/approval/callback')
      .set('x-wecom-signature', 'invalid-signature')
      .set('x-wecom-timestamp', callbackSignature.timestamp)
      .set('x-wecom-nonce', callbackSignature.nonce)
      .send({
        eventId: 'evt-invalid-sign',
        processInstanceId,
        status: 'approved',
        callbackVersion: 2,
      });

    expect(invalidSignatureCallback.status).toBe(400);

    const instanceListForbiddenResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/wecom/approval/instances')
      .set('Authorization', 'Bearer token');

    expect(instanceListForbiddenResponse.status).toBe(403);

    currentUser = {
      ...currentUser,
      userId: 'sys-admin-1',
      roles: ['all_authenticated', 'system_admin', 'general_office'],
      isAdmin: true,
    };

    const instanceListResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/wecom/approval/instances')
      .set('Authorization', 'Bearer token')
      .query({ processInstanceId });

    expect(instanceListResponse.status).toBe(200);
    expect((instanceListResponse.body as { data: Array<{ processInstanceId: string }> }).data).toEqual(
      expect.arrayContaining([expect.objectContaining({ processInstanceId })]),
    );

    const retryResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/wecom/approval/retry')
      .set('Authorization', 'Bearer token')
      .send({
        processInstanceId,
        strategy: 'full_reconcile',
        reason: 'manual retry from test',
      });

    expect(retryResponse.status).toBe(202);
    expect((retryResponse.body as { data: { accepted: boolean } }).data.accepted).toBe(true);

    const reconcileResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/wecom/approval/reconcile')
      .set('Authorization', 'Bearer token')
      .send({ processInstanceIds: [processInstanceId], reason: 'monthly reconcile' });

    expect(reconcileResponse.status).toBe(202);
    expect((reconcileResponse.body as { data: { acceptedCount: number } }).data.acceptedCount).toBe(1);

    const instanceResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/v1/wecom/approval/instances/${processInstanceId}`)
      .set('Authorization', 'Bearer token');

    expect(instanceResponse.status).toBe(200);
    expect((instanceResponse.body as { data: { externalStatus: string; mirrorStatus: string; approvalSyncStatus: string } }).data).toMatchObject({
      externalStatus: 'approved',
      mirrorStatus: 'approval_passed',
      approvalSyncStatus: 'reconciled',
    });

    const recordRepository = dataSource.getRepository(WorkbenchRecordEntity);
    const storedRecord = await recordRepository.findOneByOrFail({ id: flowRecordId });
    expect(storedRecord.recordNo).toEqual(expect.stringMatching(/^WB\d{8}[A-Z0-9]{8}$/));

    const approvalSyncRepository = dataSource.getRepository(WecomApprovalInstanceSyncEntity);
    const approvalSync = await approvalSyncRepository.findOneByOrFail({ processInstanceId });
    expect(approvalSync.approvalSyncStatus).toBe('reconciled');
    expect(approvalSync.callbackVersion).toBe(1);
    expect(approvalSync.lastReconciledAt).not.toBeNull();
    expect(approvalSync.retryCount).toBeGreaterThanOrEqual(1);
  });

  it('exposes wave-a and wave-b schema fields and enforces required payload fields', async () => {
    currentUser = {
      ...currentUser,
      userId: 'business-user-2',
      roles: ['all_authenticated', 'business', 'general_office'],
      departments: ['业务部', '总经办'],
      isAdmin: false,
    };

    const shipSignSchemaResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/workbench/modules/business_ship_sign/schema')
      .set('Authorization', 'Bearer token');

    expect(shipSignSchemaResponse.status).toBe(200);
    const shipSignFields = (
      (shipSignSchemaResponse.body as { data: { sections: Array<{ fields: Array<{ key: string }> }> } }).data.sections[0]?.fields ?? []
    ).map((field) => field.key);
    expect(shipSignFields).toEqual(
      expect.arrayContaining([
        'customerName',
        'vesselName',
        'imoOrCallSign',
        'vesselType',
        'grossTonnage',
        'agreementNo',
        'fee',
        'chargeMode',
        'berth',
        'cargoType',
        'serviceOwner',
        'teamLead',
        'signDate',
        'watchVessel',
      ]),
    );

    const vesselDynamicSchemaResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/workbench/modules/business_vessel_dynamic/schema')
      .set('Authorization', 'Bearer token');
    expect(vesselDynamicSchemaResponse.status).toBe(200);
    const vesselDynamicFields = (
      (vesselDynamicSchemaResponse.body as { data: { sections: Array<{ fields: Array<{ key: string }> }> } }).data.sections[0]?.fields ?? []
    ).map((field) => field.key);
    expect(vesselDynamicFields).toContain('berthTerminal');

    const garbageSchemaResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/workbench/modules/business_ship_garbage_operation/schema')
      .set('Authorization', 'Bearer token');
    expect(garbageSchemaResponse.status).toBe(200);
    const garbageFields = (
      (garbageSchemaResponse.body as { data: { sections: Array<{ fields: Array<{ key: string }> }> } }).data.sections[0]?.fields ?? []
    ).map((field) => field.key);
    expect(garbageFields).toEqual(expect.arrayContaining(['nationality', 'voyageNo', 'fee']));

    const oilyWaterSchemaResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/workbench/modules/business_ship_oily_water_operation/schema')
      .set('Authorization', 'Bearer token');
    expect(oilyWaterSchemaResponse.status).toBe(200);
    const oilyWaterFields = (
      (oilyWaterSchemaResponse.body as { data: { sections: Array<{ fields: Array<{ key: string }> }> } }).data.sections[0]?.fields ?? []
    ).map((field) => field.key);
    expect(oilyWaterFields).toEqual(expect.arrayContaining(['nationality', 'documentNo', 'fee']));

    const domesticSewageSchemaResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/workbench/modules/business_domestic_sewage_operation/schema')
      .set('Authorization', 'Bearer token');
    expect(domesticSewageSchemaResponse.status).toBe(200);
    const domesticSewageFields = (
      (domesticSewageSchemaResponse.body as { data: { sections: Array<{ fields: Array<{ key: string }> }> } }).data.sections[0]?.fields ?? []
    ).map((field) => field.key);
    expect(domesticSewageFields).toEqual(expect.arrayContaining(['nationality', 'documentNo', 'voyageNo', 'fee']));

    const trainingSchemaResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/workbench/modules/goa_training/schema')
      .set('Authorization', 'Bearer token');
    expect(trainingSchemaResponse.status).toBe(200);
    const trainingFields = (
      (trainingSchemaResponse.body as { data: { sections: Array<{ fields: Array<{ key: string }> }> } }).data.sections[0]?.fields ?? []
    ).map((field) => field.key);
    expect(trainingFields).toEqual(expect.arrayContaining(['learningStatus', 'learningProgressPercent', 'completedAt']));

    const meetingSchemaResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/workbench/modules/goa_meeting/schema')
      .set('Authorization', 'Bearer token');
    expect(meetingSchemaResponse.status).toBe(200);
    const meetingFields = (
      (meetingSchemaResponse.body as { data: { sections: Array<{ fields: Array<{ key: string }> }> } }).data.sections[0]?.fields ?? []
    ).map((field) => field.key);
    expect(meetingFields).toEqual(
      expect.arrayContaining(['signInCount', 'photoAttachmentIds', 'retentionUntil', 'wecomGroupChatId', 'wecomGroupChatLink']),
    );

    const missingRequiredFieldResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/workbench/records')
      .set('Authorization', 'Bearer token')
      .send({
        moduleCode: 'business_ship_sign',
        title: '签船记录-缺字段',
        summary: '故意缺少 required 字段',
        payload: {
          customerName: '张三',
          vesselName: '苏南012',
          imoOrCallSign: 'IMO1234567',
          vesselType: '油船',
          grossTonnage: 1234,
          agreementNo: 'AG-2026-001',
          fee: 2000,
          chargeMode: '月结',
          berth: 'QZ-B3',
          cargoType: '成品油',
          serviceOwner: '李四',
          teamLead: '王队长',
          signDate: '2026-04-22',
        },
      });

    expect(missingRequiredFieldResponse.status).toBe(400);
    expect((missingRequiredFieldResponse.body as { message: string }).message).toContain('payload.watchVessel');

    const validCreateResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/workbench/records')
      .set('Authorization', 'Bearer token')
      .send({
        moduleCode: 'business_ship_sign',
        title: '签船记录-完整',
        summary: '字段完整',
        payload: {
          customerName: '张三',
          vesselName: '苏南012',
          imoOrCallSign: 'IMO1234567',
          vesselType: '油船',
          grossTonnage: 1234,
          agreementNo: 'AG-2026-001',
          fee: 2000,
          chargeMode: '月结',
          berth: 'QZ-B3',
          cargoType: '成品油',
          serviceOwner: '李四',
          teamLead: '王队长',
          signDate: '2026-04-22',
          watchVessel: '苏南022',
        },
      });

    expect(validCreateResponse.status).toBe(201);
    expect((validCreateResponse.body as { data: { moduleCode: string } }).data.moduleCode).toBe('business_ship_sign');

    const createMeetingResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/workbench/records')
      .set('Authorization', 'Bearer token')
      .send({
        moduleCode: 'goa_meeting',
        title: '季度视频会议',
        summary: 'WaveB 会议字段验证',
        payload: {
          meetingType: '视频会议',
          host: '总经办',
          attendeeCount: 10,
          signInCount: 8,
          photoAttachmentIds: 'file-1,file-2',
          meetingMinutes: '会议纪要',
          wecomGroupChatId: 'group-123',
          wecomGroupChatLink: 'https://wecom.example.com/group/123',
        },
      });
    expect(createMeetingResponse.status).toBe(201);
    expect((createMeetingResponse.body as { data: { payload: Record<string, unknown> } }).data.payload.retentionUntil).toEqual(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );

    const printDefaultResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/v1/workbench/records/${(validCreateResponse.body as { data: { id: string } }).data.id}/print`)
      .set('Authorization', 'Bearer token');
    expect(printDefaultResponse.status).toBe(200);
    expect((printDefaultResponse.body as { data: { paperSize: string } }).data.paperSize).toBe('A4');

    const printA3Response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/v1/workbench/records/${(validCreateResponse.body as { data: { id: string } }).data.id}/print`)
      .query({ paperSize: 'A3' })
      .set('Authorization', 'Bearer token');
    expect(printA3Response.status).toBe(200);
    expect((printA3Response.body as { data: { paperSize: string } }).data.paperSize).toBe('A3');
  });

  it('enforces module visibility by role (permission matrix baseline)', async () => {
    currentUser = {
      ...currentUser,
      userId: 'finance-user-1',
      roles: ['all_authenticated', 'finance'],
      departments: ['财务部'],
      isAdmin: false,
    };

    const financeModules = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/workbench/modules')
      .set('Authorization', 'Bearer token');

    expect(financeModules.status).toBe(200);
    const moduleCodes = (financeModules.body as { data: Array<{ moduleCode: string }> }).data.map((item) => item.moduleCode);
    expect(moduleCodes).toContain('finance_attendance');
    expect(moduleCodes).not.toContain('business_operation_flow');
    expect(moduleCodes).not.toContain('business_oil_boom_operation');
    expect(moduleCodes).not.toContain('shipping_voyage_approval');

    const forbiddenCreate = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/workbench/records')
      .set('Authorization', 'Bearer token')
      .send({
        moduleCode: 'shipping_voyage_approval',
        title: 'unauthorized',
        summary: 'unauthorized',
      });

    expect(forbiddenCreate.status).toBe(403);

    const attendanceExport = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/workbench/statistics/attendance/export')
      .set('Authorization', 'Bearer token')
      .query({ month: '2026-04', exportFormat: 'xlsx' });
    expect(attendanceExport.status).toBe(202);
    expect((attendanceExport.body as { data: { status: string } }).data.status).toBe('queued');

    const attendanceReconcile = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/workbench/statistics/attendance/reconcile')
      .set('Authorization', 'Bearer token')
      .send({ month: '2026-04', compareSource: 'finance_template' });
    expect(attendanceReconcile.status).toBe(202);
    expect((attendanceReconcile.body as { data: { status: string } }).data.status).toBe('queued');

    currentUser = {
      ...currentUser,
      userId: 'business-user-no-finance',
      roles: ['all_authenticated', 'business'],
      departments: ['业务部'],
      isAdmin: false,
    };

    const forbiddenExport = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/workbench/statistics/attendance/export')
      .set('Authorization', 'Bearer token')
      .query({ month: '2026-04', exportFormat: 'pdf' });
    expect(forbiddenExport.status).toBe(403);
  });
});
