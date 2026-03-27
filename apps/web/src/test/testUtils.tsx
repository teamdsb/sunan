import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render, type RenderOptions } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { authReducer } from '../features/auth/authSlice';
import { myUiReducer } from '../features/ui/myUiSlice';
import { baseApi } from '../app/baseApi';

export function createTestStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      myUi: myUiReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });
}

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', ...renderOptions }: ExtendedRenderOptions = {},
) {
  const store = createTestStore();

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
