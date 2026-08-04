import { Alert, Button, Modal, Spin, Typography } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { downloadFileFromUrl } from './fileDownload';

const TEXT_PREVIEW_LIMIT = 2 * 1024 * 1024;
const CSV_ROW_LIMIT = 500;
const CSV_COLUMN_LIMIT = 50;

export interface PreviewFileDescriptor {
  fileName: string;
  mimeType: string;
  fileSize: number;
}

interface FilePreviewModalProps {
  open: boolean;
  file: PreviewFileDescriptor | null;
  getUrl: () => Promise<string>;
  onClose: () => void;
}

type PreviewKind = 'pdf' | 'image' | 'heic' | 'text' | 'csv' | 'unsupported';

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

function getPreviewKind(file: PreviewFileDescriptor): PreviewKind {
  const extension = getExtension(file.fileName);
  if (extension === 'pdf' || file.mimeType === 'application/pdf') return 'pdf';
  if (extension === 'heic' || file.mimeType.startsWith('image/heic'))
    return 'heic';
  if (
    ['jpg', 'jpeg', 'png'].includes(extension) ||
    file.mimeType.startsWith('image/')
  ) {
    return 'image';
  }
  if (extension === 'txt' || file.mimeType === 'text/plain') return 'text';
  if (extension === 'csv' || file.mimeType === 'text/csv') return 'csv';
  return 'unsupported';
}

function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return '大小未知';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function decodeText(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('gb18030').decode(buffer);
  }
}

async function readLimitedBuffer(
  response: Response,
  limit: number,
): Promise<{ buffer: ArrayBuffer; truncated: boolean }> {
  if (!response.body) {
    const raw = await response.arrayBuffer();
    return {
      buffer: raw.byteLength > limit ? raw.slice(0, limit) : raw,
      truncated: raw.byteLength > limit,
    };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let truncated = false;

  while (received < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = limit - received;
    if (value.byteLength > remaining) {
      chunks.push(value.slice(0, remaining));
      received += remaining;
      truncated = true;
      break;
    }
    chunks.push(value);
    received += value.byteLength;
  }

  if (received >= limit) {
    const next = await reader.read();
    truncated ||= !next.done;
  }
  await reader.cancel();

  const merged = new Uint8Array(received);
  let offset = 0;
  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return { buffer: merged.buffer, truncated };
}

function parseCsv(content: string): { rows: string[][]; truncated: boolean } {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let truncated = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && nextCharacter === '\n') index += 1;
      row.push(cell);
      if (row.length > CSV_COLUMN_LIMIT) truncated = true;
      rows.push(row.slice(0, CSV_COLUMN_LIMIT));
      row = [];
      cell = '';
      if (rows.length >= CSV_ROW_LIMIT) {
        truncated ||= index < content.length - 1;
        break;
      }
    } else {
      cell += character;
    }
  }

  if (rows.length < CSV_ROW_LIMIT && (cell || row.length)) {
    row.push(cell);
    if (row.length > CSV_COLUMN_LIMIT) truncated = true;
    rows.push(row.slice(0, CSV_COLUMN_LIMIT));
  }

  return { rows, truncated };
}

export function FilePreviewModal({
  open,
  file,
  getUrl,
  onClose,
}: FilePreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState('');
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const getUrlRef = useRef(getUrl);
  const fileName = file?.fileName ?? null;
  const fileSize = file?.fileSize ?? 0;
  const kind = useMemo(
    () => (file ? getPreviewKind(file) : 'unsupported'),
    [file],
  );

  useEffect(() => {
    getUrlRef.current = getUrl;
  }, [getUrl]);

  useEffect(() => {
    if (!open || !fileName) return undefined;

    let cancelled = false;
    let objectUrl: string | null = null;
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    setDownloadError(null);
    setDownloading(false);
    setUrl(null);
    setDisplayUrl(null);
    setTextContent('');
    setCsvRows([]);
    setTruncated(false);

    const load = async () => {
      try {
        const nextUrl = await getUrlRef.current();
        if (cancelled) return;
        setUrl(nextUrl);

        if (kind === 'pdf' || kind === 'image' || kind === 'unsupported') {
          setDisplayUrl(nextUrl);
          return;
        }

        const response = await fetch(nextUrl, {
          headers:
            kind === 'text' || kind === 'csv'
              ? { Range: `bytes=0-${TEXT_PREVIEW_LIMIT - 1}` }
              : undefined,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('预览内容读取失败');

        if (kind === 'heic') {
          const { default: heic2any } = await import('heic2any');
          const converted = await heic2any({
            blob: await response.blob(),
            toType: 'image/jpeg',
            quality: 0.9,
          });
          const blob = Array.isArray(converted) ? converted[0] : converted;
          if (!blob) throw new Error('HEIC 转换失败');
          objectUrl = URL.createObjectURL(blob);
          if (!cancelled) setDisplayUrl(objectUrl);
          return;
        }

        const limitedResponse = await readLimitedBuffer(
          response,
          TEXT_PREVIEW_LIMIT,
        );
        const limited = limitedResponse.buffer;
        const contentRange = response.headers.get('Content-Range');
        const contentLength = Number(
          response.headers.get('Content-Length') ?? '0',
        );
        const isTruncated =
          limitedResponse.truncated ||
          Boolean(
            contentRange && !contentRange.endsWith(`/${limited.byteLength}`),
          ) ||
          contentLength > TEXT_PREVIEW_LIMIT ||
          fileSize > TEXT_PREVIEW_LIMIT;
        const decoded = decodeText(limited).replace(/^\uFEFF/, '');

        if (!cancelled) {
          setTruncated(isTruncated);
          if (kind === 'csv') {
            const parsed = parseCsv(decoded);
            setCsvRows(parsed.rows);
            setTruncated(isTruncated || parsed.truncated);
          } else {
            setTextContent(decoded);
          }
        }
      } catch (loadError) {
        if (
          !cancelled &&
          !(
            loadError instanceof DOMException && loadError.name === 'AbortError'
          )
        ) {
          setError(
            `预览加载失败：${
              loadError instanceof Error ? loadError.message : '请稍后重试'
            }`,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileName, fileSize, kind, open]);

  const handleDownload = async () => {
    if (!url || !file) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadFileFromUrl(url, file.fileName);
    } catch (downloadFailure) {
      setDownloadError(
        downloadFailure instanceof Error
          ? downloadFailure.message
          : '文件下载失败，请稍后重试',
      );
    } finally {
      setDownloading(false);
    }
  };

  const renderContent = () => {
    if (loading) return <Spin aria-label="正在准备预览" />;
    if (error) return <Alert type="error" showIcon message={error} />;
    if (!file) return null;

    if (kind === 'pdf' && displayUrl) {
      return (
        <iframe
          className="file-preview-pdf"
          src={displayUrl}
          title={`${file.fileName} 预览`}
        />
      );
    }

    if ((kind === 'image' || kind === 'heic') && displayUrl) {
      return (
        <div className="file-preview-image-wrap">
          <img src={displayUrl} alt={file.fileName} />
        </div>
      );
    }

    if (kind === 'text') {
      return (
        <>
          {truncated ? (
            <Alert
              type="info"
              showIcon
              message="文件较大，仅展示前 2MB 内容。"
            />
          ) : null}
          <pre className="file-preview-text">{textContent}</pre>
        </>
      );
    }

    if (kind === 'csv') {
      return (
        <>
          {truncated ? (
            <Alert
              type="info"
              showIcon
              message="文件较大，仅展示前 2MB、500 行和 50 列。"
            />
          ) : null}
          <div className="file-preview-csv-wrap">
            <table>
              <tbody>
                {csvRows.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    {row.map((cell, columnIndex) => (
                      <td key={`cell-${rowIndex}-${columnIndex}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    return (
      <div className="file-preview-unsupported">
        <Typography.Title level={4}>{file.fileName}</Typography.Title>
        <Typography.Text type="secondary">
          {getExtension(file.fileName).toUpperCase()} ·{' '}
          {formatFileSize(file.fileSize)}
        </Typography.Text>
        <Typography.Paragraph>
          此格式暂不支持在线预览，请下载后查看。
        </Typography.Paragraph>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      title={file?.fileName ?? '文件预览'}
      onCancel={onClose}
      width={960}
      destroyOnHidden
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        <Button
          key="download"
          type="primary"
          disabled={!url}
          loading={downloading}
          onClick={() => void handleDownload()}
        >
          下载原文件
        </Button>,
      ]}
    >
      <div className="file-preview-meta">
        {file
          ? `${file.mimeType || '未知类型'} · ${formatFileSize(file.fileSize)}`
          : null}
      </div>
      {downloadError ? (
        <Alert type="error" showIcon message={downloadError} />
      ) : null}
      <div className="file-preview-body">{renderContent()}</div>
    </Modal>
  );
}
