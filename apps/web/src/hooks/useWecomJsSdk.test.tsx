import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { useMemo, type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../app/store';
import { useWecomJsSdk } from './useWecomJsSdk';

const getSignature = vi.fn();
const store = createStore();

vi.mock('../features/auth/authApi', () => ({
  useLazyGetJssdkSignatureQuery: () => [getSignature],
}));

function wrapper({ children }: PropsWithChildren) {
  return <Provider store={store}>{children}</Provider>;
}

function useTestHook() {
  const jsApiList = useMemo(() => ['chooseImage'], []);
  const agentJsApiList = useMemo(() => ['openEnterpriseChat'], []);
  return useWecomJsSdk({ jsApiList, agentJsApiList });
}

function useCorpOnlyHook() {
  const jsApiList = useMemo(() => ['chooseImage'], []);
  return useWecomJsSdk({ jsApiList });
}

describe('useWecomJsSdk', () => {
  beforeEach(() => {
    getSignature.mockReset();
    window.sessionStorage.clear();
    window.sessionStorage.setItem('sunan_initial_url', 'https://initial.example.com/my');
  });

  it('uses iOS initial url and completes config flow', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'iPhone WeCom',
      configurable: true,
    });

    window.wx = {
      config: vi.fn(),
      ready: vi.fn((callback: () => void) => callback()),
      error: vi.fn(),
      agentConfig: vi.fn(({ success }) => success()),
    };

    getSignature
      .mockReturnValueOnce({
        unwrap: () =>
          Promise.resolve({
            data: {
              appId: 'ww-test',
              timestamp: 1,
              nonceStr: 'n1',
              signature: 's1',
            },
          }),
      })
      .mockReturnValueOnce({
        unwrap: () =>
          Promise.resolve({
            data: {
              appId: 'ww-test',
              timestamp: 2,
              nonceStr: 'n2',
              signature: 's2',
            },
          }),
      });

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(getSignature).toHaveBeenNthCalledWith(1, {
      url: 'https://initial.example.com/my',
      type: 'corp',
    });
    expect(window.wx.agentConfig).toHaveBeenCalled();
  });

  it('retries once and fails after second error on android url', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Android WeCom',
      configurable: true,
    });
    window.history.replaceState({}, '', '/my#hash');

    window.wx = {
      config: vi.fn(),
      ready: vi.fn(),
      error: vi.fn(),
      agentConfig: vi.fn(),
    };

    getSignature.mockReturnValue({
      unwrap: () => Promise.reject(new Error('signature failed')),
    });

    const { result } = renderHook(() => useCorpOnlyHook(), { wrapper });

    await waitFor(() => {
      expect(getSignature).toHaveBeenCalledTimes(2);
    });

    expect(getSignature).toHaveBeenNthCalledWith(1, {
      url: window.location.href.split('#')[0],
      type: 'corp',
    });
    expect(result.current.isReady).toBe(false);
  });
});
