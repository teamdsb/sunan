import ExcelJS from 'exceljs';

export interface ReportSheet {
  name: string;
  headers: string[];
  rows: Record<string, unknown>[];
  note?: string;
  widths?: number[];
  freezeColumns?: number;
  paper?: 'A4' | 'A3';
  blocks?: Array<{
    title: string;
    headers: string[];
    rows: Record<string, unknown>[];
  }>;
}
export interface WorkbookOptions {
  title: string;
  scope: string;
  generatedAt?: Date;
}
const palette = {
  navy: '0E263F',
  blue: '1660D7',
  pale: 'EFF7FF',
  stripe: 'F8FAFC',
  line: 'D6E0EE',
  muted: '5C6E87',
  warning: 'FFF4DC',
  warningText: '925600',
};
const display = (value: unknown): string | number =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : value == null
      ? ''
      : typeof value === 'string' || typeof value === 'boolean' || typeof value === 'bigint'
        ? String(value)
        : JSON.stringify(value);
const units = (text: string) =>
  [...text].reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 2 : 1), 0);
const widthFor = (header: string) =>
  /时间/.test(header)
    ? 23
    : /编号/.test(header)
      ? 30
      : /标题|课程|记录$|待核对/.test(header)
        ? 34
        : /船舶|部门/.test(header)
          ? 20
          : Math.max(12, Math.min(24, units(header) + 4));
const numericFormat = (header: string) =>
  /%|完成率|进度/.test(header)
    ? '0.##"%"'
    : /天数|记录数|已分配|已完成|记录$/.test(header)
      ? '#,##0'
      : '#,##0.###';
export async function workbook(
  sheets: ReportSheet[],
  options: WorkbookOptions,
) {
  const book = new ExcelJS.Workbook();
  const generatedAt = options.generatedAt ?? new Date();
  book.creator = '苏南船舶管理平台';
  book.title = options.title;
  book.subject = options.scope;
  book.created = generatedAt;
  book.modified = generatedAt;
  const generated = new Date(generatedAt.getTime() + 8 * 3600_000)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ');
  for (const sheet of sheets) {
    const blocks = sheet.blocks ?? [
      { title: '', headers: sheet.headers, rows: sheet.rows },
    ];
    const count = Math.max(...blocks.map((b) => b.headers.length));
    const ws = book.addWorksheet(sheet.name, {
      properties: { defaultRowHeight: 24, tabColor: { argb: palette.blue } },
      views: [
        {
          state: 'frozen',
          xSplit: sheet.freezeColumns ?? 0,
          ySplit: 5,
          showGridLines: false,
        },
      ],
      pageSetup: {
        // OOXML A3 = 8；ExcelJS 的枚举遗漏此值，序列化器支持标准纸张编码。
        // OOXML paper codes: A3 = 8, A4 = 9. ExcelJS exposes the type only
        // at compile time, so keep the numeric codes here for runtime safety.
        paperSize: (sheet.paper === 'A3' || count > 8 ? 8 : 9) as unknown as ExcelJS.PaperSize,
        orientation: count > 5 ? 'landscape' : 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalCentered: true,
        margins: {
          left: 0.3,
          right: 0.3,
          top: 0.45,
          bottom: 0.45,
          header: 0.2,
          footer: 0.2,
        },
      },
      headerFooter: {
        oddFooter: '&L苏南船舶管理平台&C业务数据快照&R第 &P 页 / 共 &N 页',
      },
    });
    ws.columns = Array.from({ length: count }, (_, i) => ({
      width: sheet.widths?.[i] ?? widthFor(sheet.headers[i] ?? ''),
    }));
    const banner = (
      row: number,
      value: string,
      size: number,
      color: string,
      fill?: string,
    ) => {
      ws.mergeCells(row, 1, row, count);
      const cell = ws.getCell(row, 1);
      cell.value = value;
      cell.font = {
        name: '微软雅黑',
        size,
        color: { argb: color },
        bold: row === 1,
      };
      cell.alignment = { vertical: 'middle', wrapText: true, indent: 1 };
      if (fill)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fill },
        };
    };
    banner(
      1,
      `${options.title} · ${sheet.name}`,
      18,
      palette.navy,
      palette.pale,
    );
    ws.getRow(1).height = 38;
    banner(
      2,
      `${options.scope}    |    生成时间：${generated}（上海）`,
      10,
      palette.muted,
    );
    ws.getRow(2).height = 26;
    banner(
      3,
      sheet.note ?? '按当前账号可见范围生成；数据固定为导出时快照。',
      10,
      palette.muted,
    );
    ws.getRow(3).height = 32;
    ws.getRow(4).height = 8;
    let row = 5;
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const block = blocks[blockIndex]!;
      let usedHeight = 0;
      const newBlock = (continued = false) => {
        if (row > 5) ws.getRow(row - 1).addPageBreak();
        block.headers.forEach((header, i) => {
          const cell = ws.getCell(row, i + 1);
          cell.value = header;
          cell.font = {
            name: '微软雅黑',
            size: 10,
            bold: true,
            color: { argb: 'FFFFFF' },
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: palette.navy },
          };
          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: true,
          };
        });
        ws.getRow(row++).height = 32;
        if (block.title) {
          banner(
            row,
            `${block.title}${continued ? '（续表）' : ''}`,
            10,
            palette.blue,
            palette.pale,
          );
          ws.getRow(row++).height = 24;
        }
        usedHeight = 56;
      };
      const headerRow = row;
      newBlock();
      if (!block.rows.length) {
        banner(row, '本范围暂无记录', 11, palette.muted);
        ws.getRow(row++).height = 34;
      }
      block.rows.forEach((record, index) => {
        const values = block.headers.map((header) => display(record[header]));
        const lineCount = Math.max(
          ...values.map((v, i) =>
            String(v)
              .split('\n')
              .reduce(
                (sum, line) =>
                  sum +
                  Math.max(
                    1,
                    Math.ceil(
                      units(line) /
                        Math.max(3, (ws.getColumn(i + 1).width ?? 20) - 2),
                    ),
                  ),
                0,
              ),
          ),
        );
        const rowHeight = Math.min(409, Math.max(26, lineCount * 15 + 10));
        // 半月表主动分块分页，每页保留真实日期列头；不能重复上半月日期作为下半月表头。
        if (sheet.blocks && usedHeight + rowHeight > 540 && usedHeight > 56)
          newBlock(true);
        block.headers.forEach((header, i) => {
          const cell = ws.getCell(row, i + 1),
            value = values[i]!;
          cell.value = value;
          const warn =
            typeof value === 'string'
              ? /未登记|待核对|缺少|未完成|超过|未关联/.test(value) ||
                (header === '低余量' && value === '是')
              : /未登记/.test(header) && value > 0;
          cell.font = {
            name: '微软雅黑',
            size: 10,
            color: { argb: warn ? palette.warningText : palette.navy },
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
              argb: warn
                ? palette.warning
                : index % 2
                  ? palette.stripe
                  : 'FFFFFF',
            },
          };
          cell.alignment = {
            vertical: 'middle',
            horizontal:
              typeof value === 'number'
                ? 'right'
                : /^\d{2}$/.test(header)
                  ? 'center'
                  : 'left',
            wrapText: true,
          };
          cell.border = {
            bottom: { style: 'hair', color: { argb: palette.line } },
            right: { style: 'hair', color: { argb: palette.line } },
          };
          if (typeof value === 'number') cell.numFmt = numericFormat(header);
        });
        ws.getRow(row++).height = rowHeight;
        usedHeight += rowHeight;
      });
      if (!sheet.blocks && block.rows.length)
        ws.autoFilter = {
          from: { row: headerRow, column: 1 },
          to: { row: row - 1, column: count },
        };
    }
    ws.pageSetup.printArea = `A1:${ws.getColumn(count).letter}${row - 1}`;
    // 分块考勤每块自带表头，其余表重复标题及列头。
    ws.pageSetup.printTitlesRow = sheet.blocks ? '1:3' : '1:5';
  }
  return Buffer.from(await book.xlsx.writeBuffer());
}
