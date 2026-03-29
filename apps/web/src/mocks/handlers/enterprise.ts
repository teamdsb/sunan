import type {
  EnterpriseFile,
  EnterprisePolicy,
  EnterpriseProfile,
} from '../../features/enterprise/enterpriseApi';
import type {
  EnterpriseMockState,
  EnterprisePolicyVersion,
} from '../fixtures/enterprise';
import type { MockHandlerContext, MockRouteDefinition } from '../types';
import { createMockResponse } from '../utils';

function now(offsetMinutes = 1): string {
  return new Date(Date.parse('2026-03-01T00:00:00.000Z') + offsetMinutes * 60_000).toISOString();
}

function cloneFiles(files: EnterpriseFile[]): EnterpriseFile[] {
  return files.map((file) => ({ ...file }));
}

function cloneProfile(profile: EnterpriseProfile): EnterpriseProfile {
  return {
    ...profile,
    files: cloneFiles(profile.files),
  };
}

function clonePolicy(policy: EnterprisePolicy): EnterprisePolicy {
  return {
    ...policy,
    files: cloneFiles(policy.files),
  };
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function parsePage(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parsePageSize(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
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

function getEnterpriseState(context: MockHandlerContext): EnterpriseMockState {
  return context.state.enterprise;
}

function filterProfiles(
  state: EnterpriseMockState,
  params: Record<string, unknown>,
): EnterpriseProfile[] {
  const category = toText(params.category);
  const status = toText(params.status);
  const keyword = toText(params.keyword).toLowerCase();

  return state.profiles.filter((profile) => {
    if (category && profile.category !== category) {
      return false;
    }

    if (status && profile.status !== status) {
      return false;
    }

    if (keyword) {
      const haystack = [profile.title, profile.category, profile.description ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    }

    return true;
  });
}

function filterPolicies(
  state: EnterpriseMockState,
  params: Record<string, unknown>,
): EnterprisePolicy[] {
  const status = toText(params.status);
  const keyword = toText(params.keyword).toLowerCase();

  return state.policies.filter((policy) => {
    if (status && policy.status !== status) {
      return false;
    }

    if (keyword) {
      const haystack = [policy.title, policy.policyCode, policy.summary ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    }

    return true;
  });
}

function makeFile(id: string, fileName?: string): EnterpriseFile {
  return {
    id,
    fileName: fileName ?? `${id}.pdf`,
    ossKey: `enterprise/${id}`,
    mimeType: 'application/pdf',
    fileSize: 0,
  };
}

function normalizeFiles(fileIds: unknown): EnterpriseFile[] {
  if (!Array.isArray(fileIds)) {
    return [];
  }

  return fileIds
    .filter((fileId): fileId is string => typeof fileId === 'string' && fileId.trim().length > 0)
    .map((fileId) => makeFile(fileId));
}

function createProfile(
  state: EnterpriseMockState,
  input: Record<string, unknown>,
): EnterpriseProfile {
  const id = String(state.nextProfileId++);
  const nowValue = now(state.nextProfileId);

  return {
    id,
    title: toText(input.title) || '未命名企业资料',
    category: toText(input.category) || 'license',
    description: toText(input.description) || null,
    status: (toText(input.status) as EnterpriseProfile['status']) || 'draft',
    effectiveDate: toText(input.effectiveDate) || null,
    publishedAt: toText(input.status) === 'published' ? nowValue : null,
    files: normalizeFiles(input.fileIds),
    createdAt: nowValue,
    updatedAt: nowValue,
  };
}

function createPolicy(
  state: EnterpriseMockState,
  input: Record<string, unknown>,
): EnterprisePolicy {
  const id = String(state.nextPolicyId++);
  const nowValue = now(state.nextPolicyId);
  const policy: EnterprisePolicy = {
    id,
    title: toText(input.title) || '未命名企业制度',
    policyCode: toText(input.policyCode) || `POL-${id.padStart(3, '0')}`,
    version: toText(input.version) || 'v1',
    summary: toText(input.summary) || null,
    status: (toText(input.status) as EnterprisePolicy['status']) || 'draft',
    effectiveDate: toText(input.effectiveDate) || null,
    publishedAt: toText(input.status) === 'published' ? nowValue : null,
    files: normalizeFiles(input.fileIds),
    createdAt: nowValue,
    updatedAt: nowValue,
  };

  state.policyVersions.set(id, [
    {
      id: `${id}-${policy.version}`,
      version: policy.version,
      status: policy.status,
    },
  ]);

  return policy;
}

function updateProfile(
  state: EnterpriseMockState,
  id: string,
  input: Record<string, unknown>,
): EnterpriseProfile | null {
  const existing = state.profiles.find((profile) => profile.id === id);
  if (!existing) {
    return null;
  }

  const next: EnterpriseProfile = {
    ...existing,
    title: toText(input.title) || existing.title,
    category: toText(input.category) || existing.category,
    description:
      input.description === undefined
        ? existing.description
        : (toText(input.description) || null),
    status: (toText(input.status) as EnterpriseProfile['status']) || existing.status,
    effectiveDate:
      input.effectiveDate === undefined
        ? existing.effectiveDate
        : (toText(input.effectiveDate) || null),
    updatedAt: now(state.nextProfileId),
    files:
      input.fileIds === undefined ? existing.files : normalizeFiles(input.fileIds),
  };

  const index = state.profiles.findIndex((profile) => profile.id === id);
  state.profiles[index] = next;
  return next;
}

function updatePolicy(
  state: EnterpriseMockState,
  id: string,
  input: Record<string, unknown>,
): EnterprisePolicy | null {
  const existing = state.policies.find((policy) => policy.id === id);
  if (!existing) {
    return null;
  }

  const next: EnterprisePolicy = {
    ...existing,
    title: toText(input.title) || existing.title,
    policyCode: toText(input.policyCode) || existing.policyCode,
    version: toText(input.version) || existing.version,
    summary:
      input.summary === undefined
        ? existing.summary
        : (toText(input.summary) || null),
    status: (toText(input.status) as EnterprisePolicy['status']) || existing.status,
    effectiveDate:
      input.effectiveDate === undefined
        ? existing.effectiveDate
        : (toText(input.effectiveDate) || null),
    updatedAt: now(state.nextPolicyId),
    files:
      input.fileIds === undefined ? existing.files : normalizeFiles(input.fileIds),
  };

  const index = state.policies.findIndex((policy) => policy.id === id);
  state.policies[index] = next;

  const versions = state.policyVersions.get(id);
  if (versions) {
    const latestVersion = versions[versions.length - 1];
    if (!latestVersion || latestVersion.version !== next.version) {
      versions.push({
        id: `${id}-${next.version}`,
        version: next.version,
        status: next.status,
      });
    }
  }

  return next;
}

function deleteProfile(state: EnterpriseMockState, id: string): boolean {
  const index = state.profiles.findIndex((profile) => profile.id === id);
  if (index < 0) {
    return false;
  }

  state.profiles.splice(index, 1);
  return true;
}

function deletePolicy(state: EnterpriseMockState, id: string): boolean {
  const index = state.policies.findIndex((policy) => policy.id === id);
  if (index < 0) {
    return false;
  }

  state.policies.splice(index, 1);
  state.policyVersions.delete(id);
  return true;
}

function bindProfileFiles(
  state: EnterpriseMockState,
  id: string,
  input: Record<string, unknown>,
): EnterpriseProfile | null {
  const profile = state.profiles.find((item) => item.id === id);
  if (!profile) {
    return null;
  }

  const nextFiles = normalizeFiles(input.fileIds);
  const existingIds = new Set(profile.files.map((file) => file.id));
  profile.files = [...profile.files, ...nextFiles.filter((file) => !existingIds.has(file.id))];
  profile.updatedAt = now(state.nextProfileId);
  return profile;
}

function bindPolicyFiles(
  state: EnterpriseMockState,
  id: string,
  input: Record<string, unknown>,
): EnterprisePolicy | null {
  const policy = state.policies.find((item) => item.id === id);
  if (!policy) {
    return null;
  }

  const nextFiles = normalizeFiles(input.fileIds);
  const existingIds = new Set(policy.files.map((file) => file.id));
  policy.files = [...policy.files, ...nextFiles.filter((file) => !existingIds.has(file.id))];
  policy.updatedAt = now(state.nextPolicyId);
  return policy;
}

function publishPolicy(
  state: EnterpriseMockState,
  id: string,
): EnterprisePolicy | null {
  const policy = state.policies.find((item) => item.id === id);
  if (!policy) {
    return null;
  }

  const publishedAt = now(state.nextPolicyId);
  policy.status = 'published';
  policy.publishedAt = publishedAt;
  policy.updatedAt = publishedAt;

  const versions = state.policyVersions.get(id) ?? [];
  const hasPublishedVersion = versions.some(
    (version) => version.version === policy.version && version.status === 'published',
  );

  if (!hasPublishedVersion) {
    versions.push({
      id: `${id}-${policy.version}-published`,
      version: policy.version,
      status: 'published',
    });
    state.policyVersions.set(id, versions);
  }

  return policy;
}

function cloneVersions(versions: EnterprisePolicyVersion[]) {
  return versions.map((version) => ({ ...version }));
}

export const enterpriseHandlers: MockRouteDefinition[] = [
  {
    method: 'GET',
    path: '/enterprise-profiles',
    handler: ({ request, state }) => {
      const page = paginate(
        filterProfiles(state.enterprise, asObject(request.params)).map(cloneProfile),
        asObject(request.params),
      );

      return createMockResponse(page);
    },
  },
  {
    method: 'POST',
    path: '/enterprise-profiles',
    handler: ({ request, state }) => {
      const profile = createProfile(state.enterprise, asObject(request.data));
      state.enterprise.profiles.unshift(profile);

      return createMockResponse(
        {
          data: cloneProfile(profile),
        },
        201,
      );
    },
  },
  {
    method: 'GET',
    path: '/enterprise-profiles/:id',
    handler: (context) => {
      const profile = getEnterpriseState(context).profiles.find(
        (item) => item.id === context.params.id,
      );

      if (!profile) {
        return createMockResponse({ message: 'Enterprise profile not found' }, 404);
      }

      return createMockResponse({
        data: cloneProfile(profile),
      });
    },
  },
  {
    method: 'PATCH',
    path: '/enterprise-profiles/:id',
    handler: (context) => {
      const profile = updateProfile(
        getEnterpriseState(context),
        context.params.id,
        asObject(context.request.data),
      );

      if (!profile) {
        return createMockResponse({ message: 'Enterprise profile not found' }, 404);
      }

      return createMockResponse({
        data: cloneProfile(profile),
      });
    },
  },
  {
    method: 'DELETE',
    path: '/enterprise-profiles/:id',
    handler: (context) => {
      if (!deleteProfile(getEnterpriseState(context), context.params.id)) {
        return createMockResponse({ message: 'Enterprise profile not found' }, 404);
      }

      return createMockResponse(undefined, 204);
    },
  },
  {
    method: 'POST',
    path: '/enterprise-profiles/:id/files',
    handler: (context) => {
      const profile = bindProfileFiles(
        getEnterpriseState(context),
        context.params.id,
        asObject(context.request.data),
      );

      if (!profile) {
        return createMockResponse({ message: 'Enterprise profile not found' }, 404);
      }

      return createMockResponse({
        data: cloneProfile(profile),
      });
    },
  },
  {
    method: 'GET',
    path: '/enterprise-policies',
    handler: ({ request, state }) => {
      const page = paginate(
        filterPolicies(state.enterprise, asObject(request.params)).map(clonePolicy),
        asObject(request.params),
      );

      return createMockResponse(page);
    },
  },
  {
    method: 'POST',
    path: '/enterprise-policies',
    handler: ({ request, state }) => {
      const policy = createPolicy(state.enterprise, asObject(request.data));
      state.enterprise.policies.unshift(policy);

      return createMockResponse(
        {
          data: clonePolicy(policy),
        },
        201,
      );
    },
  },
  {
    method: 'GET',
    path: '/enterprise-policies/:id',
    handler: (context) => {
      const policy = getEnterpriseState(context).policies.find(
        (item) => item.id === context.params.id,
      );

      if (!policy) {
        return createMockResponse({ message: 'Enterprise policy not found' }, 404);
      }

      return createMockResponse({
        data: clonePolicy(policy),
      });
    },
  },
  {
    method: 'PATCH',
    path: '/enterprise-policies/:id',
    handler: (context) => {
      const policy = updatePolicy(
        getEnterpriseState(context),
        context.params.id,
        asObject(context.request.data),
      );

      if (!policy) {
        return createMockResponse({ message: 'Enterprise policy not found' }, 404);
      }

      return createMockResponse({
        data: clonePolicy(policy),
      });
    },
  },
  {
    method: 'DELETE',
    path: '/enterprise-policies/:id',
    handler: (context) => {
      if (!deletePolicy(getEnterpriseState(context), context.params.id)) {
        return createMockResponse({ message: 'Enterprise policy not found' }, 404);
      }

      return createMockResponse(undefined, 204);
    },
  },
  {
    method: 'POST',
    path: '/enterprise-policies/:id/files',
    handler: (context) => {
      const policy = bindPolicyFiles(
        getEnterpriseState(context),
        context.params.id,
        asObject(context.request.data),
      );

      if (!policy) {
        return createMockResponse({ message: 'Enterprise policy not found' }, 404);
      }

      return createMockResponse({
        data: clonePolicy(policy),
      });
    },
  },
  {
    method: 'POST',
    path: '/enterprise-policies/:id/publish',
    handler: (context) => {
      const policy = publishPolicy(getEnterpriseState(context), context.params.id);

      if (!policy) {
        return createMockResponse({ message: 'Enterprise policy not found' }, 404);
      }

      return createMockResponse({
        data: clonePolicy(policy),
      });
    },
  },
  {
    method: 'GET',
    path: '/enterprise-policies/:id/versions',
    handler: (context) => {
      const versions =
        getEnterpriseState(context).policyVersions.get(context.params.id) ?? [];

      return createMockResponse({
        data: cloneVersions(versions),
      });
    },
  },
];
