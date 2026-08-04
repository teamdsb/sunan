export interface FileCategoryRule {
  maxSize: number;
  extensions: string[];
  storagePrefix?: string;
}

export interface FileExtensionRule {
  mimeType: string;
  compatibleMimeTypes?: string[];
}

const MB = 1024 * 1024;

export const GENERIC_FILE_MIME_TYPES = new Set([
  '',
  'application/octet-stream',
]);

export const FILE_EXTENSION_RULES: Record<string, FileExtensionRule> = {
  pdf: { mimeType: 'application/pdf' },
  jpg: { mimeType: 'image/jpeg' },
  jpeg: { mimeType: 'image/jpeg' },
  png: { mimeType: 'image/png' },
  doc: { mimeType: 'application/msword' },
  docx: {
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  xls: { mimeType: 'application/vnd.ms-excel' },
  xlsx: {
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  txt: { mimeType: 'text/plain' },
  csv: {
    mimeType: 'text/csv',
    compatibleMimeTypes: [
      'application/csv',
      'text/plain',
      'application/vnd.ms-excel',
    ],
  },
  heic: {
    mimeType: 'image/heic',
    compatibleMimeTypes: [
      'image/heif',
      'image/heic-sequence',
      'image/heif-sequence',
    ],
  },
  zip: {
    mimeType: 'application/zip',
    compatibleMimeTypes: ['application/x-zip-compressed', 'multipart/x-zip'],
  },
  rar: {
    mimeType: 'application/vnd.rar',
    compatibleMimeTypes: ['application/x-rar', 'application/x-rar-compressed'],
  },
  wps: {
    mimeType: 'application/vnd.ms-works',
    compatibleMimeTypes: ['application/kswps', 'application/wps-office.wps'],
  },
  et: {
    mimeType: 'application/vnd.ms-excel',
    compatibleMimeTypes: ['application/kset', 'application/wps-office.et'],
  },
  dps: {
    mimeType: 'application/vnd.ms-powerpoint',
    compatibleMimeTypes: ['application/ksdps', 'application/wps-office.dps'],
  },
};

const GENERAL_ATTACHMENT_EXTENSIONS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'txt',
  'csv',
  'heic',
  'zip',
  'rar',
  'wps',
  'et',
  'dps',
];

export const FILE_CATEGORY_RULES: Record<string, FileCategoryRule> = {
  certificates: {
    maxSize: 20 * MB,
    extensions: ['pdf', 'jpg', 'jpeg', 'png'],
  },
  'enterprise-profiles': {
    maxSize: 20 * MB,
    extensions: GENERAL_ATTACHMENT_EXTENSIONS,
  },
  'enterprise-policies': {
    maxSize: 50 * MB,
    extensions: GENERAL_ATTACHMENT_EXTENSIONS,
  },
  'inspection-photos': {
    maxSize: 10 * MB,
    extensions: ['jpg', 'jpeg', 'png'],
  },
  'procurement-attachments': {
    maxSize: 20 * MB,
    extensions: GENERAL_ATTACHMENT_EXTENSIONS,
    storagePrefix: 'procurement/attachments',
  },
  procurement_attachment: {
    maxSize: 20 * MB,
    extensions: GENERAL_ATTACHMENT_EXTENSIONS,
    storagePrefix: 'procurement/attachments',
  },
  'workbench-attachments': {
    maxSize: 20 * MB,
    extensions: GENERAL_ATTACHMENT_EXTENSIONS,
    storagePrefix: 'workbench/attachments',
  },
  workbench_attachment: {
    maxSize: 20 * MB,
    extensions: GENERAL_ATTACHMENT_EXTENSIONS,
    storagePrefix: 'workbench/attachments',
  },
  'meeting-records': {
    maxSize: 20 * MB,
    extensions: GENERAL_ATTACHMENT_EXTENSIONS,
  },
};

export const MIME_EXTENSION_MAP: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};
