import { Navigate, useParams } from 'react-router-dom';
import { workbenchRouteConfig } from '../../router/workbenchRouteConfig';
import { WorkbenchHomePage } from './WorkbenchHomePage';

export function WorkbenchRecordDetailPage() {
  const { recordId } = useParams<{ recordId: string }>();

  if (!recordId) {
    return <Navigate to={workbenchRouteConfig.home.path} replace />;
  }

  return (
    <WorkbenchHomePage
      routeAware
      initialRecordId={recordId}
      heroTitle="记录详情"
      heroDescription="通过独立详情路由打开工作平台记录，保留企业微信内返回和回看能力。"
    />
  );
}
