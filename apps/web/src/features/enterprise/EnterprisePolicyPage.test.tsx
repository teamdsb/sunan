import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { EnterprisePolicyPage } from './EnterprisePolicyPage';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockPublish = vi.fn();

vi.mock('./enterpriseApi', () => ({
  useGetEnterprisePoliciesQuery: () => mockList(),
  useCreateEnterprisePolicyMutation: () => [mockCreate, { isLoading: false }],
  usePublishEnterprisePolicyMutation: () => [mockPublish],
}));

describe('EnterprisePolicyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockReturnValue({ data: { data: [{ id: '1', title: '制度A', policyCode: 'P-1', version: 'v1', status: 'draft' }], meta: { total: 1 } }, isLoading: false });
    mockCreate.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockPublish.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('renders list and supports create/publish', async () => {
    render(
      <MemoryRouter>
        <EnterprisePolicyPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('制度A')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('制度标题'), { target: { value: '制度B' } });
    fireEvent.change(screen.getByPlaceholderText('制度编码'), { target: { value: 'P-2' } });
    fireEvent.change(screen.getByPlaceholderText('版本'), { target: { value: 'v2' } });
    fireEvent.click(screen.getByRole('button', { name: '新建制度' }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /发\s*布/ }));
    expect(mockPublish).toHaveBeenCalled();
  });
});
