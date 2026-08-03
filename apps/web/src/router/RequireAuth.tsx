import Result from 'antd/es/result';
import Spin from 'antd/es/spin';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { setAuthStatus } from '../features/auth/authSlice';
import { redirectToOAuth } from '../features/auth/oauth';

export function RequireAuth() {
  const authStatus = useAppSelector((state) => state.auth.authStatus);
  const token = useAppSelector((state) => state.auth.token);
  const dispatch = useAppDispatch();
  const location = useLocation();

  useEffect(() => {
    if (!token) {
      dispatch(setAuthStatus('authorizing'));
      redirectToOAuth(location.pathname + location.search + location.hash);
      return;
    }

    dispatch(setAuthStatus('authenticated'));
  }, [dispatch, location.hash, location.pathname, location.search, token]);

  if (!token || authStatus === 'authorizing') {
    return (
      <Result
        icon={<Spin size="large" />}
        title="正在跳转企业微信授权"
        subTitle="如果没有自动跳转，请确认当前环境在企业微信工作台内。"
      />
    );
  }

  return <Outlet />;
}
