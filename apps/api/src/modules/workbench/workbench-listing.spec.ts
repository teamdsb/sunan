import { WorkbenchService } from './workbench.service';

describe('Workbench visible record listing', () => {
  it('pushes participant visibility into the database query', async () => {
    const service = Object.create(WorkbenchService.prototype) as Record<string, any>;
    const records = [
      { id: 'record-1', moduleCode: 'shipping_chart_update', ownerUserId: 'owner-1', applicantUserId: null, assigneeUserId: null, reviewerUserId: null, vesselId: null, occurredAt: new Date('2026-01-01') },
      { id: 'record-2', moduleCode: 'shipping_chart_update', ownerUserId: 'owner-2', applicantUserId: null, assigneeUserId: null, reviewerUserId: null, vesselId: null, occurredAt: new Date('2026-01-02') },
    ];
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([records[1]]),
    };
    service.listReadableModules = jest.fn().mockResolvedValue([
      { moduleCode: 'shipping_chart_update', visibleRoles: ['crew'] },
    ]);
    service.recordRepository = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) };
    service.toRecordModel = (record: unknown) => record;
    service.selfInspection = { canRead: jest.fn() };

    const visible = await service.listVisibleRecords({
      userId: 'reader',
      roles: ['crew'],
      departments: [],
    });

    expect(visible).toEqual([records[1]]);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(expect.stringContaining('EXISTS'), expect.objectContaining({ userId: 'reader' }));
  });
});
