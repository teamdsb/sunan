import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { CertificateEntity } from 'src/database/entities/certificate.entity';
import { MasterDataImportBatchEntity } from 'src/database/entities/master-data-import-batch.entity';
import { MasterDataImportRowEntity } from 'src/database/entities/master-data-import-row.entity';
import { PersonnelEntity } from 'src/database/entities/personnel.entity';
import { SafetyEquipmentCategoryEntity } from 'src/database/entities/safety-equipment-category.entity';
import { SafetyEquipmentEntity } from 'src/database/entities/safety-equipment.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { VesselPersonnelAssignmentEntity } from 'src/database/entities/vessel-personnel-assignment.entity';
import { WorkbenchMasterDataReferenceEntity } from 'src/database/entities/workbench-master-data-reference.entity';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { AssignmentCreateDto, EquipmentMasterDataDto, MasterDataImportDto, MasterDataListQueryDto, NormalizeReferenceDto, PersonnelMasterDataDto, VesselMasterDataDto } from './dto/master-data.dto';

const MANAGER_ROLES = new Set(['system_admin', 'general_office', 'shipping']);

@Injectable()
export class MasterDataService {
  constructor(
    @InjectRepository(VesselEntity) private readonly vessels: Repository<VesselEntity>,
    @InjectRepository(PersonnelEntity) private readonly personnel: Repository<PersonnelEntity>,
    @InjectRepository(CertificateEntity) private readonly certificates: Repository<CertificateEntity>,
    @InjectRepository(SafetyEquipmentCategoryEntity) private readonly categories: Repository<SafetyEquipmentCategoryEntity>,
    @InjectRepository(SafetyEquipmentEntity) private readonly equipment: Repository<SafetyEquipmentEntity>,
    @InjectRepository(VesselPersonnelAssignmentEntity) private readonly assignments: Repository<VesselPersonnelAssignmentEntity>,
    @InjectRepository(MasterDataImportBatchEntity) private readonly batches: Repository<MasterDataImportBatchEntity>,
    @InjectRepository(MasterDataImportRowEntity) private readonly importRows: Repository<MasterDataImportRowEntity>,
    @InjectRepository(WorkbenchMasterDataReferenceEntity) private readonly references: Repository<WorkbenchMasterDataReferenceEntity>,
    @InjectRepository(WorkbenchRecordEntity) private readonly records: Repository<WorkbenchRecordEntity>,
  ) {}

  async listVessels(query: MasterDataListQueryDto, user: CurrentUser) {
    const rows = await this.vessels.find({ where: { deletedAt: IsNull() }, order: { name: 'ASC' } });
    const keyword = query.keyword?.trim();
    return { data: rows.filter((row) => (query.includeInactive === 'true' || row.status === 'active') && this.isVesselVisible(row, user) && (!keyword || `${row.name} ${row.code}`.includes(keyword))).map((row) => this.vesselDto(row)) };
  }

  async createVessel(dto: VesselMasterDataDto, user: CurrentUser) {
    this.ensureManager(user); this.require(dto.code, 'code'); this.require(dto.name, 'name'); this.require(dto.category, 'category');
    if (await this.vessels.exists({ where: [{ code: dto.code, deletedAt: IsNull() }, { name: dto.name, deletedAt: IsNull() }] })) throw new ConflictException('vessel code or name already exists');
    const row = await this.vessels.save(this.vessels.create({ code: dto.code!, name: dto.name!, category: dto.category!, status: dto.status ?? 'active', mmsi: dto.mmsi ?? null, remarks: dto.remarks ?? null }));
    return { data: this.vesselDto(row) };
  }

  async getVessel(id: string, user: CurrentUser) {
    const row = await this.vessel(id); if (!this.isVesselVisible(row, user)) throw new ForbiddenException('forbidden');
    const [equipment, assignments, references, certificates] = await Promise.all([
      this.equipment.find({ where: { vesselId: id, deletedAt: IsNull() } }),
      this.assignments.find({ where: { vesselId: id, deletedAt: IsNull() }, order: { effectiveFrom: 'DESC' } }),
      this.references.find({ where: { objectType: 'vessel', objectId: id, deletedAt: IsNull() } }),
      this.certificates.find({ where: { ownerType: 'vessel', ownerId: id, deletedAt: IsNull() } }),
    ]);
    return { data: { ...this.vesselDto(row), equipment: equipment.map((item) => this.equipmentDto(item)), assignments: assignments.map((item) => this.assignmentDto(item)), certificates: certificates.map((item) => this.certificateDto(item)), references: references.map((item) => this.referenceDto(item)) } };
  }

  async updateVessel(id: string, dto: VesselMasterDataDto, user: CurrentUser) {
    this.ensureManager(user); const row = await this.vessel(id);
    if (dto.code && dto.code !== row.code && await this.vessels.exists({ where: { code: dto.code, deletedAt: IsNull() } })) throw new ConflictException('vessel code already exists');
    if (dto.name && dto.name !== row.name && await this.vessels.exists({ where: { name: dto.name, deletedAt: IsNull() } })) throw new ConflictException('vessel name already exists');
    Object.assign(row, { code: dto.code ?? row.code, name: dto.name ?? row.name, category: dto.category ?? row.category, status: dto.status ?? row.status, mmsi: dto.mmsi ?? row.mmsi, remarks: dto.remarks ?? row.remarks });
    return { data: this.vesselDto(await this.vessels.save(row)) };
  }

  async listPersonnel(query: MasterDataListQueryDto, user: CurrentUser) {
    const keyword = query.keyword?.trim(); const rows = await this.personnel.find({ where: { deletedAt: IsNull() }, order: { name: 'ASC' } });
    return { data: rows.filter((row) => (user.isAdmin || user.roles.some((role) => MANAGER_ROLES.has(role)) || row.wecomUserId === user.userId) && (query.includeInactive === 'true' || row.employmentStatus === 'active') && (!keyword || `${row.name} ${row.wecomUserId ?? ''}`.includes(keyword))).map((row) => this.personnelDto(row, user)) };
  }

  async createPersonnel(dto: PersonnelMasterDataDto, user: CurrentUser) {
    this.ensureManager(user); this.require(dto.name, 'name'); this.require(dto.departmentCode, 'departmentCode');
    if (dto.wecomUserId && await this.personnel.exists({ where: { wecomUserId: dto.wecomUserId, deletedAt: IsNull() } })) throw new ConflictException('wecom identity already mapped');
    const row = await this.personnel.save(this.personnel.create({ name: dto.name!, departmentCode: dto.departmentCode!, wecomUserId: dto.wecomUserId ?? null, position: dto.position ?? null, mobile: dto.mobile ?? null, employmentStatus: dto.employmentStatus ?? 'active', isSyncFromWecom: false, remarks: dto.remarks ?? null }));
    return { data: this.personnelDto(row, user) };
  }

  async getPersonnel(id: string, user: CurrentUser) {
    const row = await this.person(id); const [assignments, certificates] = await Promise.all([this.assignments.find({ where: { personnelId: id, deletedAt: IsNull() }, order: { effectiveFrom: 'DESC' } }), this.certificates.find({ where: { ownerType: 'personnel', ownerId: id, deletedAt: IsNull() } })]);
    return { data: { ...this.personnelDto(row, user), assignments: assignments.map((item) => this.assignmentDto(item)), certificates: certificates.map((item) => this.certificateDto(item)) } };
  }

  async updatePersonnel(id: string, dto: PersonnelMasterDataDto, user: CurrentUser) {
    this.ensureManager(user); const row = await this.person(id);
    if (dto.wecomUserId && dto.wecomUserId !== row.wecomUserId && await this.personnel.exists({ where: { wecomUserId: dto.wecomUserId, deletedAt: IsNull() } })) throw new ConflictException('wecom identity already mapped');
    Object.assign(row, { name: dto.name ?? row.name, departmentCode: dto.departmentCode ?? row.departmentCode, wecomUserId: dto.wecomUserId ?? row.wecomUserId, position: dto.position ?? row.position, mobile: dto.mobile ?? row.mobile, employmentStatus: dto.employmentStatus ?? row.employmentStatus, remarks: dto.remarks ?? row.remarks });
    return { data: this.personnelDto(await this.personnel.save(row), user) };
  }

  async createAssignment(dto: AssignmentCreateDto, user: CurrentUser) {
    this.ensureManager(user); const [vessel, person] = await Promise.all([this.vessel(dto.vesselId), this.person(dto.personnelId)]);
    if (vessel.status !== 'active' || person.employmentStatus !== 'active') throw new UnprocessableEntityException('inactive master data cannot be assigned');
    if (dto.effectiveTo && dto.effectiveTo <= dto.effectiveFrom) throw new UnprocessableEntityException('effectiveTo must be after effectiveFrom');
    const current = await this.assignments.find({ where: { personnelId: dto.personnelId, status: 'active', deletedAt: IsNull() } });
    const overlaps = current.some((item) => this.overlaps(dto.effectiveFrom, dto.effectiveTo ?? null, item.effectiveFrom, item.effectiveTo));
    if (overlaps) throw new ConflictException('personnel has an overlapping vessel assignment');
    const row = await this.assignments.save(this.assignments.create({ vesselId: vessel.id, personnelId: person.id, roleCode: dto.roleCode, effectiveFrom: dto.effectiveFrom, effectiveTo: dto.effectiveTo ?? null, status: 'active', vesselNameSnapshot: vessel.name, personnelNameSnapshot: person.name, createdBy: user.userId, updatedBy: user.userId }));
    return { data: this.assignmentDto(row) };
  }

  async listEquipment(query: MasterDataListQueryDto, user: CurrentUser) {
    const keyword = query.keyword?.trim(); const rows = await this.equipment.find({ where: { deletedAt: IsNull() }, order: { code: 'ASC' } }); const vessels = new Map((await this.vessels.find({ where: { deletedAt: IsNull() } })).map((row) => [row.id, row]));
    return { data: rows.filter((row) => (user.isAdmin || user.roles.some((role) => MANAGER_ROLES.has(role)) || (vessels.get(row.vesselId) && this.isVesselVisible(vessels.get(row.vesselId)!, user))) && (query.includeInactive === 'true' || row.status === 'active') && (!keyword || `${row.code} ${row.name}`.includes(keyword))).map((row) => this.equipmentDto(row)) };
  }

  async createEquipment(dto: EquipmentMasterDataDto, user: CurrentUser) {
    this.ensureManager(user); this.require(dto.code, 'code'); this.require(dto.name, 'name'); this.require(dto.categoryCode, 'categoryCode'); this.require(dto.vesselId, 'vesselId');
    if (await this.equipment.exists({ where: { code: dto.code, deletedAt: IsNull() } })) throw new ConflictException('equipment code already exists');
    const vessel = await this.vessel(dto.vesselId!); if (vessel.status !== 'active') throw new UnprocessableEntityException('inactive vessel cannot own new equipment');
    const category = await this.activeCategory(dto.categoryCode!, user);
    const row = await this.equipment.save(this.equipment.create({ code: dto.code!, name: dto.name!, categoryId: category.id, vesselId: vessel.id, serialNo: dto.serialNo ?? null, status: dto.status ?? 'active', remarks: dto.remarks ?? null, createdBy: user.userId, updatedBy: user.userId }));
    return { data: this.equipmentDto(row) };
  }

  async getEquipment(id: string, user: CurrentUser) {
    const row = await this.equipment.findOne({ where: { id, deletedAt: IsNull() } }); if (!row) throw new NotFoundException('equipment not found');
    const certificates = await this.certificates.find({ where: { ownerType: 'equipment', ownerId: id, deletedAt: IsNull() } });
    return { data: { ...this.equipmentDto(row), certificates: certificates.map((item) => this.certificateDto(item)) } };
  }

  async updateEquipment(id: string, dto: EquipmentMasterDataDto, user: CurrentUser) {
    this.ensureManager(user); const row = await this.equipment.findOne({ where: { id, deletedAt: IsNull() } }); if (!row) throw new NotFoundException('equipment not found');
    if (dto.code && dto.code !== row.code && await this.equipment.exists({ where: { code: dto.code, deletedAt: IsNull() } })) throw new ConflictException('equipment code already exists');
    const category = dto.categoryCode ? await this.activeCategory(dto.categoryCode, user) : null;
    if (dto.vesselId) { const vessel = await this.vessel(dto.vesselId); if (vessel.status !== 'active') throw new UnprocessableEntityException('inactive vessel cannot own new equipment'); }
    Object.assign(row, { code: dto.code ?? row.code, name: dto.name ?? row.name, categoryId: category?.id ?? row.categoryId, vesselId: dto.vesselId ?? row.vesselId, serialNo: dto.serialNo ?? row.serialNo, status: dto.status ?? row.status, remarks: dto.remarks ?? row.remarks, updatedBy: user.userId });
    return { data: this.equipmentDto(await this.equipment.save(row)) };
  }

  async selector(type: string, query: MasterDataListQueryDto, user: CurrentUser) {
    if (type === 'vessels') return this.listVessels({ ...query, includeInactive: 'false' }, user);
    if (type === 'personnel') return this.listPersonnel({ ...query, includeInactive: 'false' }, user);
    if (type === 'equipment') return this.listEquipment({ ...query, includeInactive: 'false' }, user);
    throw new NotFoundException('selector type not found');
  }

  async import(dto: MasterDataImportDto, user: CurrentUser) {
    this.ensureManager(user); const contentHash = createHash('sha256').update(dto.content).digest('hex');
    const existing = await this.batches.findOne({ where: { importType: dto.importType, contentHash, deletedAt: IsNull() } });
    if (existing) return { data: await this.importDto(existing), replayed: true };
    let rows: Array<Record<string, unknown>>;
    try { rows = JSON.parse(dto.content) as Array<Record<string, unknown>>; if (!Array.isArray(rows)) throw new Error('not array'); } catch { throw new UnprocessableEntityException('content must be a JSON array'); }
    let batch: MasterDataImportBatchEntity;
    try { batch = await this.batches.save(this.batches.create({ importType: dto.importType, contentHash, status: 'running', summary: {}, createdBy: user.userId, updatedBy: user.userId })); } catch (error) { if ((error as { code?: string }).code === '23505') { const concurrent = await this.batches.findOne({ where: { importType: dto.importType, contentHash, deletedAt: IsNull() } }); if (concurrent) return { data: await this.importDto(concurrent), replayed: true }; } throw error; }
    const summary = { created: 0, updated: 0, skipped: 0, failed: 0 };
    for (const [index, input] of rows.entries()) {
      let outcome: MasterDataImportRowEntity['outcome'] = 'failed'; let naturalKey: string | null = null; let errorCode: string | null = null; let errorMessage: string | null = null;
      try {
        if (dto.importType === 'vessels') { const code = String(input.code ?? '').trim(); const name = String(input.name ?? '').trim(); const category = String(input.category ?? '').trim(); naturalKey = code || null; if (!code || !name || !category) throw new UnprocessableEntityException('code, name and category are required'); if (await this.vessels.exists({ where: { code, deletedAt: IsNull() } })) outcome = 'skipped'; else { await this.vessels.save(this.vessels.create({ code, name, category, status: 'active', mmsi: null, remarks: null })); outcome = 'created'; } }
        else if (dto.importType === 'personnel') { const wecomUserId = String(input.wecomUserId ?? '').trim(); const name = String(input.name ?? '').trim(); const departmentCode = String(input.departmentCode ?? '').trim(); naturalKey = wecomUserId || `${name}:${departmentCode}`; if (!name || !departmentCode) throw new UnprocessableEntityException('name and departmentCode are required'); if (wecomUserId && await this.personnel.exists({ where: { wecomUserId, deletedAt: IsNull() } })) outcome = 'skipped'; else { await this.personnel.save(this.personnel.create({ name, departmentCode, wecomUserId: wecomUserId || null, position: null, mobile: null, employmentStatus: 'active', isSyncFromWecom: false, remarks: null })); outcome = 'created'; } }
        else if (dto.importType === 'assignments') { const vessel = await this.vessels.findOne({ where: { code: String(input.vesselCode ?? ''), deletedAt: IsNull() } }); const person = await this.personnel.findOne({ where: { wecomUserId: String(input.wecomUserId ?? ''), deletedAt: IsNull() } }); const roleCode = String(input.roleCode ?? ''); const effectiveFrom = String(input.effectiveFrom ?? ''); naturalKey = `${input.vesselCode ?? ''}:${input.wecomUserId ?? ''}:${effectiveFrom}`; if (!vessel || !person || !roleCode || !effectiveFrom || vessel.status !== 'active' || person.employmentStatus !== 'active') throw new UnprocessableEntityException('active vessel, personnel, roleCode and effectiveFrom are required'); if (await this.assignments.exists({ where: { vesselId: vessel.id, personnelId: person.id, effectiveFrom, deletedAt: IsNull() } })) outcome = 'skipped'; else { await this.assignments.save(this.assignments.create({ vesselId: vessel.id, personnelId: person.id, roleCode, effectiveFrom, effectiveTo: null, status: 'active', vesselNameSnapshot: vessel.name, personnelNameSnapshot: person.name, createdBy: user.userId, updatedBy: user.userId })); outcome = 'created'; } }
        else {
        const code = typeof input.code === 'string' ? input.code.trim() : ''; naturalKey = code || null;
        const name = typeof input.name === 'string' ? input.name.trim() : ''; const categoryCode = typeof input.categoryCode === 'string' ? input.categoryCode.trim() : ''; const vesselCode = typeof input.vesselCode === 'string' ? input.vesselCode.trim() : '';
        if (!code || !name || !categoryCode || !vesselCode) throw new UnprocessableEntityException('code, name, categoryCode and vesselCode are required');
        if (await this.equipment.exists({ where: { code, deletedAt: IsNull() } })) outcome = 'skipped';
        else {
          const vessel = await this.vessels.findOne({ where: { code: vesselCode, deletedAt: IsNull() } }); if (!vessel || vessel.status !== 'active') throw new UnprocessableEntityException('active vessel not found');
          const category = await this.activeCategory(categoryCode, user);
          await this.equipment.save(this.equipment.create({ code, name, categoryId: category.id, vesselId: vessel.id, serialNo: null, status: 'active', remarks: null, createdBy: user.userId, updatedBy: user.userId })); outcome = 'created'; }
        }
      } catch (error) { errorCode = error instanceof UnprocessableEntityException ? 'invalid_row' : 'import_error'; errorMessage = error instanceof Error ? error.message : 'import failed'; }
      summary[outcome] += 1;
      await this.importRows.save(this.importRows.create({ batchId: batch.id, rowNo: index + 1, naturalKey, outcome, errorCode, errorMessage, beforeSnapshot: null, createdBy: user.userId, updatedBy: user.userId }));
    }
    batch.status = summary.failed === rows.length ? 'failed' : 'completed'; batch.summary = summary; batch.updatedBy = user.userId; await this.batches.save(batch);
    return { data: await this.importDto(batch), replayed: false };
  }

  async getImport(id: string, user: CurrentUser) { this.ensureManager(user); const batch = await this.batches.findOne({ where: { id, deletedAt: IsNull() } }); if (!batch) throw new NotFoundException('import batch not found'); return { data: await this.importDto(batch) }; }

  async normalizeReference(dto: NormalizeReferenceDto, user: CurrentUser) {
    this.ensureManager(user); const record = await this.records.findOne({ where: { id: dto.sourceRecordId, deletedAt: IsNull() } }); if (!record) throw new NotFoundException('workbench record not found');
    const raw = record.payload[dto.fieldKey]; if (typeof raw !== 'string' || !raw.trim()) throw new UnprocessableEntityException('source field is not a text reference');
    let candidates: Array<{ id: string; label: string }> = [];
    if (dto.objectType === 'vessel') candidates = (await this.vessels.find({ where: { deletedAt: IsNull() } })).filter((row) => row.name === raw || row.code === raw).map((row) => ({ id: row.id, label: row.name }));
    if (dto.objectType === 'personnel') candidates = (await this.personnel.find({ where: { deletedAt: IsNull() } })).filter((row) => row.name === raw || row.wecomUserId === raw).map((row) => ({ id: row.id, label: row.name }));
    if (dto.objectType === 'equipment') candidates = (await this.equipment.find({ where: { deletedAt: IsNull() } })).filter((row) => row.name === raw || row.code === raw).map((row) => ({ id: row.id, label: row.name }));
    let target = dto.objectId ? candidates.find((item) => item.id === dto.objectId) : candidates.length === 1 ? candidates[0] : undefined;
    if (dto.objectId && !target) { if (dto.objectType === 'vessel') { const item = await this.vessel(dto.objectId); target = { id: item.id, label: item.name }; } else if (dto.objectType === 'personnel') { const item = await this.person(dto.objectId); target = { id: item.id, label: item.name }; } else { const item = await this.equipment.findOne({ where: { id: dto.objectId, deletedAt: IsNull() } }); if (!item) throw new NotFoundException('equipment not found'); target = { id: item.id, label: item.name }; } }
    const mappingStatus: WorkbenchMasterDataReferenceEntity['mappingStatus'] = dto.objectId ? 'manual_override' : target ? 'matched' : candidates.length ? 'ambiguous' : 'unmatched';
    const previous = await this.references.findOne({ where: { sourceDomain: 'workbench', sourceRecordId: record.id, fieldKey: dto.fieldKey, objectType: dto.objectType, deletedAt: IsNull() } });
    const row = previous ?? this.references.create({ sourceDomain: 'workbench', sourceRecordId: record.id, fieldKey: dto.fieldKey, objectType: dto.objectType, rawValue: raw, objectId: null, displaySnapshot: null, mappingStatus, createdBy: user.userId, updatedBy: user.userId });
    Object.assign(row, { rawValue: raw, objectId: target?.id ?? null, displaySnapshot: target?.label ?? null, mappingStatus, updatedBy: user.userId });
    return { data: this.referenceDto(await this.references.save(row)) };
  }

  private async vessel(id: string) { const row = await this.vessels.findOne({ where: { id, deletedAt: IsNull() } }); if (!row) throw new NotFoundException('vessel not found'); return row; }
  private async person(id: string) { const row = await this.personnel.findOne({ where: { id, deletedAt: IsNull() } }); if (!row) throw new NotFoundException('personnel not found'); return row; }
  private async activeCategory(code: string, user: CurrentUser) { let row = await this.categories.findOne({ where: { code, deletedAt: IsNull() } }); if (!row) row = await this.categories.save(this.categories.create({ code, name: code, status: 'active', createdBy: user.userId, updatedBy: user.userId })); if (row.status !== 'active') throw new UnprocessableEntityException('equipment category is inactive'); return row; }
  private ensureManager(user: CurrentUser) { if (!user || !(user.isAdmin || user.roles.some((role) => MANAGER_ROLES.has(role)))) throw new ForbiddenException('forbidden'); }
  private require(value: string | undefined, field: string): asserts value is string { if (!value?.trim()) throw new UnprocessableEntityException(`${field} is required`); }
  private isVesselVisible(vessel: VesselEntity, user: CurrentUser) { return user.isAdmin || user.roles.some((role) => MANAGER_ROLES.has(role)) || user.departments.includes(`vessel:${vessel.id}`) || user.departments.includes(`vessel:${vessel.code}`); }
  private overlaps(from: string, to: string | null, existingFrom: string, existingTo: string | null) { return from <= (existingTo ?? '9999-12-31') && existingFrom <= (to ?? '9999-12-31'); }
  private vesselDto(row: VesselEntity) { return { id: row.id, code: row.code, name: row.name, category: row.category, status: row.status, mmsi: row.mmsi, remarks: row.remarks }; }
  private personnelDto(row: PersonnelEntity, user: CurrentUser) { const sensitive = user.isAdmin || user.roles.some((role) => MANAGER_ROLES.has(role)) || row.wecomUserId === user.userId; return { id: row.id, name: row.name, departmentCode: row.departmentCode, position: row.position, employmentStatus: row.employmentStatus, ...(sensitive ? { mobile: row.mobile, wecomUserId: row.wecomUserId } : {}) }; }
  private equipmentDto(row: SafetyEquipmentEntity) { return { id: row.id, code: row.code, name: row.name, categoryId: row.categoryId, vesselId: row.vesselId, serialNo: row.serialNo, status: row.status, remarks: row.remarks }; }
  private assignmentDto(row: VesselPersonnelAssignmentEntity) { return { id: row.id, vesselId: row.vesselId, personnelId: row.personnelId, roleCode: row.roleCode, effectiveFrom: row.effectiveFrom, effectiveTo: row.effectiveTo, status: row.status, vesselName: row.vesselNameSnapshot, personnelName: row.personnelNameSnapshot }; }
  private referenceDto(row: WorkbenchMasterDataReferenceEntity) { return { id: row.id, sourceRecordId: row.sourceRecordId, fieldKey: row.fieldKey, objectType: row.objectType, rawValue: row.rawValue, objectId: row.objectId, displaySnapshot: row.displaySnapshot, mappingStatus: row.mappingStatus }; }
  private certificateDto(row: CertificateEntity) { return { id: row.id, title: row.title, certificateNo: row.certificateNo, expiryDate: row.expiryDate, status: row.status }; }
  private async importDto(batch: MasterDataImportBatchEntity) { const rows = await this.importRows.find({ where: { batchId: batch.id, deletedAt: IsNull() }, order: { rowNo: 'ASC' } }); return { id: batch.id, importType: batch.importType, contentHash: batch.contentHash, status: batch.status, summary: batch.summary, rows: rows.map((row) => ({ rowNo: row.rowNo, naturalKey: row.naturalKey, outcome: row.outcome, errorCode: row.errorCode, errorMessage: row.errorMessage })) }; }
}
