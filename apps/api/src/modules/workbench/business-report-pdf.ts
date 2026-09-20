import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import { createChinesePdfFont } from 'src/common/pdf/chinese-pdf-font';

export interface ReportPdfColumn {
  label: string;
  weight: number;
  align?: 'left' | 'right' | 'center';
}
export interface ReportPdfInput {
  title: string;
  scope: string;
  generatedAt?: Date;
  paperSize?: 'A4' | 'A3';
  landscape?: boolean;
  summary?: Array<{ label: string; value: string }>;
  sections: Array<{
    title: string;
    note?: string;
    columns: ReportPdfColumn[];
    rows: Array<Array<string | number | null>>;
    emptyText?: string;
  }>;
}
const colors = {
  navy: rgb(0.055, 0.149, 0.247),
  blue: rgb(0.086, 0.376, 0.843),
  muted: rgb(0.36, 0.43, 0.53),
  line: rgb(0.84, 0.88, 0.94),
  pale: rgb(0.94, 0.97, 1),
  stripe: rgb(0.975, 0.98, 0.99),
  white: rgb(1, 1, 1),
  warning: rgb(0.57, 0.34, 0),
};
const brand = '苏南船舶管理平台 · 工作平台报表';
export async function businessReportPdf(input: ReportPdfInput) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(
    await createChinesePdfFont([
      input,
      brand,
      '（续表） 本范围暂无记录 未登记 业务数据快照 生成时间：上海 第页共0123456789 /:.-',
    ]),
  );
  const generatedAt = input.generatedAt ?? new Date();
  const generated = new Date(generatedAt.getTime() + 8 * 3600_000)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ');
  doc.setTitle(input.title);
  doc.setAuthor('苏南船舶管理平台');
  doc.setCreator('苏南船舶管理平台');
  doc.setSubject(input.scope);
  doc.setCreationDate(generatedAt);
  const portrait = input.paperSize === 'A3' ? [842, 1191] : [595, 842];
  const [width, height] = input.landscape ? [...portrait].reverse() : portrait;
  const margin = 40,
    bottom = 52,
    content = width! - margin * 2;
  let page: PDFPage,
    y = 0;
  const wrap = (
    raw: string | number | null,
    size: number,
    available: number,
  ) => {
    const output: string[] = [];
    for (const paragraph of String(raw ?? '未登记')
      .replace(/\r\n?/g, '\n')
      .replace(/\t/g, ' ')
      .split('\n')) {
      let line = '';
      for (const char of paragraph) {
        if (line && font.widthOfTextAtSize(line + char, size) > available) {
          output.push(line);
          line = '';
        }
        line += char;
      }
      output.push(line);
    }
    return output;
  };
  const text = (
    value: string,
    x: number,
    baseline: number,
    size = 9,
    color = colors.navy,
  ) => page.drawText(value, { x, y: baseline, size, font, color });
  const addPage = () => {
    page = doc.addPage([width!, height!]);
    text(brand, margin, height! - 32, 9, colors.blue);
    y = height! - 58;
    for (const line of wrap(input.title, 19, content)) {
      text(line, margin, y, 19);
      y -= 25;
    }
    for (const line of wrap(input.scope, 9, content)) {
      text(line, margin, y, 9, colors.muted);
      y -= 14;
    }
    page.drawLine({
      start: { x: margin, y: y + 3 },
      end: { x: width! - margin, y: y + 3 },
      thickness: 0.7,
      color: colors.line,
    });
    y -= 12;
  };
  const sectionTitle = (title: string) => {
    page.drawRectangle({
      x: margin,
      y: y - 16,
      width: 3,
      height: 15,
      color: colors.blue,
    });
    for (const line of wrap(title, 12, content - 12)) {
      text(line, margin + 10, y - 13, 12);
      y -= 18;
    }
    y -= 8;
  };
  addPage();
  if (input.summary?.length) {
    const cardWidth =
      (content - 10 * (input.summary.length - 1)) / input.summary.length;
    input.summary.forEach((item, index) => {
      const x = margin + index * (cardWidth + 10);
      page.drawRectangle({
        x,
        y: y - 55,
        width: cardWidth,
        height: 55,
        color: colors.pale,
        borderColor: colors.line,
        borderWidth: 0.5,
      });
      text(item.label, x + 12, y - 18, 9, colors.muted);
      text(item.value, x + 12, y - 40, 15, colors.blue);
    });
    y -= 73;
  }
  for (const section of input.sections) {
    const totalWeight = section.columns.reduce((sum, c) => sum + c.weight, 0);
    const widths = section.columns.map(
      (c) => (content * c.weight) / totalWeight,
    );
    const headerLines = section.columns.map((c, i) =>
      wrap(c.label, 9, widths[i]! - 14),
    );
    const headerHeight =
      Math.max(...headerLines.map((v) => v.length)) * 13 + 14;
    const header = () => {
      let x = margin;
      section.columns.forEach((_, i) => {
        page.drawRectangle({
          x,
          y: y - headerHeight,
          width: widths[i]!,
          height: headerHeight,
          color: colors.pale,
          borderColor: colors.line,
          borderWidth: 0.5,
        });
        headerLines[i]!.forEach((line, n) =>
          text(line, x + 7, y - 16 - n * 13, 9),
        );
        x += widths[i]!;
      });
      y -= headerHeight;
    };
    const continuation = () => {
      addPage();
      sectionTitle(`${section.title}（续表）`);
      header();
    };
    if (y - (headerHeight + 75) < bottom) addPage();
    sectionTitle(section.title);
    if (section.note) {
      for (const line of wrap(section.note, 8.5, content)) {
        if (y - headerHeight - 35 < bottom) {
          addPage();
          sectionTitle(section.title);
        }
        text(line, margin, y - 10, 8.5, colors.muted);
        y -= 13;
      }
      y -= 6;
    }
    header();
    const rows = section.rows.length
      ? section.rows
      : [
          [
            section.emptyText ?? '本范围暂无记录',
            ...section.columns.slice(1).map(() => ''),
          ],
        ];
    rows.forEach((row, index) => {
      const lines = section.columns.map((_, i) =>
        wrap(row[i] ?? '', 9, widths[i]! - 14),
      );
      const count = Math.max(...lines.map((l) => l.length));
      const fullHeight = count * 13 + 14;
      // 尽量整行换页；超出单页的长内容按行分段，保留所有文字。
      if (fullHeight > y - bottom && fullHeight <= height! - 190 - headerHeight)
        continuation();
      let offset = 0;
      while (offset < count) {
        let capacity = Math.floor((y - bottom - 14) / 13);
        if (capacity < 1) {
          continuation();
          capacity = Math.floor((y - bottom - 14) / 13);
        }
        const take = Math.min(capacity, count - offset),
          rowHeight = take * 13 + 14;
        let x = margin;
        section.columns.forEach((column, i) => {
          const cellLines = lines[i]!.slice(offset, offset + take);
          page.drawRectangle({
            x,
            y: y - rowHeight,
            width: widths[i]!,
            height: rowHeight,
            color: index % 2 ? colors.stripe : colors.white,
            borderColor: colors.line,
            borderWidth: 0.45,
          });
          cellLines.forEach((line, n) => {
            const textWidth = font.widthOfTextAtSize(line, 9);
            const dx =
              column.align === 'right'
                ? widths[i]! - 7 - textWidth
                : column.align === 'center'
                  ? (widths[i]! - textWidth) / 2
                  : 7;
            text(
              line,
              x + dx,
              y - 16 - n * 13,
              9,
              /未登记|待核对|未完成/.test(line) ? colors.warning : colors.navy,
            );
          });
          x += widths[i]!;
        });
        y -= rowHeight;
        offset += take;
        if (offset < count) continuation();
      }
    });
    y -= 22;
  }
  doc.getPages().forEach((p, i) => {
    p.drawLine({
      start: { x: margin, y: 37 },
      end: { x: width! - margin, y: 37 },
      thickness: 0.5,
      color: colors.line,
    });
    p.drawText(`业务数据快照 | 生成时间：${generated}（上海）`, {
      x: margin,
      y: 24,
      size: 8,
      font,
      color: colors.muted,
    });
    const label = `第 ${i + 1} 页 / 共 ${doc.getPageCount()} 页`;
    p.drawText(label, {
      x: width! - margin - font.widthOfTextAtSize(label, 8),
      y: 24,
      size: 8,
      font,
      color: colors.muted,
    });
  });
  return Buffer.from(await doc.save());
}
