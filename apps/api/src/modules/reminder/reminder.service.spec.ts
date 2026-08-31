import type { CurrentUser } from 'src/common/interfaces/current-user.interface';

import { ReminderService } from './reminder.service';

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
      { findOne: jest.fn() } as never,
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
      { findOne: jest.fn() } as never,
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
