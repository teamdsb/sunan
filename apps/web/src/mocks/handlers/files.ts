import type { FileRecord } from '../../features/files/types';
import { createMockFileRecord, buildFileDownloadUrl, buildFileOssKey, buildFileUploadUrl } from '../fixtures/files';
import type { FilesMockState, FileRecordSeed } from '../fixtures/files';
import type { MockHandlerContext, MockRouteDefinition } from '../types';
import { createMockResponse } from '../utils';

const BASE_TIMESTAMP = Date.parse('2026-03-01T00:00:00.000Z');

function now(offsetMinutes = 1): string {
  return new Date(BASE_TIMESTAMP + offsetMinutes * 60_000).toISOString();
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function toText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getFilesState(context: MockHandlerContext): FilesMockState {
  return context.state.files;
}

function cloneFileRecord(record: FileRecord): FileRecord {
  return { ...record };
}

function createStoredFileRecord(
  state: FilesMockState,
  input: Record<string, unknown>,
  ossKey: string,
): FileRecord {
  const fileName = toText(input.fileName, 'untitled');
  const mimeType = toText(input.mimeType, 'application/octet-stream');
  const category = toText(input.category, 'certificates');
  const fileSize = toNumber(input.fileSize, 0);
  const fileId = `file-${state.nextFileId}`;
  state.nextFileId += 1;

  const seed: FileRecordSeed = {
    id: fileId,
    ossKey,
    fileName,
    mimeType,
    fileSize,
    category,
    createdAt: now(state.nextFileId),
  };

  return createMockFileRecord(seed);
}

function normalizeOssKey(ossKey: string): string {
  return ossKey;
}

function createPresignResponse(
  state: FilesMockState,
  input: Record<string, unknown>,
) {
  const category = toText(input.category, 'certificates');
  const fileName = toText(input.fileName, 'untitled');
  const mimeType = toText(input.mimeType, 'application/octet-stream');
  const sequence = state.nextUploadSequence;
  state.nextUploadSequence += 1;
  const ossKey = buildFileOssKey(category, sequence, fileName, mimeType);

  return createMockResponse({
    data: {
      uploadUrl: buildFileUploadUrl(ossKey),
      ossKey,
      expiresAt: now(15),
      headers: {
        'Content-Type': mimeType,
        'x-oss-meta-original-name': fileName,
      },
    },
  });
}

function callbackUpload(
  context: MockHandlerContext,
): ReturnType<typeof createMockResponse> {
  const state = getFilesState(context);
  const input = asObject(context.request.data);
  const ossKey = normalizeOssKey(toText(input.ossKey, ''));

  if (!ossKey) {
    return createMockResponse(
      {
        message: 'ossKey is required',
      },
      400,
    );
  }

  const file = createStoredFileRecord(state, input, ossKey);

  state.files.unshift(file);

  return createMockResponse(
    {
      data: cloneFileRecord(file),
    },
    201,
  );
}

function getDownloadUrl(context: MockHandlerContext) {
  const ossKey = normalizeOssKey(context.params.ossKey);

  return createMockResponse({
    data: {
      downloadUrl: buildFileDownloadUrl(ossKey),
      expiresAt: now(15),
    },
  });
}

function createFromWecom(context: MockHandlerContext) {
  const state = getFilesState(context);
  const input = asObject(context.request.data);
  const mediaId = toText(input.mediaId, 'media');
  const category = toText(input.category, 'inspection-photos');
  const ossKey = buildFileOssKey(category, state.nextUploadSequence++, `${mediaId}.jpg`, 'image/jpeg');
  const file = createMockFileRecord({
    id: `file-${state.nextFileId++}`,
    ossKey,
    fileName: `${mediaId}.jpg`,
    mimeType: 'image/jpeg',
    fileSize: 0,
    category,
    createdAt: now(state.nextFileId),
  });

  state.files.unshift(file);

  return createMockResponse(
    {
      data: cloneFileRecord(file),
    },
    201,
  );
}

export const filesHandlers: MockRouteDefinition[] = [
  {
    method: 'POST',
    path: '/files/presign',
    handler: (context) => createPresignResponse(getFilesState(context), asObject(context.request.data)),
  },
  {
    method: 'POST',
    path: '/files/callback',
    handler: callbackUpload,
  },
  {
    method: 'GET',
    path: '/files/:ossKey/download-url',
    handler: getDownloadUrl,
  },
  {
    method: 'POST',
    path: '/files/from-wecom',
    handler: createFromWecom,
  },
];
