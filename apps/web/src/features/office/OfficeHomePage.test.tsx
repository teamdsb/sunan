import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OfficeHomePage } from './OfficeHomePage';

const mockNavigate = vi.fn();
const mockCategories = vi.fn();
const mockEntries = vi.fn();
const mockOpen = vi.fn();
const mockLaunch = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('./officeApi', () => ({
  useGetOfficeCategoriesQuery: () => mockCategories(),
  useGetOfficeEntriesQuery: () => mockEntries(),
  useOpenOfficeEntryMutation: () => [mockOpen, { isLoading: false }],
}));

vi.mock('./launchOfficeEntry', () => ({
  launchOfficeEntry: (...args: unknown[]) => mockLaunch(...args),
}));

describe('OfficeHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCategories.mockReturnValue({
      data: { data: [{ code: 'maritime', name: '海事', sortOrder: 10, isEnabled: true, canManage: true }] },
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
      <MemoryRouter>
        <OfficeHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('海事入口')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '进入治理台' }));
    expect(mockNavigate).toHaveBeenCalledWith('/office/admin');
  });

  it('records open action before launching the target', async () => {
    render(
      <MemoryRouter>
        <OfficeHomePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '打开入口' }));

    await waitFor(() => expect(mockOpen).toHaveBeenCalledWith('office-1'));
    expect(mockLaunch).toHaveBeenCalled();
  });
});
