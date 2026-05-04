import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { CertificateListPage } from './CertificateListPage';

const mockGet = vi.fn();
const mockGrouped = vi.fn();
const mockSettings = vi.fn();

vi.mock('./certificateApi', () => ({
  useGetCertificatesQuery: (params: unknown) => mockGet(params),
  useGetGroupedCertificatesQuery: (params: unknown) => mockGrouped(params),
}));

vi.mock('../settings/settingsApi', () => ({
  useGetSettingsQuery: () => mockSettings(),
}));

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

describe('CertificateListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue({
      data: {
        data: [{ id: 'c1', title: '国籍证书', ownerName: '苏南012', expiryDate: '2027-12-31', status: 'active' }],
        meta: { total: 20 },
      },
      isLoading: false,
    });
    mockGrouped.mockReturnValue({ data: { data: [{ groupKey: 'vessel:1', groupLabel: '船舶-苏南012', count: 1 }] } });
    mockSettings.mockReturnValue({
      data: { data: { reminderViewMode: 'dashboard', certificateGroupBy: 'owner', enablePushNotifications: true } },
      isLoading: false,
    });
  });

  it('syncs the route query to list filters and preserves it in detail links', async () => {
    render(
      <MemoryRouter initialEntries={['/my/certificates?page=1&pageSize=10&ownerType=vessel&groupBy=owner&status=active&keyword=abc']}>
        <CertificateListPage />
        <LocationDisplay />
      </MemoryRouter>,
    );

    expect(screen.getByText('国籍证书')).toBeInTheDocument();
    expect(mockGet).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 10,
        ownerType: 'vessel',
        status: 'active',
        keyword: 'abc',
      }),
    );
    expect(mockGrouped).toHaveBeenLastCalledWith(expect.objectContaining({ groupBy: 'owner' }));
    expect(screen.getByRole('link', { name: '国籍证书' })).toHaveAttribute(
      'href',
      '/my/certificates/c1?backTo=%2Fmy%2Fcertificates%3Fpage%3D1%26pageSize%3D10%26ownerType%3Dvessel%26groupBy%3Downer%26status%3Dactive%26keyword%3Dabc',
    );

    fireEvent.click(screen.getByRole('button', { name: /展开筛选/ }));
    fireEvent.click(screen.getByText('按类型分组'));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent(
        '?page=1&pageSize=10&ownerType=vessel&groupBy=type&status=active&keyword=abc',
      );
    });
  });

  it('updates the route query when the keyword search is edited through the UI', async () => {
    render(
      <MemoryRouter initialEntries={['/my/certificates?page=1&pageSize=10&ownerType=vessel&groupBy=owner&status=active&keyword=abc']}>
        <CertificateListPage />
        <LocationDisplay />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /展开筛选/ }));
    const keywordInput = screen.getByPlaceholderText('关键字');
    fireEvent.change(keywordInput, { target: { value: '海事' } });
    fireEvent.click(screen.getByRole('button', { name: 'search' }));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent(
        '?page=1&pageSize=10&ownerType=vessel&groupBy=owner&status=active&keyword=%E6%B5%B7%E4%BA%8B',
      );
    });

    expect(mockGet).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ownerType: 'vessel',
        status: 'active',
        keyword: '海事',
        page: 1,
        pageSize: 10,
      }),
    );
  });

  it('uses the certificate groupBy setting when the URL omits groupBy', () => {
    mockSettings.mockReturnValue({
      data: { data: { reminderViewMode: 'dashboard', certificateGroupBy: 'type', enablePushNotifications: true } },
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/my/certificates?page=1&pageSize=10&ownerType=vessel&status=active&keyword=abc']}>
        <CertificateListPage />
      </MemoryRouter>,
    );

    expect(mockGrouped).toHaveBeenLastCalledWith(expect.objectContaining({ groupBy: 'type' }));
    expect(screen.getByRole('link', { name: '国籍证书' })).toHaveAttribute(
      'href',
      '/my/certificates/c1?backTo=%2Fmy%2Fcertificates%3Fpage%3D1%26pageSize%3D10%26ownerType%3Dvessel%26status%3Dactive%26keyword%3Dabc',
    );
  });

  it('restores the certificate list scroll position when returning with the same query', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    window.sessionStorage.setItem(
      'certificate-list-scroll:?page=2&pageSize=20&ownerType=vessel&groupBy=owner&status=active&keyword=abc',
      '240',
    );

    render(
      <MemoryRouter initialEntries={['/my/certificates?page=2&pageSize=20&ownerType=vessel&groupBy=owner&status=active&keyword=abc']}>
        <CertificateListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith(0, 240);
    });
  });

  it('hides advanced filters behind an expandable panel by default', () => {
    render(
      <MemoryRouter initialEntries={['/my/certificates?page=1&pageSize=10&ownerType=vessel&groupBy=owner']}>
        <CertificateListPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /展开筛选/ })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('状态')).not.toBeInTheDocument();
  });
});
