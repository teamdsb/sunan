import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PDFDocument } from 'pdf-lib';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { configureApp } from 'src/app.bootstrap';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileEntity } from 'src/database/entities/file.entity';
import { OssService } from 'src/modules/files/oss.service';
import { ProcurementModule } from 'src/modules/procurement/procurement.module';
import { bootstrapPgTestDatabase, buildPgTypeOrmOptions, shutdownPgTestDatabase } from 'test/pg-test-container';

let currentUser = {
  userId: 'applicant-1',
  corpId: 'ww-test',
  name: 'Applicant',
  avatar: null,
  departments: ['业务部'],
  position: '员工',
  roles: ['all_authenticated', 'business'],
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
    ProcurementModule,
  ],
})
class TestModule {}

function toDateText(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('ProcurementController integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let ossService: OssService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [TestModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = moduleRef.get(DataSource);
    ossService = moduleRef.get(OssService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await shutdownPgTestDatabase();
  });

  it('supports draft -> submit -> dept approve -> final approve flow', async () => {
    currentUser = {
      ...currentUser,
      userId: 'creator-general',
      departments: ['总经办'],
      roles: ['all_authenticated', 'general_office'],
    };

    const createResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/procurement/orders')
      .set('Authorization', 'Bearer token')
      .send({
        departmentCode: 'general_office',
        title: '办公设备采购',
        summary: '采购会议平板',
        amount: 12000,
      });

    expect(createResponse.status).toBe(201);
    expect((createResponse.body as { data: { status: string; approvalChannel: string } }).data.status).toBe('draft');
    expect((createResponse.body as { data: { status: string; approvalChannel: string } }).data.approvalChannel).toBe('internal');

    const orderId = (createResponse.body as { data: { id: string } }).data.id;

    const submitResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/submit`)
      .set('Authorization', 'Bearer token');
    expect(submitResponse.status).toBe(201);
    expect((submitResponse.body as { data: { status: string } }).data.status).toBe('submitted');

    const deptApproveResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/approvals/actions`)
      .set('Authorization', 'Bearer token')
      .send({ action: 'approve', comment: '同意', source: 'internal' });
    expect(deptApproveResponse.status).toBe(201);
    expect((deptApproveResponse.body as { data: { status: string } }).data.status).toBe('dept_approved');

    const finalApproveResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/approvals/actions`)
      .set('Authorization', 'Bearer token')
      .send({ action: 'approve', comment: '终审通过', source: 'internal' });
    expect(finalApproveResponse.status).toBe(201);
    expect((finalApproveResponse.body as { data: { status: string } }).data.status).toBe('final_approved');

    const approvalHistoryResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/v1/procurement/orders/${orderId}/approvals`)
      .set('Authorization', 'Bearer token');

    expect(approvalHistoryResponse.status).toBe(200);
    expect((approvalHistoryResponse.body as { data: Array<{ approvalLevel: string }> }).data).toEqual([
      expect.objectContaining({ approvalLevel: 'dept' }),
      expect.objectContaining({ approvalLevel: 'final' }),
    ]);
  });

  it('supports return to draft and resubmit flow', async () => {
    currentUser = {
      ...currentUser,
      userId: 'logistics-applicant',
      departments: ['后勤部'],
      roles: ['all_authenticated', 'logistics'],
    };

    const createResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/procurement/orders')
      .set('Authorization', 'Bearer token')
      .send({
        departmentCode: 'logistics_dept',
        dimensionType: 'logistics_category',
        dimensionKey: 'canteen',
        title: '食堂补货',
        summary: '补充厨房消耗品',
        amount: 3600,
      });

    expect(createResponse.status).toBe(201);
    const orderId = (createResponse.body as { data: { id: string } }).data.id;

    const submitResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/submit`)
      .set('Authorization', 'Bearer token');
    expect(submitResponse.status).toBe(201);

    const returnResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/approvals/actions`)
      .set('Authorization', 'Bearer token')
      .send({ action: 'return', comment: '补充报价单', source: 'internal' });
    expect(returnResponse.status).toBe(201);
    expect((returnResponse.body as { data: { status: string } }).data.status).toBe('draft');

    const submitAgainResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/submit`)
      .set('Authorization', 'Bearer token');
    expect(submitAgainResponse.status).toBe(409);

    const resubmitResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/resubmit`)
      .set('Authorization', 'Bearer token');
    expect(resubmitResponse.status).toBe(201);
    expect((resubmitResponse.body as { data: { status: string } }).data.status).toBe('submitted');
  });

  it('binds attachments in draft and exposes pending approvals', async () => {
    currentUser = {
      ...currentUser,
      userId: 'business-applicant',
      departments: ['业务部'],
      roles: ['all_authenticated', 'business'],
    };

    const createResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/procurement/orders')
      .set('Authorization', 'Bearer token')
      .send({
        departmentCode: 'business_dept',
        title: '客户接待采购',
        summary: '客户接待所需物资',
        amount: 980,
      });

    expect(createResponse.status).toBe(201);
    const orderId = (createResponse.body as { data: { id: string } }).data.id;

    const fileRepository = dataSource.getRepository(FileEntity);
    const file = await fileRepository.save(
      fileRepository.create({
        ossKey: `procurement/${orderId}/receipt.pdf`,
        fileName: 'receipt.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        category: 'procurement_attachment',
        uploadedBy: currentUser.userId,
      }),
    );

    const bindResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/attachments`)
      .set('Authorization', 'Bearer token')
      .send({ fileIds: [file.id] });

    expect(bindResponse.status).toBe(201);
    expect((bindResponse.body as { data: { files: Array<{ id: string }> } }).data.files).toEqual([
      expect.objectContaining({ id: file.id }),
    ]);

    const downloadResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/v1/procurement/orders/${orderId}/attachments/${file.id}/download-url`)
      .set('Authorization', 'Bearer token');
    expect(downloadResponse.status).toBe(200);
    expect((downloadResponse.body as { data: { downloadUrl: string } }).data.downloadUrl).toContain('receipt.pdf');

    currentUser = {
      ...currentUser,
      userId: 'unrelated-viewer',
      departments: ['财务部'],
      roles: ['all_authenticated', 'finance'],
    };
    const forbiddenDownloadResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/v1/procurement/orders/${orderId}/attachments/${file.id}/download-url`)
      .set('Authorization', 'Bearer token');
    expect(forbiddenDownloadResponse.status).toBe(404);

    currentUser = {
      ...currentUser,
      userId: 'business-applicant',
      departments: ['业务部'],
      roles: ['all_authenticated', 'business'],
    };

    const submitResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/submit`)
      .set('Authorization', 'Bearer token');
    expect(submitResponse.status).toBe(201);

    const pendingResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/procurement/approvals/pending')
      .set('Authorization', 'Bearer token');

    expect(pendingResponse.status).toBe(200);
    expect((pendingResponse.body as { data: Array<{ entityId: string; approvalLevel: string }> }).data).toEqual(
      expect.arrayContaining([expect.objectContaining({ entityId: orderId, approvalLevel: 'dept' })]),
    );
  });

  it('prints procurement order PDF with readable Chinese text and A4 export path', async () => {
    currentUser = {
      ...currentUser,
      userId: 'pdf-applicant',
      departments: ['总经办'],
      roles: ['all_authenticated', 'general_office'],
    };
    const uploadSpy = jest
      .spyOn(ossService, 'uploadBuffer')
      .mockResolvedValueOnce(undefined);

    const createResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/procurement/orders')
      .set('Authorization', 'Bearer token')
      .send({
        departmentCode: 'general_office',
        title: '中文 PDF 采购',
        summary: '采购金额和审批状态需要中文可读',
        amount: 1688.5,
      });
    const orderId = (createResponse.body as { data: { id: string } }).data.id;

    const printResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/print`)
      .set('Authorization', 'Bearer token');

    expect(printResponse.status).toBe(201);
    expect(uploadSpy).toHaveBeenCalledTimes(1);
    const uploadCall = uploadSpy.mock.calls[0];
    expect(uploadCall).toBeDefined();
    const [ossKey, pdfBuffer] = uploadCall!;
    const generatedPdf = await PDFDocument.load(pdfBuffer as Buffer);
    const firstPageSize = generatedPdf.getPage(0).getSize();
    expect(String(ossKey)).toMatch(/^procurement\/exports\//);
    expect((pdfBuffer as Buffer).subarray(0, 5).toString('utf8')).toBe('%PDF-');
    expect((pdfBuffer as Buffer).length).toBeGreaterThan(1024 * 1024);
    expect(generatedPdf.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(firstPageSize.width).toBe(595);
    expect(firstPageSize.height).toBe(842);
  });

  it('enforces last-three-years window for procurement order list submitted range', async () => {
    currentUser = {
      ...currentUser,
      userId: 'viewer-general',
      departments: ['总经办'],
      roles: ['all_authenticated', 'general_office'],
    };

    const now = new Date();
    const validFrom = new Date(now);
    validFrom.setFullYear(validFrom.getFullYear() - 2);
    const validTo = new Date(now);
    validTo.setDate(validTo.getDate() - 1);

    const validResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/procurement/orders')
      .set('Authorization', 'Bearer token')
      .query({
        submittedFrom: toDateText(validFrom),
        submittedTo: toDateText(validTo),
      });
    expect(validResponse.status).toBe(200);

    const invalidFrom = new Date(now);
    invalidFrom.setFullYear(invalidFrom.getFullYear() - 4);
    const invalidResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/procurement/orders')
      .set('Authorization', 'Bearer token')
      .query({
        submittedFrom: toDateText(invalidFrom),
        submittedTo: toDateText(validTo),
      });
    expect(invalidResponse.status).toBe(400);
    expect((invalidResponse.body as { message: string }).message).toContain('submitted date range must be in last three years');
  });
});
