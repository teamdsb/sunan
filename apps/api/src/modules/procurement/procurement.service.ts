import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, IsNull, Repository } from 'typeorm';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { FileEntity } from 'src/database/entities/file.entity';
import { ProcurementOrderApprovalEntity } from 'src/database/entities/procurement-order-approval.entity';
import { ProcurementOrderFileEntity } from 'src/database/entities/procurement-order-file.entity';
import { ProcurementOrderEntity } from 'src/database/entities/procurement-order.entity';
import { ProcurementApprovalActionDto } from './dto/procurement-approval-action.dto';
import { ProcurementApprovalListQueryDto } from './dto/procurement-approval-list-query.dto';
import { ProcurementOrderBindFilesDto } from './dto/procurement-order-bind-files.dto';
import { ProcurementOrderCreateDto } from './dto/procurement-order-create.dto';
import { ProcurementOrderListQueryDto } from './dto/procurement-order-list-query.dto';
import { ProcurementOrderUpdateDto } from './dto/procurement-order-update.dto';
import {
  DEPARTMENT_ROLE_MAP,
  PROCUREMENT_APPROVAL_CHANNELS,
  PROCUREMENT_APPROVAL_SOURCES,
  PROCUREMENT_DEPARTMENT_CODES,
  PROCUREMENT_DIMENSION_TYPES,
  type ProcurementApprovalLevel,
  type ProcurementApprovalSource,
  type ProcurementDepartmentCode,
  type ProcurementDimensionType,
  type ProcurementOrderStatus,
} from './procurement.constants';

interface NormalizedDimension {
  dimensionType: ProcurementDimensionType;
  dimensionKey: string | null;
}

@Injectable()
export class ProcurementService {
  constructor(
    @InjectRepository(ProcurementOrderEntity)
    private readonly orderRepository: Repository<ProcurementOrderEntity>,
    @InjectRepository(ProcurementOrderApprovalEntity)
    private readonly orderApprovalRepository: Repository<ProcurementOrderApprovalEntity>,
    @InjectRepository(ProcurementOrderFileEntity)
    private readonly orderFileRepository: Repository<ProcurementOrderFileEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
  ) {}

  async listOrders(query: ProcurementOrderListQueryDto, user: CurrentUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.orderRepository.createQueryBuilder('order').where('order.deletedAt IS NULL');

    if (!this.canViewAllOrders(user)) {
      qb.andWhere('order.createdBy = :createdBy', { createdBy: user.userId });
    }

    if (query.keyword?.trim()) {
      const normalized = `%${query.keyword.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb.where('LOWER(order.title) LIKE :keyword', { keyword: normalized }).orWhere('LOWER(order.summary) LIKE :keyword', { keyword: normalized });
        }),
      );
    }

    if (query.departmentCode) {
      qb.andWhere('order.departmentCode = :departmentCode', { departmentCode: query.departmentCode });
    }

    if (query.dimensionType) {
      qb.andWhere('order.dimensionType = :dimensionType', { dimensionType: query.dimensionType });
    }

    if (query.dimensionKey?.trim()) {
      qb.andWhere('order.dimensionKey = :dimensionKey', { dimensionKey: query.dimensionKey.trim() });
    }

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query.approvalChannel) {
      qb.andWhere('order.approvalChannel = :approvalChannel', { approvalChannel: query.approvalChannel });
    }

    if (query.submittedFrom) {
      qb.andWhere('order.submittedAt >= :submittedFrom', { submittedFrom: `${query.submittedFrom}T00:00:00.000+08:00` });
    }

    if (query.submittedTo) {
      qb.andWhere('order.submittedAt <= :submittedTo', { submittedTo: `${query.submittedTo}T23:59:59.999+08:00` });
    }

    const [rows, total] = await qb
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: rows.map((row) => this.toOrderListItem(row)),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async createOrderDraft(dto: ProcurementOrderCreateDto, user: CurrentUser) {
    const approvalChannel = dto.approvalChannel ?? 'internal';
    this.assertApprovalChannel(approvalChannel);

    const normalizedDimension = this.normalizeDimension(dto.departmentCode, dto.dimensionType, dto.dimensionKey);
    const orderNo = await this.generateOrderNo();

    const entity = this.orderRepository.create({
      orderNo,
      departmentCode: dto.departmentCode,
      dimensionType: normalizedDimension.dimensionType,
      dimensionKey: normalizedDimension.dimensionKey,
      title: dto.title.trim(),
      summary: dto.summary.trim(),
      amount: dto.amount,
      expenseDate: dto.expenseDate ?? null,
      status: 'draft',
      approvalChannel,
      externalProcessInstanceId: null,
      externalStatus: null,
      externalSyncedAt: null,
      submittedAt: null,
      finalApprovedAt: null,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    const saved = await this.orderRepository.save(entity);
    return this.getOrderDetail(saved.id, user);
  }

  async getOrderDetail(id: string, user: CurrentUser) {
    const order = await this.mustFindOrder(id);
    this.assertCanViewOrder(order, user);
    return this.toOrderDetail(order);
  }

  async updateOrderDraft(id: string, dto: ProcurementOrderUpdateDto, user: CurrentUser) {
    const order = await this.mustFindOrder(id);
    this.assertCanEditDraft(order, user);

    const nextDepartmentCode = dto.departmentCode ?? order.departmentCode;
    const nextDimensionType = dto.dimensionType ?? order.dimensionType;
    const nextDimensionKey = dto.dimensionKey ?? order.dimensionKey ?? undefined;
    const normalizedDimension = this.normalizeDimension(nextDepartmentCode, nextDimensionType, nextDimensionKey);

    Object.assign(order, {
      departmentCode: nextDepartmentCode,
      dimensionType: normalizedDimension.dimensionType,
      dimensionKey: normalizedDimension.dimensionKey,
      title: dto.title?.trim() ?? order.title,
      summary: dto.summary?.trim() ?? order.summary,
      amount: dto.amount ?? order.amount,
      expenseDate: dto.expenseDate ?? order.expenseDate,
      updatedBy: user.userId,
    });

    await this.orderRepository.save(order);
    return this.getOrderDetail(id, user);
  }

  async submitOrder(id: string, user: CurrentUser) {
    const order = await this.mustFindOrder(id);
    this.assertCanSubmitDraft(order, user, false);

    order.status = 'submitted';
    order.submittedAt = new Date();
    order.updatedBy = user.userId;

    await this.orderRepository.save(order);
    return this.getOrderDetail(id, user);
  }

  async resubmitOrder(id: string, user: CurrentUser) {
    const order = await this.mustFindOrder(id);
    this.assertCanSubmitDraft(order, user, true);

    order.status = 'submitted';
    order.submittedAt = new Date();
    order.updatedBy = user.userId;

    await this.orderRepository.save(order);
    return this.getOrderDetail(id, user);
  }

  async bindOrderAttachments(id: string, dto: ProcurementOrderBindFilesDto, user: CurrentUser) {
    const order = await this.mustFindOrder(id);
    this.assertCanEditDraft(order, user);

    const files = await this.fileRepository.find({ where: { id: In(dto.fileIds) } });
    if (files.length !== dto.fileIds.length) {
      throw new NotFoundException('file not found');
    }

    const existing = await this.orderFileRepository.find({ where: { orderId: id } });
    const existingSet = new Set(existing.map((item) => item.fileId));

    const rows = dto.fileIds
      .filter((fileId) => !existingSet.has(fileId))
      .map((fileId) =>
        this.orderFileRepository.create({
          orderId: id,
          fileId,
          relationType: 'attachment',
          createdBy: user.userId,
        }),
      );

    if (rows.length) {
      await this.orderFileRepository.save(rows);
    }

    return this.getOrderDetail(id, user);
  }

  async listPendingApprovals(query: ProcurementApprovalListQueryDto, user: CurrentUser) {
    if (query.entityType === 'report') {
      return [];
    }

    if (!this.canApproveAnyOrder(user)) {
      return [];
    }

    const rows = await this.orderRepository.find({
      where: {
        deletedAt: IsNull(),
        status: In(['submitted', 'dept_approved'] satisfies ProcurementOrderStatus[]),
      },
      order: { submittedAt: 'ASC', createdAt: 'ASC' },
    });

    const filtered = rows
      .filter((row) => {
        if (query.departmentCode && row.departmentCode !== query.departmentCode) {
          return false;
        }
        return Boolean(this.resolveApprovalLevel(row, user));
      })
      .map((row) => {
        const approvalLevel = this.resolveApprovalLevel(row, user);
        if (!approvalLevel) {
          return null;
        }

        return {
          entityType: 'order' as const,
          entityId: row.id,
          title: row.title,
          departmentCode: row.departmentCode,
          approvalLevel,
          status: row.status,
          submittedAt: (row.submittedAt ?? row.createdAt).toISOString(),
          approvalChannel: row.approvalChannel,
          externalStatus: row.externalStatus,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const start = (page - 1) * pageSize;

    return filtered.slice(start, start + pageSize);
  }

  async listOrderApprovals(id: string, user: CurrentUser) {
    const order = await this.mustFindOrder(id);
    this.assertCanViewOrder(order, user);

    const rows = await this.orderApprovalRepository.find({ where: { orderId: id }, order: { approvedAt: 'ASC' } });
    return rows.map((row) => this.toApprovalDto(row));
  }

  async actionOrderApproval(id: string, dto: ProcurementApprovalActionDto, user: CurrentUser) {
    const order = await this.mustFindOrder(id);
    const source = dto.source ?? 'internal';
    this.assertApprovalSource(source);

    const approvalLevel = this.resolveApprovalLevel(order, user);
    if (!approvalLevel) {
      if (order.status === 'draft' || order.status === 'final_approved' || order.status === 'rejected') {
        throw new ConflictException('current status does not allow approval action');
      }
      throw new ForbiddenException('forbidden');
    }

    const nextStatus = this.resolveNextStatus(order.status, approvalLevel, dto.action);
    order.status = nextStatus;
    order.updatedBy = user.userId;

    if (nextStatus === 'final_approved') {
      order.finalApprovedAt = new Date();
    }

    if (nextStatus === 'draft') {
      order.finalApprovedAt = null;
    }

    await this.orderRepository.save(order);

    const approval = await this.orderApprovalRepository.save(
      this.orderApprovalRepository.create({
        orderId: order.id,
        approvalLevel,
        action: dto.action,
        comment: dto.comment?.trim() || null,
        source,
        externalEventId: dto.externalEventId ?? null,
        approvedBy: user.userId,
        payloadSnapshot: {
          externalEventId: dto.externalEventId ?? null,
          syncDirection: source === 'external' ? 'pull_from_wecom' : null,
        },
      }),
    );

    return {
      entityId: order.id,
      status: order.status,
      latestApproval: this.toApprovalDto(approval),
    };
  }

  private canViewAllOrders(user: CurrentUser) {
    return user.roles.includes('system_admin') || user.roles.includes('general_office');
  }

  private canApproveAnyOrder(user: CurrentUser) {
    return user.roles.includes('system_admin') || user.roles.includes('general_office') || Object.values(DEPARTMENT_ROLE_MAP).some((role) => user.roles.includes(role));
  }

  private resolveApprovalLevel(order: ProcurementOrderEntity, user: CurrentUser): ProcurementApprovalLevel | null {
    if (order.status === 'submitted' && this.canDepartmentApprove(order.departmentCode, user)) {
      return 'dept';
    }

    if (order.status === 'dept_approved' && this.canFinalApprove(user)) {
      return 'final';
    }

    return null;
  }

  private canDepartmentApprove(departmentCode: ProcurementDepartmentCode, user: CurrentUser) {
    if (user.roles.includes('system_admin')) {
      return true;
    }

    const requiredRole = DEPARTMENT_ROLE_MAP[departmentCode];
    return user.roles.includes(requiredRole);
  }

  private canFinalApprove(user: CurrentUser) {
    return user.roles.includes('system_admin') || user.roles.includes('general_office');
  }

  private assertCanViewOrder(order: ProcurementOrderEntity, user: CurrentUser) {
    if (
      order.createdBy === user.userId ||
      this.canViewAllOrders(user) ||
      this.canDepartmentApprove(order.departmentCode, user)
    ) {
      return;
    }

    throw new NotFoundException('procurement order not found');
  }

  private assertCanEditDraft(order: ProcurementOrderEntity, user: CurrentUser) {
    if (order.status !== 'draft') {
      throw new ConflictException('only draft order can be edited');
    }

    if (order.createdBy === user.userId || user.roles.includes('system_admin')) {
      return;
    }

    throw new ForbiddenException('forbidden');
  }

  private assertCanSubmitDraft(order: ProcurementOrderEntity, user: CurrentUser, isResubmit: boolean) {
    if (order.status !== 'draft') {
      throw new ConflictException('only draft order can be submitted');
    }

    if (order.createdBy !== user.userId && !user.roles.includes('system_admin')) {
      throw new ForbiddenException('forbidden');
    }

    if (isResubmit && !order.submittedAt) {
      throw new ConflictException('order is not from a returned flow');
    }

    if (!isResubmit && order.submittedAt) {
      throw new ConflictException('use resubmit endpoint for returned order');
    }
  }

  private assertApprovalChannel(channel: string) {
    if (!PROCUREMENT_APPROVAL_CHANNELS.includes(channel as (typeof PROCUREMENT_APPROVAL_CHANNELS)[number])) {
      throw new BadRequestException('invalid approval channel');
    }

    if (channel !== 'internal') {
      throw new UnprocessableEntityException('approval channel is not enabled in current milestone');
    }
  }

  private assertApprovalSource(source: ProcurementApprovalSource) {
    if (!PROCUREMENT_APPROVAL_SOURCES.includes(source)) {
      throw new BadRequestException('invalid approval source');
    }

    if (source !== 'internal') {
      throw new UnprocessableEntityException('external approval source is not enabled in current milestone');
    }
  }

  private resolveNextStatus(currentStatus: ProcurementOrderStatus, approvalLevel: ProcurementApprovalLevel, action: 'approve' | 'reject' | 'return'): ProcurementOrderStatus {
    if (action === 'reject') {
      return 'rejected';
    }

    if (action === 'return') {
      return 'draft';
    }

    if (currentStatus === 'submitted' && approvalLevel === 'dept') {
      return 'dept_approved';
    }

    if (currentStatus === 'dept_approved' && approvalLevel === 'final') {
      return 'final_approved';
    }

    throw new ConflictException('invalid status transition');
  }

  private normalizeDimension(
    departmentCode: ProcurementDepartmentCode,
    dimensionType?: ProcurementDimensionType,
    dimensionKey?: string | null,
  ): NormalizedDimension {
    if (!PROCUREMENT_DEPARTMENT_CODES.includes(departmentCode)) {
      throw new BadRequestException('invalid department code');
    }

    const normalizedType = dimensionType ?? 'none';
    if (!PROCUREMENT_DIMENSION_TYPES.includes(normalizedType)) {
      throw new BadRequestException('invalid dimension type');
    }

    const normalizedKey = dimensionKey?.trim() || null;

    if (departmentCode === 'shipping_dept') {
      if (normalizedType !== 'vessel' || !normalizedKey) {
        throw new BadRequestException('shipping department requires vessel dimension');
      }
      return { dimensionType: 'vessel', dimensionKey: normalizedKey };
    }

    if (departmentCode === 'logistics_dept') {
      if (normalizedType !== 'logistics_category' || !normalizedKey) {
        throw new BadRequestException('logistics department requires logistics_category dimension');
      }
      return { dimensionType: 'logistics_category', dimensionKey: normalizedKey };
    }

    if (normalizedType !== 'none' || normalizedKey) {
      throw new BadRequestException('current department does not support extra dimension');
    }

    return { dimensionType: 'none', dimensionKey: null };
  }

  private async mustFindOrder(id: string) {
    const order = await this.orderRepository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!order) {
      throw new NotFoundException('procurement order not found');
    }
    return order;
  }

  private async toOrderDetail(order: ProcurementOrderEntity) {
    const fileRelations = await this.orderFileRepository.find({ where: { orderId: order.id }, order: { createdAt: 'ASC' } });
    const fileIds = fileRelations.map((item) => item.fileId);
    const files = fileIds.length ? await this.fileRepository.find({ where: { id: In(fileIds) } }) : [];
    const fileMap = new Map(files.map((file) => [file.id, file]));

    return {
      ...this.toOrderListItem(order),
      files: fileRelations
        .map((relation) => {
          const file = fileMap.get(relation.fileId);
          if (!file) {
            return null;
          }

          return {
            id: file.id,
            fileName: file.fileName,
            ossKey: file.ossKey,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
            relationType: relation.relationType,
            createdAt: relation.createdAt.toISOString(),
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    };
  }

  private toOrderListItem(order: ProcurementOrderEntity) {
    return {
      id: order.id,
      orderNo: order.orderNo,
      departmentCode: order.departmentCode,
      dimensionType: order.dimensionType,
      dimensionKey: order.dimensionKey,
      title: order.title,
      summary: order.summary,
      amount: Number(order.amount),
      expenseDate: order.expenseDate,
      status: order.status,
      approvalChannel: order.approvalChannel,
      externalProcessInstanceId: order.externalProcessInstanceId,
      externalStatus: order.externalStatus,
      externalSyncedAt: order.externalSyncedAt?.toISOString() ?? null,
      submittedAt: order.submittedAt?.toISOString() ?? null,
      finalApprovedAt: order.finalApprovedAt?.toISOString() ?? null,
      createdBy: order.createdBy,
      updatedBy: order.updatedBy,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private toApprovalDto(row: ProcurementOrderApprovalEntity) {
    return {
      id: row.id,
      approvalLevel: row.approvalLevel,
      action: row.action,
      comment: row.comment,
      source: row.source,
      externalEventId: row.externalEventId,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt.toISOString(),
    };
  }

  private async generateOrderNo() {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = String(Math.floor(Math.random() * 10_000)).padStart(4, '0');
      const candidate = `CG${datePart}${suffix}`;
      const existed = await this.orderRepository.exist({ where: { orderNo: candidate } });
      if (!existed) {
        return candidate;
      }
    }

    throw new InternalServerErrorException('failed to generate order number');
  }
}
