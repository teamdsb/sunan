import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import {
  EnterprisePolicyDetailPage,
  EnterprisePolicyPage,
} from './EnterprisePolicyPage';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockPublish = vi.fn();
const mockDelete = vi.fn();
const mockCurrentUser = vi.fn();
const mockPolicyDetail = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../../app/hooks', () => ({
  useAppSelector: (
    selector: (state: {
      auth: { currentUser: { userId: string; roles: string[] } | null };
    }) => unknown,
  ) => selector({ auth: { currentUser: mockCurrentUser() } }),
}));

vi.mock('../files/FileUploadField', () => ({
  FileUploadField: (props: { onChange?: (v: unknown) => void }) => (
    <button onClick={() => props.onChange?.({ id: 'f3' })}>upload</button>
  ),
}));

vi.mock('./enterpriseApi', () => ({
  useGetEnterprisePoliciesQuery: (params: unknown) => mockList(params),
  useCreateEnterprisePolicyMutation: () => [mockCreate, { isLoading: false }],
  usePublishEnterprisePolicyMutation: () => [mockPublish],
  useDeleteEnterprisePolicyMutation: () => [mockDelete],
  useGetEnterprisePolicyByIdQuery: () => mockPolicyDetail(),
  useGetEnterprisePolicyVersionsQuery: () => ({
    data: { data: [] },
    isLoading: false,
  }),
  useUpdateEnterprisePolicyMutation: () => [mockUpdate, { isLoading: false }],
  useBindEnterprisePolicyFilesMutation: () => [vi.fn()],
  useUnbindEnterprisePolicyFileMutation: () => [vi.fn()],
  useLazyGetEnterprisePolicyFileDownloadUrlQuery: () => [vi.fn()],
}));

function LocationDisplay() {
  const location = useLocation();
  return (
    <>
      <div data-testid="location-search">{location.search}</div>
      <div data-testid="location-path">{location.pathname}{location.search}</div>
    </>
  );
}

describe('EnterprisePolicyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPolicyDetail.mockReturnValue({ data: { data: { id: '1', title: '制度A', policyCode: 'P-1', version: 'v1', summary: '制度正文摘要', status: 'draft', publishedAt: null, files: [], canManage: true } }, isLoading: false });
    mockUpdate.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockList.mockReturnValue({
      data: {
        data: [
          {
            id: '1',
            title: '制度A',
            policyCode: 'P-1',
            version: 'v1',
            status: 'draft',
            canManage: true,
          },
        ],
        meta: { total: 1 },
      },
      isLoading: false,
    });
    mockCreate.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockPublish.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockCurrentUser.mockReturnValue({
      userId: 'manager-1',
      roles: ['all_authenticated', 'finance'],
    });
  });

  it('shows the title and summary to a reader without an edit form', () => {
    const response = mockPolicyDetail();
    mockPolicyDetail.mockReturnValue({ ...response, data: { data: { ...response.data.data, canManage: false } } });
    render(<MemoryRouter initialEntries={['/my/enterprise-policy/1']}><Routes><Route path="/my/enterprise-policy/:id" element={<EnterprisePolicyDetailPage />} /></Routes></MemoryRouter>);

    expect(screen.getByText('制度A')).toBeInTheDocument();
    expect(screen.getByText('制度正文摘要')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'upload' })).not.toBeInTheDocument();
  });

  it.each(['published', 'deprecated'])('keeps a %s published version and its attachments read-only', (status) => {
    const response = mockPolicyDetail();
    mockPolicyDetail.mockReturnValue({ ...response, data: { data: { ...response.data.data, status, publishedAt: '2026-11-17T02:30:00.000Z', files: [{ id: 'f1', fileName: '发布版.pdf', mimeType: 'application/pdf', fileSize: 1024 }] } } });
    render(<MemoryRouter initialEntries={['/my/enterprise-policy/1']}><Routes><Route path="/my/enterprise-policy/:id" element={<EnterprisePolicyDetailPage />} /></Routes></MemoryRouter>);

    expect(screen.getByText('制度正文摘要')).toBeInTheDocument();
    expect(screen.queryByLabelText('制度标题')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'upload' })).not.toBeInTheDocument();
    const attachment = screen.getByText('发布版.pdf').closest('.ant-list-item') as HTMLElement;
    expect(within(attachment).queryByRole('button', { name: /删\s*除/ })).not.toBeInTheDocument();
  });

  it('deprecates a published version without resubmitting its content', async () => {
    const response = mockPolicyDetail();
    mockPolicyDetail.mockReturnValue({ ...response, data: { data: { ...response.data.data, status: 'published', publishedAt: '2026-11-17T02:30:00.000Z' } } });
    render(<MemoryRouter initialEntries={['/my/enterprise-policy/1']}><Routes><Route path="/my/enterprise-policy/:id" element={<EnterprisePolicyDetailPage />} /></Routes></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: '废弃此版本' }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ id: '1', data: { status: 'deprecated' } }));
  });

  it('saves an uploaded attachment in the same update as the draft content', async () => {
    render(<MemoryRouter initialEntries={['/my/enterprise-policy/1']}><Routes><Route path="/my/enterprise-policy/:id" element={<EnterprisePolicyDetailPage />} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'upload' }));
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ id: '1', data: expect.objectContaining({ fileIds: ['f3'] }) }));
  });

  it('keeps keyword drafting local until search is committed', async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={[
          '/my/enterprise-policy?page=1&pageSize=10&status=published&keyword=foo',
        ]}
      >
        <EnterprisePolicyPage />
        <LocationDisplay />
      </MemoryRouter>,
    );

    expect(screen.getByText('制度A')).toBeInTheDocument();
    expect(mockList).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 10,
        status: 'published',
        keyword: 'foo',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /展开筛选/ }));
    const searchInput = screen.getByPlaceholderText('关键字');
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'bar');

    expect(screen.getByTestId('location-search')).toHaveTextContent(
      '?page=1&pageSize=10&status=published&keyword=foo',
    );

    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent(
        '?page=1&pageSize=10&status=published&keyword=bar',
      );
    });

    expect(screen.getByRole('link', { name: '详情' })).toHaveAttribute(
      'href',
      '/my/enterprise-policy/1?backTo=%2Fmy%2Fenterprise-policy%3Fpage%3D1%26pageSize%3D10%26status%3Dpublished%26keyword%3Dbar',
    );
  });

  it('returns from detail to the filtered policy list', () => {
    const response = mockPolicyDetail();
    mockPolicyDetail.mockReturnValue({ ...response, data: { data: { ...response.data.data, publishedAt: '2026-08-12T09:30:00.000+08:00' } } });
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={[
          '/my/enterprise-policy/1?backTo=%2Fmy%2Fenterprise-policy%3Fpage%3D1%26pageSize%3D10%26status%3Dpublished%26keyword%3Dbar',
        ]}
      >
        <Routes>
          <Route
            path="/my/enterprise-policy/:id"
            element={<EnterprisePolicyDetailPage />}
          />
          <Route path="/my/enterprise-policy" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('2026-08-12 09:30')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /返回制度列表/ }));
    expect(screen.getByTestId('location-path')).toHaveTextContent(
      '/my/enterprise-policy?page=1&pageSize=10&status=published&keyword=bar',
    );
  });

  it('uses a vertical creation form for narrow screens', () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <EnterprisePolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('enterprise-policy-create-form')).not.toHaveClass(
      'ant-form-inline',
    );
  });
});
