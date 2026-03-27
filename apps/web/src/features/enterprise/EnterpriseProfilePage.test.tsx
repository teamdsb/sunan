import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { EnterpriseProfilePage } from './EnterpriseProfilePage';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockDelete = vi.fn();

vi.mock('./enterpriseApi', () => ({
  useGetEnterpriseProfilesQuery: (params: unknown) => mockList(params),
  useCreateEnterpriseProfileMutation: () => [mockCreate, { isLoading: false }],
  useDeleteEnterpriseProfileMutation: () => [mockDelete],
}));

describe('EnterpriseProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockReturnValue({ data: { data: [{ id: '1', title: 'profile-a', category: 'license', status: 'draft', files: [] }], meta: { total: 1 } }, isLoading: false });
    mockCreate.mockReturnValue({ unwrap: () => Promise.resolve({ data: { id: '2' } }) });
    mockDelete.mockReturnValue({ unwrap: () => Promise.resolve() });
  });

  it('renders list and detail link', async () => {
    render(
      <MemoryRouter>
        <EnterpriseProfilePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('profile-a')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '详情' })).toHaveAttribute('href', '/my/enterprise-profile/1');
  });
});
