import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { WorkbenchRecordActionLogEntity } from 'src/database/entities/workbench-record-action-log.entity';
import {
  FUEL_MODULE,
  FUEL_MEASUREMENT,
  reportMonth,
  textValue,
} from './business-reports';
import {
  FuelActualDto,
  FuelMeasurementDto,
} from './dto/workbench-business.dto';
const manager = (user: CurrentUser) =>
  user.roles.some((r) =>
    ['system_admin', 'general_office', 'shipping'].includes(r),
  );
@Injectable()
export class WorkbenchFuelService {
  constructor(private readonly source: DataSource) {}
  async actual(id: string, dto: FuelActualDto, user: CurrentUser) {
    if (!textValue(dto.fuelType)) throw new BadRequestException('请填写油品');
    if (new Date(dto.occurredAt).getTime() > Date.now())
      throw new BadRequestException('实际加注时间不能在未来');
    return this.source.transaction(async (em) => {
      const record = await em.findOne(WorkbenchRecordEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!record || record.moduleCode !== FUEL_MODULE)
        throw new NotFoundException('加注记录不存在');
      if (!manager(user) && record.ownerUserId !== user.userId)
        throw new ForbiddenException('仅申请人或管理人员可登记实绩');
      if (record.status !== 'approval_passed')
        throw new ConflictException('审批通过后才能登记实际加注');
      if (!record.vesselId)
        throw new BadRequestException('原申请缺少船舶关联，请先补录正确的申请');
      const before = record.payload.fuelActual;
      record.payload = {
        ...record.payload,
        fuelActual: {
          ...dto,
          fuelType: dto.fuelType.trim(),
          recordedBy: user.userId,
          recordedAt: new Date().toISOString(),
        },
      };
      await em.save(record);
      await em.save(
        WorkbenchRecordActionLogEntity,
        em.create(WorkbenchRecordActionLogEntity, {
          businessRecordId: id,
          actionType: 'record_fuel_actual',
          source: 'manual',
          operatorUserId: user.userId,
          fromStatus: record.status,
          toStatus: record.status,
          comment: before ? '更正实际加注' : '登记实际加注',
          payloadDigest: JSON.stringify({
            before,
            after: record.payload.fuelActual,
          }),
        }),
      );
      return record.payload.fuelActual;
    });
  }
  async measurement(dto: FuelMeasurementDto, user: CurrentUser) {
    if (
      !manager(user) &&
      !(
        user.roles.includes('crew') &&
        (user.departments.includes(dto.vesselId) ||
          user.departments.includes(`vessel:${dto.vesselId}`))
      )
    )
      throw new ForbiddenException('仅所属船舶人员或管理人员可登记测量');
    reportMonth(dto.month);
    if (dto.month > reportMonth())
      throw new BadRequestException('不能登记未来月份的测量');
    if (!textValue(dto.fuelType)) throw new BadRequestException('请填写油品');
    const vessel = await this.source
      .getRepository(VesselEntity)
      .findOneBy({ id: dto.vesselId });
    if (!vessel) throw new NotFoundException('船舶不存在');
    return this.source.transaction(async (em) => {
      const key = JSON.stringify([
        dto.vesselId,
        dto.month,
        dto.fuelType.trim(),
        dto.unit,
      ]);
      await em.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `fuel:${key}`,
      ]);
      let record = await em
        .getRepository(WorkbenchRecordEntity)
        .createQueryBuilder('r')
        .where('r.moduleCode = :moduleCode', { moduleCode: FUEL_MEASUREMENT })
        .andWhere('r.vesselId = :vesselId', { vesselId: dto.vesselId })
        .andWhere("r.payload->>'month' = :month", { month: dto.month })
        .andWhere("r.payload->>'fuelType' = :fuelType", {
          fuelType: dto.fuelType.trim(),
        })
        .andWhere("r.payload->>'unit' = :unit", { unit: dto.unit })
        .getOne();
      const before = record?.payload;
      if (!record)
        record = em.create(WorkbenchRecordEntity, {
          moduleCode: FUEL_MEASUREMENT,
          templateCode: `${FUEL_MEASUREMENT}_v1`,
          recordNo: `FM${randomUUID().replace(/-/g, '').slice(0, 28)}`,
          recordSource: 'manual',
          status: 'closed',
          closedAt: new Date(),
          approvalChannel: 'internal',
          title: `${vessel.name} ${dto.month} 燃油测量`,
          summary: '月末实测余量',
          departmentCode: 'shipping',
          vesselId: dto.vesselId,
          ownerUserId: user.userId,
          applicantUserId: user.userId,
          occurredAt: new Date(`${dto.month}-01T00:00:00+08:00`),
        });
      record.payload = {
        ...record.payload,
        ...Object.fromEntries(
          Object.entries(dto).filter(
            ([, value]) => value !== undefined && value !== null,
          ),
        ),
        fuelType: dto.fuelType.trim(),
        vesselName: vessel.name,
        measuredBy: user.userId,
        updatedAt: new Date().toISOString(),
      };
      await em.save(record);
      await em.save(
        WorkbenchRecordActionLogEntity,
        em.create(WorkbenchRecordActionLogEntity, {
          businessRecordId: record.id,
          actionType: 'record_fuel_measurement',
          source: 'manual',
          operatorUserId: user.userId,
          fromStatus: record.status,
          toStatus: record.status,
          comment: before ? '更正月末测量' : '登记月末测量',
          payloadDigest: JSON.stringify({ before, after: record.payload }),
        }),
      );
      return { id: record.id };
    });
  }
}
