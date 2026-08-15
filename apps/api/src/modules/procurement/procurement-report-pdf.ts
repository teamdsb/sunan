import fontkit from '@pdf-lib/fontkit';
import {
  PDFDocument,
  type PDFFont,
  type PDFPage,
  rgb,
} from 'pdf-lib';
import type { ProcurementReportApprovalEntity } from 'src/database/entities/procurement-report-approval.entity';
import type { ProcurementReportEntity } from 'src/database/entities/procurement-report.entity';
import { createProcurementPdfFont } from './procurement-pdf-font';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const CONTENT_BOTTOM = 66;

const colors = {
  navy: rgb(0.055, 0.149, 0.247),
  blue: rgb(0.086, 0.376, 0.843),
  muted: rgb(0.36, 0.43, 0.53),
  line: rgb(0.84, 0.88, 0.94),
  softBlue: rgb(0.94, 0.97, 1),
  softGray: rgb(0.975, 0.98, 0.99),
  white: rgb(1, 1, 1),
};

type ReportPdfReport = Pick<
  ProcurementReportEntity,
  | 'reportNo'
  | 'reportType'
  | 'periodYear'
  | 'periodMonth'
  | 'departmentCode'
  | 'snapshotParams'
  | 'snapshotSummary'
  | 'status'
  | 'approvalChannel'
  | 'externalStatus'
  | 'submittedAt'
  | 'finalApprovedAt'
  | 'createdBy'
  | 'createdAt'
>;

type ReportPdfApproval = Pick<
  ProcurementReportApprovalEntity,
  | 'approvalLevel'
  | 'action'
  | 'comment'
  | 'source'
  | 'approvedBy'
  | 'approvedAt'
>;

export interface ProcurementReportPdfInput {
  report: ReportPdfReport;
  approvals: ReportPdfApproval[];
  generatedAt: Date;
}

interface SummaryRow {
  label: string;
  amount: number | null;
  orderCount: number | null;
}

interface DisplayField {
  label: string;
  value: string;
}

export interface NormalizedProcurementReportPdfData {
  title: string;
  reportNo: string;
  status: string;
  period: string;
  department: string;
  reportType: string;
  totalAmount: number | null;
  totalOrderCount: number | null;
  rows: SummaryRow[];
  basicFields: DisplayField[];
  conditionFields: DisplayField[];
  extraParams: DisplayField[];
  approvals: Array<{
    level: string;
    action: string;
    approver: string;
    approvedAt: string;
    comment: string;
    source: string;
  }>;
}

const departmentLabels: Record<string, string> = {
  general_office: '总经办',
  business_dept: '业务部',
  finance_dept: '财务部',
  shipping_dept: '船务部',
  logistics_dept: '后勤部',
};

const statusLabels: Record<string, string> = {
  draft: '草稿',
  submitted: '已提交',
  dept_approved: '部门已通过',
  finance_approved: '财务已通过',
  final_approved: '终审已通过',
  rejected: '已驳回',
};

const approvalLevelLabels: Record<string, string> = {
  dept: '部门审批',
  finance: '财务审批',
  final: '总经办审批',
};

const approvalActionLabels: Record<string, string> = {
  approve: '通过',
  reject: '驳回',
  return: '退回',
};

const approvalSourceLabels: Record<string, string> = {
  internal: '系统内',
  external: '企业微信',
};

const parameterLabels: Record<string, string> = {
  source: '快照来源',
  dimensionType: '统计维度',
  dimensionKey: '维度编码',
  dimensionName: '维度名称',
  startDate: '开始日期',
  endDate: '结束日期',
};

const parameterValueLabels: Record<string, string> = {
  approval_snapshot: '审批提交快照',
  vessel: '船舶',
  logistics_category: '后勤类别',
  none: '未细分',
};

const knownParameterKeys = new Set([
  'reportType',
  'periodYear',
  'periodMonth',
  'year',
  'month',
  'departmentCode',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toOptionalFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? `已记录 ${value.length} 项` : '-';
  }
  if (isRecord(value)) {
    return `已记录 ${Object.keys(value).length} 项配置`;
  }
  return '-';
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDateTime(value: Date | null | undefined): string {
  if (!value) {
    return '-';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatMoney(value: number | null): string {
  if (value === null) {
    return '-';
  }
  return `¥${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPeriod(
  reportType: string,
  year: number,
  month: number | null,
): string {
  if (reportType === 'monthly' && month) {
    return `${year}年${month}月`;
  }
  return `${year}年度`;
}

function formatParameterLabel(key: string): string {
  return parameterLabels[key] ?? key.replace(/_/g, ' ');
}

function formatParameterValue(value: unknown): string {
  if (typeof value === 'string' && parameterValueLabels[value]) {
    return parameterValueLabels[value];
  }
  return toDisplayValue(value);
}

export function normalizeProcurementReportPdfData(
  input: ProcurementReportPdfInput,
): NormalizedProcurementReportPdfData {
  const { report } = input;
  const snapshotSummary = isRecord(report.snapshotSummary)
    ? report.snapshotSummary
    : {};
  const snapshotParams = isRecord(report.snapshotParams)
    ? report.snapshotParams
    : {};
  const snapshotReportTypeCode =
    snapshotParams.reportType === 'monthly' ||
    snapshotParams.reportType === 'yearly'
      ? snapshotParams.reportType
      : report.reportType;
  const reportType = snapshotReportTypeCode === 'monthly' ? '月报' : '年报';
  const snapshotYear =
    toOptionalFiniteNumber(
      snapshotParams.periodYear ?? snapshotParams.year,
    ) ?? report.periodYear;
  const snapshotMonth =
    snapshotReportTypeCode === 'monthly'
      ? (toOptionalFiniteNumber(
          snapshotParams.periodMonth ?? snapshotParams.month,
        ) ?? report.periodMonth)
      : null;
  const period = formatPeriod(
    snapshotReportTypeCode,
    snapshotYear,
    snapshotMonth,
  );
  const rawRows = Array.isArray(snapshotSummary.items)
    ? snapshotSummary.items
    : [];
  const rows = rawRows.flatMap((item, index): SummaryRow[] => {
    if (!isRecord(item)) {
      return [];
    }
    const rawLabel =
      item.label ?? item.dimensionName ?? item.name ?? item.dimensionKey;
    const label = toDisplayValue(rawLabel);
    return [
      {
        label: label === '-' ? `汇总项 ${index + 1}` : label,
        amount: toOptionalFiniteNumber(item.amount),
        orderCount: toOptionalFiniteNumber(item.orderCount),
      },
    ];
  });
  const rowAmount = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const rowOrderCount = rows.reduce(
    (sum, row) => sum + (row.orderCount ?? 0),
    0,
  );
  const totalAmount =
    toOptionalFiniteNumber(snapshotSummary.totalAmount) ??
    (rows.length > 0 ? rowAmount : null);
  const totalOrderCount =
    toOptionalFiniteNumber(snapshotSummary.totalOrderCount) ??
    (rows.length > 0 ? rowOrderCount : null);
  const snapshotDepartmentCode =
    typeof snapshotParams.departmentCode === 'string'
      ? snapshotParams.departmentCode
      : report.departmentCode;
  const department = snapshotDepartmentCode
    ? departmentLabels[snapshotDepartmentCode] ?? snapshotDepartmentCode
    : '全部部门';

  return {
    title: `${period}采购${reportType}`,
    reportNo: report.reportNo,
    status: statusLabels[report.status] ?? report.status,
    period,
    department,
    reportType,
    totalAmount,
    totalOrderCount,
    rows,
    basicFields: [
      { label: '申请人', value: report.createdBy || '-' },
      { label: '审批状态', value: statusLabels[report.status] ?? report.status },
      {
        label: '提交时间',
        value: formatDateTime(report.submittedAt),
      },
      {
        label: '终审时间',
        value: formatDateTime(report.finalApprovedAt),
      },
      {
        label: '审批渠道',
        value:
          report.approvalChannel === 'wecom_native'
            ? '企业微信原生审批'
            : '系统内审批',
      },
      {
        label: '快照生成',
        value: formatDateTime(report.createdAt),
      },
    ],
    conditionFields: [
      { label: '报表类型', value: reportType },
      { label: '统计周期', value: period },
      { label: '统计部门', value: department },
    ],
    extraParams: Object.entries(snapshotParams)
      .filter(([key]) => !knownParameterKeys.has(key))
      .map(([key, value]) => ({
        label: formatParameterLabel(key),
        value: formatParameterValue(value),
      })),
    approvals: input.approvals.map((approval) => ({
      level:
        approvalLevelLabels[approval.approvalLevel] ?? approval.approvalLevel,
      action: approvalActionLabels[approval.action] ?? approval.action,
      approver: approval.approvedBy || '-',
      approvedAt: formatDateTime(approval.approvedAt),
      comment: approval.comment?.trim() || '无审批意见',
      source: approvalSourceLabels[approval.source] ?? approval.source,
    })),
  };
}

interface TableColumn {
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

function fitText(
  font: PDFFont,
  value: string,
  size: number,
  maxWidth: number,
): string {
  if (font.widthOfTextAtSize(value, size) <= maxWidth) {
    return value;
  }
  let result = value;
  while (
    result.length > 0 &&
    font.widthOfTextAtSize(`${result}…`, size) > maxWidth
  ) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function wrapText(
  font: PDFFont,
  value: string,
  size: number,
  maxWidth: number,
  maxLines = 2,
): string[] {
  const source = value || '-';
  const lines: string[] = [];
  let current = '';
  for (const character of source) {
    if (character === '\n') {
      lines.push(current || ' ');
      current = '';
      continue;
    }
    const candidate = `${current}${character}`;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }
  if (current || lines.length === 0) {
    lines.push(current || '-');
  }
  if (lines.length <= maxLines) {
    return lines;
  }
  const visible = lines.slice(0, maxLines);
  visible[maxLines - 1] = fitText(
    font,
    `${visible[maxLines - 1]}…`,
    size,
    maxWidth,
  );
  return visible;
}

export async function buildProcurementReportPdf(
  input: ProcurementReportPdfInput,
): Promise<Buffer> {
  const data = normalizeProcurementReportPdfData(input);
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(
    await createProcurementPdfFont({ input, data }),
  );
  pdfDoc.setTitle(`${data.title}（${data.reportNo}）`);
  pdfDoc.setSubject('采购报表审批单');
  pdfDoc.setCreator('苏南船舶管理平台');
  pdfDoc.setProducer('苏南船舶管理平台');
  pdfDoc.setCreationDate(input.generatedAt);

  let page!: PDFPage;
  let y = 0;

  const drawHeader = (target: PDFPage) => {
    target.drawText('苏南船舶管理平台 · 采购报表审批单', {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 40,
      size: 9,
      font,
      color: colors.blue,
    });
    target.drawText(fitText(font, data.title, 20, 320), {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 70,
      size: 20,
      font,
      color: colors.navy,
    });
    const reportNoText = `报表编号  ${data.reportNo}`;
    target.drawText(reportNoText, {
      x:
        PAGE_WIDTH -
        MARGIN_X -
        font.widthOfTextAtSize(reportNoText, 9),
      y: PAGE_HEIGHT - 67,
      size: 9,
      font,
      color: colors.muted,
    });
    target.drawLine({
      start: { x: MARGIN_X, y: PAGE_HEIGHT - 84 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: PAGE_HEIGHT - 84 },
      thickness: 1,
      color: colors.line,
    });
  };

  const addPage = () => {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawHeader(page);
    y = PAGE_HEIGHT - 108;
  };

  const ensureSpace = (height: number) => {
    if (y - height < CONTENT_BOTTOM) {
      addPage();
    }
  };

  const drawSectionTitle = (title: string, followingHeight = 0) => {
    ensureSpace(34 + followingHeight);
    page.drawRectangle({
      x: MARGIN_X,
      y: y - 16,
      width: 3,
      height: 16,
      color: colors.blue,
    });
    page.drawText(title, {
      x: MARGIN_X + 10,
      y: y - 15,
      size: 12,
      font,
      color: colors.navy,
    });
    page.drawLine({
      start: { x: MARGIN_X + 94, y: y - 9 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: y - 9 },
      thickness: 0.7,
      color: colors.line,
    });
    y -= 28;
  };

  const drawStatusStrip = () => {
    ensureSpace(40);
    page.drawRectangle({
      x: MARGIN_X,
      y: y - 34,
      width: CONTENT_WIDTH,
      height: 34,
      color: colors.softBlue,
      borderColor: colors.line,
      borderWidth: 0.6,
    });
    const entries = [
      `状态  ${data.status}`,
      `周期  ${data.period}`,
      `部门  ${data.department}`,
    ];
    entries.forEach((entry, index) => {
      page.drawText(fitText(font, entry, 9, 145), {
        x: MARGIN_X + 14 + index * 158,
        y: y - 21,
        size: 9,
        font,
        color: index === 0 ? colors.blue : colors.navy,
      });
    });
    y -= 48;
  };

  const drawKpis = () => {
    drawSectionTitle('报表摘要', 68);
    const gap = 10;
    const width = (CONTENT_WIDTH - gap * 2) / 3;
    const kpis = [
      { label: '采购总额', value: formatMoney(data.totalAmount) },
      {
        label: '采购单数',
        value:
          data.totalOrderCount === null
            ? '-'
            : `${data.totalOrderCount} 单`,
      },
      { label: '汇总维度', value: `${data.rows.length} 项` },
    ];
    kpis.forEach((kpi, index) => {
      const x = MARGIN_X + index * (width + gap);
      page.drawRectangle({
        x,
        y: y - 58,
        width,
        height: 58,
        color: index === 0 ? colors.softBlue : colors.softGray,
        borderColor: colors.line,
        borderWidth: 0.7,
      });
      page.drawText(kpi.label, {
        x: x + 12,
        y: y - 19,
        size: 8,
        font,
        color: colors.muted,
      });
      page.drawText(fitText(font, kpi.value, 14, width - 24), {
        x: x + 12,
        y: y - 43,
        size: 14,
        font,
        color: index === 0 ? colors.blue : colors.navy,
      });
    });
    y -= 72;
  };

  const drawFields = (title: string, fields: DisplayField[]) => {
    if (fields.length === 0) {
      return;
    }
    const rowHeight = 30;
    drawSectionTitle(title, rowHeight);
    const rows = Math.ceil(fields.length / 2);
    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      ensureSpace(rowHeight);
      const rowFields = fields.slice(rowIndex * 2, rowIndex * 2 + 2);
      rowFields.forEach((field, columnIndex) => {
        const x = MARGIN_X + columnIndex * (CONTENT_WIDTH / 2);
        const width = CONTENT_WIDTH / 2;
        page.drawRectangle({
          x,
          y: y - rowHeight,
          width,
          height: rowHeight,
          color: rowIndex % 2 === 0 ? colors.softGray : colors.white,
          borderColor: colors.line,
          borderWidth: 0.5,
        });
        page.drawText(fitText(font, field.label, 8, 58), {
          x: x + 10,
          y: y - 19,
          size: 8,
          font,
          color: colors.muted,
        });
        page.drawText(fitText(font, field.value, 9, width - 88), {
          x: x + 76,
          y: y - 19,
          size: 9,
          font,
          color: colors.navy,
        });
      });
      y -= rowHeight;
    }
    y -= 12;
  };

  const drawTableHeader = (columns: TableColumn[]) => {
    const headerHeight = 26;
    page.drawRectangle({
      x: MARGIN_X,
      y: y - headerHeight,
      width: CONTENT_WIDTH,
      height: headerHeight,
      color: colors.softBlue,
      borderColor: colors.line,
      borderWidth: 0.6,
    });
    let x = MARGIN_X;
    columns.forEach((column) => {
      page.drawText(fitText(font, column.label, 8, column.width - 12), {
        x: x + 6,
        y: y - 17,
        size: 8,
        font,
        color: colors.navy,
      });
      x += column.width;
      if (x < PAGE_WIDTH - MARGIN_X) {
        page.drawLine({
          start: { x, y },
          end: { x, y: y - headerHeight },
          thickness: 0.4,
          color: colors.line,
        });
      }
    });
    y -= headerHeight;
  };

  const drawTable = (
    title: string,
    columns: TableColumn[],
    rows: string[][],
    emptyText: string,
  ) => {
    drawSectionTitle(title, 60);
    drawTableHeader(columns);
    if (rows.length === 0) {
      const rowHeight = 34;
      page.drawRectangle({
        x: MARGIN_X,
        y: y - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: colors.white,
        borderColor: colors.line,
        borderWidth: 0.5,
      });
      const emptyWidth = font.widthOfTextAtSize(emptyText, 8);
      page.drawText(emptyText, {
        x: MARGIN_X + (CONTENT_WIDTH - emptyWidth) / 2,
        y: y - 21,
        size: 8,
        font,
        color: colors.muted,
      });
      y -= rowHeight + 14;
      return;
    }
    rows.forEach((row, rowIndex) => {
      const lineGroups = columns.map((column, columnIndex) =>
        wrapText(
          font,
          row[columnIndex] ?? '',
          8,
          column.width - 12,
          2,
        ),
      );
      const lineCount = Math.max(...lineGroups.map((lines) => lines.length));
      const rowHeight = Math.max(28, lineCount * 11 + 10);
      if (y - rowHeight < CONTENT_BOTTOM) {
        addPage();
        drawSectionTitle(`${title}（续）`, 54);
        drawTableHeader(columns);
      }
      page.drawRectangle({
        x: MARGIN_X,
        y: y - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: rowIndex % 2 === 0 ? colors.white : colors.softGray,
        borderColor: colors.line,
        borderWidth: 0.5,
      });
      let x = MARGIN_X;
      columns.forEach((column, columnIndex) => {
        const lines = lineGroups[columnIndex] ?? ['-'];
        lines.forEach((line, lineIndex) => {
          const textWidth = font.widthOfTextAtSize(line, 8);
          const textX =
            column.align === 'right'
              ? x + column.width - 6 - textWidth
              : column.align === 'center'
                ? x + (column.width - textWidth) / 2
                : x + 6;
          page.drawText(line, {
            x: textX,
            y: y - 17 - lineIndex * 11,
            size: 8,
            font,
            color: colors.navy,
          });
        });
        x += column.width;
        if (x < PAGE_WIDTH - MARGIN_X) {
          page.drawLine({
            start: { x, y },
            end: { x, y: y - rowHeight },
            thickness: 0.4,
            color: colors.line,
          });
        }
      });
      y -= rowHeight;
    });
    y -= 14;
  };

  addPage();
  drawStatusStrip();
  drawKpis();
  drawFields('基本信息', data.basicFields);
  drawFields('统计条件', data.conditionFields);
  drawFields('其他参数', data.extraParams);
  drawTable(
    '汇总明细',
    [
      { label: '序号', width: 42, align: 'center' },
      { label: '汇总维度', width: 247 },
      { label: '采购单数', width: 88, align: 'right' },
      { label: '采购金额', width: 122, align: 'right' },
    ],
    data.rows.length > 0
      ? [
          ...data.rows.map((row, index) => [
            String(index + 1),
            row.label,
            row.orderCount === null ? '-' : String(row.orderCount),
            formatMoney(row.amount),
          ]),
          [
            ' ',
            '合计',
            data.totalOrderCount === null
              ? '-'
              : String(data.totalOrderCount),
            formatMoney(data.totalAmount),
          ],
        ]
      : [],
    '暂无汇总明细',
  );
  drawTable(
    '审批记录',
    [
      { label: '审批节点', width: 78 },
      { label: '结果', width: 52 },
      { label: '审批人', width: 72 },
      { label: '审批时间', width: 112 },
      { label: '审批意见', width: 137 },
      { label: '来源', width: 48 },
    ],
    data.approvals.map((approval) => [
      approval.level,
      approval.action,
      approval.approver,
      approval.approvedAt,
      approval.comment,
      approval.source,
    ]),
    '暂无审批记录',
  );

  ensureSpace(46);
  page.drawRectangle({
    x: MARGIN_X,
    y: y - 34,
    width: CONTENT_WIDTH,
    height: 34,
    color: colors.softGray,
    borderColor: colors.line,
    borderWidth: 0.6,
  });
  page.drawText('数据说明', {
    x: MARGIN_X + 12,
    y: y - 21,
    size: 8,
    font,
    color: colors.blue,
  });
  page.drawText(
    fitText(
      font,
      '本文件基于审批提交时的数据快照生成，后续业务数据变化不会回写本报表。',
      8,
      CONTENT_WIDTH - 82,
    ),
    {
      x: MARGIN_X + 70,
      y: y - 21,
      size: 8,
      font,
      color: colors.muted,
    },
  );

  const pages = pdfDoc.getPages();
  pages.forEach((target, index) => {
    target.drawLine({
      start: { x: MARGIN_X, y: 46 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: 46 },
      thickness: 0.6,
      color: colors.line,
    });
    const generatedText = `生成时间  ${formatDateTime(input.generatedAt)}`;
    target.drawText(generatedText, {
      x: MARGIN_X,
      y: 30,
      size: 7,
      font,
      color: colors.muted,
    });
    const criterionText = '数据口径  审批单创建时快照';
    target.drawText(criterionText, {
      x: (PAGE_WIDTH - font.widthOfTextAtSize(criterionText, 7)) / 2,
      y: 30,
      size: 7,
      font,
      color: colors.muted,
    });
    const pageText = `第 ${index + 1} / ${pages.length} 页`;
    target.drawText(pageText, {
      x:
        PAGE_WIDTH - MARGIN_X - font.widthOfTextAtSize(pageText, 7),
      y: 30,
      size: 7,
      font,
      color: colors.muted,
    });
  });

  return Buffer.from(await pdfDoc.save());
}
