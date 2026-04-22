import { Navigate, useParams } from 'react-router-dom';
import { workbenchRouteConfig } from '../../router/workbenchRouteConfig';
import { WorkbenchHomePage } from './WorkbenchHomePage';

export function WorkbenchModulePage() {
  const { moduleCode } = useParams<{ moduleCode: string }>();

  if (!moduleCode) {
    return <Navigate to={workbenchRouteConfig.home.path} replace />;
  }

  return (
    <WorkbenchHomePage
      routeAware
      initialModuleCode={moduleCode}
      heroTitle="模块工作台"
      heroDescription="按模块查看记录、详情、打印能力与审批动作，作为 M6 工作平台模块化路由入口。"
    />
  );
}
