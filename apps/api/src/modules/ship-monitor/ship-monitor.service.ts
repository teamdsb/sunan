import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { ShipMonitorEntity } from 'src/database/entities/ship-monitor.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { ShipMonitorCreateDto } from './dto/ship-monitor-create.dto';
import { ShipMonitorListQueryDto } from './dto/ship-monitor-list-query.dto';
import { ShipMonitorUpdateDto } from './dto/ship-monitor-update.dto';

@Injectable()
export class ShipMonitorService {
  constructor(
    @InjectRepository(ShipMonitorEntity)
    private readonly repository: Repository<ShipMonitorEntity>,
    @InjectRepository(VesselEntity)
    private readonly vesselRepository: Repository<VesselEntity>,
  ) {}

  async list(query: ShipMonitorListQueryDto, user: CurrentUser) {
    const qb = this.repository.createQueryBuilder('m').where('m.deletedAt IS NULL');
    if (query.vesselId) qb.andWhere('m.vesselId = :vesselId', { vesselId: query.vesselId });

    const isAdminView = user.roles.includes('system_admin');
    if (query.activeOnly !== false || !isAdminView) {
      qb.andWhere('m.isActive = true');
    }

    const rows = await qb.orderBy('m.sortOrder', 'ASC').addOrderBy('m.createdAt', 'DESC').getMany();
    return rows.map((row) => this.toDto(row));
  }

  async listByVessel(vesselId: string, user: CurrentUser) {
    return this.list({ vesselId, activeOnly: true }, user);
  }

  async getById(id: string) {
    const row = await this.repository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!row) throw new NotFoundException('ship monitor not found');
    return this.toDto(row);
  }

  async create(dto: ShipMonitorCreateDto, user: CurrentUser) {
    this.ensureManager(user);
    await this.assertVesselExists(dto.vesselId);

    const entity = this.repository.create({
      vesselId: dto.vesselId,
      monitorName: dto.monitorName,
      endpointUrl: dto.endpointUrl,
      accessMode: dto.accessMode ?? 'external',
      sortOrder: dto.sortOrder ?? 0,
      isActive: true,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    return this.toDto(await this.repository.save(entity));
  }

  async update(id: string, dto: ShipMonitorUpdateDto, user: CurrentUser) {
    this.ensureManager(user);
    const entity = await this.repository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!entity) throw new NotFoundException('ship monitor not found');

    if (dto.vesselId) await this.assertVesselExists(dto.vesselId);

    Object.assign(entity, {
      vesselId: dto.vesselId ?? entity.vesselId,
      monitorName: dto.monitorName ?? entity.monitorName,
      endpointUrl: dto.endpointUrl ?? entity.endpointUrl,
      accessMode: dto.accessMode ?? entity.accessMode,
      sortOrder: dto.sortOrder ?? entity.sortOrder,
      isActive: dto.isActive ?? entity.isActive,
      updatedBy: user.userId,
    });

    return this.toDto(await this.repository.save(entity));
  }

  async remove(id: string, user: CurrentUser) {
    this.ensureManager(user);
    const entity = await this.repository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!entity) throw new NotFoundException('ship monitor not found');
    entity.deletedAt = new Date();
    entity.updatedBy = user.userId;
    await this.repository.save(entity);
  }

  private ensureManager(user: CurrentUser) {
    if (user.roles.includes('system_admin')) return;
    throw new ForbiddenException('forbidden');
  }

  private async assertVesselExists(vesselId: string) {
    const vessel = await this.vesselRepository.findOne({ where: { id: vesselId, deletedAt: IsNull() } });
    if (!vessel) throw new NotFoundException('vessel not found');
  }

  private toDto(entity: ShipMonitorEntity) {
    return {
      id: entity.id,
      vesselId: entity.vesselId,
      monitorName: entity.monitorName,
      endpointUrl: entity.endpointUrl,
      accessMode: entity.accessMode,
      sortOrder: entity.sortOrder,
      isActive: entity.isActive,
      lastVerifiedAt: entity.lastVerifiedAt?.toISOString() ?? null,
    };
  }
}
