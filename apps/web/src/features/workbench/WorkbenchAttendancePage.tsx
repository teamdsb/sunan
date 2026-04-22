import { WorkbenchHomePage } from './WorkbenchHomePage';

export function WorkbenchAttendancePage() {
  return (
    <WorkbenchHomePage
      routeAware
      statisticsOnly
      heroTitle="考勤统计"
      heroDescription="M6 将签到台与月度统计从工作台首页中拆出，形成可直达的统计看板入口。"
      recordListTitle="考勤相关记录"
    />
  );
}
