import { randomUUID } from 'crypto';

type AnyRepo<T> = {
  find: jest.Mock<Promise<T[]>, [unknown?]>;
  findOne: jest.Mock<Promise<T | null>, [unknown?]>;
  save: jest.Mock<Promise<T>, [T | T[]]>;
  upsert: jest.Mock<Promise<unknown>, any[]>;
  create: jest.Mock<T, [Partial<T>]>;
  rows: T[];
};

function createRepo<T>(rows: T[] = []): AnyRepo<T> {
  return {
    rows,
    find: jest.fn(async () => [...rows]),
    findOne: jest.fn(async () => rows[0] ?? null),
    save: jest.fn(async (value) => {
      const list = Array.isArray(value) ? value : [value];
      for (const item of list as T[]) {
        const record = item as Record<string, unknown>;
        const index = rows.findIndex((row) => (row as Record<string, unknown>).id === record.id);
        if (index >= 0) {
          rows[index] = { ...(rows[index] as Record<string, unknown>), ...record } as T;
        } else {
          rows.push(item);
        }
      }
      return value as T;
    }),
    upsert: jest.fn(async (value) => {
      const list = Array.isArray(value) ? value : [value];
      for (const item of list as T[]) {
        const record = item as Record<string, unknown>;
        const index = rows.findIndex((row) => {
          const existing = row as Record<string, unknown>;
          return (
            existing.certificateId === record.certificateId &&
            existing.recipientUserId === record.recipientUserId &&
            existing.scheduledDate === record.scheduledDate &&
            existing.reminderType === record.reminderType
          );
        });

        if (index >= 0) {
          rows[index] = { ...(rows[index] as Record<string, unknown>), ...record } as T;
        } else {
          rows.push(item);
        }
      }
      return undefined;
    }),
    create: jest.fn((value) => value as T),
  };
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function makeCertificate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: randomUUID(),
    certificateTypeId: randomUUID(),
    ownerType: 'vessel',
    ownerId: randomUUID(),
    certificateNo: null,
    title: '国籍证书',
    issueDate: null,
    expiryDate: '2026-04-27',
    advanceDays: 30,
    issuer: null,
    status: 'active',
    latestScanAt: null,
    remarks: null,
    createdBy: 'seed',
    updatedBy: 'seed',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function makeCertificateType(
  id: string,
  code: string,
  reminderCategory: 'certificate' | 'contract',
  defaultAdvanceDays: number,
) {
  return {
    id,
    code,
    name: code,
    ownerScope: 'mixed',
    reminderCategory,
    defaultAdvanceDays,
    requiresAttachment: true,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function makeVessel(id: string) {
  return {
    id,
    code: 'SN012',
    name: '苏南012',
    category: 'main_vessel',
    status: 'active',
    mmsi: null,
    remarks: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  };
}

function makeVehicle(id: string) {
  return {
    id,
    plateNumber: '桂A0001',
    vehicleType: 'car',
    status: 'active',
    remarks: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  };
}

function makePersonnel(id: string, wecomUserId: string | null, departmentCode: string) {
  return {
    id,
    wecomUserId,
    name: '张三',
    departmentCode,
    position: '员工',
    mobile: null,
    employmentStatus: 'active',
    isSyncFromWecom: true,
    remarks: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  };
}

function makeWecomUser(
  userId: string,
  departmentCodes: string[],
  departmentNames: string[],
  options: Partial<Record<string, unknown>> = {},
) {
  return {
    id: randomUUID(),
    userId,
    corpId: 'ww-test',
    name: userId,
    avatarUrl: null,
    departmentCodes,
    departmentNames,
    position: null,
    isSystemAdmin: false,
    rawProfile: {},
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...options,
  };
}

describe('CertificateReminderEngineService', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('creates upcoming reminders on the threshold day and routes vessel certificates to shipping and general office users', async () => {
    const { CertificateReminderEngineService } = await import('./certificate-reminder-engine.service');

    const certificate = makeCertificate({
      ownerType: 'vessel',
      ownerId: randomUUID(),
      expiryDate: '2026-04-27',
      advanceDays: 30,
    });

    const reminderRepo = createRepo<any>([]);
    const certificateRepo = createRepo([certificate]);
    const certificateTypeRepo = createRepo([
      makeCertificateType(certificate.certificateTypeId as string, 'nationality_cert', 'certificate', 30),
    ]);
    const vesselRepo = createRepo([makeVessel(certificate.ownerId as string)]);
    const vehicleRepo = createRepo([]);
    const personnelRepo = createRepo([]);
    const wecomUserRepo = createRepo([
      makeWecomUser('shipping-user', ['shipping_dept'], ['船务部'], { position: '经理' }),
      makeWecomUser('office-user', ['general_office'], ['总经办'], { position: '主任' }),
    ]);
    const wecomMessageService = {
      sendTextCard: jest.fn(async () => ({ invalidUser: [] })),
    };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T01:00:00.000Z')),
      today: jest.fn(() => dateOnly('2026-03-28')),
    };
    const redis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      expire: jest.fn(),
    };

    const service = new CertificateReminderEngineService(
      reminderRepo as never,
      certificateRepo as never,
      certificateTypeRepo as never,
      vesselRepo as never,
      vehicleRepo as never,
      personnelRepo as never,
      wecomUserRepo as never,
      wecomMessageService as never,
      clock as never,
      redis as never,
    );

    const result = await service.runScan({ jobId: 'job-1', source: 'manual' });

    expect(result.createdCount).toBe(2);
    expect(reminderRepo.upsert).toHaveBeenCalledTimes(2);
    expect(wecomMessageService.sendTextCard).toHaveBeenCalledTimes(2);
    expect(reminderRepo.upsert.mock.invocationCallOrder[0] ?? 0).toBeLessThan(
      wecomMessageService.sendTextCard.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
    expect(wecomMessageService.sendTextCard).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '证书到期提醒',
        url: expect.stringMatching(/^https:\/\/example\.com\/my\/reminders\/[a-f0-9-]+$/),
      }),
    );
    expect(reminderRepo.save).toHaveBeenCalledTimes(2);
    expect(reminderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        certificateId: certificate.id,
        recipientUserId: 'shipping-user',
        reminderType: 'upcoming',
        status: 'sent',
        scheduledDate: '2026-03-28',
        daysBeforeExpiry: 30,
        certificateExpiryDate: certificate.expiryDate,
      }),
    );
    expect(reminderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        certificateId: certificate.id,
        recipientUserId: 'office-user',
        reminderType: 'upcoming',
        status: 'sent',
        scheduledDate: '2026-03-28',
        daysBeforeExpiry: 30,
      }),
    );
  });

  it('does not create an upcoming reminder before the threshold day', async () => {
    const { CertificateReminderEngineService } = await import('./certificate-reminder-engine.service');

    const certificate = makeCertificate({
      ownerType: 'vessel',
      ownerId: randomUUID(),
      expiryDate: '2026-04-28',
      advanceDays: 30,
    });

    const reminderRepo = createRepo<any>([]);
    const certificateRepo = createRepo([certificate]);
    const certificateTypeRepo = createRepo([
      makeCertificateType(certificate.certificateTypeId as string, 'nationality_cert', 'certificate', 30),
    ]);
    const vesselRepo = createRepo([makeVessel(certificate.ownerId as string)]);
    const vehicleRepo = createRepo([]);
    const personnelRepo = createRepo([]);
    const wecomUserRepo = createRepo([]);
    const wecomMessageService = {
      sendTextCard: jest.fn(async () => ({ invalidUser: [] })),
    };
    const clock = {
      now: jest.fn(() => new Date('2026-03-27T01:00:00.000Z')),
      today: jest.fn(() => dateOnly('2026-03-27')),
    };
    const redis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      expire: jest.fn(),
    };

    const service = new CertificateReminderEngineService(
      reminderRepo as never,
      certificateRepo as never,
      certificateTypeRepo as never,
      vesselRepo as never,
      vehicleRepo as never,
      personnelRepo as never,
      wecomUserRepo as never,
      wecomMessageService as never,
      clock as never,
      redis as never,
    );

    const result = await service.runScan({ jobId: 'job-2', source: 'manual' });

    expect(result.createdCount).toBe(0);
    expect(wecomMessageService.sendTextCard).not.toHaveBeenCalled();
    expect(reminderRepo.save).not.toHaveBeenCalled();
  });

  it('creates overdue reminders after expiry date', async () => {
    const { CertificateReminderEngineService } = await import('./certificate-reminder-engine.service');

    const certificate = makeCertificate({
      ownerType: 'vehicle',
      ownerId: randomUUID(),
      expiryDate: '2026-03-27',
      advanceDays: 30,
      certificateTypeId: randomUUID(),
    });

    const reminderRepo = createRepo([]);
    const certificateRepo = createRepo([certificate]);
    const certificateTypeRepo = createRepo([
      makeCertificateType(certificate.certificateTypeId as string, 'insurance', 'certificate', 30),
    ]);
    const vesselRepo = createRepo([]);
    const vehicleRepo = createRepo([makeVehicle(certificate.ownerId as string)]);
    const personnelRepo = createRepo([]);
    const wecomUserRepo = createRepo([
      makeWecomUser('logistics-user', ['logistics_dept'], ['后勤部'], { position: '主管' }),
      makeWecomUser('office-user', ['general_office'], ['总经办'], { position: '主任' }),
    ]);
    const wecomMessageService = {
      sendTextCard: jest.fn(async () => ({ invalidUser: [] })),
    };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T01:00:00.000Z')),
      today: jest.fn(() => dateOnly('2026-03-28')),
    };
    const redis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      expire: jest.fn(),
    };

    const service = new CertificateReminderEngineService(
      reminderRepo as never,
      certificateRepo as never,
      certificateTypeRepo as never,
      vesselRepo as never,
      vehicleRepo as never,
      personnelRepo as never,
      wecomUserRepo as never,
      wecomMessageService as never,
      clock as never,
      redis as never,
    );

    const result = await service.runScan({ jobId: 'job-3', source: 'manual' });

    expect(result.createdCount).toBe(2);
    expect(reminderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        reminderType: 'overdue',
        recipientUserId: 'logistics-user',
        daysBeforeExpiry: -1,
      }),
    );
  });

  it('marks reminders failed when the WeCom API responds with a non-success error', async () => {
    const { CertificateReminderEngineService } = await import('./certificate-reminder-engine.service');

    const certificate = makeCertificate({
      ownerType: 'vehicle',
      ownerId: randomUUID(),
      expiryDate: '2026-04-27',
      advanceDays: 30,
      certificateTypeId: randomUUID(),
    });

    const reminderRepo = createRepo([]);
    const certificateRepo = createRepo([certificate]);
    const certificateTypeRepo = createRepo([
      makeCertificateType(certificate.certificateTypeId as string, 'insurance', 'certificate', 30),
    ]);
    const vesselRepo = createRepo([]);
    const vehicleRepo = createRepo([makeVehicle(certificate.ownerId as string)]);
    const personnelRepo = createRepo([]);
    const wecomUserRepo = createRepo([
      makeWecomUser('logistics-user', ['logistics_dept'], ['后勤部'], { position: '主管' }),
    ]);
    const wecomMessageService = {
      sendTextCard: jest.fn(async () => ({
        success: false,
        invalidUser: [],
        failureReason: 'WeCom API error 60005: sender blocked',
      })),
    };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T01:00:00.000Z')),
      today: jest.fn(() => dateOnly('2026-03-28')),
    };
    const redis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      expire: jest.fn(),
    };

    const service = new CertificateReminderEngineService(
      reminderRepo as never,
      certificateRepo as never,
      certificateTypeRepo as never,
      vesselRepo as never,
      vehicleRepo as never,
      personnelRepo as never,
      wecomUserRepo as never,
      wecomMessageService as never,
      clock as never,
      redis as never,
    );

    const result = await service.runScan({ jobId: 'job-3b', source: 'manual' });

    expect(result.createdCount).toBe(1);
    expect(result.sentCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(reminderRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: 'logistics-user',
        status: 'pending',
      }),
      expect.arrayContaining(['certificateId', 'recipientUserId', 'scheduledDate', 'reminderType']),
    );
    expect(reminderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: 'logistics-user',
        status: 'failed',
        failureReason: 'WeCom API error 60005: sender blocked',
      }),
    );
  });

  it('skips reminder creation when a matching acknowledged reminder already exists', async () => {
    const { CertificateReminderEngineService } = await import('./certificate-reminder-engine.service');

    const certificate = makeCertificate({
      ownerType: 'vessel',
      ownerId: randomUUID(),
      expiryDate: '2026-04-27',
      advanceDays: 30,
    });

    const reminderRepo = createRepo([
      {
        id: randomUUID(),
        certificateId: certificate.id,
        ownerType: 'vessel',
        ownerId: certificate.ownerId,
        recipientUserId: 'shipping-user',
        reminderType: 'upcoming',
        status: 'acknowledged',
        scheduledDate: '2026-03-27',
        daysBeforeExpiry: 31,
        certificateExpiryDate: certificate.expiryDate,
        sentAt: new Date('2026-03-27T01:00:00.000Z'),
        acknowledgedAt: new Date('2026-03-27T02:00:00.000Z'),
        acknowledgedBy: 'shipping-user',
        failureReason: null,
        createdAt: new Date('2026-03-27T01:00:00.000Z'),
        updatedAt: new Date('2026-03-27T02:00:00.000Z'),
      },
    ]);
    const certificateRepo = createRepo([certificate]);
    const certificateTypeRepo = createRepo([
      makeCertificateType(certificate.certificateTypeId as string, 'nationality_cert', 'certificate', 30),
    ]);
    const vesselRepo = createRepo([makeVessel(certificate.ownerId as string)]);
    const vehicleRepo = createRepo([]);
    const personnelRepo = createRepo([]);
    const wecomUserRepo = createRepo([
      makeWecomUser('shipping-user', ['shipping_dept'], ['船务部'], { position: '经理' }),
    ]);
    const wecomMessageService = {
      sendTextCard: jest.fn(async () => ({ invalidUser: [] })),
    };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T01:00:00.000Z')),
      today: jest.fn(() => dateOnly('2026-03-28')),
    };
    const redis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      expire: jest.fn(),
    };

    const service = new CertificateReminderEngineService(
      reminderRepo as never,
      certificateRepo as never,
      certificateTypeRepo as never,
      vesselRepo as never,
      vehicleRepo as never,
      personnelRepo as never,
      wecomUserRepo as never,
      wecomMessageService as never,
      clock as never,
      redis as never,
    );

    const result = await service.runScan({ jobId: 'job-4', source: 'manual' });

    expect(result.createdCount).toBe(0);
    expect(wecomMessageService.sendTextCard).not.toHaveBeenCalled();
    expect(reminderRepo.save).not.toHaveBeenCalled();
  });

  it('creates a new reminder on the next day when the previous reminder is still unacknowledged', async () => {
    const { CertificateReminderEngineService } = await import('./certificate-reminder-engine.service');

    const certificate = makeCertificate({
      ownerType: 'vessel',
      ownerId: randomUUID(),
      expiryDate: '2026-04-27',
      advanceDays: 30,
    });

    const reminderRepo = createRepo([
      {
        id: randomUUID(),
        certificateId: certificate.id,
        ownerType: 'vessel',
        ownerId: certificate.ownerId,
        recipientUserId: 'shipping-user',
        reminderType: 'upcoming',
        status: 'sent',
        scheduledDate: '2026-03-27',
        daysBeforeExpiry: 31,
        certificateExpiryDate: certificate.expiryDate,
        sentAt: new Date('2026-03-27T01:00:00.000Z'),
        acknowledgedAt: null,
        acknowledgedBy: null,
        failureReason: null,
        createdAt: new Date('2026-03-27T01:00:00.000Z'),
        updatedAt: new Date('2026-03-27T01:00:00.000Z'),
      },
    ]);
    const certificateRepo = createRepo([certificate]);
    const certificateTypeRepo = createRepo([
      makeCertificateType(certificate.certificateTypeId as string, 'nationality_cert', 'certificate', 30),
    ]);
    const vesselRepo = createRepo([makeVessel(certificate.ownerId as string)]);
    const vehicleRepo = createRepo([]);
    const personnelRepo = createRepo([]);
    const wecomUserRepo = createRepo([
      makeWecomUser('shipping-user', ['shipping_dept'], ['船务部'], { position: '经理' }),
    ]);
    const wecomMessageService = {
      sendTextCard: jest.fn(async () => ({ invalidUser: [] })),
    };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T01:00:00.000Z')),
      today: jest.fn(() => dateOnly('2026-03-28')),
    };
    const redis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      expire: jest.fn(),
    };

    const service = new CertificateReminderEngineService(
      reminderRepo as never,
      certificateRepo as never,
      certificateTypeRepo as never,
      vesselRepo as never,
      vehicleRepo as never,
      personnelRepo as never,
      wecomUserRepo as never,
      wecomMessageService as never,
      clock as never,
      redis as never,
    );

    const result = await service.runScan({ jobId: 'job-5', source: 'manual' });

    expect(result.createdCount).toBe(1);
    expect(reminderRepo.upsert).toHaveBeenCalledTimes(1);
    expect(reminderRepo.save).toHaveBeenCalledTimes(1);
  });

  it('persists a reminder row before sending and avoids blind resend when the row already exists', async () => {
    const { CertificateReminderEngineService } = await import('./certificate-reminder-engine.service');

    const certificate = makeCertificate({
      ownerType: 'vehicle',
      ownerId: randomUUID(),
      expiryDate: '2026-04-27',
      advanceDays: 30,
      certificateTypeId: randomUUID(),
    });

    const reminderRepo = createRepo([]);
    const certificateRepo = createRepo([certificate]);
    const certificateTypeRepo = createRepo([
      makeCertificateType(certificate.certificateTypeId as string, 'insurance', 'certificate', 30),
    ]);
    const vesselRepo = createRepo([]);
    const vehicleRepo = createRepo([makeVehicle(certificate.ownerId as string)]);
    const personnelRepo = createRepo([]);
    const wecomUserRepo = createRepo([
      makeWecomUser('logistics-user', ['logistics_dept'], ['后勤部'], { position: '主管' }),
    ]);
    const sendTextCard = jest.fn(async () => ({ success: true, invalidUser: [] }));
    const wecomMessageService = { sendTextCard };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T01:00:00.000Z')),
      today: jest.fn(() => dateOnly('2026-03-28')),
    };
    const redis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      expire: jest.fn(),
    };

    const service = new CertificateReminderEngineService(
      reminderRepo as never,
      certificateRepo as never,
      certificateTypeRepo as never,
      vesselRepo as never,
      vehicleRepo as never,
      personnelRepo as never,
      wecomUserRepo as never,
      wecomMessageService as never,
      clock as never,
      redis as never,
    );

    const firstRun = await service.runScan({ jobId: 'job-8', source: 'manual' });
    expect(firstRun.createdCount).toBe(1);
    expect(reminderRepo.upsert).toHaveBeenCalledTimes(1);
    expect(sendTextCard).toHaveBeenCalledTimes(1);
    expect(reminderRepo.upsert.mock.invocationCallOrder[0] ?? 0).toBeLessThan(
      sendTextCard.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );

    const existingReminder = reminderRepo.rows[0] as any as {
      status: string;
      sentAt: Date | null;
      failureReason: string | null;
    };
    (reminderRepo.rows as any[])[0] = {
      ...existingReminder,
      status: 'pending',
      sentAt: null,
      failureReason: null,
    };
    sendTextCard.mockClear();
    reminderRepo.upsert.mockClear();
    reminderRepo.save.mockClear();

    const secondRun = await service.runScan({ jobId: 'job-9', source: 'manual' });
    expect(secondRun.createdCount).toBe(0);
    expect(sendTextCard).not.toHaveBeenCalled();
    expect(reminderRepo.upsert).not.toHaveBeenCalled();
  });

  it('stops sending additional reminders when the scan lease becomes invalid', async () => {
    const { CertificateReminderEngineService } = await import('./certificate-reminder-engine.service');

    const certificate = makeCertificate({
      ownerType: 'vessel',
      ownerId: randomUUID(),
      expiryDate: '2026-04-27',
      advanceDays: 30,
    });

    const reminderRepo = createRepo([]);
    const certificateRepo = createRepo([certificate]);
    const certificateTypeRepo = createRepo([
      makeCertificateType(certificate.certificateTypeId as string, 'nationality_cert', 'certificate', 30),
    ]);
    const vesselRepo = createRepo([makeVessel(certificate.ownerId as string)]);
    const vehicleRepo = createRepo([]);
    const personnelRepo = createRepo([]);
    const wecomUserRepo = createRepo([
      makeWecomUser('shipping-user', ['shipping_dept'], ['船务部'], { position: '经理' }),
      makeWecomUser('office-user', ['general_office'], ['总经办'], { position: '主任' }),
    ]);
    let leaseValid = true;
    const sendTextCard = jest.fn(async () => {
      leaseValid = false;
      return { invalidUser: [] };
    });
    const wecomMessageService = { sendTextCard };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T01:00:00.000Z')),
      today: jest.fn(() => dateOnly('2026-03-28')),
    };
    const redis = {
      set: jest.fn(async () => 'OK'),
      get: jest.fn(),
      del: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      expire: jest.fn(),
      eval: jest.fn(async () => 0),
    };

    const service = new CertificateReminderEngineService(
      reminderRepo as never,
      certificateRepo as never,
      certificateTypeRepo as never,
      vesselRepo as never,
      vehicleRepo as never,
      personnelRepo as never,
      wecomUserRepo as never,
      wecomMessageService as never,
      clock as never,
      redis as never,
    );

    await expect(service.runScan({ jobId: 'job-abort', source: 'manual' }, { isLeaseValid: () => leaseValid })).rejects.toThrow(
      'scan lock lost',
    );

    expect(sendTextCard).toHaveBeenCalledTimes(1);
    expect(reminderRepo.upsert).toHaveBeenCalledTimes(1);
  });

  it('skips external send when another worker already holds the reminder send claim', async () => {
    const { CertificateReminderEngineService } = await import('./certificate-reminder-engine.service');

    const certificate = makeCertificate({
      ownerType: 'vehicle',
      ownerId: randomUUID(),
      expiryDate: '2026-04-27',
      advanceDays: 30,
      certificateTypeId: randomUUID(),
    });

    const reminderRepo = createRepo([]);
    const certificateRepo = createRepo([certificate]);
    const certificateTypeRepo = createRepo([
      makeCertificateType(certificate.certificateTypeId as string, 'insurance', 'certificate', 30),
    ]);
    const vesselRepo = createRepo([]);
    const vehicleRepo = createRepo([makeVehicle(certificate.ownerId as string)]);
    const personnelRepo = createRepo([]);
    const wecomUserRepo = createRepo([
      makeWecomUser('logistics-user', ['logistics_dept'], ['后勤部'], { position: '主管' }),
    ]);
    const wecomMessageService = {
      sendTextCard: jest.fn(async () => ({ invalidUser: [] })),
    };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T01:00:00.000Z')),
      today: jest.fn(() => dateOnly('2026-03-28')),
    };
    const redis = {
      set: jest.fn(async (key: string) => {
        if (key.startsWith('certificate-reminder:send:')) {
          return null;
        }

        return 'OK';
      }),
      get: jest.fn(),
      del: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      expire: jest.fn(),
      eval: jest.fn(async () => 0),
    };

    const service = new CertificateReminderEngineService(
      reminderRepo as never,
      certificateRepo as never,
      certificateTypeRepo as never,
      vesselRepo as never,
      vehicleRepo as never,
      personnelRepo as never,
      wecomUserRepo as never,
      wecomMessageService as never,
      clock as never,
      redis as never,
    );

    const result = await service.runScan({ jobId: 'job-claim', source: 'manual' });

    expect(result.createdCount).toBe(1);
    expect(result.sentCount).toBe(0);
    expect(wecomMessageService.sendTextCard).not.toHaveBeenCalled();
    expect(reminderRepo.upsert).toHaveBeenCalledTimes(1);
  });

  it('routes ordinary personnel reminders only to the owner and approved same-department managers', async () => {
    const { CertificateReminderEngineService } = await import('./certificate-reminder-engine.service');

    const certificate = makeCertificate({
      ownerType: 'personnel',
      ownerId: randomUUID(),
      expiryDate: '2026-04-27',
      advanceDays: 30,
    });

    const reminderRepo = createRepo([]);
    const certificateRepo = createRepo([certificate]);
    const certificateTypeRepo = createRepo([
      makeCertificateType(certificate.certificateTypeId as string, 'personnel_cert', 'certificate', 30),
    ]);
    const vesselRepo = createRepo([]);
    const vehicleRepo = createRepo([]);
    const personnelRepo = createRepo([makePersonnel(certificate.ownerId as string, 'person-self', 'shipping_dept')]);
    const wecomUserRepo = createRepo([
      makeWecomUser('person-self', ['shipping_dept'], ['船务部']),
      makeWecomUser('shipping-manager', ['shipping_dept'], ['船务部'], { position: '经理' }),
      makeWecomUser('shipping-employee', ['shipping_dept'], ['船务部'], { position: '员工' }),
      makeWecomUser('office-user', ['general_office'], ['总经办'], { position: '主任' }),
    ]);
    const wecomMessageService = {
      sendTextCard: jest.fn(async () => ({ invalidUser: [] })),
    };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T01:00:00.000Z')),
      today: jest.fn(() => dateOnly('2026-03-28')),
    };
    const redis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      expire: jest.fn(),
    };

    const service = new CertificateReminderEngineService(
      reminderRepo as never,
      certificateRepo as never,
      certificateTypeRepo as never,
      vesselRepo as never,
      vehicleRepo as never,
      personnelRepo as never,
      wecomUserRepo as never,
      wecomMessageService as never,
      clock as never,
      redis as never,
    );

    const result = await service.runScan({ jobId: 'job-6', source: 'manual' });

    expect(result.createdCount).toBe(2);
    expect(reminderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: 'person-self' }),
    );
    expect(reminderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: 'shipping-manager' }),
    );
    expect(reminderRepo.save).not.toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: 'shipping-employee' }),
    );
    expect(reminderRepo.save).not.toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: 'office-user' }),
    );
  });

  it('routes personnel contract reminders to the owner and same-department management users only', async () => {
    const { CertificateReminderEngineService } = await import('./certificate-reminder-engine.service');

    const certificate = makeCertificate({
      ownerType: 'personnel',
      ownerId: randomUUID(),
      expiryDate: '2026-04-27',
      advanceDays: 90,
      certificateTypeId: randomUUID(),
    });

    const reminderRepo = createRepo([]);
    const certificateRepo = createRepo([
      {
        ...certificate,
        certificateTypeId: certificate.certificateTypeId,
      },
    ]);
    const certificateTypeRepo = createRepo([
      makeCertificateType(certificate.certificateTypeId as string, 'personnel_contract', 'contract', 90),
    ]);
    const vesselRepo = createRepo([]);
    const vehicleRepo = createRepo([]);
    const personnelRepo = createRepo([makePersonnel(certificate.ownerId as string, 'person-self', 'shipping_dept')]);
    const wecomUserRepo = createRepo([
      makeWecomUser('person-self', ['shipping_dept'], ['船务部']),
      makeWecomUser('shipping-manager', ['shipping_dept'], ['船务部'], { position: '经理' }),
      makeWecomUser('office-user', ['general_office'], ['总经办'], { position: '主任' }),
    ]);
    const wecomMessageService = {
      sendTextCard: jest.fn(async () => ({ invalidUser: [] })),
    };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T01:00:00.000Z')),
      today: jest.fn(() => dateOnly('2026-03-28')),
    };
    const redis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      expire: jest.fn(),
    };

    const service = new CertificateReminderEngineService(
      reminderRepo as never,
      certificateRepo as never,
      certificateTypeRepo as never,
      vesselRepo as never,
      vehicleRepo as never,
      personnelRepo as never,
      wecomUserRepo as never,
      wecomMessageService as never,
      clock as never,
      redis as never,
    );

    const result = await service.runScan({ jobId: 'job-7', source: 'manual' });

    expect(result.createdCount).toBe(2);
    expect(reminderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: 'person-self' }),
    );
    expect(reminderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: 'shipping-manager' }),
    );
    expect(reminderRepo.save).not.toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: 'office-user' }),
    );
  });
});
