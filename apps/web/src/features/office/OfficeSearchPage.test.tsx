import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OfficeSearchPage } from './OfficeSearchPage';

const mockNavigate = vi.fn();
const mockCategories = vi.fn();
const mockEntries = vi.fn();
const mockOpen = vi.fn();
const mockLaunch = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
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

describe('OfficeSearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCategories.mockReturnValue({
      data: {
        data: [
          {
            code: 'maritime',
            name: '海事',
            sortOrder: 10,
            isEnabled: true,
            canManage: true,
          },
        ],
      },
    });
    mockEntries.mockReturnValue({
      data: {
        data: [
          {
            id: 'office-1',
            categoryCode: 'maritime',
            title: '海事申报入口',
            summary: '处理海事相关办事端口。',
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
      unwrap: () =>
        Promise.resolve({
          data: {
            id: 'office-1',
            title: '海事申报入口',
            targetType: 'external_url',
            targetValue: 'https://example.com',
            openMode: 'current_webview',
          },
        }),
    });
  });

  it('opens an entry from the whole result card without redundant action buttons', async () => {
    render(
      <MemoryRouter>
        <OfficeSearchPage />
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole('button', { name: '返回首页' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '打开入口' }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: '海事申报入口' }),
    );

    await waitFor(() => expect(mockOpen).toHaveBeenCalledWith('office-1'));
    expect(mockLaunch).toHaveBeenCalled();
  });

  it('uses URL keyword and category as the search source of truth', () => {
    render(
      <MemoryRouter initialEntries={['/office/search?keyword=海事&categoryCode=maritime']}>
        <OfficeSearchPage />
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText('搜索标题或摘要')).toHaveValue('海事');
    expect(mockEntries).toHaveBeenLastCalledWith({
      keyword: '海事',
      categoryCode: 'maritime',
    });
  });
});
