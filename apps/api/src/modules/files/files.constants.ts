export interface FileCategoryRule {
  maxSize: number;
  mimeTypes: string[];
  extensions: string[];
}

const MB = 1024 * 1024;

export const FILE_CATEGORY_RULES: Record<string, FileCategoryRule> = {
  certificates: {
    maxSize: 20 * MB,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    extensions: ['pdf', 'jpg', 'jpeg', 'png'],
  },
  'enterprise-profiles': {
    maxSize: 20 * MB,
    mimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    extensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'],
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
  'meeting-records': {
    maxSize: 20 * MB,
    mimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    extensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'],
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
