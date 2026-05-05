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
          colorPrimary: '#1769e0',
          colorInfo: '#1769e0',
          colorLink: '#0b58c7',
          colorBgLayout: '#f1f7ff',
          colorText: '#102a43',
          colorTextSecondary: '#5b708a',
          colorBorder: 'rgba(23, 105, 224, 0.16)',
          borderRadius: 12,
          fontFamily: '"Alibaba PuHuiTi", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
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
