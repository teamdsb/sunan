import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EnterpriseProfileDetailPage } from './EnterpriseProfileDetailPage';

const mockGetById = vi.fn();
const mockUpdate = vi.fn();
const mockBind = vi.fn();

vi.mock('../files/FileUploadField', () => ({
  FileUploadField: (props: { onChange?: (v: unknown) => void }) => (
    <button onClick={() => props.onChange?.({ id: 'f1' })}>upload</button>
  ),
}));

vi.mock('./enterpriseApi', () => ({
  useGetEnterpriseProfileByIdQuery: () => mockGetById(),
  useUpdateEnterpriseProfileMutation: () => [mockUpdate, { isLoading: false }],
  useBindEnterpriseProfileFilesMutation: () => [mockBind],
}));

describe('EnterpriseProfileDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetById.mockReturnValue({
      data: { data: { id: '1', title: 'profile-a', category: 'license', status: 'draft', description: '', files: [] } },
      isLoading: false,
    });
    mockUpdate.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockBind.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('supports edit and bind files', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/my/enterprise-profile/1']}>
        <Routes>
          <Route path="/my/enterprise-profile/:id" element={<EnterpriseProfileDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const titleInput = container.querySelector('#title') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'profile-a-updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'upload' }));
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    await waitFor(() => expect(mockBind).toHaveBeenCalled());
  });
});
