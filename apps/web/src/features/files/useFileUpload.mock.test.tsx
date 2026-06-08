import { act, renderHook, waitFor } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosPut = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      request: vi.fn(),
      post: vi.fn(),
    })),
    put: axiosPut,
  },
}));

describe('useFileUpload mock mode', () => {
  beforeEach(() => {
    vi.resetModules();
    axiosPut.mockReset();
    vi.stubEnv('VITE_MOCK_MODE', 'true');
  });

  it('returns a mock file record without calling axios.put', async () => {
    const { createStore } = await import('../../app/store');
    const { useFileUpload } = await import('./useFileUpload');
    const wrapper = ({ children }: PropsWithChildren) => (
      <Provider store={createStore()}>{children}</Provider>
    );

    const file = new File(['pdf'], '证书.pdf', {
      type: 'application/pdf',
    });

    const { result } = renderHook(
      () => useFileUpload({ category: 'certificates' }),
      { wrapper },
    );

    await act(async () => {
      const uploaded = await result.current.uploadFile(file);
      expect(uploaded).toMatchObject({
        fileName: '证书.pdf',
        category: 'certificates',
      });
    });

    expect(axiosPut).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.status).toBe('success');
      expect(result.current.file).toMatchObject({
        fileName: '证书.pdf',
        category: 'certificates',
      });
    });
  });

  it('recovers from a failed mock upload and succeeds on retry without axios.put', async () => {
    const { createStore } = await import('../../app/store');
    const wrapper = ({ children }: PropsWithChildren) => (
      <Provider store={createStore()}>{children}</Provider>
    );

    const file = new File(['pdf'], '证书.pdf', {
      type: 'application/pdf',
    });

    const createPresign = vi.fn();
    const createCallback = vi.fn();

    createPresign
      .mockReturnValueOnce({
        unwrap: () => Promise.reject(new Error('presign failed')),
      })
      .mockReturnValueOnce({
        unwrap: () =>
          Promise.resolve({
            data: {
              uploadUrl: 'https://mock-files.local/upload/certificates/2026/03/file-2.pdf',
              ossKey: 'certificates/2026/03/file-2.pdf',
              expiresAt: '2026-03-01T00:15:00.000Z',
              headers: {
                'Content-Type': 'application/pdf',
                'x-oss-meta-original-name': '证书.pdf',
              },
            },
          }),
      });

    createCallback.mockReturnValueOnce({
      unwrap: () =>
        Promise.resolve({
          data: {
            id: 'file-2',
            ossKey: 'certificates/2026/03/file-2.pdf',
            fileName: '证书.pdf',
            mimeType: 'application/pdf',
            fileSize: 3,
            category: 'certificates',
            downloadUrl: 'https://mock-files.local/download/certificates%2F2026%2F03%2Ffile-2.pdf',
            createdAt: '2026-03-01T00:00:00.000Z',
          },
        }),
    });

    vi.doMock('./filesApi', () => ({
      useCreateFilePresignMutation: () => [createPresign],
      useCreateFileCallbackMutation: () => [createCallback],
      useCreateFileFromWecomMutation: () => [vi.fn()],
      useLazyGetFileDownloadUrlQuery: () => [vi.fn()],
    }));

    const { useFileUpload: useMockedFileUpload } = await import('./useFileUpload');
    const { result } = renderHook(
      () => useMockedFileUpload({ category: 'certificates' }),
      { wrapper },
    );

    await act(async () => {
      const failed = await result.current.uploadFile(file);
      expect(failed).toBeNull();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('presign failed');
      expect(result.current.progress).toBe(0);
    });

    await act(async () => {
      const uploaded = await result.current.uploadFile(file);
      expect(uploaded).toMatchObject({
        fileName: '证书.pdf',
        category: 'certificates',
      });
    });

    expect(axiosPut).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.status).toBe('success');
      expect(result.current.file).toMatchObject({
        fileName: '证书.pdf',
        category: 'certificates',
      });
    });
  });

  it('resets progress when mock callback fails after setting optimistic progress', async () => {
    const { createStore } = await import('../../app/store');
    const wrapper = ({ children }: PropsWithChildren) => (
      <Provider store={createStore()}>{children}</Provider>
    );

    const file = new File(['pdf'], '证书.pdf', {
      type: 'application/pdf',
    });

    const createPresign = vi.fn().mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          data: {
            uploadUrl: 'https://mock-files.local/upload/certificates/2026/03/file-3.pdf',
            ossKey: 'certificates/2026/03/file-3.pdf',
            expiresAt: '2026-03-01T00:15:00.000Z',
            headers: {
              'Content-Type': 'application/pdf',
            },
          },
        }),
    });
    const createCallback = vi.fn().mockReturnValue({
      unwrap: () => Promise.reject(new Error('callback failed')),
    });

    vi.doMock('./filesApi', () => ({
      useCreateFilePresignMutation: () => [createPresign],
      useCreateFileCallbackMutation: () => [createCallback],
      useCreateFileFromWecomMutation: () => [vi.fn()],
      useLazyGetFileDownloadUrlQuery: () => [vi.fn()],
    }));

    const { useFileUpload: useMockedFileUpload } = await import('./useFileUpload');
    const { result } = renderHook(
      () => useMockedFileUpload({ category: 'certificates' }),
      { wrapper },
    );

    await act(async () => {
      const uploaded = await result.current.uploadFile(file);
      expect(uploaded).toBeNull();
    });

    expect(axiosPut).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('callback failed');
      expect(result.current.progress).toBe(0);
    });
  });

  it('resets progress when wecom upload fails', async () => {
    const { createStore } = await import('../../app/store');
    const { useFileUpload } = await import('./useFileUpload');
    const wrapper = ({ children }: PropsWithChildren) => (
      <Provider store={createStore()}>{children}</Provider>
    );

    window.wx = {
      config: vi.fn(),
      ready: vi.fn(),
      error: vi.fn(),
      agentConfig: vi.fn(),
      chooseImage: vi.fn(({ success }) => success({ localIds: ['local-1'] })),
      uploadImage: vi.fn(({ fail }) => fail(new Error('wecom upload failed'))),
      invoke: vi.fn(),
      previewFile: vi.fn(),
    };

    const { result } = renderHook(
      () => useFileUpload({ category: 'inspection-photos', wecomReady: true }),
      { wrapper },
    );

    await act(async () => {
      const uploaded = await result.current.uploadFromWecom();
      expect(uploaded).toBeNull();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('wecom upload failed');
      expect(result.current.progress).toBe(0);
    });
  });
});
