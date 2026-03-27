import { Alert, Card, Result, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../../app/hooks';
import { useLazyGetCurrentUserQuery, useLazyWecomCallbackQuery } from './authApi';
import { loginSucceeded, logout, setCurrentUser } from './authSlice';
import { consumeRedirectTarget, verifyOauthState } from './oauth';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [triggerCallback] = useLazyWecomCallbackQuery();
  const [triggerCurrentUser] = useLazyGetCurrentUserQuery();

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (!code || !state) {
        setError('缺少企业微信回调参数。');
        dispatch(logout());
        return;
      }

      if (!verifyOauthState(state)) {
        setError('登录状态校验失败，请重新进入应用。');
        dispatch(logout());
        return;
      }

      try {
        const callbackResponse = await triggerCallback({ code, state }).unwrap();
        dispatch(loginSucceeded(callbackResponse.data));
        const currentUserResponse = await triggerCurrentUser().unwrap();
        dispatch(setCurrentUser(currentUserResponse.data));
        navigate(consumeRedirectTarget(), { replace: true });
      } catch {
        dispatch(logout());
        setError('登录失败，请稍后重试。');
      }
    };

    void run();
  }, [dispatch, navigate, searchParams, triggerCallback, triggerCurrentUser]);

  return (
    <div className="callback-panel">
      <Card className="callback-card" variant="borderless">
        {error ? (
          <Result
            status="error"
            title="认证未完成"
            subTitle={error}
            extra={<Alert type="warning" showIcon message="关闭页面后重新从企业微信进入。" />}
          />
        ) : (
          <Spin size="large">
            <Result
              status="info"
              title="正在完成企业微信登录"
              subTitle={
                <Typography.Text type="secondary">
                  正在换取 JWT 并恢复访问上下文。
                </Typography.Text>
              }
            />
          </Spin>
        )}
      </Card>
    </div>
  );
}
