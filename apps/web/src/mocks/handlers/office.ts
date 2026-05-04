import type { OfficeAdminEntry, OfficeAuditRecord, OfficeOpenResult } from '../../features/office/officeApi';
import type { OfficeMockState } from '../fixtures/office';
import type { MockHandlerContext, MockRouteDefinition } from '../types';
import { createMockResponse } from '../utils';

type OfficeRuntimeState = MockHandlerContext['state'] & {
  office: OfficeMockState;
};

function getOfficeState(context: MockHandlerContext): OfficeMockState {
  return (context.state as OfficeRuntimeState).office;
}

function pushAudit(state: OfficeMockState, params: Omit<OfficeAuditRecord, 'id' | 'createdAt'>) {
  state.audits.unshift({
    id: `office-audit-${state.nextAuditId++}`,
    createdAt: new Date().toISOString(),
    ...params,
  });
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function toText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function toStringArray(value: unknown, fallback: string[] = []): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : fallback;
}

function toEntry(input: Record<string, unknown>, id: string): OfficeAdminEntry {
  return {
    id,
    categoryCode: toText(input.categoryCode, 'other'),
    title: toText(input.title, '未命名入口'),
    summary: toText(input.summary, '暂无说明'),
    iconType: toText(input.iconType, 'other'),
    targetType: input.targetType === 'internal_route' ? 'internal_route' : 'external_url',
    targetValue: toText(input.targetValue, 'https://office.example.com/default'),
    openMode: input.openMode === 'new_window' ? 'new_window' : 'current_webview',
    visibilityRoles: toStringArray(input.visibilityRoles, ['all_authenticated']),
    managerRoles: toStringArray(input.managerRoles, ['general_office']),
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
    status: 'draft',
    canManage: true,
    createdBy: 'mock-admin',
    updatedBy: 'mock-admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function filterEntries(state: OfficeMockState, params: Record<string, unknown>, includeDrafts: boolean): OfficeAdminEntry[] {
  const keyword = toText(params.keyword).toLowerCase();
  const categoryCode = toText(params.categoryCode);
  const status = toText(params.status);

  return state.entries.filter((entry) => {
    if (!includeDrafts && entry.status !== 'published') return false;
    if (keyword && !`${entry.title} ${entry.summary}`.toLowerCase().includes(keyword)) return false;
    if (categoryCode && entry.categoryCode !== categoryCode) return false;
    if (status && entry.status !== status) return false;
    return true;
  });
}

export const officeHandlers: MockRouteDefinition[] = [
  {
    method: 'GET',
    path: '/office/categories',
    handler: (context) => createMockResponse({ data: getOfficeState(context).categories }),
  },
  {
    method: 'GET',
    path: '/office/entries',
    handler: (context) => createMockResponse({ data: filterEntries(getOfficeState(context), asObject(context.request.params), false) }),
  },
  {
    method: 'POST',
    path: '/office/entries/:id/open',
    handler: (context) => {
      const state = getOfficeState(context);
      const entry = state.entries.find((item) => item.id === context.params.id && item.status === 'published');
      if (!entry) return createMockResponse({ message: 'Office entry not found' }, 404);
      pushAudit(state, {
        entryId: entry.id,
        entryTitle: entry.title,
        categoryCode: entry.categoryCode,
        action: 'open',
        operatorUserId: 'mock-admin',
        payloadSnapshot: { targetType: entry.targetType, targetValue: entry.targetValue },
      });
      const result: OfficeOpenResult = {
        id: entry.id,
        title: entry.title,
        targetType: entry.targetType,
        targetValue: entry.targetValue,
        openMode: entry.openMode,
      };
      return createMockResponse({ data: result }, 201);
    },
  },
  {
    method: 'GET',
    path: '/office/admin/audits',
    handler: (context) => {
      const state = getOfficeState(context);
      const params = asObject(context.request.params);
      const action = toText(params.action);
      const entryId = toText(params.entryId);
      const rows = state.audits.filter((audit) => {
        if (action && audit.action !== action) return false;
        if (entryId && audit.entryId !== entryId) return false;
        return true;
      });
      return createMockResponse({
        data: rows,
        meta: {
          total: rows.length,
          page: 1,
          pageSize: rows.length || 20,
          totalPages: 1,
        },
      });
    },
  },
  {
    method: 'GET',
    path: '/office/admin/entries',
    handler: (context) => createMockResponse({ data: filterEntries(getOfficeState(context), asObject(context.request.params), true) }),
  },
  {
    method: 'POST',
    path: '/office/admin/entries',
    handler: (context) => {
      const state = getOfficeState(context);
      const entry = toEntry(asObject(context.request.data), `office-${state.nextEntryId++}`);
      state.entries.unshift(entry);
      pushAudit(state, {
        entryId: entry.id,
        entryTitle: entry.title,
        categoryCode: entry.categoryCode,
        action: 'create',
        operatorUserId: 'mock-admin',
        payloadSnapshot: { targetType: entry.targetType, targetValue: entry.targetValue },
      });
      return createMockResponse({ data: entry }, 201);
    },
  },
  {
    method: 'PATCH',
    path: '/office/admin/entries/:id',
    handler: (context) => {
      const state = getOfficeState(context);
      const current = state.entries.find((item) => item.id === context.params.id);
      if (!current) return createMockResponse({ message: 'Office entry not found' }, 404);
      Object.assign(current, asObject(context.request.data), { updatedAt: new Date().toISOString() });
      pushAudit(state, {
        entryId: current.id,
        entryTitle: current.title,
        categoryCode: current.categoryCode,
        action: 'update',
        operatorUserId: 'mock-admin',
        payloadSnapshot: asObject(context.request.data),
      });
      return createMockResponse({ data: current });
    },
  },
  {
    method: 'POST',
    path: '/office/admin/entries/:id/publish',
    handler: (context) => {
      const current = getOfficeState(context).entries.find((item) => item.id === context.params.id);
      if (!current) return createMockResponse({ message: 'Office entry not found' }, 404);
      current.status = 'published';
      current.updatedAt = new Date().toISOString();
      pushAudit(getOfficeState(context), {
        entryId: current.id,
        entryTitle: current.title,
        categoryCode: current.categoryCode,
        action: 'publish',
        operatorUserId: 'mock-admin',
        payloadSnapshot: { status: 'published' },
      });
      return createMockResponse({ data: current }, 201);
    },
  },
  {
    method: 'POST',
    path: '/office/admin/entries/:id/disable',
    handler: (context) => {
      const current = getOfficeState(context).entries.find((item) => item.id === context.params.id);
      if (!current) return createMockResponse({ message: 'Office entry not found' }, 404);
      current.status = 'disabled';
      current.updatedAt = new Date().toISOString();
      pushAudit(getOfficeState(context), {
        entryId: current.id,
        entryTitle: current.title,
        categoryCode: current.categoryCode,
        action: 'disable',
        operatorUserId: 'mock-admin',
        payloadSnapshot: { status: 'disabled' },
      });
      return createMockResponse({ data: current }, 201);
    },
  },
];
