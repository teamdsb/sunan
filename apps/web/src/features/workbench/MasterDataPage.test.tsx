import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MasterDataPage } from './MasterDataPage';

vi.mock('./masterDataApi', () => ({
  useGetMasterDataSelectorQuery: () => ({ data: { data: [{ id: 'v1', name: '苏南012', code: 'SN012' }] }, isLoading: false }),
  useGetMasterDataVesselsQuery: () => ({ data: { data: [{ id: 'v1', name: '苏南012', code: 'SN012' }] }, isLoading: false }),
  useGetMasterDataPersonnelQuery: () => ({ data: { data: [] }, isLoading: false }),
  useGetMasterDataEquipmentQuery: () => ({ data: { data: [] }, isLoading: false }),
}));

describe('MasterDataPage', () => {
  it('uses a searchable active selector instead of a UUID text field', () => {
    render(<MasterDataPage />);
    expect(screen.getByPlaceholderText('按名称或编码搜索，不需输入 UUID')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '选择主数据' })).toBeInTheDocument();
    expect(screen.getByText('苏南012')).toBeInTheDocument();
  });
});
