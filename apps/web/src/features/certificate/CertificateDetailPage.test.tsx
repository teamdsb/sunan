import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CertificateDetailPage } from './CertificateDetailPage';

const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockBind = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../files/FileUploadField', () => ({
  FileUploadField: (props: { onChange?: (v: unknown) => void }) => (
    <button onClick={() => props.onChange?.({ id: 'f2' })}>upload</button>
  ),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('./certificateApi', () => ({
  useGetCertificateByIdQuery: () => mockGet(),
  useUpdateCertificateMutation: () => [mockUpdate, { isLoading: false }],
  useBindCertificateFilesMutation: () => [mockBind],
}));

describe('CertificateDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue({
      data: { data: { id: 'c1', title: 'certificate-a', ownerName: 'vessel-012', expiryDate: '2027-12-31', status: 'active', files: [{ id: 'f1', fileName: 'doc.pdf' }] } },
      isLoading: false,
    });
    mockUpdate.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockBind.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('replaces history when returning to the certificate list', () => {
    render(
      <MemoryRouter
        initialEntries={[
          '/my/certificates/c1?backTo=%2Fmy%2Fcertificates%3Fpage%3D2%26pageSize%3D20%26ownerType%3Dvessel%26groupBy%3Downer%26status%3Dactive%26keyword%3Dabc',
        ]}
      >
        <Routes>
          <Route path="/my/certificates/:id" element={<CertificateDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '返回列表' }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/my/certificates?page=2&pageSize=20&ownerType=vessel&groupBy=owner&status=active&keyword=abc',
      { replace: true },
    );
  });

  it('renders detail, edit and bind file', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/my/certificates/c1?backTo=%2Fmy%2Fcertificates%3Fpage%3D2%26pageSize%3D20%26ownerType%3Dvessel%26groupBy%3Downer%26status%3Dactive%26keyword%3Dabc']}>
        <Routes>
          <Route path="/my/certificates/:id" element={<CertificateDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const titleInput = container.querySelector('#title') as HTMLInputElement;
    expect(titleInput.value).toBe('certificate-a');
    expect(screen.getByText('doc.pdf')).toBeInTheDocument();

    fireEvent.change(titleInput, { target: { value: 'certificate-a-updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'upload' }));
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    await waitFor(() => expect(mockBind).toHaveBeenCalled());
  });
});
