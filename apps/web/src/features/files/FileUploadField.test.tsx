import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FileUploadField } from './FileUploadField';

const uploadFile = vi.fn();
const uploadFromWecom = vi.fn();
const previewFile = vi.fn();
const reset = vi.fn();
const refetchPolicy = vi.fn();
const getFileDownloadUrl = vi.fn();
const downloadFileFromUrl = vi.fn();
const filePolicy = {
  category: 'procurement-attachments',
  maxSize: 20 * 1024 * 1024,
  extensions: ['pdf', 'txt', 'csv', 'heic', 'zip', 'rar', 'wps', 'et', 'dps'],
  accept: '.pdf,.txt,.csv,.heic,.zip,.rar,.wps,.et,.dps',
  mimeTypes: { pdf: 'application/pdf', txt: 'text/plain' },
};
type MockUploadState = {
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  file: null;
  error: string | null;
};
let uploadState: MockUploadState = {
  status: 'idle',
  progress: 0,
  file: null,
  error: null,
};

vi.mock('./useFileUpload', () => ({
  useFileUpload: () => ({
    ...uploadState,
    reset,
    uploadFile,
    uploadFromWecom,
    previewFile,
    refetchPolicy,
    getFileDownloadUrl,
    policy: filePolicy,
    isPolicyLoading: false,
    policyError: null,
  }),
}));

vi.mock('./fileDownload', () => ({
  downloadFileFromUrl: (url: string, fileName: string) =>
    downloadFileFromUrl(url, fileName),
}));

describe('FileUploadField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFileDownloadUrl.mockResolvedValue('https://oss.example.com/download');
    uploadState = {
      status: 'idle',
      progress: 0,
      file: null,
      error: null,
    };
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

  it('shows the effective limits before the upload action', () => {
    render(<FileUploadField category="procurement-attachments" />);

    expect(screen.getByText(/支持格式/)).toHaveTextContent('TXT');
    expect(screen.getByText(/单个文件/)).toHaveTextContent('20MB');
    expect(screen.getByTestId('file-input')).toHaveAttribute(
      'accept',
      filePolicy.accept,
    );
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

    expect(await screen.findByTitle('证书.pdf 预览')).toHaveAttribute(
      'src',
      'https://oss.example.com/download',
    );
  });

  it('downloads the current file through the existing signed URL', async () => {
    downloadFileFromUrl.mockResolvedValue(undefined);
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

    fireEvent.click(screen.getByRole('button', { name: /下载文件/ }));

    await waitFor(() => {
      expect(getFileDownloadUrl).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'file-1' }),
      );
      expect(downloadFileFromUrl).toHaveBeenCalledWith(
        'https://oss.example.com/download',
        '证书.pdf',
      );
    });
  });

  it('keeps a retry path after native upload fails', async () => {
    uploadState = {
      status: 'error',
      progress: 0,
      file: null,
      error: '文件直传 OSS 失败，请检查网络后重试。',
    };
    uploadFile.mockResolvedValue(null);

    render(<FileUploadField category="certificates" />);

    const input = screen.getByTestId('file-input') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(['pdf'], '证书.pdf', { type: 'application/pdf' })],
      },
    });

    await waitFor(() => {
      expect(uploadFile).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));

    await waitFor(() => {
      expect(uploadFile).toHaveBeenCalledTimes(2);
    });
  });
});
