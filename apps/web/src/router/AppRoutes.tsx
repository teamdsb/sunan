import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthCallbackPage } from '../features/auth/AuthCallbackPage';
import { AppShell } from '../layouts/AppShell';
import { PlaceholderPage } from './PlaceholderPage';
import { RequireAuth } from './RequireAuth';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route
            path="/my"
            element={
              <PlaceholderPage
                title="我的模块首页"
                description="六宫格与功能卡片后续在 Wave 3 接入。当前已具备受保护路由与认证上下文。"
              />
            }
          />
          <Route
            path="/my/enterprise-profile"
            element={
              <PlaceholderPage
                title="企业资料"
                description="为企业资料列表、详情与附件管理预留挂载点。"
              />
            }
          />
          <Route
            path="/my/enterprise-policy"
            element={
              <PlaceholderPage
                title="企业制度"
                description="为制度列表、版本历史与预览流程预留挂载点。"
              />
            }
          />
          <Route
            path="/my/settings"
            element={
              <PlaceholderPage
                title="设置"
                description="为用户偏好、提醒参数和轻量设置预留挂载点。"
              />
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/my" replace />} />
    </Routes>
  );
}
