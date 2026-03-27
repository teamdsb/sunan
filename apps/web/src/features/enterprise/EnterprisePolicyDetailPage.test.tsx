import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EnterprisePolicyDetailPage } from './EnterprisePolicyPage';

const mockGetById = vi.fn();
const mockVersions = vi.fn();
const mockUpdate = vi.fn();
const mockBind = vi.fn();

vi.mock('../files/FileUploadField', () => ({
  FileUploadField: (props: { onChange?: (v: unknown) => void }) => (
    <button onClick={() => props.onChange?.({ id: 'f1' })}>upload</button>
  ),
}));

vi.mock('./enterpriseApi', () => ({
  useGetEnterprisePolicyByIdQuery: () => mockGetById(),
  useGetEnterprisePolicyVersionsQuery: () => mockVersions(),
  useUpdateEnterprisePolicyMutation: () => [mockUpdate, { isLoading: false }],
  useBindEnterprisePolicyFilesMutation: () => [mockBind],
}));

describe('EnterprisePolicyDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetById.mockReturnValue({ data: { data: { id: '1', title: 'policy-a', status: 'draft', summary: '', files: [] } }, isLoading: false });
    mockVersions.mockReturnValue({ data: { data: [{ id: 'v1', version: 'v1', status: 'draft' }] } });
    mockUpdate.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockBind.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('supports edit and file bind', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/my/enterprise-policy/1']}>
        <Routes>
          <Route path="/my/enterprise-policy/:id" element={<EnterprisePolicyDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const titleInput = container.querySelector('#title') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'policy-a-updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'upload' }));
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    await waitFor(() => expect(mockBind).toHaveBeenCalled());
    expect(screen.getByText(/v1/)).toBeInTheDocument();
  });
});
