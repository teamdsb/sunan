import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MasterDataPage } from './MasterDataPage';

const mockEquipment = vi.fn();

vi.mock('../../app/hooks', () => ({
  useAppSelector: (selector: (state: { auth: { currentUser: { roles: string[] } } }) => unknown) =>
    selector({ auth: { currentUser: { roles: ['system_admin'] } } }),
}));

vi.mock('./masterDataApi', () => ({
  useGetMasterDataSelectorQuery: () => ({ data: { data: [{ id: 'v1', name: '苏南012', code: 'SN012' }] }, isLoading: false }),
  useGetMasterDataVesselsQuery: () => ({ data: { data: [{ id: 'v1', name: '苏南012', code: 'SN012' }] }, isLoading: false }),
  useGetMasterDataVehiclesQuery: () => ({ data: { data: [] }, isLoading: false }),
  useGetMasterDataPersonnelQuery: () => ({ data: { data: [] }, isLoading: false }),
  useGetMasterDataEquipmentQuery: () => mockEquipment(),
  useCreateMasterDataVesselMutation: () => [vi.fn()],
  useUpdateMasterDataVesselMutation: () => [vi.fn()],
  useCreateMasterDataVehicleMutation: () => [vi.fn()],
  useUpdateMasterDataVehicleMutation: () => [vi.fn()],
  useCreateMasterDataPersonnelMutation: () => [vi.fn()],
  useUpdateMasterDataPersonnelMutation: () => [vi.fn()],
  useCreateMasterDataEquipmentMutation: () => [vi.fn()],
  useUpdateMasterDataEquipmentMutation: () => [vi.fn()],
  useDeleteMasterDataVesselMutation: () => [vi.fn()],
  useDeleteMasterDataVehicleMutation: () => [vi.fn()],
  useDeleteMasterDataPersonnelMutation: () => [vi.fn()],
  useDeleteMasterDataEquipmentMutation: () => [vi.fn()],
}));

describe('MasterDataPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEquipment.mockReturnValue({ data: { data: [] }, isLoading: false });
  });
  it('uses a searchable active selector instead of a UUID text field', () => {
    render(<MasterDataPage />);
    expect(screen.getByPlaceholderText('按名称或编码搜索，不需输入 UUID')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '选择主数据' })).toBeInTheDocument();
    expect(screen.getByText('苏南012')).toBeInTheDocument();
  });

  it('does not carry an edited category into another equipment form', () => {
    mockEquipment.mockReturnValue({ data: { data: [
      { id: 'e1', code: 'E1', name: '设备甲', categoryCode: 'pump', vesselId: 'v1', status: 'active' },
      { id: 'e2', code: 'E2', name: '设备乙', vesselId: 'v1', status: 'active' },
    ] }, isLoading: false });
    render(<MasterDataPage />);
    fireEvent.click(screen.getByText('设备'));
    fireEvent.click(within(screen.getByText('设备甲').closest('.ant-list-item') as HTMLElement).getByRole('button', { name: /编\s*辑/ }));
    fireEvent.change(screen.getByLabelText('设备类别编码'), { target: { value: 'another-category' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(within(screen.getByText('设备乙').closest('.ant-list-item') as HTMLElement).getByRole('button', { name: /编\s*辑/ }));

    expect(screen.getByLabelText('设备名称')).toHaveValue('设备乙');
    expect(screen.getByLabelText('设备类别编码')).toHaveValue('');
  });
});
