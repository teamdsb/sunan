import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from './app/App';
import { bootstrapAuth } from './features/auth/bootstrap';
import { store } from './app/store';
import { captureInitialUrl } from './features/auth/oauth';

captureInitialUrl();
bootstrapAuth(store.dispatch);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <App />
  </Provider>,
);
