import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
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
        moduleCode: 'business_operation_flow',
        title: '围油栏布设流程',
        summary: 'B3 泊位作业闭环',
        vesselId: 'sunan-012',
        payload: {
          operationName: '围油栏布设',
          vesselName: '苏南012',
          berth: 'QZ-B3',
          teamLead: '赵班长',
        },
      });

    expect(createFlowResponse.status).toBe(201);
    const flowRecordId = (createFlowResponse.body as { data: { id: string } }).data.id;

    const listFlowResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/workbench/records')
      .set('Authorization', 'Bearer token')
      .query({ moduleCode: 'business_operation_flow' });

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
    expect((printResponse.body as { data: { businessRecordId: string } }).data.businessRecordId).toBe(flowRecordId);

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

    expect(launchApprovalResponse.status).toBe(201);
    const processInstanceId = (launchApprovalResponse.body as { data: { processInstanceId: string } }).data.processInstanceId;

    const callbackResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/wecom/approval/callback')
      .send({
        eventId: 'evt-1',
        processInstanceId,
        status: 'approved',
        callbackVersion: 1,
      });

    expect(callbackResponse.status).toBe(201);
    expect((callbackResponse.body as { data: { ignored: boolean; mirrorStatus: string } }).data.ignored).toBe(false);
    expect((callbackResponse.body as { data: { mirrorStatus: string } }).data.mirrorStatus).toBe('approval_passed');

    const duplicateCallbackResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/wecom/approval/callback')
      .send({
        eventId: 'evt-1-dup',
        processInstanceId,
        status: 'approved',
        callbackVersion: 1,
      });

    expect(duplicateCallbackResponse.status).toBe(201);
    expect((duplicateCallbackResponse.body as { data: { ignored: boolean } }).data.ignored).toBe(true);

    const reconcileResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/wecom/approval/reconcile')
      .set('Authorization', 'Bearer token')
      .send({ processInstanceIds: [processInstanceId] });

    expect(reconcileResponse.status).toBe(201);
    expect((reconcileResponse.body as { data: { accepted: number } }).data.accepted).toBe(1);

    const instanceResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/v1/wecom/approval/instances/${processInstanceId}`)
      .set('Authorization', 'Bearer token');

    expect(instanceResponse.status).toBe(200);
    expect((instanceResponse.body as { data: { externalStatus: string; mirrorStatus: string } }).data).toMatchObject({
      externalStatus: 'approved',
      mirrorStatus: 'approval_passed',
    });

    const recordRepository = dataSource.getRepository(WorkbenchRecordEntity);
    const storedRecord = await recordRepository.findOneByOrFail({ id: flowRecordId });
    expect(storedRecord.recordNo).toEqual(expect.stringMatching(/^WB\d{8}[A-Z0-9]{8}$/));

    const approvalSyncRepository = dataSource.getRepository(WecomApprovalInstanceSyncEntity);
    const approvalSync = await approvalSyncRepository.findOneByOrFail({ processInstanceId });
    expect(approvalSync.approvalSyncStatus).toBe('reconciled');
    expect(approvalSync.callbackVersion).toBe(1);
    expect(approvalSync.lastReconciledAt).not.toBeNull();
  });
});
