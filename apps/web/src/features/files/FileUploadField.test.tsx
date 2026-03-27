import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FileUploadField } from './FileUploadField';

const uploadFile = vi.fn();
const uploadFromWecom = vi.fn();
const previewFile = vi.fn();

vi.mock('./useFileUpload', () => ({
  useFileUpload: () => ({
    status: 'idle',
    progress: 0,
    file: null,
    error: null,
    reset: vi.fn(),
    uploadFile,
    uploadFromWecom,
    previewFile,
  }),
}));

describe('FileUploadField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes uploadFile when a file is selected', async () => {
    uploadFile.mockResolvedValue({
      id: 'file-1',
      ossKey: 'certificates/2026/03/file.pdf',
      fileName: '证书.pdf',
      mimeType: 'application/pdf',
      fileSize: 3,
      category: 'certificates',
      downloadUrl: 'https://oss.example.com/download',
      createdAt: '2026-03-01T00:00:00.000Z',
    });

    const onChange = vi.fn();
    render(<FileUploadField category="certificates" onChange={onChange} />);

    const input = screen.getByTestId('file-input') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(['pdf'], '证书.pdf', { type: 'application/pdf' })],
      },
    });

    await waitFor(() => {
      expect(uploadFile).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalled();
    });
  });

  it('invokes wecom upload when capture is enabled', async () => {
    uploadFromWecom.mockResolvedValue({
      id: 'file-2',
      ossKey: 'inspection-photos/2026/03/file.jpg',
      fileName: '照片.jpg',
      mimeType: 'image/jpeg',
      fileSize: 3,
      category: 'inspection-photos',
      downloadUrl: 'https://oss.example.com/download',
      createdAt: '2026-03-01T00:00:00.000Z',
    });

    render(
      <FileUploadField
        category="inspection-photos"
        enableWecomCapture
        wecomReady
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '拍照上传' }));

    await waitFor(() => {
      expect(uploadFromWecom).toHaveBeenCalled();
    });
  });

  it('previews the current file', async () => {
    render(
      <FileUploadField
        category="certificates"
        value={{
          id: 'file-1',
          ossKey: 'certificates/2026/03/file.pdf',
          fileName: '证书.pdf',
          mimeType: 'application/pdf',
          fileSize: 3,
          category: 'certificates',
          downloadUrl: 'https://oss.example.com/download',
          createdAt: '2026-03-01T00:00:00.000Z',
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '预览文件' }));

    await waitFor(() => {
      expect(previewFile).toHaveBeenCalled();
    });
  });
});
