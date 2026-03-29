import type { CertificateItem } from '../../features/certificate/certificateApi';
import {
  createCertificateAttachment,
  createMockCertificateRecord,
  resolveCertificateTypeName,
  resolveOwnerName,
  type CertificateFileAttachment,
  type CertificatesMockState,
  type CertificateMockRecord,
} from '../fixtures/certificates';
import type { FilesMockState } from '../fixtures/files';
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

function toList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function parsePage(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parsePageSize(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function getCertificatesState(context: MockHandlerContext): CertificatesMockState {
  return context.state.certificates;
}

function getFilesState(context: MockHandlerContext): FilesMockState {
  return context.state.files;
}

function cloneAttachment(
  attachment: CertificateFileAttachment,
): CertificateFileAttachment {
  return { ...attachment };
}

function cloneCertificate(record: CertificateMockRecord): CertificateMockRecord {
  return {
    ...record,
    files: record.files.map((file) => cloneAttachment(file)),
  };
}

function findCertificate(
  state: CertificatesMockState,
  id: string,
): CertificateMockRecord | undefined {
  return state.certificates.find((certificate) => certificate.id === id);
}

function createFileAttachmentFromState(
  fileState: FilesMockState,
  fileId: string,
): CertificateFileAttachment | null {
  const file = fileState.files.find((item) => item.id === fileId);
  if (file) {
    return createCertificateAttachment(file);
  }

  return null;
}

function collectAttachments(
  context: MockHandlerContext,
  fileIds: unknown,
): CertificateFileAttachment[] {
  const state = getFilesState(context);
  const uniqueFileIds = [...new Set(toList(fileIds))];
  const attachments = uniqueFileIds.map((fileId) => ({
    fileId,
    attachment: createFileAttachmentFromState(state, fileId),
  }));
  const missingFileIds = attachments
    .filter((entry) => entry.attachment === null)
    .map((entry) => entry.fileId);

  if (missingFileIds.length > 0) {
    throw new Error(`Files not found: ${missingFileIds.join(', ')}`);
  }

  return attachments.map(
    (entry) => entry.attachment as CertificateFileAttachment,
  );
}

function paginate<T>(items: T[], params: Record<string, unknown>) {
  const page = parsePage(params.page, 1);
  const pageSize = parsePageSize(params.pageSize, 10);
  const start = (page - 1) * pageSize;
  const totalPages = items.length === 0 ? 0 : Math.ceil(items.length / pageSize);

  return {
    data: items.slice(start, start + pageSize),
    meta: {
      page,
      pageSize,
      total: items.length,
      totalPages,
    },
  };
}

function matchesFilters(
  certificate: CertificateMockRecord,
  params: Record<string, unknown>,
): boolean {
  const ownerType = toText(params.ownerType);
  const ownerId = toText(params.ownerId);
  const certificateTypeId = toText(params.certificateTypeId);
  const status = toText(params.status);
  const keyword = toText(params.keyword).toLowerCase();

  if (ownerType && certificate.ownerType !== ownerType) {
    return false;
  }

  if (ownerId && certificate.ownerId !== ownerId) {
    return false;
  }

  if (certificateTypeId && certificate.certificateTypeId !== certificateTypeId) {
    return false;
  }

  if (status && certificate.status !== status) {
    return false;
  }

  if (keyword) {
    const haystack = [
      certificate.certificateTypeName,
      certificate.ownerName,
      certificate.title,
      certificate.expiryDate,
      certificate.status,
      certificate.files.map((file) => file.fileName).join(' '),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(keyword);
  }

  return true;
}

function listCertificates(context: MockHandlerContext) {
  const state = getCertificatesState(context);
  const filtered = state.certificates.filter((certificate) =>
    matchesFilters(certificate, asObject(context.request.params)),
  );
  const result = paginate(filtered.map(cloneCertificate), asObject(context.request.params));

  return createMockResponse({
    data: result.data,
    meta: result.meta,
  });
}

function groupByOwner(certificates: CertificateMockRecord[]) {
  const grouped = new Map<
    string,
    {
      groupKey: string;
      groupLabel: string;
      count: number;
      items: CertificateMockRecord[];
    }
  >();

  for (const certificate of certificates) {
    const groupKey = `${certificate.ownerType}:${certificate.ownerId}`;
    const existing = grouped.get(groupKey);
    if (existing) {
      existing.count += 1;
      existing.items.push(cloneCertificate(certificate));
      continue;
    }

    grouped.set(groupKey, {
      groupKey,
      groupLabel: certificate.ownerName,
      count: 1,
      items: [cloneCertificate(certificate)],
    });
  }

  return [...grouped.values()];
}

function groupByType(certificates: CertificateMockRecord[]) {
  const grouped = new Map<
    string,
    {
      groupKey: string;
      groupLabel: string;
      count: number;
      items: CertificateMockRecord[];
    }
  >();

  for (const certificate of certificates) {
    const groupKey = certificate.certificateTypeId;
    const existing = grouped.get(groupKey);
    if (existing) {
      existing.count += 1;
      existing.items.push(cloneCertificate(certificate));
      continue;
    }

    grouped.set(groupKey, {
      groupKey,
      groupLabel: certificate.certificateTypeName,
      count: 1,
      items: [cloneCertificate(certificate)],
    });
  }

  return [...grouped.values()];
}

function groupedCertificates(context: MockHandlerContext) {
  const state = getCertificatesState(context);
  const params = asObject(context.request.params);
  const groupBy = toText(params.groupBy, 'owner');
  const filtered = state.certificates.filter((certificate) =>
    matchesFilters(certificate, params),
  );

  const data = groupBy === 'type' ? groupByType(filtered) : groupByOwner(filtered);

  return createMockResponse({
    data,
  });
}

function certificateById(context: MockHandlerContext) {
  const certificate = findCertificate(getCertificatesState(context), context.params.id);

  if (!certificate) {
    return createMockResponse(
      {
        message: `Certificate ${context.params.id} not found`,
      },
      404,
    );
  }

  return createMockResponse({
    data: cloneCertificate(certificate),
  });
}

function createCertificateFromInput(
  context: MockHandlerContext,
  input: Record<string, unknown>,
): CertificateMockRecord {
  const state = getCertificatesState(context);
  const id = String(state.nextCertificateId++);
  const certificateTypeId = toText(input.certificateTypeId, 'certificate_type');
  const ownerType = (toText(input.ownerType, 'vessel') as CertificateItem['ownerType']) ?? 'vessel';
  const ownerId = toText(input.ownerId, 'owner-unknown');
  const certificateTypeName = toText(
    input.certificateTypeName,
    resolveCertificateTypeName(certificateTypeId),
  );
  const ownerName = toText(input.ownerName, resolveOwnerName(ownerType, ownerId));
  const files = collectAttachments(context, input.fileIds);

  return createMockCertificateRecord({
    id,
    certificateTypeId,
    certificateTypeName,
    ownerType,
    ownerId,
    ownerName,
    title: toText(input.title, '未命名证书'),
    expiryDate: toText(input.expiryDate, '2027-12-31'),
    advanceDays:
      typeof input.advanceDays === 'number' && Number.isFinite(input.advanceDays)
        ? input.advanceDays
        : undefined,
    status: (toText(input.status) as CertificateItem['status']) || 'active',
    files,
    createdAt: now(state.nextCertificateId),
    updatedAt: now(state.nextCertificateId),
  });
}

function createCertificate(context: MockHandlerContext) {
  const state = getCertificatesState(context);
  const input = asObject(context.request.data);
  const certificate = createCertificateFromInput(context, input);
  state.certificates.unshift(certificate);

  return createMockResponse(
    {
      data: cloneCertificate(certificate),
    },
    201,
  );
}

function updateCertificate(context: MockHandlerContext) {
  const state = getCertificatesState(context);
  const certificate = findCertificate(state, context.params.id);

  if (!certificate) {
    return createMockResponse(
      {
        message: `Certificate ${context.params.id} not found`,
      },
      404,
    );
  }

  const input = asObject(context.request.data);
  const nextCertificate = cloneCertificate(certificate);

  if (input.certificateTypeId !== undefined) {
    nextCertificate.certificateTypeId = toText(
      input.certificateTypeId,
      nextCertificate.certificateTypeId,
    );
    nextCertificate.certificateTypeName = toText(
      input.certificateTypeName,
      resolveCertificateTypeName(nextCertificate.certificateTypeId),
    );
  }

  if (input.ownerType !== undefined) {
    nextCertificate.ownerType = toText(
      input.ownerType,
      nextCertificate.ownerType,
    ) as CertificateItem['ownerType'];
  }

  if (input.ownerId !== undefined) {
    nextCertificate.ownerId = toText(input.ownerId, nextCertificate.ownerId);
  }

  if (input.ownerName !== undefined) {
    nextCertificate.ownerName = toText(input.ownerName);
  } else if (input.ownerType !== undefined || input.ownerId !== undefined) {
    nextCertificate.ownerName = resolveOwnerName(
      nextCertificate.ownerType,
      nextCertificate.ownerId,
    );
  }

  if (input.title !== undefined) {
    nextCertificate.title = toText(input.title, nextCertificate.title);
  }

  if (input.expiryDate !== undefined) {
    nextCertificate.expiryDate = toText(input.expiryDate, nextCertificate.expiryDate);
  }

  if (input.advanceDays !== undefined) {
    const parsedAdvanceDays = Number(input.advanceDays);
    if (Number.isFinite(parsedAdvanceDays)) {
      nextCertificate.advanceDays = parsedAdvanceDays;
    }
  }

  if (input.status !== undefined) {
    nextCertificate.status = toText(
      input.status,
      nextCertificate.status,
    ) as CertificateItem['status'];
  }

  if (input.fileIds !== undefined) {
    nextCertificate.files = collectAttachments(context, input.fileIds);
  }

  nextCertificate.updatedAt = now(state.nextCertificateId);
  const certificateIndex = state.certificates.findIndex(
    (item) => item.id === context.params.id,
  );
  state.certificates[certificateIndex] = nextCertificate;

  return createMockResponse({
    data: cloneCertificate(nextCertificate),
  });
}

function bindCertificateFiles(context: MockHandlerContext) {
  const state = getCertificatesState(context);
  const certificate = findCertificate(state, context.params.id);

  if (!certificate) {
    return createMockResponse(
      {
        message: `Certificate ${context.params.id} not found`,
      },
      404,
    );
  }

  const input = asObject(context.request.data);
  const nextFiles = collectAttachments(context, input.fileIds);
  const existingIds = new Set(certificate.files.map((file) => file.id));
  certificate.files = [
    ...certificate.files,
    ...nextFiles.filter((file) => !existingIds.has(file.id)),
  ];
  certificate.updatedAt = now(state.nextCertificateId);

  return createMockResponse({
    data: cloneCertificate(certificate),
  });
}

export const certificateHandlers: MockRouteDefinition[] = [
  {
    method: 'GET',
    path: '/certificates',
    handler: listCertificates,
  },
  {
    method: 'GET',
    path: '/certificates/grouped',
    handler: groupedCertificates,
  },
  {
    method: 'GET',
    path: '/certificates/:id',
    handler: certificateById,
  },
  {
    method: 'POST',
    path: '/certificates',
    handler: createCertificate,
  },
  {
    method: 'PATCH',
    path: '/certificates/:id',
    handler: updateCertificate,
  },
  {
    method: 'POST',
    path: '/certificates/:id/files',
    handler: bindCertificateFiles,
  },
];
