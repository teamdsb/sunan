import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
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
    const qb = this.repository
      .createQueryBuilder('m')
      .where('m.deletedAt IS NULL');
    if (query.vesselId)
      qb.andWhere('m.vesselId = :vesselId', { vesselId: query.vesselId });

    const isAdminView = user.roles.includes('system_admin');
    if (query.activeOnly !== false || !isAdminView) {
      qb.andWhere('m.isActive = true');
    }

    const rows = await qb
      .orderBy('m.sortOrder', 'ASC')
      .addOrderBy('m.createdAt', 'DESC')
      .getMany();
    return this.toDtos(rows);
  }

  async listByVessel(vesselId: string, user: CurrentUser) {
    return this.list(
      { vesselId, activeOnly: !user.roles.includes('system_admin') },
      user,
    );
  }

  async getById(id: string, user: CurrentUser) {
    const row = await this.repository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!row || (!user.roles.includes('system_admin') && !row.isActive)) {
      throw new NotFoundException('监控入口不存在或已停用');
    }
    return (await this.toDtos([row]))[0];
  }

  async create(dto: ShipMonitorCreateDto, user: CurrentUser) {
    this.ensureManager(user);
    await this.assertVesselExists(dto.vesselId);
    await this.assertNameAvailable(dto.vesselId, dto.monitorName);

    const entity = this.repository.create({
      vesselId: dto.vesselId,
      monitorName: dto.monitorName,
      endpointUrl: dto.endpointUrl,
      accessMode: dto.accessMode ?? 'external',
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    return this.saveAndMap(entity);
  }

  async update(id: string, dto: ShipMonitorUpdateDto, user: CurrentUser) {
    this.ensureManager(user);
    const entity = await this.repository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!entity) throw new NotFoundException('监控入口不存在或已停用');

    const vesselId = dto.vesselId ?? entity.vesselId;
    // Disabling a monitor must remain possible after its vessel is retired/deleted.
    if (
      (dto.vesselId && dto.vesselId !== entity.vesselId) ||
      dto.isActive === true
    ) {
      await this.assertVesselExists(vesselId);
    }
    await this.assertNameAvailable(
      vesselId,
      dto.monitorName ?? entity.monitorName,
      id,
    );

    Object.assign(entity, {
      vesselId: dto.vesselId ?? entity.vesselId,
      monitorName: dto.monitorName ?? entity.monitorName,
      endpointUrl: dto.endpointUrl ?? entity.endpointUrl,
      accessMode: dto.accessMode ?? entity.accessMode,
      sortOrder: dto.sortOrder ?? entity.sortOrder,
      isActive: dto.isActive ?? entity.isActive,
      updatedBy: user.userId,
    });

    return this.saveAndMap(entity);
  }

  async remove(id: string, user: CurrentUser) {
    this.ensureManager(user);
    const entity = await this.repository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!entity) throw new NotFoundException('监控入口不存在或已停用');
    entity.deletedAt = new Date();
    entity.updatedBy = user.userId;
    await this.repository.save(entity);
  }

  private ensureManager(user: CurrentUser) {
    if (user.roles.includes('system_admin')) return;
    throw new ForbiddenException('仅系统管理员可配置监控入口');
  }

  private async assertVesselExists(vesselId: string) {
    const vessel = await this.vesselRepository.findOne({
      where: { id: vesselId, deletedAt: IsNull() },
    });
    if (!vessel) throw new NotFoundException('船舶不存在或已删除，请重新选择');
    if (vessel.status !== 'active')
      throw new UnprocessableEntityException('船舶已停用，请选择有效船舶');
  }

  private async assertNameAvailable(
    vesselId: string,
    monitorName: string,
    excludeId?: string,
  ) {
    const existing = await this.repository.findOne({
      where: { vesselId, monitorName, deletedAt: IsNull() },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('该船舶已存在同名监控入口');
    }
  }

  private async saveAndMap(entity: ShipMonitorEntity) {
    try {
      return (await this.toDtos([await this.repository.save(entity)]))[0];
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('该船舶已存在同名监控入口');
      }
      throw error;
    }
  }

  private async toDtos(entities: ShipMonitorEntity[]) {
    if (!entities.length) return [];
    const vesselIds = [...new Set(entities.map((entity) => entity.vesselId))];
    const vessels = await this.vesselRepository.find({
      where: { id: In(vesselIds) },
      withDeleted: true,
    });
    const vesselById = new Map(vessels.map((vessel) => [vessel.id, vessel]));
    return entities.map((entity) =>
      this.toDto(entity, vesselById.get(entity.vesselId)),
    );
  }

  private toDto(entity: ShipMonitorEntity, vessel?: VesselEntity) {
    return {
      id: entity.id,
      vesselId: entity.vesselId,
      vesselName: vessel?.name ?? null,
      vesselCode: vessel?.code ?? null,
      monitorName: entity.monitorName,
      endpointUrl: entity.endpointUrl,
      accessMode: entity.accessMode,
      sortOrder: entity.sortOrder,
      isActive: entity.isActive,
      lastVerifiedAt: entity.lastVerifiedAt?.toISOString() ?? null,
    };
  }
}
