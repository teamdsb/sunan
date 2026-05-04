import { WorkbenchHomePage } from './WorkbenchHomePage';

export function WorkbenchApprovalPage() {
  return (
    <WorkbenchHomePage
      routeAware
      moduleFilter="requiresApproval"
      heroTitle="审批看板"
      heroDescription="聚焦企业微信审批类模块，便于在正式上线前后统一回看审批发起、回调和镜像状态。"
      recordListTitle="审批相关记录"
    />
  );
}
