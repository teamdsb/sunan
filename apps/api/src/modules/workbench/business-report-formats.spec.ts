import ExcelJS from 'exceljs';
import { PDFDocument } from 'pdf-lib';
import { attendanceReport, attendanceWorkbook } from './business-reports';
import {
  attendancePdf,
  learningPdf,
  learningWorkbook,
} from './business-report-formats';

const report = (count = 32) =>
  attendanceReport(
    Array.from({ length: count }, (_, i) => ({
      id: `r${i}`,
      recordNo: `WB-${i}`,
      moduleCode: 'shipping_attendance',
      departmentCode: 'shipping',
      title: `第 ${i + 1} 条考勤记录`,
      status: 'submitted',
      vesselId: 'v1',
      occurredAt: `2026-09-${String((i % 30) + 1).padStart(2, '0')}T08:00:00+08:00`,
      payload: {
        crewName: `船员${i + 1}`,
        vesselName: '苏南测试船',
        ...(i % 2 ? {} : { workHours: 4 }),
      },
    })),
    '2026-09',
  );
const generatedAt = new Date('2026-09-20T08:00:00Z');
describe('business export formats', () => {
  it('keeps actual data, missing values and both half-months in styled printable Excel', async () => {
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(
      Uint8Array.from(await attendanceWorkbook(report(), generatedAt)).buffer,
    );
    const detail = book.getWorksheet('考勤明细')!;
    expect(detail.getCell('A1').value).toContain('2026-09');
    expect(detail.getCell('A5').font.bold).toBe(true);
    expect(detail.views[0]).toMatchObject({
      state: 'frozen',
      ySplit: 5,
      xSplit: 2,
    });
    expect(detail.pageSetup).toMatchObject({
      orientation: 'landscape',
      fitToWidth: 1,
      printTitlesRow: '1:5',
    });
    expect(detail.getColumn(1).values).toContain('WB-31');
    expect(detail.getColumn(9).values).toContain('未登记');
    const daily = book.getWorksheet('逐日考勤')!;
    expect(daily.pageSetup.paperSize).toBe(8);
    expect(daily.pageSetup.printTitlesRow).toBe('1:3');
    expect(daily.getColumn(18).width).toBe(16);
    const headers: string[] = [];
    daily.eachRow((row) => {
      if (row.getCell(1).value === '姓名') {
        const value = row.getCell(3).value;
        headers.push(typeof value === 'string' ? value : '');
      }
    });
    expect(headers.filter((v) => v === '01').length).toBeGreaterThan(1);
    expect(headers.filter((v) => v === '16').length).toBeGreaterThan(1);
  });
  it('formats percentages without converting values or interpreting user text as formulas', async () => {
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(
      Uint8Array.from(
        await learningWorkbook({
          people: [
            {
              userId: 'u',
              name: '=1+1',
              assigned: 2,
              completed: 1,
              completionRate: 50,
              completedHours: 2,
            },
          ],
          courses: [],
        }),
      ).buffer,
    );
    const sheet = book.getWorksheet('个人学时')!;
    expect(sheet.getCell('A6').value).toBe('=1+1');
    expect(sheet.getCell('D6').value).toBe(50);
    expect(sheet.getCell('D6').numFmt).toBe('0.##"%"');
    expect(book.getWorksheet('学习明细')!.getCell('A6').value).toBe(
      '本范围暂无记录',
    );
  });
  it('paginates attendance tables and honors A3 learning paper selection', async () => {
    const pdf = await PDFDocument.load(
      await attendancePdf(report(), generatedAt),
    );
    expect(pdf.getPageCount()).toBeGreaterThan(2);
    expect(pdf.getTitle()).toBe('2026-09 考勤报表');
    pdf
      .getPages()
      .forEach((page) =>
        expect(page.getSize()).toEqual({ width: 842, height: 595 }),
      );
    const learning = await PDFDocument.load(
      await learningPdf({
        title: '学习测试',
        summary: '内容'.repeat(3000),
        recordNo: 'LEARN-1',
        learning: null,
        paperSize: 'A3',
        generatedAt,
      }),
    );
    expect(learning.getPageCount()).toBeGreaterThan(1);
    learning
      .getPages()
      .forEach((page) =>
        expect(page.getSize()).toEqual({ width: 842, height: 1191 }),
      );
  }, 15000);
});
