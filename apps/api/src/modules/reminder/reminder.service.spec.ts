import type { CurrentUser } from 'src/common/interfaces/current-user.interface';

import { ReminderService } from './reminder.service';

describe('ReminderService acknowledge capability', () => {
  it.each([
    ['vessel', 'shipping', 'other-user', false],
    ['vessel', 'all_authenticated', 'viewer', true],
    ['personnel', 'all_authenticated', 'other-user', true],
  ])('matches the existing acknowledge rule for %s/%s/%s', async (ownerType, role, recipientUserId, allowed) => {
    const reminder = { id: 'r1', certificateId: 'c1', certificateExpiryDate: '2026-12-17', ownerType, ownerId: 'owner1', recipientUserId, reminderType: 'upcoming', status: 'pending', sentAt: null, acknowledgedAt: null, acknowledgedBy: null };
    const certificate = { id: 'c1', expiryDate: '2026-12-17', status: 'active', reminderEnabled: true };
    const viewer = { userId: 'viewer', departmentIds: [6], departmentNames: ['船务部'], departmentCodes: ['shipping_dept'], position: '部门经理' };
    const service = new ReminderService(
      { findOne: jest.fn().mockResolvedValue(reminder), save: jest.fn() } as never,
      { findOne: jest.fn().mockResolvedValue(certificate) } as never,
      { find: jest.fn().mockResolvedValue([]) } as never, {} as never,
      { findOne: jest.fn().mockResolvedValue({ departmentCode: 'shipping_dept' }) } as never,
      { findOne: jest.fn().mockResolvedValue(viewer) } as never,
      { now: () => new Date('2026-11-17T00:00:00.000Z') } as never,
    );
    const user: CurrentUser = { userId: 'viewer', corpId: 'corp', name: '用户', avatar: null, departments: ['船务部'], position: '部门经理', roles: [role], isAdmin: false };

    const detail = await service.detail('r1', user);

    expect(detail).toMatchObject({ canAcknowledge: allowed });
    if (allowed) await expect(service.acknowledge('r1', {}, user)).resolves.toMatchObject({ status: 'acknowledged', canAcknowledge: false });
    else await expect(service.acknowledge('r1', {}, user)).rejects.toMatchObject({ status: 403 });
  });
});

describe('ReminderService administrator source', () => {
  it('does not restore administrator access from a stale database flag', async () => {
    const reminderRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'reminder-1',
          certificateId: 'certificate-1',
          certificateTitle: '其他成员证书',
          ownerType: 'equipment',
          ownerId: 'equipment-1',
          ownerName: '设备一',
          recipientUserId: 'other-user',
          reminderType: 'upcoming',
          status: 'pending',
          scheduledDate: '2026-08-10',
          daysBeforeExpiry: 30,
          sentAt: null,
          acknowledgedAt: null,
          acknowledgedBy: null,
          createdAt: new Date('2026-08-10T00:00:00.000Z'),
        },
      ]),
    };
    const wecomUserRepository = {
      findOne: jest.fn().mockResolvedValue({
        userId: 'former-admin',
        departmentIds: [1],
        departmentNames: ['公司成员'],
        departmentCodes: [],
        position: null,
        isSystemAdmin: true,
      }),
    };
    const service = new ReminderService(
      reminderRepository as never,
      { findOne: jest.fn(), find: jest.fn().mockResolvedValue([{ id: 'certificate-pending', expiryDate: '2026-09-09' }]) } as never,
      { find: jest.fn() } as never,
      { find: jest.fn() } as never,
      { findOne: jest.fn() } as never,
      wecomUserRepository as never,
      {} as never,
    );
    const user: CurrentUser = {
      userId: 'former-admin',
      corpId: 'ww-test',
      name: '已撤销管理员',
      avatar: null,
      departments: ['公司成员'],
      position: null,
      roles: ['all_authenticated'],
      isAdmin: false,
    };

    const result = await service.list({ page: 1, pageSize: 20 }, user);

    expect(result.data).toEqual([]);
  });

  it('excludes acknowledged upcoming reminders from the pending list', async () => {
    const reminderRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'pending',
          certificateId: 'certificate-pending',
          certificateExpiryDate: '2026-09-09',
          certificateTitle: '待处理证照',
          ownerType: 'equipment',
          ownerId: 'equipment-1',
          ownerName: '设备一',
          recipientUserId: 'admin',
          reminderType: 'upcoming',
          status: 'pending',
          scheduledDate: '2026-08-10',
          daysBeforeExpiry: 30,
          sentAt: null,
          acknowledgedAt: null,
          acknowledgedBy: null,
          createdAt: new Date('2026-08-10T00:00:00.000Z'),
        },
        {
          id: 'acknowledged',
          certificateId: 'certificate-acknowledged',
          certificateTitle: '已确认证照',
          ownerType: 'equipment',
          ownerId: 'equipment-1',
          ownerName: '设备一',
          recipientUserId: 'admin',
          reminderType: 'upcoming',
          status: 'acknowledged',
          scheduledDate: '2026-08-09',
          daysBeforeExpiry: 30,
          sentAt: null,
          acknowledgedAt: new Date('2026-08-09T00:00:00.000Z'),
          acknowledgedBy: 'admin',
          createdAt: new Date('2026-08-09T00:00:00.000Z'),
        },
      ]),
    };
    const service = new ReminderService(
      reminderRepository as never,
      { findOne: jest.fn(), find: jest.fn().mockResolvedValue([{ id: 'certificate-pending', expiryDate: '2026-09-09' }]) } as never,
      { find: jest.fn() } as never,
      { find: jest.fn() } as never,
      { findOne: jest.fn() } as never,
      { findOne: jest.fn().mockResolvedValue(null) } as never,
      {} as never,
    );

    const result = await service.list(
      { page: 1, pageSize: 20, reminderType: 'upcoming' },
      {
        userId: 'admin',
        corpId: 'ww-test',
        name: '管理员',
        avatar: null,
        departments: [],
        position: null,
        roles: ['system_admin'],
        isAdmin: true,
      },
    );

    expect(result.data.map((item) => item.id)).toEqual(['pending']);
  });
});
