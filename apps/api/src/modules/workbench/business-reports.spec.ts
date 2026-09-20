import * as XLSX from 'xlsx';
import {
  attendanceReport,
  attendanceWorkbook,
  fuelReport,
} from './business-reports';

const record = (
  id: string,
  occurredAt: string,
  payload: Record<string, unknown>,
  extra = {},
) => ({
  id,
  recordNo: id,
  moduleCode: 'shipping_attendance',
  departmentCode: 'shipping',
  title: id,
  status: 'submitted',
  vesselId: 'v1',
  occurredAt,
  payload,
  ...extra,
});
describe('business reports', () => {
  it('exports real rows and separates missing hours, Shanghai month boundaries and void records', async () => {
    const report = attendanceReport(
      [
        record('r1', '2026-08-31T16:30:00Z', {
          crewName: '张三',
          period: 'am',
          workHours: 4,
        }),
        record('r2', '2026-09-30T16:00:00Z', {
          crewName: '张三',
          workHours: 8,
        }),
        record('r3', '2026-09-02T00:00:00Z', { crewName: '张三' }),
        record(
          'r4',
          '2026-09-02T00:00:00Z',
          { crewName: '李四', workHours: 9 },
          { status: 'voided' },
        ),
      ],
      '2026-09',
    );
    expect(report.details).toHaveLength(2);
    expect(report.people[0]).toMatchObject({
      personName: '张三',
      workHours: 4,
      missingHours: 1,
      days: 2,
    });
    const wb = XLSX.read(await attendanceWorkbook(report), { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['人员汇总', '逐日考勤', '考勤明细']);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['考勤明细']!, { range: 4 });
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ 姓名: '张三', 记录编号: 'r1', 工时: 4 }),
      ]),
    );
  });
  it('filters departments and rejects invalid months', () => {
    expect(
      attendanceReport(
        [record('r', '2026-09-01T00:00:00Z', { crewName: '甲' })],
        '2026-09',
        'finance',
      ).details,
    ).toHaveLength(0);
    expect(() => attendanceReport([], '2026-13')).toThrow();
  });
  it('calculates fuel from actual receipts and previous close, without mixing units or estimates', () => {
    const rows = [
      record(
        'm1',
        '2026-08-31T00:00:00Z',
        { month: '2026-08', fuelType: '柴油', unit: 'L', closingBalance: 100 },
        { moduleCode: 'shipping_fuel_measurement' },
      ),
      record(
        'm2',
        '2026-09-30T00:00:00Z',
        {
          month: '2026-09',
          fuelType: '柴油',
          unit: 'L',
          closingBalance: 30,
          lowFuelThreshold: 40,
        },
        { moduleCode: 'shipping_fuel_measurement' },
      ),
      record(
        'b',
        '2026-09-01T00:00:00Z',
        {
          bunkeringAmount: 999,
          fuelActual: {
            fuelType: '柴油',
            unit: 'L',
            amount: 50,
            occurredAt: '2026-09-05T00:00:00Z',
          },
        },
        {
          moduleCode: 'shipping_fuel_bunkering_approval',
          status: 'approval_passed',
        },
      ),
      record(
        'other',
        '2026-09-30T00:00:00Z',
        {
          month: '2026-09',
          fuelType: '柴油',
          unit: 't',
          openingBalance: 2,
          closingBalance: 1,
        },
        { moduleCode: 'shipping_fuel_measurement' },
      ),
    ];
    const report = fuelReport(rows, '2026-09');
    expect(report.rows.find((row) => row.unit === 'L')).toMatchObject({
      openingBalance: 100,
      bunkeredAmount: 50,
      consumedAmount: 120,
      closingBalance: 30,
      lowFuel: true,
    });
    expect(report.rows.find((row) => row.unit === 't')).toMatchObject({
      consumedAmount: 1,
    });
  });
  it('does not invent consumption when measurements are missing or inconsistent', () => {
    const report = fuelReport(
      [
        record(
          'm',
          '2026-09-30T00:00:00Z',
          {
            month: '2026-09',
            fuelType: '柴油',
            unit: 'L',
            openingBalance: 1,
            closingBalance: 10,
          },
          { moduleCode: 'shipping_fuel_measurement' },
        ),
      ],
      '2026-09',
    );
    expect(report.rows[0]?.consumedAmount).toBeNull();
    expect(report.rows[0]?.issues).toContain('余量超过期初与加注合计，请核对');
  });
});
