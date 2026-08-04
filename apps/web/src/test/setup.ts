import '@testing-library/jest-dom';

import { vi } from 'vitest';

process.env.TZ = 'Asia/Shanghai';

vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000/api/v1');
vi.stubEnv('VITE_WECOM_CORP_ID', 'ww-test');
vi.stubEnv('VITE_WECOM_AGENT_ID', '1000002');
vi.stubEnv('VITE_WECOM_REDIRECT_URI', 'http://localhost:5173/auth/callback');

Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'uuid-test',
  },
  configurable: true,
});

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

Object.defineProperty(window, 'localStorage', {
  value: createMemoryStorage(),
  configurable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: createMemoryStorage(),
  configurable: true,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

Object.defineProperty(window, 'getComputedStyle', {
  configurable: true,
  value: () =>
    ({
      getPropertyValue: (property: string) => {
        void property;
        return '';
      },
      overflow: 'auto',
      overflowX: 'auto',
      overflowY: 'auto',
      width: '0px',
      height: '0px',
      paddingLeft: '0px',
      paddingRight: '0px',
      paddingTop: '0px',
      paddingBottom: '0px',
      marginLeft: '0px',
      marginRight: '0px',
      marginTop: '0px',
      marginBottom: '0px',
    }) as CSSStyleDeclaration,
});
