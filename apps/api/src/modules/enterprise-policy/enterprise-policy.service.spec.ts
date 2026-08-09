import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { EnterprisePolicyService } from './enterprise-policy.service';

describe('EnterprisePolicyService department scope', () => {
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

  it('loads department memberships once when mapping a list page', async () => {
    const entities = ['policy-1', 'policy-2'].map((id, index) => ({
      id,
      title: id,
      policyCode: `POLICY-${index + 1}`,
      version: '1.0',
      summary: null,
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
    const service = new EnterprisePolicyService(
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
