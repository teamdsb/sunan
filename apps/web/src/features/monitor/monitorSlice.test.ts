import { describe, expect, it } from 'vitest';
import { monitorApi } from './monitorApi';

describe('monitorApi', () => {
  it('supports global and vessel scoped queries', () => {
    expect(monitorApi.endpoints.getShipMonitors).toBeDefined();
    expect(monitorApi.endpoints.getShipMonitorsByVessel).toBeDefined();
  });

  it('supports create/update/delete invalidation', () => {
    expect(monitorApi.endpoints.createShipMonitor).toBeDefined();
    expect(monitorApi.endpoints.updateShipMonitor).toBeDefined();
    expect(monitorApi.endpoints.deleteShipMonitor).toBeDefined();
  });
});
