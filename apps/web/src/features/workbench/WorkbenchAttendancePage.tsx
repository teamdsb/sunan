import { WorkbenchHomePage } from './WorkbenchHomePage';

export function WorkbenchAttendancePage() {
  return (
    <WorkbenchHomePage
      routeAware
      statisticsOnly
      heroTitle="考勤统计"
      heroDescription="查看月度签到汇总、部门记录和考勤趋势。"
      recordListTitle="考勤相关记录"
    />
  );
}
