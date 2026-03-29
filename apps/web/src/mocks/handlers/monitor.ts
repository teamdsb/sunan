import type { MonitorItem } from '../../features/monitor/monitorApi';
import type { MonitorMockState } from '../fixtures/monitor';
import { cloneMonitorItem } from '../fixtures/monitor';
import type { MockHandlerContext, MockRouteDefinition } from '../types';
import { createMockResponse } from '../utils';

type MonitorRuntimeState = MockHandlerContext['state'] & {
  monitor: MonitorMockState;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function toText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function toBoolean(value: unknown): boolean | null {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }

  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false;
  }

  return null;
}

function toSortOrder(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

function getMonitorState(context: MockHandlerContext): MonitorMockState {
  return (context.state as MonitorRuntimeState).monitor;
}

function cloneMonitors(monitors: MonitorItem[]): MonitorItem[] {
  return monitors.map((monitor) => cloneMonitorItem(monitor));
}

function filterMonitors(
  state: MonitorMockState,
  params: Record<string, unknown>,
  vesselIdOverride?: string,
): MonitorItem[] {
  const vesselId = vesselIdOverride ?? toText(params.vesselId);
  const activeOnly = toBoolean(params.activeOnly) ?? true;

  return state.monitors
    .filter((monitor) => {
      if (vesselId && monitor.vesselId !== vesselId) {
        return false;
      }

      if (activeOnly === true && !monitor.isActive) {
        return false;
      }

      return true;
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
}

function createMonitor(state: MonitorMockState, input: Record<string, unknown>): MonitorItem {
  const id = `monitor-${state.nextMonitorId++}`;

  return {
    id,
    vesselId: toText(input.vesselId, 'vessel-unknown'),
    monitorName: toText(input.monitorName, '未命名监控'),
    endpointUrl: toText(input.endpointUrl, `https://mock-monitor.local/${id}`),
    accessMode: input.accessMode === 'embed' ? 'embed' : 'external',
    sortOrder: toSortOrder(input.sortOrder, 0),
    isActive: typeof input.isActive === 'boolean' ? input.isActive : true,
  };
}

function findMonitor(state: MonitorMockState, id: string): MonitorItem | null {
  return state.monitors.find((monitor) => monitor.id === id) ?? null;
}

function updateMonitor(
  state: MonitorMockState,
  id: string,
  input: Record<string, unknown>,
): MonitorItem | null {
  const existing = findMonitor(state, id);
  if (!existing) {
    return null;
  }

  const next: MonitorItem = {
    ...existing,
    vesselId:
      input.vesselId === undefined ? existing.vesselId : toText(input.vesselId, existing.vesselId),
    monitorName:
      input.monitorName === undefined
        ? existing.monitorName
        : toText(input.monitorName, existing.monitorName),
    endpointUrl:
      input.endpointUrl === undefined
        ? existing.endpointUrl
        : toText(input.endpointUrl, existing.endpointUrl),
    accessMode:
      input.accessMode === 'external' || input.accessMode === 'embed'
        ? input.accessMode
        : existing.accessMode,
    sortOrder:
      input.sortOrder === undefined
        ? existing.sortOrder
        : toSortOrder(input.sortOrder, existing.sortOrder),
    isActive:
      input.isActive === undefined ? existing.isActive : Boolean(input.isActive),
  };

  const index = state.monitors.findIndex((monitor) => monitor.id === id);
  state.monitors[index] = next;
  return next;
}

function deleteMonitor(state: MonitorMockState, id: string): boolean {
  const index = state.monitors.findIndex((monitor) => monitor.id === id);
  if (index < 0) {
    return false;
  }

  state.monitors.splice(index, 1);
  return true;
}

export const monitorHandlers: MockRouteDefinition[] = [
  {
    method: 'GET',
    path: '/ship-monitors',
    handler: (context) => {
      const params = asObject(context.request.params);
      const monitors = filterMonitors(getMonitorState(context), params);

      return createMockResponse({
        data: cloneMonitors(monitors),
      });
    },
  },
  {
    method: 'POST',
    path: '/ship-monitors',
    handler: (context) => {
      const state = getMonitorState(context);
      const monitor = createMonitor(state, asObject(context.request.data));
      state.monitors.unshift(monitor);

      return createMockResponse(
        {
          data: cloneMonitorItem(monitor),
        },
        201,
      );
    },
  },
  {
    method: 'GET',
    path: '/ship-monitors/vessels/:vesselId',
    handler: (context) => {
      const params = asObject(context.request.params);
      const monitors = filterMonitors(
        getMonitorState(context),
        params,
        context.params.vesselId,
      );

      return createMockResponse({
        data: cloneMonitors(monitors),
      });
    },
  },
  {
    method: 'GET',
    path: '/ship-monitors/:id',
    handler: (context) => {
      const monitor = findMonitor(getMonitorState(context), context.params.id);

      if (!monitor) {
        return createMockResponse({ message: 'Ship monitor not found' }, 404);
      }

      return createMockResponse({
        data: cloneMonitorItem(monitor),
      });
    },
  },
  {
    method: 'PATCH',
    path: '/ship-monitors/:id',
    handler: (context) => {
      const monitor = updateMonitor(
        getMonitorState(context),
        context.params.id,
        asObject(context.request.data),
      );

      if (!monitor) {
        return createMockResponse({ message: 'Ship monitor not found' }, 404);
      }

      return createMockResponse({
        data: cloneMonitorItem(monitor),
      });
    },
  },
  {
    method: 'DELETE',
    path: '/ship-monitors/:id',
    handler: (context) => {
      if (!deleteMonitor(getMonitorState(context), context.params.id)) {
        return createMockResponse({ message: 'Ship monitor not found' }, 404);
      }

      return createMockResponse(undefined, 204);
    },
  },
];
