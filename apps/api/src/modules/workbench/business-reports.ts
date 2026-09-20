import { BadRequestException } from '@nestjs/common';
import { workbook } from './business-report-workbook';
export { workbook } from './business-report-workbook';

const departments: Record<string, string> = {
  general_office: '总经办',
  finance: '财务部',
  shipping: '船务部',
  business: '综合部',
  logistics: '后勤部',
  workgroup: '工作组',
};
const statuses: Record<string, string> = {
  draft: '草稿',
  submitted: '已提交',
  assigned: '已分配',
  in_progress: '进行中',
  pending_review: '待审核',
  closed: '已关闭',
  archived: '已归档',
  approval_pending: '审批中',
  approval_passed: '审批通过',
  rework_required: '待返工',
};
const duties: Record<string, string> = {
  normal: '正常出勤',
  business_trip: '出差',
  dispatch: '外派',
};
export const dutyName = (code: string) => duties[code] || code;
export const departmentName = (code: string) => departments[code] || code;
export const LEARNING_MODULES = [
  'goa_training',
  'shipping_training_hours',
  'shipping_case_study',
];
export const FUEL_MODULE = 'shipping_fuel_bunkering_approval';
export const FUEL_MEASUREMENT = 'shipping_fuel_measurement';
const ATTENDANCE = [
  'finance_attendance',
  'shipping_attendance',
  'business_signin_desk',
];
const OPERATIONS = [
  'business_receiving_workgroup_flow',
  'business_oil_boom_operation',
  'business_ship_garbage_operation',
  'business_ship_oily_water_operation',
  'business_domestic_sewage_operation',
  'business_operation_flow',
  'zhongchuan_operation_flow',
  'pinglu_operation_flow',
];
export interface ReportRecord {
  id: string;
  recordNo?: string;
  moduleCode: string;
  departmentCode: string;
  title: string;
  status: string;
  vesselId: string | null;
  occurredAt: string | Date;
  payload: Record<string, unknown>;
}
export const textValue = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';
export const numberValue = (value: unknown): number | null => {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    typeof value === 'boolean' ||
    typeof value === 'object'
  )
    return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
};
export const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 1000) / 1000;
export function shanghaiTime(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Date(date.getTime() + 8 * 3600_000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');
}
export function reportMonth(month?: string) {
  const result = month || shanghaiTime(new Date()).slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(result))
    throw new BadRequestException('月份必须为有效的 YYYY-MM');
  return result;
}
const usable = (record: ReportRecord) =>
  ![
    'voided',
    'void',
    'terminated',
    'approval_rejected',
    'approval_canceled',
    'approval_terminated',
  ].includes(record.status);
export function attendanceReport(
  records: ReportRecord[],
  inputMonth?: string,
  departmentCode?: string,
) {
  const month = reportMonth(inputMonth);
  const details = records
    .filter(
      (record) =>
        usable(record) &&
        (ATTENDANCE.includes(record.moduleCode) ||
          OPERATIONS.includes(record.moduleCode)) &&
        shanghaiTime(record.occurredAt).startsWith(month) &&
        (!departmentCode || record.departmentCode === departmentCode),
    )
    .flatMap((record) => {
      const p = record.payload;
      const isOperation = OPERATIONS.includes(record.moduleCode);
      const names = textValue(p.workerNames || p.employeeName || p.crewName)
        .split(/[,，、;；\n]+/)
        .map((name) => name.trim())
        .filter(Boolean);
      const occurredAt = shanghaiTime(record.occurredAt);
      const startAt = textValue(p.workStartedAt),
        endAt = textValue(p.workEndedAt);
      const interval =
        startAt && endAt
          ? (new Date(endAt).getTime() - new Date(startAt).getTime()) / 3600_000
          : NaN;
      const hours =
        Number.isFinite(interval) && interval >= 0
          ? round(interval)
          : numberValue(p.workHours);
      const period = ['am', 'pm'].includes(textValue(p.period))
        ? textValue(p.period)
        : Number(occurredAt.slice(11, 13)) < 12
          ? 'am'
          : 'pm';
      const location = textValue(p.locationInRange).toLowerCase();
      return [...new Set(names.length ? names : ['未登记人员'])].map(
        (personName) => ({
          recordId: record.id,
          recordNo: record.recordNo || record.id,
          title: record.title,
          moduleCode: record.moduleCode,
          departmentCode: record.departmentCode,
          departmentName: departmentName(record.departmentCode),
          personName,
          personKey:
            textValue(p.employeeUserId) ||
            `${record.departmentCode}:${personName === '未登记人员' ? record.id : personName}`,
          vesselId: record.vesselId,
          vesselName: textValue(p.vesselName) || '未登记船舶',
          occurredAt,
          date: occurredAt.slice(0, 10),
          period,
          dutyType: textValue(p.dutyType) || 'normal',
          locationInRange:
            typeof p.locationInRange === 'boolean'
              ? p.locationInRange
              : ['true', 'false'].includes(location)
                ? location === 'true'
                : null,
          workHours: hours,
          status: record.status,
          statusName: statuses[record.status] || record.status,
          source: isOperation ? '作业记录' : '考勤记录',
        }),
      );
    })
    .sort(
      (a, b) =>
        a.occurredAt.localeCompare(b.occurredAt) ||
        a.personName.localeCompare(b.personName),
    );
  const keys = [...new Set(details.map((row) => row.personKey))];
  const people = keys.map((personKey) => {
    const rows = details.filter((row) => row.personKey === personKey),
      first = rows[0]!;
    return {
      personKey,
      personName: first.personName,
      departmentCode: first.departmentCode,
      departmentName: departmentName(first.departmentCode),
      days: new Set(rows.map((row) => row.date)).size,
      recordCount: rows.length,
      morningCount: rows.filter((row) => row.period === 'am').length,
      afternoonCount: rows.filter((row) => row.period === 'pm').length,
      workHours: round(
        rows.reduce((sum, row) => sum + (row.workHours ?? 0), 0),
      ),
      missingHours: rows.filter((row) => row.workHours === null).length,
    };
  });
  return { month, departmentCode: departmentCode || null, details, people };
}
export type AttendanceReport = ReturnType<typeof attendanceReport>;
export function attendanceWorkbook(
  report: AttendanceReport,
  generatedAt = new Date(),
) {
  const days = Array.from(
    {
      length: new Date(
        Number(report.month.slice(0, 4)),
        Number(report.month.slice(5)),
        0,
      ).getDate(),
    },
    (_, index) => String(index + 1).padStart(2, '0'),
  );
  return workbook(
    [
      {
        name: '人员汇总',
        note: '工时单位：小时；缺工时记录单列提示，不作为零工时。相同部门同名历史人员请结合明细核对。',
        widths: [18, 20, 14, 14, 20, 23],
        headers: [
          '姓名',
          '部门',
          '出勤天数',
          '记录数',
          '已登记工时',
          '未登记工时记录数',
        ],
        rows: report.people.map((p) => ({
          姓名: p.personName,
          部门: departmentName(p.departmentCode),
          出勤天数: p.days,
          记录数: p.recordCount,
          已登记工时: p.workHours,
          未登记工时记录数: p.missingHours,
        })),
      },
      {
        name: '逐日考勤',
        headers: [
          '姓名',
          '部门',
          ...days.slice(0, Math.max(15, days.length - 15)),
          '确认签字',
        ],
        rows: [],
        widths: [
          14,
          16,
          // The last date column and the signature column are both wide enough
          // for the 31-day month's second half and the signature text.
          ...Array.from(
            { length: Math.max(15, days.length - 15) - 1 },
            () => 9,
          ),
          16,
          16,
        ],
        freezeColumns: 2,
        paper: 'A3',
        note: '上、下半月分别排版；空白表示无记录，未登记工时不按零工时处理。完整来源见“考勤明细”。',
        blocks: [days.slice(0, 15), days.slice(15)].map((part, i) => ({
          title: `${report.month} · ${i === 0 ? '上半月（01–15 日）' : `下半月（16–${days.length} 日）`}`,
          headers: ['姓名', '部门', ...part, '确认签字'],
          rows: report.people.map((p) => ({
            姓名: p.personName,
            部门: departmentName(p.departmentCode),
            ...Object.fromEntries(
              part.map((day) => [
                day,
                report.details
                  .filter(
                    (r) =>
                      r.personKey === p.personKey &&
                      r.date === `${report.month}-${day}`,
                  )
                  .map(
                    (r) =>
                      `${r.period === 'am' ? '上午' : '下午'}\n${r.workHours === null ? '工时未登记' : `${r.workHours} 小时`}`,
                  )
                  .join('\n'),
              ]),
            ),
            确认签字: '',
          })),
        })),
      },
      {
        name: '考勤明细',
        freezeColumns: 2,
        paper: 'A3',
        widths: [30, 14, 16, 24, 23, 10, 15, 12, 12, 15, 16, 32],
        headers: [
          '记录编号',
          '姓名',
          '部门',
          '船舶',
          '时间（上海）',
          '时段',
          '出勤类型',
          '范围内',
          '工时',
          '状态',
          '来源',
          '标题',
        ],
        rows: report.details.map((row) => ({
          记录编号: row.recordNo,
          姓名: row.personName,
          部门: departmentName(row.departmentCode),
          船舶: row.vesselName,
          '时间（上海）': row.occurredAt,
          时段: row.period === 'am' ? '上午' : '下午',
          出勤类型: dutyName(row.dutyType),
          范围内:
            row.locationInRange === null
              ? '未登记'
              : row.locationInRange
                ? '是'
                : '否',
          工时: row.workHours ?? '未登记',
          状态: statuses[row.status] || row.status,
          来源: row.source,
          标题: row.title,
        })),
      },
    ],
    {
      title: `${report.month} 考勤报表`,
      scope: `统计月份：${report.month} | 部门：${report.departmentCode ? departmentName(report.departmentCode) : '全部可见部门'}`,
      generatedAt,
    },
  );
}
export function fuelReport(records: ReportRecord[], inputMonth?: string) {
  const month = reportMonth(inputMonth);
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  const previous = date.toISOString().slice(0, 7);
  const usableRecords = records.filter(usable);
  const measurements = usableRecords.filter(
    (r) => r.moduleCode === FUEL_MEASUREMENT,
  );
  const receipts = usableRecords
    .filter(
      (r) => r.moduleCode === FUEL_MODULE && r.status === 'approval_passed',
    )
    .flatMap((r) => {
      const actual = r.payload.fuelActual as
        | Record<string, unknown>
        | undefined;
      return actual &&
        shanghaiTime(textValue(actual.occurredAt)).startsWith(month)
        ? [
            {
              recordId: r.id,
              recordNo: r.recordNo || r.id,
              vesselId: r.vesselId!,
              fuelType: textValue(actual.fuelType),
              unit: textValue(actual.unit),
              amount: numberValue(actual.amount) ?? 0,
              occurredAt: shanghaiTime(textValue(actual.occurredAt)),
            },
          ]
        : [];
    });
  const key = (vesselId: string | null, fuelType: unknown, unit: unknown) =>
    JSON.stringify([vesselId, textValue(fuelType), textValue(unit)]);
  const current = measurements.filter((r) => r.payload.month === month);
  const prior = measurements.filter((r) => r.payload.month === previous);
  const groups = new Set([
    ...current.map((r) => key(r.vesselId, r.payload.fuelType, r.payload.unit)),
    ...prior.map((r) => key(r.vesselId, r.payload.fuelType, r.payload.unit)),
    ...receipts.map((r) => key(r.vesselId, r.fuelType, r.unit)),
  ]);
  const rows = [...groups].map((group) => {
    const [vesselId, fuelType, unit] = JSON.parse(group) as [
      string,
      string,
      string,
    ];
    const candidates = current.filter(
      (r) => key(r.vesselId, r.payload.fuelType, r.payload.unit) === group,
    );
    const last = prior.filter(
      (r) => key(r.vesselId, r.payload.fuelType, r.payload.unit) === group,
    );
    const measure = candidates[0];
    const openingBalance =
      numberValue(last[0]?.payload.closingBalance) ??
      numberValue(measure?.payload.openingBalance);
    const closingBalance = numberValue(measure?.payload.closingBalance);
    const bunkeredAmount = round(
      receipts
        .filter((r) => key(r.vesselId, r.fuelType, r.unit) === group)
        .reduce((sum, r) => sum + r.amount, 0),
    );
    const lowFuelThreshold = numberValue(measure?.payload.lowFuelThreshold);
    const issues: string[] = [];
    if (openingBalance === null) issues.push('缺少期初余量');
    if (closingBalance === null) issues.push('缺少月末实测余量');
    if (candidates.length > 1 || last.length > 1)
      issues.push('存在重复测量记录');
    const consumed =
      openingBalance !== null && closingBalance !== null
        ? round(openingBalance + bunkeredAmount - closingBalance)
        : null;
    if (consumed !== null && consumed < 0)
      issues.push('余量超过期初与加注合计，请核对');
    return {
      vesselId,
      vesselName:
        textValue(measure?.payload.vesselName || last[0]?.payload.vesselName) ||
        vesselId,
      fuelType,
      unit,
      openingBalance,
      bunkeredAmount,
      closingBalance,
      consumedAmount: issues.length ? null : consumed,
      lowFuelThreshold,
      lowFuel:
        closingBalance !== null &&
        lowFuelThreshold !== null &&
        closingBalance <= lowFuelThreshold,
      issues,
      measurementId: measure?.id ?? null,
    };
  });
  const unconfirmed = usableRecords
    .filter(
      (r) =>
        r.moduleCode === FUEL_MODULE &&
        r.status === 'approval_passed' &&
        !r.payload.fuelActual &&
        shanghaiTime(r.occurredAt).startsWith(month),
    )
    .map((r) => ({ recordId: r.id, title: r.title, vesselId: r.vesselId }));
  for (const row of rows)
    if (unconfirmed.some((r) => r.vesselId === row.vesselId)) {
      row.issues.push('存在未登记实际加注的已批准申请');
      row.consumedAmount = null;
    }
  return { month, rows, receipts, unconfirmed };
}
