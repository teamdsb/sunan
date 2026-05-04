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
import { CertificateReminderEntity } from 'src/database/entities/certificate-reminder.entity';
import { CertificateTypeEntity } from 'src/database/entities/certificate-type.entity';
import { CertificateEntity } from 'src/database/entities/certificate.entity';
import { PersonnelEntity } from 'src/database/entities/personnel.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { VehicleEntity } from 'src/database/entities/vehicle.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { ReminderModule } from 'src/modules/reminder/reminder.module';
import { REDIS_CLIENT } from 'src/modules/wecom/wecom.constants';
import { WecomMessageService } from 'src/modules/wecom/wecom-message.service';

let currentUser = {
  userId: 'shipping-employee',
  corpId: 'ww-test',
  name: 'Shipping Employee',
  avatar: null,
  departments: ['Shipping Department'],
  position: '\u5458\u5DE5',
  roles: ['all_authenticated'],
  isAdmin: false,
};

const authGuard: CanActivate = {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ user?: unknown }>();
    req.user = currentUser;
    return true;
  },
};

const redisMock = {
  hset: jest.fn(async () => 1),
  hgetall: jest.fn(async () => ({})),
  expire: jest.fn(async () => 1),
  lpush: jest.fn(async () => 1),
  rpush: jest.fn(async () => 1),
  rpoplpush: jest.fn(async () => null),
  lrange: jest.fn(async () => []),
  lrem: jest.fn(async () => 0),
  get: jest.fn(async () => null),
  set: jest.fn(async () => 'OK'),
  del: jest.fn(async () => 1),
  eval: jest.fn(async () => 0),
};

const wecomMessageMock = {
  sendTextCard: jest.fn(async () => ({ invalidUser: [] })),
};

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        await bootstrapPgTestDatabase();
        return buildPgTypeOrmOptions();
      },
    }),
    ReminderModule,
  ],
})
class TestModule {}

describe('ReminderController integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let shippingReminderId: string;
  let shippingPeerReminderId: string;
  let officeReminderId: string;
  let vesselId: string;
  let vehicleId: string;
  let personnelId: string;
  let certificateId: string;
  let typeId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [TestModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .overrideProvider(REDIS_CLIENT)
      .useValue(redisMock)
      .overrideProvider(WecomMessageService)
      .useValue(wecomMessageMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = moduleRef.get(DataSource);
    const certificateTypeRepo = dataSource.getRepository(CertificateTypeEntity);
    const vesselRepo = dataSource.getRepository(VesselEntity);
    const vehicleRepo = dataSource.getRepository(VehicleEntity);
    const personnelRepo = dataSource.getRepository(PersonnelEntity);
    const certificateRepo = dataSource.getRepository(CertificateEntity);
    const reminderRepo = dataSource.getRepository(CertificateReminderEntity);
    const wecomUserRepo = dataSource.getRepository(WecomUserEntity);

    typeId = (
      await certificateTypeRepo.save(
        certificateTypeRepo.create({
          code: 'nationality_cert_reminder',
          name: '鍥界睄璇佷功',
          ownerScope: 'mixed',
          reminderCategory: 'certificate',
          defaultAdvanceDays: 30,
          requiresAttachment: true,
          sortOrder: 10,
          isActive: true,
        }),
      )
    ).id;

    vesselId = (
      await vesselRepo.save(
        vesselRepo.create({
          code: 'SN012-REM',
          name: '\u82CF\u5357012-\u63D0\u9192\u6D4B\u8BD5',
          category: 'main_vessel',
          status: 'active',
        }),
      )
    ).id;

    vehicleId = (
      await vehicleRepo.save(
        vehicleRepo.create({
          plateNumber: '妗侫1002',
          vehicleType: 'car',
          status: 'active',
        }),
      )
    ).id;

    personnelId = (
      await personnelRepo.save(
        personnelRepo.create({
          wecomUserId: 'shipping-employee',
          name: 'Shipping Employee',
          departmentCode: 'shipping_dept',
          position: '\u5458\u5DE5',
          mobile: null,
          employmentStatus: 'active',
          isSyncFromWecom: true,
        }),
      )
    ).id;

    certificateId = (
      await certificateRepo.save(
        certificateRepo.create({
          certificateTypeId: typeId,
          ownerType: 'personnel',
          ownerId: personnelId,
          certificateNo: 'CERT-001',
          title: '浜哄憳璇佷功',
          issueDate: '2026-01-01',
          expiryDate: '2026-04-27',
          advanceDays: 30,
          issuer: null,
          status: 'active',
          latestScanAt: null,
          remarks: null,
          createdBy: 'seed',
          updatedBy: 'seed',
        }),
      )
    ).id;

    await wecomUserRepo.save(
      wecomUserRepo.create([
        {
          userId: 'shipping-employee',
          corpId: 'ww-test',
          name: 'Shipping Employee',
          avatarUrl: null,
          departmentCodes: ['shipping_dept'],
          departmentNames: ['Shipping Department'],
          position: '\u5458\u5DE5',
          isSystemAdmin: false,
          rawProfile: {},
        },
        {
          userId: 'shipping-manager',
          corpId: 'ww-test',
          name: 'Shipping Manager',
          avatarUrl: null,
          departmentCodes: ['shipping_dept'],
          departmentNames: ['Shipping Department'],
          position: '\u7ECF\u7406',
          isSystemAdmin: false,
          rawProfile: {},
        },
        {
          userId: 'shipping-peer',
          corpId: 'ww-test',
          name: 'Shipping Peer',
          avatarUrl: null,
          departmentCodes: ['shipping_dept'],
          departmentNames: ['Shipping Department'],
          position: '\u5458\u5DE5',
          isSystemAdmin: false,
          rawProfile: {},
        },
        {
          userId: 'office-user',
          corpId: 'ww-test',
          name: 'Office User',
          avatarUrl: null,
          departmentCodes: ['general_office'],
          departmentNames: ['General Office'],
          position: '\u4E3B\u4EFB',
          isSystemAdmin: false,
          rawProfile: {},
        },
      ]),
    );

    shippingReminderId = (
      await reminderRepo.save(
        reminderRepo.create({
          certificateId,
          certificateTypeId: typeId,
          certificateTypeName: '鍥界睄璇佷功',
          certificateTitle: '鍥界睄璇佷功',
          ownerType: 'personnel',
          ownerId: personnelId,
          ownerName: 'Shipping Employee',
          recipientUserId: 'shipping-employee',
          reminderType: 'upcoming',
          status: 'sent',
          scheduledDate: '2026-03-28',
          daysBeforeExpiry: 30,
          certificateExpiryDate: '2026-04-27',
          sentAt: new Date('2026-03-28T01:00:00.000Z'),
          acknowledgedAt: null,
          acknowledgedBy: null,
          failureReason: null,
        }),
      )
    ).id;

    shippingPeerReminderId = (
      await reminderRepo.save(
        reminderRepo.create({
          certificateId,
          certificateTypeId: typeId,
          certificateTypeName: '鍥界睄璇佷功',
          certificateTitle: '鍥界睄璇佷功',
          ownerType: 'personnel',
          ownerId: personnelId,
          ownerName: 'Shipping Employee',
          recipientUserId: 'shipping-peer',
          reminderType: 'upcoming',
          status: 'sent',
          scheduledDate: '2026-03-28',
          daysBeforeExpiry: 30,
          certificateExpiryDate: '2026-04-27',
          sentAt: new Date('2026-03-28T01:00:00.000Z'),
          acknowledgedAt: null,
          acknowledgedBy: null,
          failureReason: null,
        }),
      )
    ).id;

    officeReminderId = (
      await reminderRepo.save(
        reminderRepo.create({
          certificateId,
          certificateTypeId: typeId,
          certificateTypeName: '鍥界睄璇佷功',
          certificateTitle: '鍥界睄璇佷功',
          ownerType: 'vehicle',
          ownerId: vehicleId,
          ownerName: '妗侫0001',
          recipientUserId: 'office-user',
          reminderType: 'overdue',
          status: 'pending',
          scheduledDate: '2026-03-28',
          daysBeforeExpiry: -1,
          certificateExpiryDate: '2026-03-27',
          sentAt: null,
          acknowledgedAt: null,
          acknowledgedBy: null,
          failureReason: null,
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

  it('scopes dashboard, list, and detail to the recipient for non-manager users', async () => {
    currentUser = {
      ...currentUser,
      userId: 'shipping-employee',
      roles: ['all_authenticated'],
      position: '\u5458\u5DE5',
    };

    const dashboard = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/certificate-reminders/dashboard')
      .set('Authorization', 'Bearer token');
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.totalPending).toBe(0);
    expect(dashboard.body.data.totalAcknowledged).toBe(0);

    const list = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/certificate-reminders?page=1&pageSize=20')
      .set('Authorization', 'Bearer token');
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].recipientUserId).toBe('shipping-employee');

    const hiddenPeerDetail = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get(`/api/v1/certificate-reminders/${shippingPeerReminderId}`)
      .set('Authorization', 'Bearer token');
    expect(hiddenPeerDetail.status).toBe(404);
  });

  it('limits shipping managers to reminders within their responsibility scope', async () => {
    currentUser = {
      ...currentUser,
      userId: 'shipping-manager',
      roles: ['all_authenticated', 'shipping'],
      position: '\u7ECF\u7406',
    };

    const dashboard = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/certificate-reminders/dashboard')
      .set('Authorization', 'Bearer token');
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.totalPending).toBe(0);

    const list = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/certificate-reminders?page=1&pageSize=20')
      .set('Authorization', 'Bearer token');
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(2);

    const detail = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get(`/api/v1/certificate-reminders/${officeReminderId}`)
      .set('Authorization', 'Bearer token');
    expect(detail.status).toBe(404);
  });

  it('allows general office users to view reminders they legitimately receive', async () => {
    currentUser = {
      ...currentUser,
      userId: 'office-user',
      roles: ['all_authenticated', 'general_office'],
      position: '\u4E3B\u4EFB',
    };

    const dashboard = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/certificate-reminders/dashboard')
      .set('Authorization', 'Bearer token');
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.totalPending).toBe(1);

    const list = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/certificate-reminders?page=1&pageSize=20')
      .set('Authorization', 'Bearer token');
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].recipientUserId).toBe('office-user');

    const hiddenDetail = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get(`/api/v1/certificate-reminders/${shippingReminderId}`)
      .set('Authorization', 'Bearer token');
    expect(hiddenDetail.status).toBe(404);
  });

  it('allows acknowledge for self and same-department management users and rejects repeat acknowledge', async () => {
    currentUser = {
      ...currentUser,
      userId: 'shipping-employee',
      roles: ['all_authenticated'],
      position: '\u5458\u5DE5',
    };

    const selfAck = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post(`/api/v1/certificate-reminders/${shippingReminderId}/acknowledge`)
      .set('Authorization', 'Bearer token')
      .send({ comment: 'Acknowledged' });
    expect(selfAck.status).toBe(200);
    expect(selfAck.body.data.status).toBe('acknowledged');

    const employeeAckPeer = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post(
        `/api/v1/certificate-reminders/${shippingPeerReminderId}/acknowledge`,
      )
      .set('Authorization', 'Bearer token')
      .send({ comment: 'Try acknowledge peer reminder' });
    expect(employeeAckPeer.status).toBe(404);

    currentUser = {
      ...currentUser,
      userId: 'shipping-manager',
      roles: ['all_authenticated', 'shipping'],
      position: '\u7ECF\u7406',
    };

    const managerAck = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post(
        `/api/v1/certificate-reminders/${shippingPeerReminderId}/acknowledge`,
      )
      .set('Authorization', 'Bearer token')
      .send({ comment: 'Department acknowledged' });
    expect(managerAck.status).toBe(200);
    expect(managerAck.body.data.status).toBe('acknowledged');

    const repeatAck = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post(
        `/api/v1/certificate-reminders/${shippingPeerReminderId}/acknowledge`,
      )
      .set('Authorization', 'Bearer token')
      .send({ comment: '閲嶅纭' });
    expect(repeatAck.status).toBe(409);
  });

  it('accepts manual scan requests from authenticated users and returns a job id', async () => {
    currentUser = {
      ...currentUser,
      userId: 'shipping-employee',
      roles: ['all_authenticated'],
      position: '\u5458\u5DE5',
    };

    const scan = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/certificate-reminders/actions/scan')
      .set('Authorization', 'Bearer token');

    expect(scan.status).toBe(202);
    expect(scan.body.data.jobId).toEqual(expect.any(String));
    expect(scan.body.data.acceptedAt).toEqual(expect.any(String));
  });
});
