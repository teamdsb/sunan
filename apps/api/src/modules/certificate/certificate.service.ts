import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UnprocessableEntityException } from '@nestjs/common';
import { In, IsNull, Repository } from 'typeorm';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { toBusinessDate } from 'src/common/date/business-date';
import { CertificateFileEntity } from 'src/database/entities/certificate-file.entity';
import { CertificateTypeEntity } from 'src/database/entities/certificate-type.entity';
import { CertificateEntity } from 'src/database/entities/certificate.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import { PersonnelEntity } from 'src/database/entities/personnel.entity';
import { SafetyEquipmentEntity } from 'src/database/entities/safety-equipment.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { VehicleEntity } from 'src/database/entities/vehicle.entity';
import { CertificateBindFilesDto } from './dto/certificate-bind-files.dto';
import { CertificateCreateDto } from './dto/certificate-create.dto';
import { CertificateGroupQueryDto } from './dto/certificate-group-query.dto';
import { CertificateListQueryDto } from './dto/certificate-list-query.dto';
import { CertificateUpdateDto } from './dto/certificate-update.dto';
import { OssService } from 'src/modules/files/oss.service';

const MANAGER_ROLES = new Set(['general_office', 'finance', 'business', 'shipping', 'logistics']);
const OWNER_TYPE_LABELS: Record<CertificateEntity['ownerType'], string> = {
  vessel: '船舶',
  vehicle: '车辆',
  personnel: '人员',
  equipment: '设备',
};

@Injectable()
export class CertificateService {
  constructor(
    @InjectRepository(CertificateEntity)
    private readonly repository: Repository<CertificateEntity>,
    @InjectRepository(CertificateFileEntity)
    private readonly fileRelRepository: Repository<CertificateFileEntity>,
    @InjectRepository(CertificateTypeEntity)
    private readonly certificateTypeRepository: Repository<CertificateTypeEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(VesselEntity)
    private readonly vesselRepository: Repository<VesselEntity>,
    @InjectRepository(VehicleEntity)
    private readonly vehicleRepository: Repository<VehicleEntity>,
    @InjectRepository(PersonnelEntity)
    private readonly personnelRepository: Repository<PersonnelEntity>,
    @InjectRepository(SafetyEquipmentEntity)
    private readonly equipmentRepository: Repository<SafetyEquipmentEntity>,
    private readonly ossService: OssService,
  ) {}

  async list(query: CertificateListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.repository.createQueryBuilder('c').where('c.deletedAt IS NULL');

    if (query.ownerType) qb.andWhere('c.ownerType = :ownerType', { ownerType: query.ownerType });
    if (query.ownerId) qb.andWhere('c.ownerId = :ownerId', { ownerId: query.ownerId });
    if (query.certificateTypeId) qb.andWhere('c.certificateTypeId = :certificateTypeId', { certificateTypeId: query.certificateTypeId });
    if (query.status) qb.andWhere('c.status = :status', { status: query.status });
    if (query.keyword) qb.andWhere('(c.title like :kw OR c.certificateNo like :kw)', { kw: `%${query.keyword}%` });

    const [items, total] = await qb.orderBy('c.expiryDate', 'ASC').addOrderBy('c.updatedAt', 'DESC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const data = await Promise.all(items.map((item) => this.toDetail(item)));

    return { data, meta: { page, pageSize, total } };
  }

  async listTypes(ownerType?: 'vessel' | 'vehicle' | 'personnel' | 'equipment') {
    const rows = await this.certificateTypeRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    return rows
      .filter((row) => this.matchesOwnerScope(row.ownerScope, ownerType))
      .map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        ownerScope: row.ownerScope,
        reminderCategory: row.reminderCategory,
        defaultAdvanceDays: row.defaultAdvanceDays,
        requiresAttachment: row.requiresAttachment,
      }));
  }

  async listOwners(ownerType: 'vessel' | 'vehicle' | 'personnel' | 'equipment') {
    if (ownerType === 'vessel') {
      const rows = await this.vesselRepository.find({
        where: { deletedAt: IsNull(), status: 'active' },
        order: { name: 'ASC' },
      });
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        status: row.status,
      }));
    }

    if (ownerType === 'vehicle') {
      const rows = await this.vehicleRepository.find({
        where: { deletedAt: IsNull(), status: 'active' },
        order: { plateNumber: 'ASC' },
      });
      return rows.map((row) => ({
        id: row.id,
        name: row.plateNumber,
        code: row.plateNumber,
        status: row.status,
      }));
    }

    if (ownerType === 'equipment') {
      const rows = await this.equipmentRepository.find({ where: { deletedAt: IsNull(), status: 'active' }, order: { code: 'ASC' } });
      return rows.map((row) => ({ id: row.id, name: row.name, code: row.code, status: row.status }));
    }

    const rows = await this.personnelRepository.find({
      where: { deletedAt: IsNull(), employmentStatus: 'active' },
      order: { name: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.wecomUserId ?? row.id,
      status: row.employmentStatus,
    }));
  }

  async grouped(query: CertificateGroupQueryDto) {
    const rows = await this.repository.find({ where: { deletedAt: IsNull() }, order: { expiryDate: 'ASC' } });
    const details = await Promise.all(rows.map((row) => this.toDetail(row)));

    const map = new Map<string, { groupKey: string; groupLabel: string; count: number }>();
    for (const row of details) {
      const key = query.groupBy === 'owner' ? `${row.ownerType}:${row.ownerId}` : row.certificateTypeId;
      const label = query.groupBy === 'owner'
        ? `${OWNER_TYPE_LABELS[row.ownerType] ?? row.ownerType} - ${row.ownerName}`
        : row.certificateTypeName;
      const current = map.get(key) ?? { groupKey: key, groupLabel: label, count: 0 };
      current.count += 1;
      map.set(key, current);
    }

    return [...map.values()];
  }

  async getById(id: string) {
    const entity = await this.findOneOrThrow(id);
    return this.toDetail(entity);
  }

  async create(dto: CertificateCreateDto, user: CurrentUser) {
    this.ensureManager(user);
    await this.assertOwnerExists(dto.ownerType, dto.ownerId);
    const certificateType = await this.assertCertificateType(dto.certificateTypeId, dto.ownerType);

    const advanceDays = dto.advanceDays ?? certificateType.defaultAdvanceDays;
    const entity = this.repository.create({
      certificateTypeId: dto.certificateTypeId,
      ownerType: dto.ownerType,
      ownerId: dto.ownerId,
      certificateNo: dto.certificateNo ?? null,
      title: dto.title,
      issueDate: toBusinessDate(dto.issueDate),
      expiryDate: toBusinessDate(dto.expiryDate) as string,
      advanceDays,
      issuer: dto.issuer ?? null,
      status: dto.status ?? 'active',
      remarks: dto.remarks ?? null,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    const saved = await this.repository.save(entity);
    if (dto.fileIds?.length) await this.bindFiles(saved.id, { fileIds: dto.fileIds }, user);
    return this.getById(saved.id);
  }

  async update(id: string, dto: CertificateUpdateDto, user: CurrentUser) {
    this.ensureManager(user);
    const entity = await this.findOneOrThrow(id);

    const nextOwnerType = dto.ownerType ?? entity.ownerType;
    const nextOwnerId = dto.ownerId ?? entity.ownerId;
    if (dto.ownerType || dto.ownerId) {
      await this.assertOwnerExists(nextOwnerType, nextOwnerId);
    }
    if (dto.certificateTypeId || dto.ownerType) {
      await this.assertCertificateType(dto.certificateTypeId ?? entity.certificateTypeId, nextOwnerType);
    }

    Object.assign(entity, {
      certificateTypeId: dto.certificateTypeId ?? entity.certificateTypeId,
      ownerType: dto.ownerType ?? entity.ownerType,
      ownerId: dto.ownerId ?? entity.ownerId,
      certificateNo: dto.certificateNo ?? entity.certificateNo,
      title: dto.title ?? entity.title,
      issueDate: dto.issueDate === undefined ? entity.issueDate : toBusinessDate(dto.issueDate),
      expiryDate: dto.expiryDate === undefined ? entity.expiryDate : toBusinessDate(dto.expiryDate) as string,
      advanceDays: dto.advanceDays ?? entity.advanceDays,
      issuer: dto.issuer ?? entity.issuer,
      status: dto.status ?? entity.status,
      remarks: dto.remarks ?? entity.remarks,
      updatedBy: user.userId,
    });

    await this.repository.save(entity);

    if (dto.fileIds) {
      await this.fileRelRepository.delete({ certificateId: id });
      await this.bindFiles(id, { fileIds: dto.fileIds }, user);
    }

    return this.getById(id);
  }

  async remove(id: string, user: CurrentUser) {
    this.ensureManager(user);
    const entity = await this.findOneOrThrow(id);
    entity.deletedAt = new Date();
    entity.updatedBy = user.userId;
    await this.repository.save(entity);
  }

  async bindFiles(id: string, dto: CertificateBindFilesDto, user: CurrentUser) {
    this.ensureManager(user);
    await this.findOneOrThrow(id);

    const files = await this.fileRepository.find({ where: { id: In(dto.fileIds) } });
    if (files.length !== dto.fileIds.length) throw new NotFoundException('file not found');

    const existing = await this.fileRelRepository.find({ where: { certificateId: id } });
    const existingSet = new Set(existing.map((row) => row.fileId));
    const rows = dto.fileIds.filter((fileId) => !existingSet.has(fileId)).map((fileId, index) =>
      this.fileRelRepository.create({ certificateId: id, fileId, sortOrder: existing.length + index, fileRole: 'primary' }),
    );
    if (rows.length) await this.fileRelRepository.save(rows);
    return this.getById(id);
  }

  async getFileDownloadUrl(id: string, fileId: string) {
    await this.findOneOrThrow(id);
    const relation = await this.fileRelRepository.findOne({
      where: { certificateId: id, fileId },
    });
    if (!relation) throw new NotFoundException('certificate file not found');
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException('file not found');
    return this.ossService.createDownloadSignature(file.ossKey);
  }

  private ensureManager(user: CurrentUser) {
    if (user.roles.includes('system_admin') || user.roles.some((role) => MANAGER_ROLES.has(role))) return;
    throw new ForbiddenException('forbidden');
  }

  private matchesOwnerScope(ownerScope: string, ownerType?: 'vessel' | 'vehicle' | 'personnel' | 'equipment') {
    if (!ownerType || ownerScope === 'mixed' || ownerScope === 'all') {
      return true;
    }

    return ownerScope === ownerType;
  }

  private async assertOwnerExists(ownerType: 'vessel' | 'vehicle' | 'personnel' | 'equipment', ownerId: string) {
    if (ownerType === 'vessel') {
      const row = await this.vesselRepository.findOne({ where: { id: ownerId, deletedAt: IsNull() } });
      if (!row) throw new NotFoundException('vessel owner not found');
      if (row.status !== 'active') throw new UnprocessableEntityException('inactive owner cannot be selected');
      return;
    }

    if (ownerType === 'vehicle') {
      const row = await this.vehicleRepository.findOne({ where: { id: ownerId, deletedAt: IsNull() } });
      if (!row) throw new NotFoundException('vehicle owner not found');
      if (row.status !== 'active') throw new UnprocessableEntityException('inactive owner cannot be selected');
      return;
    }

    if (ownerType === 'equipment') {
      const row = await this.equipmentRepository.findOne({ where: { id: ownerId, deletedAt: IsNull() } });
      if (!row) throw new NotFoundException('equipment owner not found');
      if (row.status !== 'active') throw new UnprocessableEntityException('inactive owner cannot be selected');
      return;
    }

    const row = await this.personnelRepository.findOne({ where: { id: ownerId, deletedAt: IsNull() } });
    if (!row) throw new NotFoundException('personnel owner not found');
    if (row.employmentStatus !== 'active') throw new UnprocessableEntityException('inactive owner cannot be selected');
  }

  private async assertCertificateType(
    certificateTypeId: string,
    ownerType: CertificateEntity['ownerType'],
  ) {
    const certificateType = await this.certificateTypeRepository.findOne({
      where: { id: certificateTypeId },
    });
    if (!certificateType || !certificateType.isActive) {
      throw new NotFoundException('certificate type not found');
    }
    if (!this.matchesOwnerScope(certificateType.ownerScope, ownerType)) {
      throw new UnprocessableEntityException(
        'certificate type is not applicable to owner type',
      );
    }
    return certificateType;
  }

  private async findOneOrThrow(id: string) {
    const entity = await this.repository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!entity) throw new NotFoundException('certificate not found');
    return entity;
  }

  private async getOwnerName(ownerType: string, ownerId: string): Promise<string> {
    if (ownerType === 'vessel') {
      const vessel = await this.vesselRepository.findOne({ where: { id: ownerId } });
      return vessel?.name ?? ownerId;
    }

    if (ownerType === 'vehicle') {
      const vehicle = await this.vehicleRepository.findOne({ where: { id: ownerId } });
      return vehicle?.plateNumber ?? ownerId;
    }

    if (ownerType === 'equipment') {
      const equipment = await this.equipmentRepository.findOne({ where: { id: ownerId } });
      return equipment?.name ?? ownerId;
    }

    const person = await this.personnelRepository.findOne({ where: { id: ownerId } });
    return person?.name ?? ownerId;
  }

  private async toDetail(entity: CertificateEntity) {
    const type = await this.certificateTypeRepository.findOne({ where: { id: entity.certificateTypeId } });
    const ownerName = await this.getOwnerName(entity.ownerType, entity.ownerId);

    const rels = await this.fileRelRepository.find({ where: { certificateId: entity.id }, order: { sortOrder: 'ASC' } });
    const fileIds = rels.map((item) => item.fileId);
    const files = fileIds.length ? await this.fileRepository.find({ where: { id: In(fileIds) } }) : [];
    const byId = new Map(files.map((file) => [file.id, file]));

    return {
      id: entity.id,
      certificateTypeId: entity.certificateTypeId,
      certificateTypeName: type?.name ?? entity.certificateTypeId,
      ownerType: entity.ownerType,
      ownerId: entity.ownerId,
      ownerName,
      certificateNo: entity.certificateNo,
      title: entity.title,
      issueDate: entity.issueDate,
      expiryDate: entity.expiryDate,
      advanceDays: entity.advanceDays,
      issuer: entity.issuer,
      status: entity.status,
      remarks: entity.remarks,
      files: fileIds.map((id) => byId.get(id)).filter((f): f is FileEntity => Boolean(f)).map((file) => ({
        id: file.id,
        fileName: file.fileName,
        ossKey: file.ossKey,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        fileRole: 'primary',
      })),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
