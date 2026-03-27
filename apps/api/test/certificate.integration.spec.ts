import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { configureApp } from 'src/app.bootstrap';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CertificateTypeEntity } from 'src/database/entities/certificate-type.entity';
import { CertificateEntity } from 'src/database/entities/certificate.entity';
import { CertificateFileEntity } from 'src/database/entities/certificate-file.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import { PersonnelEntity } from 'src/database/entities/personnel.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { VehicleEntity } from 'src/database/entities/vehicle.entity';
import { CertificateModule } from 'src/modules/certificate/certificate.module';

const currentUser = {
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
    TypeOrmModule.forRoot({
      type: 'sqljs',
      autoSave: false,
      synchronize: true,
      entities: [CertificateEntity, CertificateFileEntity, CertificateTypeEntity, FileEntity, VesselEntity, VehicleEntity, PersonnelEntity],
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

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [TestModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = moduleRef.get(DataSource);
    const vesselRepo = dataSource.getRepository(VesselEntity);
    const vehicleRepo = dataSource.getRepository(VehicleEntity);
    const typeRepo = dataSource.getRepository(CertificateTypeEntity);
    const fileRepo = dataSource.getRepository(FileEntity);

    vesselId = (await vesselRepo.save(vesselRepo.create({ code: 'SN012', name: '苏南012', category: 'main_vessel', status: 'active' }))).id;
    vehicleId = (await vehicleRepo.save(vehicleRepo.create({ plateNumber: '桂A0001', vehicleType: 'car', status: 'active' }))).id;
    typeId = (await typeRepo.save(typeRepo.create({ code: 'nationality_cert', name: '国籍证书', ownerScope: 'mixed', reminderCategory: 'certificate', defaultAdvanceDays: 30, requiresAttachment: true, sortOrder: 10, isActive: true }))).id;
    fileId = (await fileRepo.save(fileRepo.create({ ossKey: 'certificates/2026/03/a.pdf', fileName: 'a.pdf', mimeType: 'application/pdf', fileSize: 123, category: 'certificates', uploadedBy: 'manager-1' }))).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('supports create/filter/grouped/update/delete and file bind', async () => {
    const createVessel = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/certificates')
      .set('Authorization', 'Bearer token')
      .send({ certificateTypeId: typeId, ownerType: 'vessel', ownerId: vesselId, title: '国籍证书A', expiryDate: '2027-12-31' });
    const id1 = (createVessel.body as { data: { id: string } }).data.id;

    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/certificates')
      .set('Authorization', 'Bearer token')
      .send({ certificateTypeId: typeId, ownerType: 'vehicle', ownerId: vehicleId, title: '车辆证书B', expiryDate: '2028-01-31' });

    const filtered = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/v1/certificates?page=1&pageSize=10&ownerType=vessel&ownerId=${vesselId}&keyword=国籍`)
      .set('Authorization', 'Bearer token');
    expect(filtered.status).toBe(200);
    expect((filtered.body as { data: Array<{ id: string }> }).data[0]?.id).toBe(id1);

    const groupedOwner = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/certificates/grouped?groupBy=owner')
      .set('Authorization', 'Bearer token');
    expect(groupedOwner.status).toBe(200);

    const groupedType = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/certificates/grouped?groupBy=type')
      .set('Authorization', 'Bearer token');
    expect(groupedType.status).toBe(200);

    const bind = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/certificates/${id1}/files`)
      .set('Authorization', 'Bearer token')
      .send({ fileIds: [fileId] });
    expect(bind.status).toBe(201);

    const patch = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch(`/api/v1/certificates/${id1}`)
      .set('Authorization', 'Bearer token')
      .send({ title: '国籍证书A-更新' });
    expect(patch.status).toBe(200);

    const del = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .delete(`/api/v1/certificates/${id1}`)
      .set('Authorization', 'Bearer token');
    expect(del.status).toBe(204);
  });

  it('validates polymorphic owner', async () => {
    const create = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/certificates')
      .set('Authorization', 'Bearer token')
      .send({ certificateTypeId: typeId, ownerType: 'vessel', ownerId: '00000000-0000-0000-0000-000000000001', title: 'bad', expiryDate: '2027-12-31' });
    expect(create.status).toBe(400);
  });
});


