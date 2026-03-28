import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from './AppRoutes';
import { authReducer, loginSucceeded } from '../features/auth/authSlice';
import { myUiReducer } from '../features/ui/myUiSlice';
import { baseApi } from '../app/baseApi';

vi.mock('../features/ui/MyHomePage', () => ({
  MyHomePage: () => <div>MY_HOME</div>,
}));

vi.mock('../features/reminder/ReminderDashboardPage', () => ({
  ReminderDashboardPage: () => <div>REMINDER_DASHBOARD</div>,
}));

vi.mock('../features/reminder/ReminderDetailPage', () => ({
  ReminderDetailPage: () => <div>REMINDER_DETAIL</div>,
}));

function renderRoute(path: string) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      myUi: myUiReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });
  store.dispatch(
    loginSucceeded({
      accessToken: 'token',
      expiresIn: 3600,
      user: {
        userId: 'u1',
        name: '张三',
        department: ['总经办'],
        roles: ['all_authenticated'],
      },
    }),
  );

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>,
  );
}

describe('AppRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the my home page at /my', () => {
    renderRoute('/my');
    expect(screen.getByText('MY_HOME')).toBeInTheDocument();
  });

  it('renders reminder dashboard and detail routes', () => {
    renderRoute('/my/reminders');
    expect(screen.getByText('REMINDER_DASHBOARD')).toBeInTheDocument();

    renderRoute('/my/reminders/1');
    expect(screen.getByText('REMINDER_DETAIL')).toBeInTheDocument();
  });
});
