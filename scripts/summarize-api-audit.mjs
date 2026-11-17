#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const output = path.resolve(process.argv[2] || 'output/api-audit-2026-11-17');
const inventory = JSON.parse(fs.readFileSync(path.join(output, 'source-contracts.json'), 'utf8'));
const traces = fs.readdirSync(output).filter((name) => /http\.(jsonl|ndjson)$/.test(name)).flatMap((name) => {
  const file = path.join(output, name);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((line) => ({ ...JSON.parse(line), sourceTrace: name })) : [];
});
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const routeRegex = (route) => new RegExp('^' + route.path.split('/').map((part) => part.startsWith(':') ? '[^/]+' : escape(part)).join('/') + '/?$');
const routes = inventory.routes.map((route) => {
  const regex = routeRegex(route);
  const requests = traces.filter((request) => {
    if (request.method !== route.method) return false;
    // Express's matched route avoids counting /issues/statistics as /issues/:id.
    if (typeof request.registeredRoute === 'string') return request.registeredRoute.replace(/\/$/, '') === route.path;
    if (Array.isArray(request.registeredRoute)) return request.registeredRoute.includes(route.path) && regex.test(request.pathname);
    return regex.test(request.pathname);
  });
  const statuses = Object.fromEntries([...new Set(requests.map((request) => request.status))].sort().map((status) => [status, requests.filter((request) => request.status === status).length]));
  const finalRequests = requests.filter((request) => /^(integration-final-rerun|browser-final)-http\./.test(request.sourceTrace));
  return { ...route, requestCount: requests.length, positiveHttpObserved: requests.some((request) => request.status >= 200 && request.status < 300), statuses,
    evidenceFiles: [...new Set(requests.map((request) => request.sourceTrace))],
    finalRunRequestCount: finalRequests.length,
    finalRunPositiveHttpObserved: finalRequests.some((request) => request.status >= 200 && request.status < 300) };
});
const result = {
  summary: { ...inventory.summary, observedRequests: traces.length, routesObserved: routes.filter((route) => route.requestCount).length, routesWith2xx: routes.filter((route) => route.positiveHttpObserved).length, routesWithoutObservedHttp: routes.filter((route) => !route.requestCount).length,
    finalRunRoutesObserved: routes.filter((route) => route.finalRunRequestCount).length,
    finalRunRoutesWith2xx: routes.filter((route) => route.finalRunPositiveHttpObserved).length },
  caveat: 'Local synthetic integration/browser HTTP evidence. A 2xx response is not proof of all business branches. Negative tests intentionally include 4xx/5xx. External production/device/delivery validation is not included.',
  routes,
};
fs.writeFileSync(path.join(output, 'route-coverage.json'), JSON.stringify(result, null, 2) + '\n');
const csv = (values) => values.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',');
fs.writeFileSync(path.join(output, 'route-coverage.csv'), [
  csv(['method', 'path', 'controller', 'frontendCalls', 'requestCount', 'statuses', 'finalRun2xx', 'evidenceFiles']),
  ...routes.map((route) => csv([route.method, route.path, route.controller, route.frontendCalls.length, route.requestCount, JSON.stringify(route.statuses), route.finalRunPositiveHttpObserved, route.evidenceFiles.join(';')])),
].join('\n') + '\n');
console.log(JSON.stringify(result.summary, null, 2));
for (const route of routes.filter((route) => !route.requestCount)) console.log(`NO_HTTP ${route.method} ${route.path}`);
for (const route of routes.filter((route) => route.requestCount && !route.positiveHttpObserved)) console.log(`NO_2XX ${route.method} ${route.path} ${JSON.stringify(route.statuses)}`);
