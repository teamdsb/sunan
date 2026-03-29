import type { MonitorItem } from '../../features/monitor/monitorApi';

export interface MonitorMockState {
  monitors: MonitorItem[];
  nextMonitorId: number;
}

export function cloneMonitorItem(item: MonitorItem): MonitorItem {
  return { ...item };
}

export function createMonitorsMockState(): MonitorMockState {
  return {
    monitors: [
      {
        id: 'monitor-1',
        vesselId: 'vessel-012',
        monitorName: '苏南012驾驶台直播',
        endpointUrl: 'https://mock-monitor.local/vessels/vessel-012/live',
        accessMode: 'embed',
        sortOrder: 1,
        isActive: true,
      },
      {
        id: 'monitor-2',
        vesselId: 'vessel-012',
        monitorName: '苏南012机舱回放',
        endpointUrl: 'https://mock-monitor.local/vessels/vessel-012/engine-room',
        accessMode: 'external',
        sortOrder: 2,
        isActive: false,
      },
    ],
    nextMonitorId: 3,
  };
}
