import type {
  ProcurementBudget,
  ProcurementBudgetAudit,
  ProcurementDepartmentCode,
  ProcurementDimensionType,
  ProcurementOrder,
} from '../../features/procurement/procurementApi';
import type { ProcurementMockState } from '../fixtures/procurement';
import type { MockHandlerContext, MockRouteDefinition } from '../types';
import { createMockResponse } from '../utils';

function getState(context: MockHandlerContext): ProcurementMockState {
  return context.state.procurement;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function scopeKey(item: {
  departmentCode: ProcurementDepartmentCode;
  dimensionType: ProcurementDimensionType;
  dimensionKey: string | null;
}) {
  return JSON.stringify([
    item.departmentCode,
    item.dimensionType,
    item.dimensionKey,
  ]);
}

function recalculateBudget(
  state: ProcurementMockState,
  budget: ProcurementBudget,
) {
  const executedAmount = state.orders
    .filter(
      (order) =>
        order.status === 'final_approved' &&
        order.expenseDate?.startsWith(String(budget.budgetYear)) &&
        scopeKey(order) === scopeKey(budget),
    )
    .reduce((sum, order) => sum + order.amount, 0);
  budget.executedAmount = executedAmount;
  budget.executionRate =
    budget.budgetAmount > 0
      ? Math.round((executedAmount / budget.budgetAmount) * 10000) / 100
      : 0;
  budget.overBudgetAmount = Math.max(executedAmount - budget.budgetAmount, 0);
  budget.isOverBudget =
    budget.isEnabled && executedAmount > budget.budgetAmount;
  return budget;
}

function createAudit(
  state: ProcurementMockState,
  budget: ProcurementBudget,
  input: Omit<
    ProcurementBudgetAudit,
    'id' | 'budgetId' | 'changedAt' | 'payloadSnapshot'
  >,
) {
  state.budgetAudits.unshift({
    id: `budget-audit-${state.nextAuditId++}`,
    budgetId: budget.id,
    changedAt: new Date().toISOString(),
    payloadSnapshot: {
      budgetYear: budget.budgetYear,
      departmentCode: budget.departmentCode,
      dimensionType: budget.dimensionType,
      dimensionKey: budget.dimensionKey,
    },
    ...input,
  });
}

export const procurementHandlers: MockRouteDefinition[] = [
  {
    method: 'GET',
    path: '/procurement/dimensions',
    handler: (context) => {
      const params = asObject(context.request.params);
      const rows = getState(context).dimensions.filter((item) => {
        if (
          params.departmentCode &&
          item.departmentCode !== params.departmentCode
        )
          return false;
        if (
          typeof params.isEnabled === 'boolean' &&
          item.isEnabled !== params.isEnabled
        )
          return false;
        return true;
      });
      return createMockResponse({ data: rows });
    },
  },
  {
    method: 'POST',
    path: '/procurement/admin/dimensions',
    handler: (context) => {
      const state = getState(context);
      const input = asObject(context.request.data);
      const now = new Date().toISOString();
      const item = {
        id: `dimension-${state.nextDimensionId++}`,
        departmentCode: input.departmentCode as
          | 'shipping_dept'
          | 'logistics_dept',
        dimensionType: input.dimensionType as 'vessel' | 'logistics_category',
        dimensionKey: String(input.dimensionKey ?? ''),
        dimensionName: String(input.dimensionName ?? ''),
        sortOrder: Number(input.sortOrder ?? 0),
        isEnabled: true,
        createdBy: 'mock-admin',
        updatedBy: 'mock-admin',
        createdAt: now,
        updatedAt: now,
      };
      state.dimensions.push(item);
      return createMockResponse({ data: item }, 201);
    },
  },
  {
    method: 'PATCH',
    path: '/procurement/admin/dimensions/:id',
    handler: (context) => {
      const item = getState(context).dimensions.find(
        (row) => row.id === context.params.id,
      );
      if (!item)
        return createMockResponse({ message: 'dimension not found' }, 404);
      Object.assign(item, asObject(context.request.data), {
        updatedBy: 'mock-admin',
        updatedAt: new Date().toISOString(),
      });
      return createMockResponse({ data: item });
    },
  },
  {
    method: 'DELETE',
    path: '/procurement/admin/dimensions/:id',
    handler: (context) => {
      const item = getState(context).dimensions.find(
        (row) => row.id === context.params.id,
      );
      if (!item)
        return createMockResponse({ message: 'dimension not found' }, 404);
      item.isEnabled = false;
      return createMockResponse(undefined, 204);
    },
  },
  {
    method: 'GET',
    path: '/procurement/orders',
    handler: (context) => {
      const params = asObject(context.request.params);
      const page = Number(params.page ?? 1);
      const pageSize = Number(params.pageSize ?? 20);
      const keyword = String(params.keyword ?? '').toLowerCase();
      const rows = getState(context).orders.filter((order) => {
        if (
          keyword &&
          !`${order.title} ${order.summary}`.toLowerCase().includes(keyword)
        )
          return false;
        if (
          params.departmentCode &&
          order.departmentCode !== params.departmentCode
        )
          return false;
        if (params.status && order.status !== params.status) return false;
        return true;
      });
      return createMockResponse({
        data: rows.slice((page - 1) * pageSize, page * pageSize),
        meta: {
          total: rows.length,
          page,
          pageSize,
          totalPages: Math.ceil(rows.length / pageSize),
        },
      });
    },
  },
  {
    method: 'GET',
    path: '/procurement/orders/:id',
    handler: (context) => {
      const order = getState(context).orders.find(
        (item) => item.id === context.params.id,
      );
      return order
        ? createMockResponse({ data: order })
        : createMockResponse({ message: 'order not found' }, 404);
    },
  },
  {
    method: 'POST',
    path: '/procurement/orders',
    handler: (context) => {
      const state = getState(context);
      const input = asObject(context.request.data);
      const now = new Date().toISOString();
      const order: ProcurementOrder = {
        id: `procurement-order-${state.nextOrderId++}`,
        orderNo: `CG${Date.now()}`,
        departmentCode: input.departmentCode as ProcurementDepartmentCode,
        dimensionType: (input.dimensionType ??
          'none') as ProcurementDimensionType,
        dimensionKey:
          typeof input.dimensionKey === 'string' ? input.dimensionKey : null,
        title: String(input.title ?? ''),
        summary: String(input.summary ?? ''),
        amount: Number(input.amount ?? 0),
        expenseDate:
          typeof input.expenseDate === 'string' ? input.expenseDate : null,
        status: 'draft',
        approvalChannel: 'internal',
        externalProcessInstanceId: null,
        externalStatus: null,
        externalSyncedAt: null,
        submittedAt: null,
        finalApprovedAt: null,
        createdBy: 'mock-admin',
        updatedBy: 'mock-admin',
        createdAt: now,
        updatedAt: now,
      };
      state.orders.unshift(order);
      return createMockResponse({ data: order }, 201);
    },
  },
  {
    method: 'POST',
    path: '/procurement/orders/:id/submit',
    handler: (context) => {
      const order = getState(context).orders.find(
        (item) => item.id === context.params.id,
      );
      if (!order)
        return createMockResponse({ message: 'order not found' }, 404);
      order.status = 'submitted';
      order.submittedAt = new Date().toISOString();
      return createMockResponse({ data: order }, 201);
    },
  },
  {
    method: 'GET',
    path: '/procurement/budgets/summary',
    handler: (context) => {
      const state = getState(context);
      const year = Number(asObject(context.request.params).year);
      const budgets = state.budgets
        .filter((budget) => budget.budgetYear === year && budget.isEnabled)
        .map((budget) => recalculateBudget(state, budget));
      const budgetAmount = budgets.reduce(
        (sum, budget) => sum + budget.budgetAmount,
        0,
      );
      const executedAmount = budgets.reduce(
        (sum, budget) => sum + budget.executedAmount,
        0,
      );
      return createMockResponse({
        data: {
          year,
          budgetAmount,
          executedAmount,
          executionRate:
            budgetAmount > 0
              ? Math.round((executedAmount / budgetAmount) * 10000) / 100
              : 0,
          overBudgetAmount: Math.max(executedAmount - budgetAmount, 0),
          isOverBudget: budgetAmount > 0 && executedAmount > budgetAmount,
          items: budgets.map(
            ({ id: _id, budgetYear: _budgetYear, ...item }) => item,
          ),
        },
      });
    },
  },
  {
    method: 'GET',
    path: '/procurement/admin/budgets',
    handler: (context) => {
      const state = getState(context);
      const params = asObject(context.request.params);
      const rows = state.budgets
        .filter((budget) => {
          if (budget.budgetYear !== Number(params.year)) return false;
          if (
            params.departmentCode &&
            budget.departmentCode !== params.departmentCode
          )
            return false;
          if (
            typeof params.isEnabled === 'boolean' &&
            budget.isEnabled !== params.isEnabled
          )
            return false;
          return true;
        })
        .map((budget) => recalculateBudget(state, budget));
      return createMockResponse({ data: rows });
    },
  },
  {
    method: 'POST',
    path: '/procurement/admin/budgets',
    handler: (context) => {
      const state = getState(context);
      const input = asObject(context.request.data);
      const now = new Date().toISOString();
      const dimension = state.dimensions.find(
        (item) => item.dimensionKey === input.dimensionKey,
      );
      const budget: ProcurementBudget = {
        id: `budget-${state.nextBudgetId++}`,
        budgetYear: Number(input.budgetYear),
        departmentCode: input.departmentCode as ProcurementDepartmentCode,
        dimensionType: input.dimensionType as ProcurementDimensionType,
        dimensionKey:
          typeof input.dimensionKey === 'string' ? input.dimensionKey : null,
        dimensionName: dimension?.dimensionName ?? '未细分',
        dimensionNameSnapshot: dimension?.dimensionName ?? '未细分',
        budgetAmount: Number(input.budgetAmount),
        executedAmount: 0,
        executionRate: 0,
        overBudgetAmount: 0,
        isOverBudget: false,
        isConfigured: true,
        isEnabled: true,
        createdBy: 'mock-admin',
        updatedBy: 'mock-admin',
        createdAt: now,
        updatedAt: now,
      };
      state.budgets.push(budget);
      createAudit(state, budget, {
        action: 'create',
        beforeAmount: null,
        afterAmount: budget.budgetAmount,
        beforeEnabled: null,
        afterEnabled: true,
        changeReason: String(input.changeReason ?? ''),
        changedBy: 'mock-admin',
      });
      return createMockResponse(
        { data: recalculateBudget(state, budget) },
        201,
      );
    },
  },
  {
    method: 'PATCH',
    path: '/procurement/admin/budgets/:id',
    handler: (context) => {
      const state = getState(context);
      const budget = state.budgets.find(
        (item) => item.id === context.params.id,
      );
      if (!budget)
        return createMockResponse({ message: 'budget not found' }, 404);
      const input = asObject(context.request.data);
      const beforeAmount = budget.budgetAmount;
      const beforeEnabled = budget.isEnabled;
      if (typeof input.budgetAmount === 'number')
        budget.budgetAmount = input.budgetAmount;
      if (typeof input.isEnabled === 'boolean')
        budget.isEnabled = input.isEnabled;
      budget.updatedAt = new Date().toISOString();
      budget.updatedBy = 'mock-admin';
      createAudit(state, budget, {
        action:
          beforeEnabled !== budget.isEnabled
            ? budget.isEnabled
              ? 'enable'
              : 'disable'
            : 'update',
        beforeAmount,
        afterAmount: budget.budgetAmount,
        beforeEnabled,
        afterEnabled: budget.isEnabled,
        changeReason: String(input.changeReason ?? ''),
        changedBy: 'mock-admin',
      });
      return createMockResponse({ data: recalculateBudget(state, budget) });
    },
  },
  {
    method: 'GET',
    path: '/procurement/admin/budgets/:id/audits',
    handler: (context) =>
      createMockResponse({
        data: getState(context).budgetAudits.filter(
          (audit) => audit.budgetId === context.params.id,
        ),
      }),
  },
];
