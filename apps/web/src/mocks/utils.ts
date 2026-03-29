import type {
  MockResponse,
  MockRouteDefinition,
  MockRouteMatch,
  MockState,
} from './types';

export function normalizeMethod(method: string | undefined): string {
  return (method ?? 'GET').toUpperCase();
}

export function normalizePath(url: string): string {
  if (!url) {
    return '/';
  }

  if (/^https?:\/\//.test(url)) {
    return new URL(url).pathname;
  }

  const [path] = url.split('?');
  return path || '/';
}

export function buildRouteKey(method: string | undefined, url: string): string {
  return `${normalizeMethod(method)} ${normalizePath(url)}`;
}

function tokenizePath(path: string): string[] {
  const normalized = normalizePath(path);

  if (normalized === '/') {
    return [];
  }

  return normalized.split('/').filter(Boolean);
}

export function normalizeRouteShape(path: string): string {
  const segments = tokenizePath(path);

  if (segments.length === 0) {
    return '/';
  }

  const normalizedSegments = segments.map((segment) =>
    segment.startsWith(':') ? ':param' : segment,
  );

  return `/${normalizedSegments.join('/')}`;
}

export function hasPathParams(path: string): boolean {
  return tokenizePath(path).some((segment) => segment.startsWith(':'));
}

export function routePatternsConflict(pathA: string, pathB: string): boolean {
  const segmentsA = tokenizePath(pathA);
  const segmentsB = tokenizePath(pathB);

  if (segmentsA.length !== segmentsB.length) {
    return false;
  }

  return segmentsA.every((segmentA, index) => {
    const segmentB = segmentsB[index];
    const aIsParam = segmentA.startsWith(':');
    const bIsParam = segmentB.startsWith(':');

    return aIsParam || bIsParam || segmentA === segmentB;
  });
}

export function matchRoutePath(
  routePath: string,
  requestUrl: string,
): Record<string, string> | null {
  const routeSegments = tokenizePath(routePath);
  const requestSegments = tokenizePath(requestUrl);

  if (routeSegments.length !== requestSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < routeSegments.length; index += 1) {
    const routeSegment = routeSegments[index];
    const requestSegment = requestSegments[index];

    if (routeSegment.startsWith(':')) {
      const key = routeSegment.slice(1);

      if (!key || !requestSegment) {
        return null;
      }

      params[key] = decodeURIComponent(requestSegment);
      continue;
    }

    if (routeSegment !== requestSegment) {
      return null;
    }
  }

  return params;
}

function matchPatternRoutes(
  routes: MockRouteDefinition[],
  method: string | undefined,
  url: string,
): MockRouteMatch | null {
  const normalizedMethod = normalizeMethod(method);

  for (const route of routes) {
    if (normalizeMethod(route.method) !== normalizedMethod) {
      continue;
    }

    const params = matchRoutePath(route.path, url);

    if (params) {
      return {
        route,
        params,
      };
    }
  }

  return null;
}

export function resolveMockRoute(
  state: MockState,
  method: string | undefined,
  url: string,
): MockRouteMatch | null {
  const routeKey = buildRouteKey(method, url);
  const exactRoute = state.routes.get(routeKey);

  if (exactRoute) {
    return {
      route: exactRoute,
      params: {},
    };
  }

  return matchPatternRoutes(state.patternRoutes, method, url);
}

export function createMockResponse(data?: unknown, status = 200): MockResponse {
  return { status, data };
}
