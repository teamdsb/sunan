import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { MasterDataService } from './master-data.service';

describe('MasterDataService edit DTOs', () => {
  const user: CurrentUser = { userId: 'admin', corpId: 'corp', name: '管理员', avatar: null, departments: [], position: null, roles: ['system_admin'], isAdmin: true };
  const vessels = { find: jest.fn().mockResolvedValue([]) };
  const personnel = { find: jest.fn() };
  const categories = { find: jest.fn() };
  const equipment = { find: jest.fn() };
  const service = new MasterDataService(vessels as never, personnel as never, {} as never, categories as never, equipment as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never);

  it('returns equipment category codes needed by the edit form', async () => {
    equipment.find.mockResolvedValue([{ id: 'equipment-1', code: 'E1', name: '泵', categoryId: 'category-1', vesselId: 'vessel-1', status: 'active' }]);
    categories.find.mockResolvedValue([{ id: 'category-1', code: 'pump' }]);

    const result = await service.listEquipment({}, user);

    expect(result.data[0]).toMatchObject({ id: 'equipment-1', categoryId: 'category-1', categoryCode: 'pump' });
  });

  it('returns personnel remarks when reopening the edit form', async () => {
    personnel.find.mockResolvedValue([{ id: 'person-1', name: '船员', employmentStatus: 'active', remarks: '保留原备注' }]);

    const result = await service.listPersonnel({}, user);

    expect(result.data[0]).toMatchObject({ id: 'person-1', remarks: '保留原备注' });
  });
});
