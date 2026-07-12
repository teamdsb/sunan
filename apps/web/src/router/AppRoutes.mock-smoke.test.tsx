import { cleanup, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const redirectToOAuth = vi.hoisted(() => vi.fn());
const routeContentTimeout = 60000;

vi.mock('../features/auth/oauth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/auth/oauth')>();
  return {
    ...actual,
    redirectToOAuth,
  };
});

async function renderMockRoute(path: string) {
  vi.stubEnv('VITE_MOCK_MODE', 'true');

  const { createStore } = await import('../app/store');
  const { bootstrapAuth } = await import('../features/auth/bootstrap');
  const { AppRoutes } = await import('./AppRoutes');

  const store = createStore();
  await bootstrapAuth(store.dispatch);

  render(
    <Provider store={store}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>,
  );
}

describe('AppRoutes mock direct-entry smoke', () => {
  beforeEach(() => {
    redirectToOAuth.mockReset();
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it.each([
    ['/my', '常用业务一屏触达，船务状态集中提醒', 'my', '常用模块'],
    ['/office', '统一办事入口，按部门与主题快速办理', 'office', '海事申报入口'],
    ['/procurement', '从采购申请到供应商履约的闭环管理', 'procurement', '采购执行清单'],
    ['/procurement/orders/new', '新建采购单', 'procurement', '摘要/事由'],
    ['/procurement/orders/procurement-order-1', '采购单详情', 'procurement', '苏南012甲板备件采购'],
    ['/workbench', '工作平台', 'workbench', '任务看板'],
    ['/workbench/modules/shipping_chart_update', '模块工作台', 'workbench', '审批看板'],
  ] as const)(
    'renders %s through the real mock runtime without oauth redirect',
    async (path, title, moduleKey, expectedText) => {
      await renderMockRoute(path);

      expect(
        await screen.findByRole('heading', { name: title }, { timeout: routeContentTimeout }),
      ).toBeInTheDocument();
      expect(
        await screen.findAllByText(expectedText, undefined, {
          timeout: routeContentTimeout,
        }),
      ).not.toHaveLength(0);

      const shell = document.querySelector('.shell-layout-enterprise');
      expect(shell).toBeInTheDocument();
      expect(shell).toHaveClass(`shell-layout-module-${moduleKey}`);
      if (path === '/my') {
        expect(shell).toHaveClass('shell-layout-my-home');
      } else {
        expect(shell).not.toHaveClass('shell-layout-my-home');
      }
      expect(redirectToOAuth).not.toHaveBeenCalled();
    },
    routeContentTimeout,
  );
});
