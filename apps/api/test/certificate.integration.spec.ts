import type {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  bootstrapPgTestDatabase,
  buildPgTypeOrmOptions,
  shutdownPgTestDatabase,
} from 'test/pg-test-container';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { configureApp } from 'src/app.bootstrap';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CertificateTypeEntity } from 'src/database/entities/certificate-type.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { VehicleEntity } from 'src/database/entities/vehicle.entity';
import { CertificateModule } from 'src/modules/certificate/certificate.module';
import { OssService } from 'src/modules/files/oss.service';

let currentUser = {
  userId: 'manager-1',
  corpId: 'ww-test',
  name: 'Manager',
  avatar: null,
  departments: ['船务部'],
  position: '经理',
  roles: ['all_authenticated', 'shipping'],
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
    CertificateModule,
  ],
})
class TestModule {}

describe('CertificateController integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let vesselId: string;
  let vehicleId: string;
  let typeId: string;
  let fileId: string;
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
    const vesselRepo = dataSource.getRepository(VesselEntity);
    const vehicleRepo = dataSource.getRepository(VehicleEntity);
    const typeRepo = dataSource.getRepository(CertificateTypeEntity);
    const fileRepo = dataSource.getRepository(FileEntity);

    vesselId = (
      await vesselRepo.save(
        vesselRepo.create({
          code: 'SN012-CERT',
          name: '苏南012-证书测试',
          category: 'main_vessel',
          status: 'active',
        }),
      )
    ).id;
    vehicleId = (
      await vehicleRepo.save(
        vehicleRepo.create({
          plateNumber: '桂A1001',
          vehicleType: 'car',
          status: 'active',
        }),
      )
    ).id;
    typeId = (
      await typeRepo.save(
        typeRepo.create({
          code: 'nationality_cert_integration',
          name: '国籍证书-证书测试',
          ownerScope: 'mixed',
          reminderCategory: 'certificate',
          defaultAdvanceDays: 30,
          requiresAttachment: true,
          sortOrder: 10,
          isActive: true,
        }),
      )
    ).id;
    fileId = (
      await fileRepo.save(
        fileRepo.create({
          ossKey: 'certificates/2026/03/a.pdf',
          fileName: 'a.pdf',
          mimeType: 'application/pdf',
          fileSize: 123,
          category: 'certificates',
          uploadedBy: 'manager-1',
        }),
      )
    ).id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await shutdownPgTestDatabase();
  });

  it('exposes certificate reference data for create forms', async () => {
    const types = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/certificate-types?ownerType=vessel')
      .set('Authorization', 'Bearer token');
    expect(types.status).toBe(200);
    expect(
      (types.body as { data: Array<{ id: string; name: string }> }).data,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: typeId, name: '国籍证书-证书测试' }),
      ]),
    );

    const owners = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/certificate-owners?ownerType=vessel')
      .set('Authorization', 'Bearer token');
    expect(owners.status).toBe(200);
    expect(
      (owners.body as { data: Array<{ id: string; name: string }> }).data,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: vesselId, name: '苏南012-证书测试' }),
      ]),
    );

    const missingOwnerType = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/certificate-owners')
      .set('Authorization', 'Bearer token');
    expect(missingOwnerType.status).toBe(400);

    const invalidOwnerType = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/certificate-types?ownerType=unknown')
      .set('Authorization', 'Bearer token');
    expect(invalidOwnerType.status).toBe(400);
  });

  it('restricts reminder recipient identities to certificate managers', async () => {
    const managerRecipients = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/certificates/reminder-recipients')
      .set('Authorization', 'Bearer token');
    expect(managerRecipients.status).toBe(200);

    currentUser = { ...currentUser, roles: ['all_authenticated'] };
    const employeeRecipients = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/certificates/reminder-recipients')
      .set('Authorization', 'Bearer token');
    expect(employeeRecipients.status).toBe(403);

    currentUser = { ...currentUser, roles: ['all_authenticated', 'shipping'] };
  });

  it('supports create/filter/grouped/update/delete and file bind', async () => {
    const createVessel = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/certificates')
      .set('Authorization', 'Bearer token')
      .send({
        certificateTypeId: typeId,
        ownerType: 'vessel',
        ownerId: vesselId,
        title: '国籍证书A',
        expiryDate: '2027-12-31T00:00:00.000Z',
        reminderRecipientUserId: 'manager-1',
      });
    const id1 = (createVessel.body as { data: { id: string } }).data.id;

    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/certificates')
      .set('Authorization', 'Bearer token')
      .send({
        certificateTypeId: typeId,
        ownerType: 'vehicle',
        ownerId: vehicleId,
        title: '车辆证书B',
        expiryDate: '2028-01-31T00:00:00.000Z',
      });

    const filtered = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get(
        `/api/v1/certificates?page=1&pageSize=10&ownerType=vessel&ownerId=${vesselId}&keyword=国籍`,
      )
      .set('Authorization', 'Bearer token');
    expect(filtered.status).toBe(200);
    expect((filtered.body as { data: Array<{ id: string }> }).data[0]?.id).toBe(
      id1,
    );

    const groupedOwner = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/certificates/grouped?groupBy=owner')
      .set('Authorization', 'Bearer token');
    expect(groupedOwner.status).toBe(200);

    const groupedType = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/certificates/grouped?groupBy=type')
      .set('Authorization', 'Bearer token');
    expect(groupedType.status).toBe(200);

    const bind = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post(`/api/v1/certificates/${id1}/files`)
      .set('Authorization', 'Bearer token')
      .send({ fileIds: [fileId] });
    expect(bind.status).toBe(201);

    const downloadSpy = jest
      .spyOn(ossService, 'createDownloadSignature')
      .mockResolvedValue({
        downloadUrl: 'https://oss.example.test/certificate-file',
        expiresAt: '2026-08-04T12:00:00.000Z',
      });
    const download = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get(`/api/v1/certificates/${id1}/files/${fileId}/download-url`)
      .set('Authorization', 'Bearer token');
    expect(download.status).toBe(200);
    expect(download.body).toEqual({
      data: {
        downloadUrl: 'https://oss.example.test/certificate-file',
        expiresAt: '2026-08-04T12:00:00.000Z',
      },
    });
    downloadSpy.mockRestore();

    const unboundDownload = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get(
        `/api/v1/certificates/${id1}/files/00000000-0000-0000-0000-000000000001/download-url`,
      )
      .set('Authorization', 'Bearer token');
    expect(unboundDownload.status).toBe(404);

    const patch = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .patch(`/api/v1/certificates/${id1}`)
      .set('Authorization', 'Bearer token')
      .send({ title: '国籍证书A-更新' });
    expect(patch.status).toBe(200);

    const clearReminderRecipient = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .patch(`/api/v1/certificates/${id1}`)
      .set('Authorization', 'Bearer token')
      .send({ reminderRecipientUserId: null });
    expect(clearReminderRecipient.status).toBe(200);
    expect(
      (clearReminderRecipient.body as { data: { reminderRecipientUserId: string | null } }).data
        .reminderRecipientUserId,
    ).toBeNull();

    const del = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .delete(`/api/v1/certificates/${id1}`)
      .set('Authorization', 'Bearer token');
    expect(del.status).toBe(204);
  });

  it('validates polymorphic owner', async () => {
    const create = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/certificates')
      .set('Authorization', 'Bearer token')
      .send({
        certificateTypeId: typeId,
        ownerType: 'vessel',
        ownerId: '00000000-0000-0000-0000-000000000001',
        title: 'bad',
        expiryDate: '2027-12-31T00:00:00.000Z',
      });
    expect(create.status).toBe(400);
  });

  it('rejects date-only certificate values and accepts ISO date-times', async () => {
    const dateOnlyResponse = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/certificates')
      .set('Authorization', 'Bearer token')
      .send({
        certificateTypeId: typeId,
        ownerType: 'vessel',
        ownerId: vesselId,
        title: '日期格式校验',
        expiryDate: '2027-12-31',
      });
    expect(dateOnlyResponse.status).toBe(400);

    const dateTimeResponse = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/certificates')
      .set('Authorization', 'Bearer token')
      .send({
        certificateTypeId: typeId,
        ownerType: 'vessel',
        ownerId: vesselId,
        title: '日期格式校验通过',
        issueDate: '2026-01-01T08:00:00.000Z',
        expiryDate: '2027-12-31T00:00:00.000Z',
      });
    expect(dateTimeResponse.status).toBe(201);
    expect((dateTimeResponse.body as { data: { issueDate: string } }).data.issueDate).toBe('2026-01-01');
  });
});
