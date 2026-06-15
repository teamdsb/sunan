import type { MockRouteDefinition, MockState } from '../types';
import { createCertificatesMockState } from '../fixtures/certificates';
import { createFilesMockState } from '../fixtures/files';
import { createEnterpriseMockState } from '../fixtures/enterprise';
import { createMonitorsMockState } from '../fixtures/monitor';
import { createOfficeMockState } from '../fixtures/office';
import { createReminderMockState } from '../fixtures/reminders';
import { createSettingsMockState } from '../fixtures/settings';
import { createProcurementMockState } from '../fixtures/procurement';
import {
  buildRouteKey,
  hasPathParams,
  normalizeRouteShape,
  routePatternsConflict,
} from '../utils';

export function createMockState(handlers: MockRouteDefinition[]): MockState {
  const routes = new Map<string, MockRouteDefinition>();
  const patternRoutes: MockRouteDefinition[] = [];
  const routeShapes = new Set<string>();

  for (const handler of handlers) {
    const routeKey = buildRouteKey(handler.method, handler.path);
    const routeShape = buildRouteKey(
      handler.method,
      normalizeRouteShape(handler.path),
    );

    if (routeShapes.has(routeShape)) {
      throw new Error(`Duplicate mock route shape: ${routeShape}`);
    }

    routeShapes.add(routeShape);

    if (hasPathParams(handler.path)) {
      const conflictingPatternRoute = patternRoutes.find(
        (route) =>
          buildRouteKey(route.method, route.path) !== routeKey &&
          buildRouteKey(route.method, '') ===
            buildRouteKey(handler.method, '') &&
          routePatternsConflict(route.path, handler.path),
      );

      if (conflictingPatternRoute) {
        throw new Error(
          `Ambiguous mock route patterns: ${buildRouteKey(handler.method, handler.path)} conflicts with ${buildRouteKey(conflictingPatternRoute.method, conflictingPatternRoute.path)}`,
        );
      }

      patternRoutes.push(handler);
      continue;
    }

    routes.set(routeKey, handler);
  }

  return {
    routes,
    patternRoutes,
    runtimeState: {
      enterprise: createEnterpriseMockState(),
      files: createFilesMockState(),
      certificates: createCertificatesMockState(),
      reminder: createReminderMockState(),
      settings: createSettingsMockState(),
      monitor: createMonitorsMockState(),
      office: createOfficeMockState(),
      procurement: createProcurementMockState(),
    },
  };
}
