import type {
  EnterpriseFile,
  EnterprisePolicy,
  EnterpriseProfile,
} from '../../features/enterprise/enterpriseApi';

export interface EnterprisePolicyVersion {
  id: string;
  version: string;
  status: 'draft' | 'published' | 'deprecated';
}

export interface EnterpriseMockState {
  profiles: EnterpriseProfile[];
  policies: EnterprisePolicy[];
  policyVersions: Map<string, EnterprisePolicyVersion[]>;
  nextProfileId: number;
  nextPolicyId: number;
}

const BASE_TIMESTAMP = Date.parse('2026-03-01T00:00:00.000Z');

function timestamp(offsetMinutes: number): string {
  return new Date(BASE_TIMESTAMP + offsetMinutes * 60_000).toISOString();
}

function createEmptyFiles(): EnterpriseFile[] {
  return [];
}

export function createEnterpriseMockState(): EnterpriseMockState {
  const profiles: EnterpriseProfile[] = [
    {
      id: '1',
      title: '企业资质示例',
      category: 'license',
      description: '用于 mock mode 的初始企业资料。',
      status: 'published',
      effectiveDate: '2026-03-01',
      publishedAt: timestamp(0),
      files: createEmptyFiles(),
      createdAt: timestamp(0),
      updatedAt: timestamp(0),
    },
  ];

  const policies: EnterprisePolicy[] = [
    {
      id: '1',
      title: '企业制度示例',
      policyCode: 'POL-001',
      version: 'v1',
      summary: '用于 mock mode 的初始企业制度。',
      status: 'draft',
      effectiveDate: null,
      publishedAt: null,
      files: createEmptyFiles(),
      createdAt: timestamp(0),
      updatedAt: timestamp(0),
    },
  ];

  const policyVersions = new Map<string, EnterprisePolicyVersion[]>([
    [
      '1',
      [
        {
          id: '1-v1',
          version: 'v1',
          status: 'draft',
        },
      ],
    ],
  ]);

  return {
    profiles,
    policies,
    policyVersions,
    nextProfileId: 2,
    nextPolicyId: 2,
  };
}

