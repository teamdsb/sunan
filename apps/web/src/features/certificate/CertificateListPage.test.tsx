import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { CertificateListPage } from './CertificateListPage';

const mockGet = vi.fn();
const mockGrouped = vi.fn();

vi.mock('./certificateApi', () => ({
  useGetCertificatesQuery: (params: unknown) => mockGet(params),
  useGetGroupedCertificatesQuery: (params: unknown) => mockGrouped(params),
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

    fireEvent.click(screen.getByText('按类型分组'));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent(
        '?page=1&pageSize=10&ownerType=vessel&groupBy=type&status=active&keyword=abc',
      );
    });
  });
});
