import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSignature = vi.fn();

vi.mock('../features/auth/authApi', () => ({
  useLazyGetJssdkSignatureQuery: () => [getSignature],
}));

describe('useWecomJsSdk mock mode', () => {
  beforeEach(() => {
    vi.resetModules();
    getSignature.mockReset();
    vi.stubEnv('VITE_MOCK_MODE', 'true');
  });

  it('marks js-sdk ready without calling signature api', async () => {
    const { createStore } = await import('../app/store');
    const { useWecomJsSdk } = await import('./useWecomJsSdk');
    const wrapper = ({ children }: PropsWithChildren) => <Provider store={createStore()}>{children}</Provider>;

    const { result } = renderHook(
      () => useWecomJsSdk({ jsApiList: ['chooseImage'] }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(getSignature).not.toHaveBeenCalled();
  });
});
