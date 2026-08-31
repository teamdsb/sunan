import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MasterDataPage } from './MasterDataPage';

vi.mock('../../app/hooks', () => ({
  useAppSelector: (selector: (state: { auth: { currentUser: { roles: string[] } } }) => unknown) =>
    selector({ auth: { currentUser: { roles: ['system_admin'] } } }),
}));

vi.mock('./masterDataApi', () => ({
  useGetMasterDataSelectorQuery: () => ({ data: { data: [{ id: 'v1', name: '苏南012', code: 'SN012' }] }, isLoading: false }),
  useGetMasterDataVesselsQuery: () => ({ data: { data: [{ id: 'v1', name: '苏南012', code: 'SN012' }] }, isLoading: false }),
  useGetMasterDataVehiclesQuery: () => ({ data: { data: [] }, isLoading: false }),
  useGetMasterDataPersonnelQuery: () => ({ data: { data: [] }, isLoading: false }),
  useGetMasterDataEquipmentQuery: () => ({ data: { data: [] }, isLoading: false }),
  useCreateMasterDataVesselMutation: () => [vi.fn()],
  useUpdateMasterDataVesselMutation: () => [vi.fn()],
  useCreateMasterDataVehicleMutation: () => [vi.fn()],
  useUpdateMasterDataVehicleMutation: () => [vi.fn()],
  useCreateMasterDataPersonnelMutation: () => [vi.fn()],
  useUpdateMasterDataPersonnelMutation: () => [vi.fn()],
  useCreateMasterDataEquipmentMutation: () => [vi.fn()],
  useUpdateMasterDataEquipmentMutation: () => [vi.fn()],
}));

describe('MasterDataPage', () => {
  it('uses a searchable active selector instead of a UUID text field', () => {
    render(<MasterDataPage />);
    expect(screen.getByPlaceholderText('按名称或编码搜索，不需输入 UUID')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '选择主数据' })).toBeInTheDocument();
    expect(screen.getByText('苏南012')).toBeInTheDocument();
  });
});
