import {
  AttendanceReport,
  departmentName,
  dutyName,
  fuelReport,
  shanghaiTime,
} from './business-reports';
import { businessReportPdf } from './business-report-pdf';
import { workbook } from './business-report-workbook';
import type { WorkbenchLearningService } from './workbench-learning.service';

type LearningStatistics = Awaited<
  ReturnType<WorkbenchLearningService['statistics']>
>;
type LearningView = ReturnType<WorkbenchLearningService['view']>;
type FuelStatistics = Omit<
  ReturnType<typeof fuelReport>,
  'receipts' | 'unconfirmed'
> & {
  receipts: Array<
    ReturnType<typeof fuelReport>['receipts'][number] & { vesselName: string }
  >;
  unconfirmed: Array<
    ReturnType<typeof fuelReport>['unconfirmed'][number] & {
      vesselName: string;
    }
  >;
};
export function attendancePdf(
  report: AttendanceReport,
  generatedAt = new Date(),
) {
  return businessReportPdf({
    title: `${report.month} 考勤报表`,
    scope: `统计月份：${report.month}    部门：${report.departmentCode ? departmentName(report.departmentCode) : '全部可见部门'}    时间口径：上海`,
    generatedAt,
    landscape: true,
    summary: [
      { label: '统计人数', value: `${report.people.length} 人` },
      { label: '人员记录', value: `${report.details.length} 条` },
      {
        label: '未登记工时',
        value: `${report.details.filter((r) => r.workHours === null).length} 条`,
      },
    ],
    sections: [
      {
        title: '人员汇总',
        note: '工时单位：小时。缺失工时单列提示；同部门同名历史人员请结合明细核对。',
        columns: [
          { label: '姓名', weight: 1.5 },
          { label: '部门', weight: 1.5 },
          { label: '出勤天数', weight: 1, align: 'right' },
          { label: '记录数', weight: 1, align: 'right' },
          { label: '已登记工时', weight: 1.3, align: 'right' },
          { label: '未登记工时记录', weight: 1.5, align: 'right' },
        ],
        rows: report.people.map((p) => [
          p.personName,
          departmentName(p.departmentCode),
          p.days,
          p.recordCount,
          p.workHours,
          p.missingHours,
        ]),
      },
      {
        title: '考勤明细',
        note: '缺失工时和范围以“未登记”显示；记录编号可用于回查原始业务。',
        columns: [
          { label: '姓名 / 部门', weight: 1.25 },
          { label: '日期 / 时段', weight: 1.6 },
          { label: '船舶 / 出勤类型', weight: 1.7 },
          { label: '工时', weight: 0.9, align: 'right' },
          { label: '状态 / 范围内', weight: 1.1 },
          { label: '记录编号 / 标题 / 来源', weight: 3 },
        ],
        rows: report.details.map((r) => [
          `${r.personName}\n${departmentName(r.departmentCode)}`,
          `${r.occurredAt}\n${r.period === 'am' ? '上午' : '下午'}`,
          `${r.vesselName}\n${dutyName(r.dutyType)}`,
          r.workHours ?? '未登记',
          `${r.statusName}\n${r.locationInRange === null ? '未登记' : r.locationInRange ? '范围内' : '范围外'}`,
          `${r.recordNo}\n${r.title}\n${r.source}`,
        ]),
      },
    ],
  });
}
export function learningPdf(input: {
  title: string;
  summary: string;
  recordNo: string;
  learning: LearningView;
  paperSize: 'A4' | 'A3';
  generatedAt: Date;
}) {
  const view = input.learning;
  return businessReportPdf({
    title: input.title,
    scope: `培训与案例学习    记录编号：${input.recordNo}`,
    paperSize: input.paperSize,
    generatedAt: input.generatedAt,
    summary: [
      { label: '可见参训成员', value: `${view?.totalPeople ?? 0} 人` },
      { label: '完成率', value: `${view?.completionRate ?? 0}%` },
      { label: '每人完成学时', value: `${view?.hours ?? 0} 小时` },
    ],
    sections: [
      {
        title: '学习内容',
        columns: [{ label: '内容说明', weight: 1 }],
        rows: [[input.summary || '未填写内容说明']],
      },
      {
        title: '学习材料',
        columns: [
          { label: '序号', weight: 0.5, align: 'center' },
          { label: '材料名称', weight: 4 },
        ],
        rows: (view?.materials ?? []).map((m, i) => [i + 1, m.title]),
        emptyText: '尚未下发学习材料',
      },
      {
        title: '个人学习进度',
        note: '进度以本人确认的材料计算；全部完成后计入学时，不代表视频播放时长。',
        columns: [
          { label: '姓名', weight: 1.3 },
          { label: '进度', weight: 0.8, align: 'right' },
          { label: '完成学时', weight: 0.9, align: 'right' },
          { label: '完成时间（上海）', weight: 2 },
        ],
        rows: (view?.learners ?? []).map((p) => [
          p.name,
          `${p.progressPercent}%`,
          p.completedHours,
          p.completedAt ? shanghaiTime(p.completedAt) : '未完成',
        ]),
        emptyText: '尚未下发学习',
      },
    ],
  });
}
export function fuelWorkbook(fuel: FuelStatistics, generatedAt = new Date()) {
  return workbook(
    [
      {
        name: '燃油月报',
        note: '月耗 = 期初余量 + 实际加注 - 月末实测；油量按行中单位计量，升与吨不混算。“待核对”不代表零耗量。',
        headers: [
          '月份',
          '船舶',
          '油品',
          '单位',
          '期初余量',
          '实际加注',
          '月耗',
          '月末实测',
          '低余量',
          '待核对',
        ],
        widths: [14, 24, 14, 10, 16, 16, 16, 16, 12, 42],
        freezeColumns: 2,
        rows: fuel.rows.map((r) => ({
          月份: fuel.month,
          船舶: r.vesselName,
          油品: r.fuelType,
          单位: r.unit,
          期初余量: r.openingBalance ?? '未登记',
          实际加注: r.bunkeredAmount,
          月耗: r.consumedAmount ?? '待核对',
          月末实测: r.closingBalance ?? '未登记',
          低余量: r.lowFuel ? '是' : '否',
          待核对: r.issues.join('；'),
        })),
      },
      {
        name: '实际加注明细',
        headers: [
          '记录编号',
          '船舶',
          '油品',
          '单位',
          '实际加注量',
          '时间（上海）',
        ],
        rows: fuel.receipts.map((r) => ({
          记录编号: r.recordNo,
          船舶: r.vesselName,
          油品: r.fuelType,
          单位: r.unit,
          实际加注量: r.amount,
          '时间（上海）': r.occurredAt,
        })),
      },
      {
        name: '待登记实绩',
        headers: ['记录', '船舶'],
        widths: [55, 32],
        note: '以下批准申请尚未登记实际加注；申请数量不会自动计入实收。',
        rows: fuel.unconfirmed.map((r) => ({
          记录: r.title,
          船舶: r.vesselName,
        })),
      },
    ],
    {
      title: `${fuel.month} 燃油月报`,
      scope: `统计月份：${fuel.month} | 当前账号可见船舶`,
      generatedAt,
    },
  );
}
export function learningWorkbook(
  learning: LearningStatistics,
  month?: string,
  generatedAt = new Date(),
) {
  return workbook(
    [
      {
        name: '个人学时',
        headers: ['姓名', '已分配', '已完成', '完成率（%）', '完成学时'],
        note: '学时单位：小时；全部材料确认完成后计入学时。进度以成员本人确认计算。',
        rows: learning.people.map((r) => ({
          姓名: r.name,
          已分配: r.assigned,
          已完成: r.completed,
          '完成率（%）': r.completionRate,
          完成学时: r.completedHours,
        })),
      },
      {
        name: '学习明细',
        headers: ['课程', '姓名', '进度（%）', '完成时间', '完成学时'],
        widths: [42, 20, 16, 24, 16],
        rows: learning.courses.flatMap((c) =>
          (c.learners ?? []).map((r) => ({
            课程: c.title,
            姓名: r.name,
            '进度（%）': r.progressPercent,
            完成时间: r.completedAt ? shanghaiTime(r.completedAt) : '未完成',
            完成学时: r.completedHours,
          })),
        ),
      },
    ],
    {
      title: '个人学习与学时统计',
      scope: `课程月份：${month ?? '全部'} | 当前账号可见成员`,
      generatedAt,
    },
  );
}
