import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcurementDictionaryAdminPage } from './ProcurementDictionaryAdminPage';

const mockNavigate = vi.fn();
const mockCurrentUser = vi.fn();
const mockGetDimensions = vi.fn();
const mockRefetch = vi.fn();
const mockCreateDimension = vi.fn();
const mockUpdateDimension = vi.fn();
const mockDisableDimension = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../app/hooks', () => ({
  useAppSelector: (
    selector: (state: { auth: { currentUser: { userId: string; roles: string[] } | null } }) => unknown,
  ) => selector({ auth: { currentUser: mockCurrentUser() } }),
}));

vi.mock('./procurementApi', () => ({
  useGetProcurementDimensionsQuery: (params: unknown) => mockGetDimensions(params),
  useCreateProcurementDimensionMutation: () => [mockCreateDimension, { isLoading: false }],
  useUpdateProcurementDimensionMutation: () => [mockUpdateDimension, { isLoading: false }],
  useDisableProcurementDimensionMutation: () => [mockDisableDimension, { isLoading: false }],
}));

describe('ProcurementDictionaryAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockResolvedValue(undefined);
    mockGetDimensions.mockReturnValue({
      data: {
        data: [
          {
            id: 'dim-1',
            departmentCode: 'shipping_dept',
            dimensionType: 'vessel',
            dimensionKey: 'su-nan-012',
            dimensionName: '苏南012',
            sortOrder: 1,
            isEnabled: true,
            createdBy: 'admin-1',
            updatedBy: 'admin-1',
            createdAt: '2026-04-18T10:00:00.000+08:00',
            updatedAt: '2026-04-18T10:00:00.000+08:00',
          },
        ],
      },
      isLoading: false,
      refetch: mockRefetch,
    });
    mockCreateDimension.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockUpdateDimension.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockDisableDimension.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('shows forbidden message for non-admin roles', () => {
    mockCurrentUser.mockReturnValue({
      userId: 'business-1',
      roles: ['all_authenticated', 'business'],
    });

    render(<ProcurementDictionaryAdminPage />);

    expect(screen.getByText('无权限访问')).toBeInTheDocument();
  });

  it('allows privileged users to edit dimension metadata', async () => {
    mockCurrentUser.mockReturnValue({
      userId: 'admin-1',
      roles: ['all_authenticated', 'system_admin'],
    });
    const promptSpy = vi
      .spyOn(window, 'prompt')
      .mockReturnValueOnce('苏南012-新')
      .mockReturnValueOnce('2');

    render(<ProcurementDictionaryAdminPage />);

    fireEvent.click(screen.getByRole('button', { name: '编辑' }));

    await waitFor(() => {
      expect(mockUpdateDimension).toHaveBeenCalledWith({
        id: 'dim-1',
        data: {
          dimensionName: '苏南012-新',
          sortOrder: 2,
        },
      });
    });

    expect(promptSpy).toHaveBeenCalled();
  });
});
