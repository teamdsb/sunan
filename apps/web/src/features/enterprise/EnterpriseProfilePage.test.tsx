import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { EnterpriseProfilePage } from './EnterpriseProfilePage';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockDelete = vi.fn();

vi.mock('./enterpriseApi', () => ({
  useGetEnterpriseProfilesQuery: (params: unknown) => mockList(params),
  useCreateEnterpriseProfileMutation: () => [mockCreate, { isLoading: false }],
  useDeleteEnterpriseProfileMutation: () => [mockDelete],
}));

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

describe('EnterpriseProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockReturnValue({
      data: {
        data: [{ id: '1', title: 'profile-a', category: 'license', status: 'draft', files: [] }],
        meta: { total: 20 },
      },
      isLoading: false,
    });
    mockCreate.mockReturnValue({ unwrap: () => Promise.resolve({ data: { id: '2' } }) });
    mockDelete.mockReturnValue({ unwrap: () => Promise.resolve() });
  });

  it('syncs the list query to the URL and preserves it in detail links', async () => {
    render(
      <MemoryRouter initialEntries={['/my/enterprise-profile?page=1&pageSize=10&category=license&status=draft']}>
        <EnterpriseProfilePage />
        <LocationDisplay />
      </MemoryRouter>,
    );

    expect(screen.getByText('profile-a')).toBeInTheDocument();
    expect(mockList).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 10,
        category: 'license',
        status: 'draft',
      }),
    );
    expect(screen.getByRole('link', { name: '详情' })).toHaveAttribute(
      'href',
      '/my/enterprise-profile/1?backTo=%2Fmy%2Fenterprise-profile%3Fpage%3D1%26pageSize%3D10%26category%3Dlicense%26status%3Ddraft',
    );

    fireEvent.click(screen.getByTitle('2'));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent(
        '?page=2&pageSize=10&category=license&status=draft',
      );
    });
  });
});
