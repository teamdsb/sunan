import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { EnterprisePolicyPage } from './EnterprisePolicyPage';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockPublish = vi.fn();

vi.mock('./enterpriseApi', () => ({
  useGetEnterprisePoliciesQuery: (params: unknown) => mockList(params),
  useCreateEnterprisePolicyMutation: () => [mockCreate, { isLoading: false }],
  usePublishEnterprisePolicyMutation: () => [mockPublish],
}));

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

describe('EnterprisePolicyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockReturnValue({
      data: {
        data: [{ id: '1', title: '制度A', policyCode: 'P-1', version: 'v1', status: 'draft' }],
        meta: { total: 1 },
      },
      isLoading: false,
    });
    mockCreate.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockPublish.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('keeps keyword drafting local until search is committed', async () => {
    render(
      <MemoryRouter initialEntries={['/my/enterprise-policy?page=1&pageSize=10&status=published&keyword=foo']}>
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
});
