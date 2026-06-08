import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OfficeAdminPage } from './OfficeAdminPage';

const mockCategories = vi.fn();
const mockEntries = vi.fn();
const mockAudits = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockPublish = vi.fn();
const mockDisable = vi.fn();

vi.mock('./officeApi', () => ({
  useGetOfficeCategoriesQuery: () => mockCategories(),
  useGetOfficeAdminEntriesQuery: () => mockEntries(),
  useGetOfficeAdminAuditsQuery: () => mockAudits(),
  useCreateOfficeEntryMutation: () => [mockCreate, { isLoading: false }],
  useUpdateOfficeEntryMutation: () => [mockUpdate, { isLoading: false }],
  usePublishOfficeEntryMutation: () => [mockPublish, { isLoading: false }],
  useDisableOfficeEntryMutation: () => [mockDisable, { isLoading: false }],
}));

describe('OfficeAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCategories.mockReturnValue({
      data: {
        data: [
          { code: 'maritime', name: '海事', sortOrder: 10, isEnabled: true, canManage: true },
          { code: 'customs', name: '海关', sortOrder: 20, isEnabled: true, canManage: false },
        ],
      },
    });
    mockEntries.mockReturnValue({
      data: {
        data: [
          {
            id: 'office-1',
            categoryCode: 'maritime',
            title: '海事入口',
            summary: '说明',
            iconType: 'maritime',
            targetType: 'external_url',
            targetValue: 'https://example.com',
            openMode: 'current_webview',
            visibilityRoles: ['all_authenticated'],
            managerRoles: ['shipping'],
            sortOrder: 10,
            status: 'draft',
            canManage: true,
            createdBy: 'u1',
            updatedBy: 'u1',
            createdAt: '2026-04-01T08:00:00.000Z',
            updatedAt: '2026-04-01T08:00:00.000Z',
          },
        ],
      },
      isLoading: false,
    });
    mockAudits.mockReturnValue({
      data: {
        data: [
          {
            id: 'audit-1',
            entryId: 'office-1',
            entryTitle: '海事入口',
            categoryCode: 'maritime',
            action: 'publish',
            operatorUserId: 'u1',
            payloadSnapshot: {},
            createdAt: '2026-04-01T08:00:00.000Z',
          },
        ],
        meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      },
      isLoading: false,
    });
    mockCreate.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockUpdate.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockPublish.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockDisable.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('renders manageable entries and opens the create drawer', async () => {
    render(<OfficeAdminPage />);

    expect(screen.getAllByText('海事入口').length).toBeGreaterThan(0);
    expect(screen.getByText('最近审计记录')).toBeInTheDocument();
    expect(screen.getByText('发布')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /新增入口/ }));

    await waitFor(() => expect(screen.getByText('新增办事入口')).toBeInTheDocument());
  });

  it('publishes and disables entries', async () => {
    render(<OfficeAdminPage />);
    fireEvent.click(screen.getByRole('button', { name: /发 布/ }));
    fireEvent.click(screen.getByRole('button', { name: /停 用/ }));
    await waitFor(() => expect(mockPublish).toHaveBeenCalledWith('office-1'));
    await waitFor(() => expect(mockDisable).toHaveBeenCalledWith('office-1'));
  });
});
