import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcurementOrderCreatePage } from './ProcurementOrderCreatePage';

const mockNavigate = vi.fn();
const mockGetDimensions = vi.fn();
const mockCreateOrder = vi.fn();
const mockSubmitOrder = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('./procurementApi', () => ({
  useGetProcurementDimensionsQuery: (params: unknown) => mockGetDimensions(params),
  useCreateProcurementOrderMutation: () => [mockCreateOrder, { isLoading: false }],
  useSubmitProcurementOrderMutation: () => [mockSubmitOrder, { isLoading: false }],
}));

describe('ProcurementOrderCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDimensions.mockReturnValue({ data: { data: [] }, isLoading: false });
    mockCreateOrder.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { id: 'order-1' } }),
    });
    mockSubmitOrder.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { id: 'order-1' } }),
    });
  });

  function fillRequiredFields() {
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '柴油机备件采购' } });
    fireEvent.change(screen.getByLabelText('摘要/事由'), { target: { value: '季度维护备件补货' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: '金额' }), { target: { value: '3200' } });
  }

  it('creates a draft order and navigates to the detail page', async () => {
    render(<ProcurementOrderCreatePage />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentCode: 'general_office',
          dimensionType: 'none',
          title: '柴油机备件采购',
          summary: '季度维护备件补货',
          amount: 3200,
        }),
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/procurement/orders/order-1');
  });

  it('can return to procurement home from a direct entry', () => {
    render(<ProcurementOrderCreatePage />);

    fireEvent.click(screen.getByRole('button', { name: '返回采购首页' }));

    expect(mockNavigate).toHaveBeenCalledWith('/procurement');
  });

  it('creates and submits an order in one action', async () => {
    render(<ProcurementOrderCreatePage />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: '保存并提交' }));

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalled();
      expect(mockSubmitOrder).toHaveBeenCalledWith('order-1');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/procurement/orders/order-1');
  });
});
