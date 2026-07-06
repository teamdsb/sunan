import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

import { createStore } from '../../app/store';
import { useFileUpload } from './useFileUpload';

const createPresign = vi.fn();
const createCallback = vi.fn();
const createFromWecom = vi.fn();
const getDownloadUrl = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      request: vi.fn(),
      post: vi.fn(),
    })),
    put: vi.fn(),
    isAxiosError: (error: unknown) => Boolean((error as { isAxiosError?: boolean }).isAxiosError),
  },
}));

vi.mock('./filesApi', () => ({
  useCreateFilePresignMutation: () => [createPresign],
  useCreateFileCallbackMutation: () => [createCallback],
  useCreateFileFromWecomMutation: () => [createFromWecom],
  useLazyGetFileDownloadUrlQuery: () => [getDownloadUrl],
}));

function wrapper({ children }: PropsWithChildren) {
  return <Provider store={createStore()}>{children}</Provider>;
}

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads a regular file through presign -> put -> callback', async () => {
    const file = new File(['pdf'], '证书.pdf', {
      type: 'application/pdf',
    });

    createPresign.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          data: {
            uploadUrl: 'https://oss.example.com/upload',
            ossKey: 'certificates/2026/03/file.pdf',
            expiresAt: '2026-03-01T00:00:00.000Z',
            headers: { 'Content-Type': 'application/pdf' },
          },
        }),
    });
    vi.mocked(axios.put).mockResolvedValue({});
    createCallback.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          data: {
            id: 'file-1',
            ossKey: 'certificates/2026/03/file.pdf',
            fileName: '证书.pdf',
            mimeType: 'application/pdf',
            fileSize: 3,
            category: 'certificates',
            downloadUrl: 'https://oss.example.com/download',
            createdAt: '2026-03-01T00:00:00.000Z',
          },
        }),
    });

    const { result } = renderHook(
      () => useFileUpload({ category: 'certificates' }),
      { wrapper },
    );

    await act(async () => {
      const uploaded = await result.current.uploadFile(file);
      expect(uploaded?.fileName).toBe('证书.pdf');
    });

    expect(createPresign).toHaveBeenCalled();
    expect(axios.put).toHaveBeenCalled();
    expect(createCallback).toHaveBeenCalled();
  });

  it('maps OSS put failures to a retryable business message', async () => {
    const file = new File(['pdf'], '证书.pdf', {
      type: 'application/pdf',
    });

    createPresign.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          data: {
            uploadUrl: 'https://oss.example.com/upload',
            ossKey: 'certificates/2026/03/file.pdf',
            expiresAt: '2026-03-01T00:00:00.000Z',
            headers: { 'Content-Type': 'application/pdf' },
          },
        }),
    });
    vi.mocked(axios.put).mockRejectedValue({
      isAxiosError: true,
      response: { status: 403 },
    });

    const { result } = renderHook(
      () => useFileUpload({ category: 'certificates' }),
      { wrapper },
    );

    await act(async () => {
      const uploaded = await result.current.uploadFile(file);
      expect(uploaded).toBeNull();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('文件直传 OSS 被拒绝，请重新选择文件后重试。');
    });
  });

  it('uploads through wecom media relay when sdk is ready', async () => {
    window.wx = {
      config: vi.fn(),
      ready: vi.fn(),
      error: vi.fn(),
      agentConfig: vi.fn(),
      chooseImage: vi.fn(({ success }) => success({ localIds: ['local-1'] })),
      uploadImage: vi.fn(({ success }) => success({ serverId: 'media-1' })),
      invoke: vi.fn(),
      previewFile: vi.fn(),
    };

    createFromWecom.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          data: {
            id: 'file-2',
            ossKey: 'inspection-photos/2026/03/file.jpg',
            fileName: 'wecom-media-1.jpg',
            mimeType: 'image/jpeg',
            fileSize: 4,
            category: 'inspection-photos',
            downloadUrl: 'https://oss.example.com/download',
            createdAt: '2026-03-01T00:00:00.000Z',
          },
        }),
    });

    const { result } = renderHook(
      () => useFileUpload({ category: 'inspection-photos', wecomReady: true }),
      { wrapper },
    );

    await act(async () => {
      const uploaded = await result.current.uploadFromWecom();
      expect(uploaded?.mimeType).toBe('image/jpeg');
    });

    expect(window.wx.chooseImage).toHaveBeenCalled();
    expect(window.wx.uploadImage).toHaveBeenCalled();
    expect(createFromWecom).toHaveBeenCalledWith({
      mediaId: 'media-1',
      category: 'inspection-photos',
    });
  });

  it('previews a file with a presigned download url', async () => {
    window.wx = {
      config: vi.fn(),
      ready: vi.fn(),
      error: vi.fn(),
      agentConfig: vi.fn(),
      chooseImage: vi.fn(),
      uploadImage: vi.fn(),
      invoke: vi.fn(),
      previewFile: vi.fn(),
    };

    getDownloadUrl.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          data: {
            downloadUrl: 'https://oss.example.com/download',
            expiresAt: '2026-03-01T00:00:00.000Z',
          },
        }),
    });

    const { result } = renderHook(
      () => useFileUpload({ category: 'certificates' }),
      { wrapper },
    );

    await act(async () => {
      await result.current.previewFile({
        id: 'file-1',
        ossKey: 'certificates/2026/03/file.pdf',
        fileName: '证书.pdf',
        mimeType: 'application/pdf',
        fileSize: 3,
        category: 'certificates',
        downloadUrl: '',
        createdAt: '2026-03-01T00:00:00.000Z',
      });
    });

    await waitFor(() => {
      expect(window.wx.previewFile).toHaveBeenCalledWith({
        url: 'https://oss.example.com/download',
        name: '证书.pdf',
      });
    });
  });
});
