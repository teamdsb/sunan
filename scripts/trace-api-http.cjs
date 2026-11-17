// Opt-in integration evidence only. Logs route/method/status, never bodies,
// query strings, headers, cookies or credentials. No change to request handling.
const http = require('node:http');
const fs = require('node:fs');
const target = process.env.API_AUDIT_HTTP_TRACE;
if (target && !http.Server.prototype.__sunanApiAudit) {
  const emit = http.Server.prototype.emit;
  Object.defineProperty(http.Server.prototype, '__sunanApiAudit', { value: true });
  http.Server.prototype.emit = function (event, request, response, ...args) {
    if (event === 'request' && request && response) {
      response.once('finish', () => {
        const pathname = (request.originalUrl || request.url || '').split('?')[0];
        if (!pathname.startsWith('/api/')) return;
        const route = request.route?.path;
        const registeredRoute = typeof route === 'string' ? route : Array.isArray(route) ? route.filter((value) => typeof value === 'string') : null;
        fs.appendFileSync(target, JSON.stringify({ method: request.method, pathname, registeredRoute, status: response.statusCode }) + '\n');
      });
    }
    return emit.call(this, event, request, response, ...args);
  };
}
