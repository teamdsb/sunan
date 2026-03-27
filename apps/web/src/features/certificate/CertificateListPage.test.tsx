import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CertificateListPage } from './CertificateListPage';

const mockGet = vi.fn();
const mockGrouped = vi.fn();
vi.mock('./certificateApi', () => ({
  useGetCertificatesQuery: () => mockGet(),
  useGetGroupedCertificatesQuery: () => mockGrouped(),
}));

describe('CertificateListPage', () => {
  beforeEach(() => {
    mockGet.mockReturnValue({
      data: { data: [{ id: 'c1', title: '国籍证书', ownerName: '苏南012', expiryDate: '2027-12-31', status: 'active' }], meta: { total: 1 } },
      isLoading: false,
    });
    mockGrouped.mockReturnValue({ data: { data: [{ groupKey: 'vessel:1', groupLabel: '船舶-苏南012', count: 1 }] } });
  });

  it('renders tab, grouped summary and list', () => {
    render(
      <MemoryRouter>
        <CertificateListPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('国籍证书')).toBeInTheDocument();
    expect(screen.getByText(/当前分组总数/)).toBeInTheDocument();
  });
});
