import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OfficeHomePage } from './OfficeHomePage';

const mockNavigate = vi.fn();
const mockCategories = vi.fn();
const mockEntries = vi.fn();
const mockOpen = vi.fn();
const mockLaunch = vi.fn();

const officeCategories = [
  { code: 'maritime', name: '海事', sortOrder: 10, isEnabled: true, canManage: true },
  { code: 'customs', name: '海关', sortOrder: 20, isEnabled: true, canManage: false },
  { code: 'border_inspection', name: '边检', sortOrder: 30, isEnabled: true, canManage: false },
  { code: 'vessel_inspection', name: '船检', sortOrder: 40, isEnabled: true, canManage: false },
  { code: 'environment', name: '环保', sortOrder: 50, isEnabled: true, canManage: false },
  { code: 'other', name: '其他', sortOrder: 60, isEnabled: true, canManage: false },
  { code: 'petrochemical_park', name: '石化园区', sortOrder: 70, isEnabled: true, canManage: false },
];

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('./officeApi', () => ({
  useGetOfficeCategoriesQuery: () => mockCategories(),
  useGetOfficeEntriesQuery: (params: unknown) => mockEntries(params),
  useOpenOfficeEntryMutation: () => [mockOpen, { isLoading: false }],
}));

vi.mock('./launchOfficeEntry', () => ({
  launchOfficeEntry: (...args: unknown[]) => mockLaunch(...args),
}));

describe('OfficeHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCategories.mockReturnValue({
      data: { data: officeCategories },
    });
    mockEntries.mockReturnValue({
      data: {
        data: [
          {
            id: 'office-1',
            categoryCode: 'maritime',
            title: '海事入口',
            summary: '海事办理说明',
            iconType: 'maritime',
            targetType: 'external_url',
            targetValue: 'https://example.com',
            openMode: 'current_webview',
            visibilityRoles: ['all_authenticated'],
            managerRoles: ['shipping'],
            sortOrder: 10,
            status: 'published',
          },
        ],
      },
      isLoading: false,
    });
    mockOpen.mockReturnValue({
      unwrap: () => Promise.resolve({
        data: {
          id: 'office-1',
          title: '海事入口',
          targetType: 'external_url',
          targetValue: 'https://example.com',
          openMode: 'current_webview',
        },
      }),
    });
  });

  it('renders entries and opens the admin page for managers', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OfficeHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('海事入口')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '进入治理台' }));
    expect(mockNavigate).toHaveBeenCalledWith('/office/admin');
  });

  it('records open action before launching the target', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OfficeHomePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '打开入口' }));

    await waitFor(() => expect(mockOpen).toHaveBeenCalledWith('office-1'));
    expect(mockLaunch).toHaveBeenCalled();
  });

  it('restores category and keyword from the URL', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/office?categoryCode=customs&keyword=港口']}>
        <OfficeHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText('搜索办事入口、表单或审批事项')).toHaveValue('港口');
    expect(mockEntries).toHaveBeenLastCalledWith({ categoryCode: 'customs' });
  });

  it('renders all office categories and keeps category switches in the URL state', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OfficeHomePage />
      </MemoryRouter>,
    );

    const categoryFilter = screen.getByRole('radiogroup', { name: 'segmented control' });
    ['全部', '海事', '海关', '边检', '船检', '环保', '其他', '石化园区'].forEach((label) => {
      expect(within(categoryFilter).getByText(label)).toBeInTheDocument();
    });

    fireEvent.click(within(categoryFilter).getByText('海关'));

    await waitFor(() => expect(mockEntries).toHaveBeenLastCalledWith({ categoryCode: 'customs' }));
  });
});
