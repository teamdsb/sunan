import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { FilePreviewModal } from './FilePreviewModal';

const { mockHeic2Any } = vi.hoisted(() => ({
  mockHeic2Any: vi.fn(),
}));

vi.mock('heic2any', () => ({ default: mockHeic2Any }));

describe('FilePreviewModal', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn().mockReturnValue('blob:preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    mockHeic2Any.mockReset();
    mockHeic2Any.mockResolvedValue(
      new Blob(['jpeg-preview'], { type: 'image/jpeg' }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('第一行\n第二行', {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  it('renders a pdf inside the application instead of opening a new window', async () => {
    const getUrl = vi
      .fn()
      .mockResolvedValue('https://oss.example.com/order.pdf');
    const openSpy = vi.spyOn(window, 'open');

    render(
      <FilePreviewModal
        open
        file={{
          fileName: '采购单.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
        }}
        getUrl={getUrl}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByTitle('采购单.pdf 预览')).toHaveAttribute(
      'src',
      'https://oss.example.com/order.pdf',
    );
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('loads and renders a text attachment as escaped text', async () => {
    render(
      <FilePreviewModal
        open
        file={{ fileName: '说明.txt', mimeType: 'text/plain', fileSize: 20 }}
        getUrl={() => Promise.resolve('https://oss.example.com/readme.txt')}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText(/第一行/)).toHaveTextContent('第二行');
  });

  it('converts a HEIC attachment for in-app image preview', async () => {
    vi.mocked(URL.createObjectURL).mockReturnValue('blob:heic-preview');

    render(
      <FilePreviewModal
        open
        file={{
          fileName: '现场照片.heic',
          mimeType: 'image/heic',
          fileSize: 256,
        }}
        getUrl={() => Promise.resolve('https://oss.example.com/photo.heic')}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByAltText('现场照片.heic')).toHaveAttribute(
      'src',
      'blob:heic-preview',
    );
    expect(mockHeic2Any).toHaveBeenCalledWith(
      expect.objectContaining({ toType: 'image/jpeg', quality: 0.9 }),
    );
  });

  it('renders CSV cells and respects quoted commas', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('名称,说明\n围油栏,"A区,已检查"'),
    );

    render(
      <FilePreviewModal
        open
        file={{ fileName: '清单.csv', mimeType: 'text/csv', fileSize: 40 }}
        getUrl={() => Promise.resolve('https://oss.example.com/list.csv')}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText('围油栏')).toBeInTheDocument();
    expect(screen.getByText('A区,已检查')).toBeInTheDocument();
  });

  it('shows a download fallback for archives', async () => {
    render(
      <FilePreviewModal
        open
        file={{
          fileName: '附件资料.rar',
          mimeType: 'application/vnd.rar',
          fileSize: 2048,
        }}
        getUrl={() => Promise.resolve('https://oss.example.com/archive.rar')}
        onClose={vi.fn()}
      />,
    );

    expect(
      await screen.findByText('此格式暂不支持在线预览，请下载后查看。'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下载原文件' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /关\s*闭/ }));
  });

  it('keeps a download path when preview loading fails', async () => {
    render(
      <FilePreviewModal
        open
        file={{ fileName: '说明.txt', mimeType: 'text/plain', fileSize: 20 }}
        getUrl={() => Promise.reject(new Error('签名失败'))}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/预览加载失败/)).toBeInTheDocument();
    });
  });

  it('shows an error when downloading the original file fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));

    render(
      <FilePreviewModal
        open
        file={{
          fileName: '附件资料.rar',
          mimeType: 'application/vnd.rar',
          fileSize: 2048,
        }}
        getUrl={() => Promise.resolve('https://oss.example.com/archive.rar')}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: '下载原文件' }));

    expect(await screen.findByText('文件下载失败')).toBeInTheDocument();
  });
});
