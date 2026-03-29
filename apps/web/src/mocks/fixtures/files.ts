import type { FileRecord } from '../../features/files/types';

const BASE_TIMESTAMP = Date.parse('2026-03-01T00:00:00.000Z');

export interface FilesMockState {
  files: FileRecord[];
  nextFileId: number;
  nextUploadSequence: number;
}

export interface FileRecordSeed {
  id: string;
  ossKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  category: string;
  createdAt?: string;
}

function timestamp(offsetMinutes: number): string {
  return new Date(BASE_TIMESTAMP + offsetMinutes * 60_000).toISOString();
}

export function buildFileDownloadUrl(ossKey: string): string {
  return `https://mock-files.local/download/${encodeURIComponent(ossKey)}`;
}

export function buildFileUploadUrl(ossKey: string): string {
  return `https://mock-files.local/upload/${encodeURIComponent(ossKey)}`;
}

export function inferFileExtension(
  fileName: string,
  mimeType: string,
): string {
  const trimmedName = fileName.trim();
  const dotIndex = trimmedName.lastIndexOf('.');

  if (dotIndex > -1 && dotIndex < trimmedName.length - 1) {
    return trimmedName.slice(dotIndex + 1).toLowerCase();
  }

  const mimeExtensionMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };

  return mimeExtensionMap[mimeType] ?? 'bin';
}

export function buildFileOssKey(
  category: string,
  sequence: number,
  fileName: string,
  mimeType: string,
): string {
  const year = '2026';
  const month = '03';
  const extension = inferFileExtension(fileName, mimeType);

  return `${category}/${year}/${month}/file-${sequence}.${extension}`;
}

export function createMockFileRecord(seed: FileRecordSeed): FileRecord {
  return {
    id: seed.id,
    ossKey: seed.ossKey,
    fileName: seed.fileName,
    mimeType: seed.mimeType,
    fileSize: seed.fileSize,
    category: seed.category,
    downloadUrl: buildFileDownloadUrl(seed.ossKey),
    createdAt: seed.createdAt ?? timestamp(0),
  };
}

export function createFilesMockState(): FilesMockState {
  const initialFile = createMockFileRecord({
    id: 'file-1',
    ossKey: 'certificates/2026/03/file-1.pdf',
    fileName: '国籍证书.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    category: 'certificates',
    createdAt: timestamp(0),
  });

  return {
    files: [initialFile],
    nextFileId: 2,
    nextUploadSequence: 2,
  };
}
