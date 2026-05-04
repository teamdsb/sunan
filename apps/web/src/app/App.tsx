import AntApp from 'antd/es/app';
import ConfigProvider from 'antd/es/config-provider';
import zhCN from 'antd/es/locale/zh_CN';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '../router/AppRoutes';
import './app.css';

export function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#0f766e',
          fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif',
          borderRadius: 18,
          colorBgLayout: '#f4efe6',
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}
