import { ForbiddenException } from '@nestjs/common';

import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { EnterpriseProfileService } from './enterprise-profile.service';

describe('EnterpriseProfileService department scope', () => {
  const user: CurrentUser = {
    userId: 'multi-department-user',
    corpId: 'corp-1',
    name: '财务兼总经办',
    avatar: null,
    departments: ['总经办', '财务部'],
    position: null,
    roles: ['all_authenticated', 'general_office', 'finance'],
    isAdmin: false,
  };

  const createService = (departmentCodes: string[]) =>
    new EnterpriseProfileService(
      {} as never,
      {} as never,
      {} as never,
      { findOne: jest.fn().mockResolvedValue({ departmentCodes }) } as never,
      {} as never,
    );

  it('allows a manager to administer a record from any of their departments', async () => {
    const service = createService(['general_office', 'finance_dept']);
    const access = service as unknown as {
      canManageEntity: (
        entity: { departmentCode: string | null },
        currentUser: CurrentUser,
      ) => Promise<boolean>;
    };

    await expect(
      access.canManageEntity({ departmentCode: 'finance_dept' }, user),
    ).resolves.toBe(true);
  });

  it('does not authorize a department outside the member\'s memberships', async () => {
    const service = createService(['general_office', 'finance_dept']);
    const access = service as unknown as {
      ensureDepartmentAccess: (
        entity: { departmentCode: string | null },
        currentUser: CurrentUser,
      ) => Promise<void>;
    };

    await expect(
      access.ensureDepartmentAccess({ departmentCode: 'shipping_dept' }, user),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('loads department memberships once when mapping a list page', async () => {
    const entities = ['profile-1', 'profile-2'].map((id, index) => ({
      id,
      title: id,
      category: 'company',
      description: null,
      status: 'published',
      effectiveDate: null,
      publishedAt: null,
      departmentCode: index === 0 ? 'general_office' : 'finance_dept',
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
      updatedAt: new Date('2026-08-09T00:00:00.000Z'),
    }));
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([entities, entities.length]),
    };
    const wecomUserRepository = {
      findOne: jest.fn().mockResolvedValue({
        departmentCodes: ['general_office', 'finance_dept'],
      }),
    };
    const service = new EnterpriseProfileService(
      { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) } as never,
      { find: jest.fn().mockResolvedValue([]) } as never,
      {} as never,
      wecomUserRepository as never,
      {} as never,
    );

    const result = await service.list({}, user);

    expect(wecomUserRepository.findOne).toHaveBeenCalledTimes(1);
    expect(result.data.map((item) => item.canManage)).toEqual([true, true]);
  });
});
