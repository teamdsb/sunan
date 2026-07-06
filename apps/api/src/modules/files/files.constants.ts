export interface FileCategoryRule {
  maxSize: number;
  mimeTypes: string[];
  extensions: string[];
  storagePrefix?: string;
}

const MB = 1024 * 1024;

const GENERAL_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const GENERAL_ATTACHMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'];

export const FILE_CATEGORY_RULES: Record<string, FileCategoryRule> = {
  certificates: {
    maxSize: 20 * MB,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    extensions: ['pdf', 'jpg', 'jpeg', 'png'],
  },
  'enterprise-profiles': {
    maxSize: 20 * MB,
    mimeTypes: GENERAL_ATTACHMENT_MIME_TYPES,
    extensions: GENERAL_ATTACHMENT_EXTENSIONS,
  },
  'enterprise-policies': {
    maxSize: 50 * MB,
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    extensions: ['pdf', 'doc', 'docx'],
  },
  'inspection-photos': {
    maxSize: 10 * MB,
    mimeTypes: ['image/jpeg', 'image/png'],
    extensions: ['jpg', 'jpeg', 'png'],
  },
  'procurement-attachments': {
    maxSize: 20 * MB,
    mimeTypes: GENERAL_ATTACHMENT_MIME_TYPES,
    extensions: GENERAL_ATTACHMENT_EXTENSIONS,
    storagePrefix: 'procurement/attachments',
  },
  procurement_attachment: {
    maxSize: 20 * MB,
    mimeTypes: GENERAL_ATTACHMENT_MIME_TYPES,
    extensions: GENERAL_ATTACHMENT_EXTENSIONS,
    storagePrefix: 'procurement/attachments',
  },
  'workbench-attachments': {
    maxSize: 20 * MB,
    mimeTypes: GENERAL_ATTACHMENT_MIME_TYPES,
    extensions: GENERAL_ATTACHMENT_EXTENSIONS,
    storagePrefix: 'workbench/attachments',
  },
  workbench_attachment: {
    maxSize: 20 * MB,
    mimeTypes: GENERAL_ATTACHMENT_MIME_TYPES,
    extensions: GENERAL_ATTACHMENT_EXTENSIONS,
    storagePrefix: 'workbench/attachments',
  },
  'meeting-records': {
    maxSize: 20 * MB,
    mimeTypes: GENERAL_ATTACHMENT_MIME_TYPES,
    extensions: GENERAL_ATTACHMENT_EXTENSIONS,
  },
};

export const MIME_EXTENSION_MAP: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};
