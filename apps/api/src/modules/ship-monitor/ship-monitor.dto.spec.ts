import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ShipMonitorCreateDto } from './dto/ship-monitor-create.dto';
import { ShipMonitorUpdateDto } from './dto/ship-monitor-update.dto';
import { ShipMonitorListQueryDto } from './dto/ship-monitor-list-query.dto';

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
const valid = {
  vesselId: '12345678-1234-4234-8234-123456789abc',
  monitorName: '主监控',
  endpointUrl: 'http://192.168.1.10:8080/live',
};

describe('ship monitor request validation', () => {
  it.each([
    [undefined, true],
    ['true', true],
    ['false', false],
    [false, false],
  ])('parses activeOnly=%s as %s', async (value, expected) => {
    const result = await pipe.transform(
      value === undefined ? {} : { activeOnly: value },
      { type: 'query', metatype: ShipMonitorListQueryDto },
    );
    expect(result.activeOnly).toBe(expected);
  });
  it('rejects invalid booleans instead of treating them as true', async () => {
    await expect(
      pipe.transform(
        { activeOnly: 'wrong' },
        { type: 'query', metatype: ShipMonitorListQueryDto },
      ),
    ).rejects.toThrow();
  });
  it('accepts a selected vessel UUID and an intranet HTTP URL, trimming pasted whitespace', async () => {
    const result = await pipe.transform(
      {
        ...valid,
        monitorName: ' 主监控 ',
        endpointUrl: ` ${valid.endpointUrl} `,
        isActive: false,
      },
      { type: 'body', metatype: ShipMonitorCreateDto },
    );
    expect(result).toMatchObject({ ...valid, isActive: false });
  });
  it('rejects a ship name where a vessel UUID is required', async () => {
    await expect(
      pipe.transform(
        { ...valid, vesselId: '苏南012' },
        { type: 'body', metatype: ShipMonitorCreateDto },
      ),
    ).rejects.toThrow();
  });
  it.each(['', '  '])(
    'rejects empty monitor names on create and update: %s',
    async (monitorName) => {
      await expect(
        pipe.transform(
          { ...valid, monitorName },
          { type: 'body', metatype: ShipMonitorCreateDto },
        ),
      ).rejects.toThrow();
      await expect(
        pipe.transform(
          { monitorName },
          { type: 'body', metatype: ShipMonitorUpdateDto },
        ),
      ).rejects.toThrow();
    },
  );
  it.each([
    'monitor.example.com',
    'ftp://monitor.example.com',
    'javascript:alert(1)',
  ])('rejects non-HTTP(S) address %s', async (endpointUrl) => {
    await expect(
      pipe.transform(
        { ...valid, endpointUrl },
        { type: 'body', metatype: ShipMonitorCreateDto },
      ),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { endpointUrl },
        { type: 'body', metatype: ShipMonitorUpdateDto },
      ),
    ).rejects.toThrow();
  });
});
