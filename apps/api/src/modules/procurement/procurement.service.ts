import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Brackets, In, IsNull, Repository } from 'typeorm';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { appEnv } from 'src/config/env';
import { FileEntity } from 'src/database/entities/file.entity';
import { ProcurementDimensionItemEntity } from 'src/database/entities/procurement-dimension-item.entity';
import { ProcurementOrderApprovalEntity } from 'src/database/entities/procurement-order-approval.entity';
import { ProcurementOrderFileEntity } from 'src/database/entities/procurement-order-file.entity';
import { ProcurementOrderEntity } from 'src/database/entities/procurement-order.entity';
import { ProcurementReportApprovalEntity } from 'src/database/entities/procurement-report-approval.entity';
import { ProcurementReportEntity } from 'src/database/entities/procurement-report.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { OssService } from 'src/modules/files/oss.service';
import { WecomMessageService } from 'src/modules/wecom/wecom-message.service';
import { ProcurementApprovalActionDto } from './dto/procurement-approval-action.dto';
import { ProcurementApprovalListQueryDto } from './dto/procurement-approval-list-query.dto';
import { ProcurementDimensionCreateDto } from './dto/procurement-dimension-create.dto';
import { ProcurementDimensionListQueryDto } from './dto/procurement-dimension-list-query.dto';
import { ProcurementDimensionUpdateDto } from './dto/procurement-dimension-update.dto';
import { ProcurementOrderBindFilesDto } from './dto/procurement-order-bind-files.dto';
import { ProcurementOrderCreateDto } from './dto/procurement-order-create.dto';
import { ProcurementOrderListQueryDto } from './dto/procurement-order-list-query.dto';
import { ProcurementOrderUpdateDto } from './dto/procurement-order-update.dto';
import { ProcurementReportDepartmentDetailsQueryDto } from './dto/procurement-report-department-details-query.dto';
import { ProcurementReportDimensionDetailsQueryDto } from './dto/procurement-report-dimension-details-query.dto';
import { ProcurementReportMonthlyQueryDto } from './dto/procurement-report-monthly-query.dto';
import { ProcurementReportRequestCreateDto } from './dto/procurement-report-request-create.dto';
import { ProcurementReportRequestListQueryDto } from './dto/procurement-report-request-list-query.dto';
import { ProcurementReportYearlyQueryDto } from './dto/procurement-report-yearly-query.dto';
import {
  DEPARTMENT_ROLE_MAP,
  PROCUREMENT_APPROVAL_CHANNELS,
  PROCUREMENT_APPROVAL_SOURCES,
  PROCUREMENT_DEPARTMENT_CODES,
  PROCUREMENT_DIMENSION_TYPES,
  PROCUREMENT_REPORT_TYPES,
  type ProcurementApprovalLevel,
  type ProcurementApprovalSource,
  type ProcurementDepartmentCode,
  type ProcurementDimensionType,
  type ProcurementOrderStatus,
  type ProcurementReportApprovalLevel,
  type ProcurementReportRequestStatus,
  type ProcurementReportType,
} from './procurement.constants';

const INCLUDED_REPORT_ORDER_STATUSES: ProcurementOrderStatus[] = ['submitted', 'dept_approved', 'final_approved', 'rejected'];
const PENDING_REPORT_REQUEST_STATUSES: ProcurementReportRequestStatus[] = ['submitted', 'dept_approved', 'finance_approved'];
const DICTIONARY_DEPARTMENT_CODES = ['shipping_dept', 'logistics_dept'] as const;
const DICTIONARY_DIMENSION_TYPES = ['vessel', 'logistics_category'] as const;
const PDF_PAGE_WIDTH = 595;
const PDF_PAGE_HEIGHT = 842;
const PDF_MARGIN_LEFT = 56;
const PDF_MARGIN_TOP = 48;
const PDF_LINE_HEIGHT = 20;
const PDF_MAX_LINES_PER_PAGE = 35;

interface NormalizedDimension {
  dimensionType: ProcurementDimensionType;
  dimensionKey: string | null;
}

interface NormalizedDateRange {
  startAt: Date;
  endAt: Date;
}

interface NormalizedSubmittedDateRange {
  submittedFrom?: Date;
  submittedTo?: Date;
}

interface ReportDetailRow {
  id: string;
  order_no: string;
  department_code: ProcurementDepartmentCode;
  dimension_type: ProcurementDimensionType;
  dimension_key: string | null;
  title: string;
  amount: string;
  status: ProcurementOrderStatus;
  submitted_at: Date | null;
}

interface DimensionItemDto {
  id: string;
  departmentCode: 'shipping_dept' | 'logistics_dept';
  dimensionType: 'vessel' | 'logistics_category';
  dimensionKey: string;
  dimensionName: string;
  sortOrder: number;
  isEnabled: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PrintResultDto {
  fileId: string;
  downloadUrl: string;
}

@Injectable()
export class ProcurementService {
  private readonly logger = new Logger(ProcurementService.name);

  constructor(
    @InjectRepository(ProcurementDimensionItemEntity)
    private readonly dimensionItemRepository: Repository<ProcurementDimensionItemEntity>,
    @InjectRepository(ProcurementOrderEntity)
    private readonly orderRepository: Repository<ProcurementOrderEntity>,
    @InjectRepository(ProcurementOrderApprovalEntity)
    private readonly orderApprovalRepository: Repository<ProcurementOrderApprovalEntity>,
    @InjectRepository(ProcurementOrderFileEntity)
    private readonly orderFileRepository: Repository<ProcurementOrderFileEntity>,
    @InjectRepository(ProcurementReportEntity)
    private readonly reportRepository: Repository<ProcurementReportEntity>,
    @InjectRepository(ProcurementReportApprovalEntity)
    private readonly reportApprovalRepository: Repository<ProcurementReportApprovalEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(WecomUserEntity)
    private readonly wecomUserRepository: Repository<WecomUserEntity>,
    private readonly ossService: OssService,
    private readonly wecomMessageService: WecomMessageService,
  ) {}

  async listDimensionItems(query: ProcurementDimensionListQueryDto, user: CurrentUser): Promise<DimensionItemDto[]> {
    this.assertCanViewReports(user);

    const qb = this.dimensionItemRepository.createQueryBuilder('item').where('item.deletedAt IS NULL');

    if (query.departmentCode) {
      qb.andWhere('item.departmentCode = :departmentCode', { departmentCode: query.departmentCode });
    }

    if (typeof query.isEnabled === 'boolean') {
      qb.andWhere('item.isEnabled = :isEnabled', { isEnabled: query.isEnabled });
    }

    const rows = await qb
      .orderBy('item.departmentCode', 'ASC')
      .addOrderBy('item.dimensionType', 'ASC')
      .addOrderBy('item.sortOrder', 'ASC')
      .addOrderBy('item.createdAt', 'ASC')
      .getMany();

    return rows.map((row) => this.toDimensionItemDto(row));
  }

  async createDimensionItem(dto: ProcurementDimensionCreateDto, user: CurrentUser): Promise<DimensionItemDto> {
    this.assertCanManageDimensionDictionary(user);
    this.assertDimensionScope(dto.departmentCode, dto.dimensionType);

    const normalizedKey = dto.dimensionKey.trim();
    const normalizedName = dto.dimensionName.trim();
    if (!normalizedKey || !normalizedName) {
      throw new BadRequestException('dimension key and name are required');
    }

    const existed = await this.dimensionItemRepository.exist({
      where: {
        departmentCode: dto.departmentCode,
        dimensionType: dto.dimensionType,
        dimensionKey: normalizedKey,
        deletedAt: IsNull(),
      },
    });
    if (existed) {
      throw new ConflictException('dimension key already exists');
    }

    const item = await this.dimensionItemRepository.save(
      this.dimensionItemRepository.create({
        departmentCode: dto.departmentCode,
        dimensionType: dto.dimensionType,
        dimensionKey: normalizedKey,
        dimensionName: normalizedName,
        sortOrder: dto.sortOrder ?? 0,
        isEnabled: true,
        createdBy: user.userId,
        updatedBy: user.userId,
      }),
    );

    return this.toDimensionItemDto(item);
  }

  async updateDimensionItem(id: string, dto: ProcurementDimensionUpdateDto, user: CurrentUser): Promise<DimensionItemDto> {
    this.assertCanManageDimensionDictionary(user);
    const item = await this.mustFindDimensionItem(id);

    const nextName = dto.dimensionName?.trim();
    if (typeof nextName === 'string' && !nextName) {
      throw new BadRequestException('dimension name cannot be empty');
    }

    if (typeof dto.dimensionName === 'string') {
      item.dimensionName = nextName ?? item.dimensionName;
    }

    if (typeof dto.sortOrder === 'number') {
      item.sortOrder = dto.sortOrder;
    }

    if (typeof dto.isEnabled === 'boolean') {
      item.isEnabled = dto.isEnabled;
    }

    item.updatedBy = user.userId;
    await this.dimensionItemRepository.save(item);

    return this.toDimensionItemDto(item);
  }

  async disableDimensionItem(id: string, user: CurrentUser): Promise<void> {
    this.assertCanManageDimensionDictionary(user);
    const item = await this.mustFindDimensionItem(id);

    if (!item.isEnabled) {
      return;
    }

    item.isEnabled = false;
    item.updatedBy = user.userId;
    await this.dimensionItemRepository.save(item);
  }

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

    const submittedRange = this.normalizeSubmittedDateRange(query.submittedFrom, query.submittedTo);
    if (submittedRange.submittedFrom) {
      qb.andWhere('order.submittedAt >= :submittedFrom', { submittedFrom: submittedRange.submittedFrom.toISOString() });
    }

    if (submittedRange.submittedTo) {
      qb.andWhere('order.submittedAt <= :submittedTo', { submittedTo: submittedRange.submittedTo.toISOString() });
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
    await this.notifyOrderPendingApproval(order, 'dept');
    return this.getOrderDetail(id, user);
  }

  async resubmitOrder(id: string, user: CurrentUser) {
    const order = await this.mustFindOrder(id);
    this.assertCanSubmitDraft(order, user, true);

    order.status = 'submitted';
    order.submittedAt = new Date();
    order.updatedBy = user.userId;

    await this.orderRepository.save(order);
    await this.notifyOrderPendingApproval(order, 'dept');
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

  async printOrder(id: string, user: CurrentUser): Promise<PrintResultDto> {
    const order = await this.mustFindOrder(id);
    this.assertCanViewOrder(order, user);

    const detail = await this.toOrderDetail(order);
    const generatedAt = new Date();
    const lines = [
      `Order No: ${order.orderNo}`,
      `Generated At: ${this.formatDateTime(generatedAt)}`,
      '',
      'Procurement Order',
      `Title: ${order.title}`,
      `Department: ${order.departmentCode}`,
      `Dimension: ${order.dimensionType}${order.dimensionKey ? ` / ${order.dimensionKey}` : ''}`,
      `Applicant: ${order.createdBy}`,
      `Status: ${order.status}`,
      `Submitted At: ${order.submittedAt ? this.formatDateTime(order.submittedAt) : '-'}`,
      `Final Approved At: ${order.finalApprovedAt ? this.formatDateTime(order.finalApprovedAt) : '-'}`,
      '',
      'Summary:',
      ...this.wrapTextLines(order.summary, 72),
      '',
      `Amount (CNY): ${order.amount.toFixed(2)}`,
      '',
      'Attachments:',
      ...(detail.files?.length
        ? detail.files.map((file, index) => `${index + 1}. ${file.fileName} (${file.mimeType}, ${file.fileSize} bytes)`)
        : ['-']),
    ];

    const amountLineIndex = lines.findIndex((line) => line.startsWith('Amount (CNY):'));
    const pdfBuffer = this.buildA4Pdf({
      title: 'Procurement Order',
      lines,
      rightAlignedLineIndexes: amountLineIndex >= 0 ? [amountLineIndex] : [],
    });

    return this.persistExportPdf({
      fileName: `${order.orderNo}.pdf`,
      category: 'procurement_exports',
      buffer: pdfBuffer,
      uploadedBy: user.userId,
    });
  }

  async printReportRequest(id: string, user: CurrentUser): Promise<PrintResultDto> {
    const report = await this.mustFindReport(id);
    this.assertCanViewReport(report, user);

    const generatedAt = new Date();
    const snapshotSummary = JSON.stringify(report.snapshotSummary, null, 2);
    const lines = [
      `Report No: ${report.reportNo}`,
      `Generated At: ${this.formatDateTime(generatedAt)}`,
      '',
      'Procurement Report Request',
      `Report Type: ${report.reportType}`,
      `Period: ${report.periodMonth ? `${report.periodYear}-${String(report.periodMonth).padStart(2, '0')}` : report.periodYear}`,
      `Department: ${report.departmentCode ?? '-'}`,
      `Applicant: ${report.createdBy}`,
      `Status: ${report.status}`,
      `Submitted At: ${report.submittedAt ? this.formatDateTime(report.submittedAt) : '-'}`,
      `Final Approved At: ${report.finalApprovedAt ? this.formatDateTime(report.finalApprovedAt) : '-'}`,
      '',
      'Snapshot Summary:',
      ...this.wrapTextLines(snapshotSummary, 72),
    ];

    const pdfBuffer = this.buildA4Pdf({
      title: 'Procurement Report Request',
      lines,
      rightAlignedLineIndexes: [],
    });

    const printResult = await this.persistExportPdf({
      fileName: `${report.reportNo}.pdf`,
      category: 'procurement_exports',
      buffer: pdfBuffer,
      uploadedBy: user.userId,
    });

    report.exportPdfFileId = printResult.fileId;
    report.updatedBy = user.userId;
    await this.reportRepository.save(report);

    return printResult;
  }

  async listPendingApprovals(query: ProcurementApprovalListQueryDto, user: CurrentUser) {
    const includeOrders = !query.entityType || query.entityType === 'order';
    const includeReports = !query.entityType || query.entityType === 'report';

    const pendingTasks: Array<{
      entityType: 'order' | 'report';
      entityId: string;
      title: string;
      departmentCode: ProcurementDepartmentCode | null;
      approvalLevel: 'dept' | 'finance' | 'final';
      status: string;
      submittedAt: string;
      approvalChannel: 'internal' | 'wecom_native';
      externalStatus: string | null;
    }> = [];

    if (includeOrders && this.canApproveAnyOrder(user)) {
      const orderRows = await this.orderRepository.find({
        where: {
          deletedAt: IsNull(),
          status: In(['submitted', 'dept_approved'] satisfies ProcurementOrderStatus[]),
        },
        order: { submittedAt: 'ASC', createdAt: 'ASC' },
      });

      orderRows.forEach((row) => {
        if (query.departmentCode && row.departmentCode !== query.departmentCode) {
          return;
        }

        const approvalLevel = this.resolveApprovalLevel(row, user);
        if (!approvalLevel) {
          return;
        }

        pendingTasks.push({
          entityType: 'order',
          entityId: row.id,
          title: row.title,
          departmentCode: row.departmentCode,
          approvalLevel,
          status: row.status,
          submittedAt: (row.submittedAt ?? row.createdAt).toISOString(),
          approvalChannel: row.approvalChannel,
          externalStatus: row.externalStatus,
        });
      });
    }

    if (includeReports && this.canApproveAnyReport(user)) {
      const reportRows = await this.reportRepository.find({
        where: {
          deletedAt: IsNull(),
          status: In(PENDING_REPORT_REQUEST_STATUSES),
        },
        order: { submittedAt: 'ASC', createdAt: 'ASC' },
      });

      reportRows.forEach((row) => {
        if (query.departmentCode && row.departmentCode !== query.departmentCode) {
          return;
        }

        const approvalLevel = this.resolveReportApprovalLevel(row, user);
        if (!approvalLevel) {
          return;
        }

        pendingTasks.push({
          entityType: 'report',
          entityId: row.id,
          title: `报表审批 ${row.reportNo}`,
          departmentCode: row.departmentCode,
          approvalLevel,
          status: row.status,
          submittedAt: (row.submittedAt ?? row.createdAt).toISOString(),
          approvalChannel: row.approvalChannel,
          externalStatus: row.externalStatus,
        });
      });
    }

    pendingTasks.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const start = (page - 1) * pageSize;

    return pendingTasks.slice(start, start + pageSize);
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

    await this.notifyOrderApprovalResult(order, dto.action);

    return {
      entityId: order.id,
      status: order.status,
      latestApproval: this.toApprovalDto(approval),
    };
  }

  async getMonthlyReport(query: ProcurementReportMonthlyQueryDto, user: CurrentUser) {
    this.assertCanViewReports(user);
    this.assertYearInLastThreeYears(query.year);

    const monthText = String(query.month).padStart(2, '0');
    const startAt = new Date(`${query.year}-${monthText}-01T00:00:00.000+08:00`);
    const endMonth = query.month === 12 ? 1 : query.month + 1;
    const endYear = query.month === 12 ? query.year + 1 : query.year;
    const endAt = new Date(`${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00.000+08:00`);

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .select('order.departmentCode', 'label')
      .addSelect('SUM(order.amount)', 'amount')
      .addSelect('COUNT(order.id)', 'orderCount')
      .where('order.deletedAt IS NULL')
      .andWhere('order.status IN (:...statuses)', { statuses: INCLUDED_REPORT_ORDER_STATUSES })
      .andWhere('order.submittedAt >= :startAt', { startAt: startAt.toISOString() })
      .andWhere('order.submittedAt < :endAt', { endAt: endAt.toISOString() })
      .groupBy('order.departmentCode')
      .orderBy('order.departmentCode', 'ASC');

    if (query.departmentCode) {
      qb.andWhere('order.departmentCode = :departmentCode', { departmentCode: query.departmentCode });
    }

    const rows = await qb.getRawMany<{ label: string; amount: string; ordercount: string; orderCount?: string }>();

    return {
      year: query.year,
      month: query.month,
      items: rows.map((row) => ({
        label: row.label,
        amount: Number(row.amount),
        orderCount: Number(row.orderCount ?? row.ordercount ?? '0'),
      })),
    };
  }

  async getYearlyReport(query: ProcurementReportYearlyQueryDto, user: CurrentUser) {
    this.assertCanViewReports(user);
    this.assertYearInLastThreeYears(query.year);

    const startAt = new Date(`${query.year}-01-01T00:00:00.000+08:00`);
    const endAt = new Date(`${query.year + 1}-01-01T00:00:00.000+08:00`);

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .select("EXTRACT(MONTH FROM order.submittedAt)", 'month')
      .addSelect('SUM(order.amount)', 'amount')
      .addSelect('COUNT(order.id)', 'orderCount')
      .where('order.deletedAt IS NULL')
      .andWhere('order.status IN (:...statuses)', { statuses: INCLUDED_REPORT_ORDER_STATUSES })
      .andWhere('order.submittedAt >= :startAt', { startAt: startAt.toISOString() })
      .andWhere('order.submittedAt < :endAt', { endAt: endAt.toISOString() })
      .groupBy("EXTRACT(MONTH FROM order.submittedAt)")
      .orderBy('month', 'ASC');

    if (query.departmentCode) {
      qb.andWhere('order.departmentCode = :departmentCode', { departmentCode: query.departmentCode });
    }

    const rows = await qb.getRawMany<{ month: string; amount: string; ordercount: string; orderCount?: string }>();
    const rowMap = new Map(rows.map((row) => [Number(row.month), row]));

    return {
      year: query.year,
      items: Array.from({ length: 12 }).map((_, index) => {
        const month = index + 1;
        const row = rowMap.get(month);

        return {
          label: String(month).padStart(2, '0'),
          amount: row ? Number(row.amount) : 0,
          orderCount: row ? Number(row.orderCount ?? row.ordercount ?? '0') : 0,
        };
      }),
    };
  }

  async getDepartmentDetails(query: ProcurementReportDepartmentDetailsQueryDto, user: CurrentUser) {
    this.assertCanViewReports(user);
    const range = this.normalizeDateRange(query.startDate, query.endDate);

    const rows = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.id', 'id')
      .addSelect('order.orderNo', 'order_no')
      .addSelect('order.departmentCode', 'department_code')
      .addSelect('order.dimensionType', 'dimension_type')
      .addSelect('order.dimensionKey', 'dimension_key')
      .addSelect('order.title', 'title')
      .addSelect('order.amount', 'amount')
      .addSelect('order.status', 'status')
      .addSelect('order.submittedAt', 'submitted_at')
      .where('order.deletedAt IS NULL')
      .andWhere('order.status IN (:...statuses)', { statuses: INCLUDED_REPORT_ORDER_STATUSES })
      .andWhere('order.departmentCode = :departmentCode', { departmentCode: query.departmentCode })
      .andWhere('order.submittedAt >= :startAt', { startAt: range.startAt.toISOString() })
      .andWhere('order.submittedAt <= :endAt', { endAt: range.endAt.toISOString() })
      .orderBy('order.submittedAt', 'DESC')
      .getRawMany<ReportDetailRow>();

    return rows.map((row) => this.toReportDetailItem(row));
  }

  async getDimensionDetails(query: ProcurementReportDimensionDetailsQueryDto, user: CurrentUser) {
    this.assertCanViewReports(user);
    this.assertDimensionDetailsScope(query.departmentCode, query.dimensionType);

    const range = this.normalizeDateRange(query.startDate, query.endDate);

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .select('order.id', 'id')
      .addSelect('order.orderNo', 'order_no')
      .addSelect('order.departmentCode', 'department_code')
      .addSelect('order.dimensionType', 'dimension_type')
      .addSelect('order.dimensionKey', 'dimension_key')
      .addSelect('order.title', 'title')
      .addSelect('order.amount', 'amount')
      .addSelect('order.status', 'status')
      .addSelect('order.submittedAt', 'submitted_at')
      .where('order.deletedAt IS NULL')
      .andWhere('order.status IN (:...statuses)', { statuses: INCLUDED_REPORT_ORDER_STATUSES })
      .andWhere('order.departmentCode = :departmentCode', { departmentCode: query.departmentCode })
      .andWhere('order.dimensionType = :dimensionType', { dimensionType: query.dimensionType })
      .andWhere('order.submittedAt >= :startAt', { startAt: range.startAt.toISOString() })
      .andWhere('order.submittedAt <= :endAt', { endAt: range.endAt.toISOString() })
      .orderBy('order.submittedAt', 'DESC');

    if (query.dimensionKey?.trim()) {
      qb.andWhere('order.dimensionKey = :dimensionKey', { dimensionKey: query.dimensionKey.trim() });
    }

    const rows = await qb.getRawMany<ReportDetailRow>();
    return rows.map((row) => this.toReportDetailItem(row));
  }

  async listReportRequests(query: ProcurementReportRequestListQueryDto, user: CurrentUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.reportRepository.createQueryBuilder('report').where('report.deletedAt IS NULL');

    if (!this.canViewReportRequestsAll(user)) {
      qb.andWhere('report.createdBy = :createdBy', { createdBy: user.userId });
    }

    if (query.reportType) {
      qb.andWhere('report.reportType = :reportType', { reportType: query.reportType });
    }

    if (query.periodYear) {
      this.assertYearInLastThreeYears(query.periodYear);
      qb.andWhere('report.periodYear = :periodYear', { periodYear: query.periodYear });
    }

    if (query.departmentCode) {
      qb.andWhere('report.departmentCode = :departmentCode', { departmentCode: query.departmentCode });
    }

    if (query.status) {
      qb.andWhere('report.status = :status', { status: query.status });
    }

    const [rows, total] = await qb
      .orderBy('report.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: rows.map((row) => this.toReportRequestItem(row)),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async createReportRequestDraft(dto: ProcurementReportRequestCreateDto, user: CurrentUser) {
    this.assertCanViewReports(user);

    const approvalChannel = dto.approvalChannel ?? 'internal';
    this.assertApprovalChannel(approvalChannel);
    this.assertYearInLastThreeYears(dto.periodYear);
    this.assertReportRequestPeriod(dto.reportType, dto.periodMonth);

    const snapshotSummary = await this.computeReportSnapshotSummary(dto.reportType, dto.periodYear, dto.periodMonth ?? null, dto.departmentCode ?? null);
    const reportNo = await this.generateReportNo();

    const entity = this.reportRepository.create({
      reportNo,
      reportType: dto.reportType,
      periodYear: dto.periodYear,
      periodMonth: dto.periodMonth ?? null,
      departmentCode: dto.departmentCode ?? null,
      snapshotParams: {
        reportType: dto.reportType,
        periodYear: dto.periodYear,
        periodMonth: dto.periodMonth ?? null,
        departmentCode: dto.departmentCode ?? null,
      },
      snapshotSummary,
      status: 'draft',
      approvalChannel,
      externalProcessInstanceId: null,
      externalStatus: null,
      externalSyncedAt: null,
      submittedAt: null,
      finalApprovedAt: null,
      exportPdfFileId: null,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    const saved = await this.reportRepository.save(entity);
    return this.getReportRequestDetail(saved.id, user);
  }

  async getReportRequestDetail(id: string, user: CurrentUser) {
    const report = await this.mustFindReport(id);
    this.assertCanViewReport(report, user);
    return this.toReportRequestItem(report);
  }

  async submitReportRequest(id: string, user: CurrentUser) {
    const report = await this.mustFindReport(id);
    this.assertCanSubmitReportDraft(report, user);

    report.status = 'submitted';
    report.submittedAt = new Date();
    report.updatedBy = user.userId;

    await this.reportRepository.save(report);
    await this.notifyReportPendingApproval(report, 'dept');
    return this.getReportRequestDetail(id, user);
  }

  async listReportApprovals(id: string, user: CurrentUser) {
    const report = await this.mustFindReport(id);
    this.assertCanViewReport(report, user);

    const rows = await this.reportApprovalRepository.find({ where: { reportId: id }, order: { approvedAt: 'ASC' } });
    return rows.map((row) => this.toReportApprovalDto(row));
  }

  async actionReportApproval(id: string, dto: ProcurementApprovalActionDto, user: CurrentUser) {
    const report = await this.mustFindReport(id);
    const source = dto.source ?? 'internal';
    this.assertApprovalSource(source);

    const approvalLevel = this.resolveReportApprovalLevel(report, user);
    if (!approvalLevel) {
      if (report.status === 'draft' || report.status === 'final_approved' || report.status === 'rejected') {
        throw new ConflictException('current status does not allow approval action');
      }
      throw new ForbiddenException('forbidden');
    }

    const previousStatus = report.status;
    const nextStatus = this.resolveNextReportStatus(report.status, approvalLevel, dto.action);

    report.status = nextStatus;
    report.updatedBy = user.userId;

    if (nextStatus === 'final_approved') {
      report.finalApprovedAt = new Date();
    }

    if (nextStatus === 'draft') {
      report.finalApprovedAt = null;
    }

    await this.reportRepository.save(report);

    const approval = await this.reportApprovalRepository.save(
      this.reportApprovalRepository.create({
        reportId: report.id,
        approvalLevel,
        action: dto.action,
        comment: dto.comment?.trim() || null,
        source,
        externalEventId: dto.externalEventId ?? null,
        approvedBy: user.userId,
        payloadSnapshot: {
          externalEventId: dto.externalEventId ?? null,
          statusBefore: previousStatus,
          statusAfter: nextStatus,
          snapshotParams: report.snapshotParams,
          snapshotSummary: report.snapshotSummary,
          syncDirection: source === 'external' ? 'pull_from_wecom' : null,
        },
      }),
    );

    await this.notifyReportApprovalResult(report, dto.action);

    return {
      entityId: report.id,
      status: report.status,
      latestApproval: this.toReportApprovalDto(approval),
    };
  }

  private canViewAllOrders(user: CurrentUser) {
    return user.roles.includes('system_admin') || user.roles.includes('general_office');
  }

  private canApproveAnyOrder(user: CurrentUser) {
    return user.roles.includes('system_admin') || user.roles.includes('general_office') || Object.values(DEPARTMENT_ROLE_MAP).some((role) => user.roles.includes(role));
  }

  private canViewReports(user: CurrentUser) {
    return user.roles.includes('all_authenticated');
  }

  private assertCanViewReports(user: CurrentUser) {
    if (this.canViewReports(user)) {
      return;
    }
    throw new ForbiddenException('forbidden');
  }

  private canManageDimensionDictionary(user: CurrentUser) {
    return user.roles.includes('system_admin') || user.roles.includes('general_office');
  }

  private assertCanManageDimensionDictionary(user: CurrentUser) {
    if (this.canManageDimensionDictionary(user)) {
      return;
    }

    throw new ForbiddenException('forbidden');
  }

  private assertDimensionScope(departmentCode: string, dimensionType: string) {
    if (!DICTIONARY_DEPARTMENT_CODES.includes(departmentCode as (typeof DICTIONARY_DEPARTMENT_CODES)[number])) {
      throw new BadRequestException('invalid department code');
    }

    if (!DICTIONARY_DIMENSION_TYPES.includes(dimensionType as (typeof DICTIONARY_DIMENSION_TYPES)[number])) {
      throw new BadRequestException('invalid dimension type');
    }

    if (departmentCode === 'shipping_dept' && dimensionType !== 'vessel') {
      throw new BadRequestException('shipping_dept only supports vessel dimensionType');
    }

    if (departmentCode === 'logistics_dept' && dimensionType !== 'logistics_category') {
      throw new BadRequestException('logistics_dept only supports logistics_category dimensionType');
    }
  }

  private canViewReportRequestsAll(user: CurrentUser) {
    return user.roles.includes('system_admin') || user.roles.includes('general_office') || user.roles.includes('finance');
  }

  private canApproveAnyReport(user: CurrentUser) {
    if (user.roles.includes('system_admin') || user.roles.includes('general_office') || user.roles.includes('finance')) {
      return true;
    }

    return Object.values(DEPARTMENT_ROLE_MAP).some((role) => user.roles.includes(role));
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

  private resolveReportApprovalLevel(report: ProcurementReportEntity, user: CurrentUser): ProcurementReportApprovalLevel | null {
    if (report.status === 'submitted' && this.canReportDepartmentApprove(report.departmentCode, user)) {
      return 'dept';
    }

    if (report.status === 'dept_approved' && this.canFinanceApprove(user)) {
      return 'finance';
    }

    if (report.status === 'finance_approved' && this.canFinalApprove(user)) {
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

  private canReportDepartmentApprove(departmentCode: ProcurementDepartmentCode | null, user: CurrentUser) {
    if (user.roles.includes('system_admin')) {
      return true;
    }

    if (!departmentCode) {
      return user.roles.includes('general_office');
    }

    const requiredRole = DEPARTMENT_ROLE_MAP[departmentCode];
    return user.roles.includes(requiredRole);
  }

  private canFinanceApprove(user: CurrentUser) {
    return user.roles.includes('system_admin') || user.roles.includes('finance');
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

  private assertCanViewReport(report: ProcurementReportEntity, user: CurrentUser) {
    if (
      report.createdBy === user.userId ||
      this.canViewReportRequestsAll(user) ||
      this.canReportDepartmentApprove(report.departmentCode, user)
    ) {
      return;
    }

    throw new NotFoundException('procurement report request not found');
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

  private assertCanSubmitReportDraft(report: ProcurementReportEntity, user: CurrentUser) {
    if (report.status !== 'draft') {
      throw new ConflictException('only draft report request can be submitted');
    }

    if (report.createdBy === user.userId || user.roles.includes('system_admin')) {
      return;
    }

    throw new ForbiddenException('forbidden');
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

  private resolveNextReportStatus(
    currentStatus: ProcurementReportRequestStatus,
    approvalLevel: ProcurementReportApprovalLevel,
    action: 'approve' | 'reject' | 'return',
  ): ProcurementReportRequestStatus {
    if (action === 'reject') {
      return 'rejected';
    }

    if (action === 'return') {
      return 'draft';
    }

    if (currentStatus === 'submitted' && approvalLevel === 'dept') {
      return 'dept_approved';
    }

    if (currentStatus === 'dept_approved' && approvalLevel === 'finance') {
      return 'finance_approved';
    }

    if (currentStatus === 'finance_approved' && approvalLevel === 'final') {
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

  private assertReportRequestPeriod(reportType: ProcurementReportType, periodMonth?: number | null) {
    if (!PROCUREMENT_REPORT_TYPES.includes(reportType)) {
      throw new BadRequestException('invalid report type');
    }

    if (reportType === 'monthly' && !periodMonth) {
      throw new BadRequestException('monthly report requires periodMonth');
    }

    if (reportType === 'yearly' && periodMonth) {
      throw new BadRequestException('yearly report should not provide periodMonth');
    }
  }

  private assertYearInLastThreeYears(year: number) {
    const currentYear = new Date().getFullYear();
    if (year < currentYear - 2 || year > currentYear) {
      throw new BadRequestException('year must be in last three years');
    }
  }

  private normalizeDateRange(startDate: string, endDate: string): NormalizedDateRange {
    const startAt = new Date(`${startDate}T00:00:00.000+08:00`);
    const endAt = new Date(`${endDate}T23:59:59.999+08:00`);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('invalid date range');
    }

    if (startAt > endAt) {
      throw new BadRequestException('startDate must be less than or equal to endDate');
    }

    const { minDate, now } = this.buildThreeYearWindow();
    if (startAt < minDate || endAt < minDate || startAt > now || endAt > now) {
      throw new BadRequestException('date range must be in last three years');
    }

    return { startAt, endAt };
  }

  private normalizeSubmittedDateRange(submittedFrom?: string, submittedTo?: string): NormalizedSubmittedDateRange {
    const result: NormalizedSubmittedDateRange = {};
    const { minDate, now } = this.buildThreeYearWindow();

    if (submittedFrom) {
      const startAt = new Date(`${submittedFrom}T00:00:00.000+08:00`);
      if (Number.isNaN(startAt.getTime())) {
        throw new BadRequestException('invalid submittedFrom');
      }
      if (startAt < minDate || startAt > now) {
        throw new BadRequestException('submitted date range must be in last three years');
      }
      result.submittedFrom = startAt;
    }

    if (submittedTo) {
      const endAt = new Date(`${submittedTo}T23:59:59.999+08:00`);
      if (Number.isNaN(endAt.getTime())) {
        throw new BadRequestException('invalid submittedTo');
      }
      if (endAt < minDate || endAt > now) {
        throw new BadRequestException('submitted date range must be in last three years');
      }
      result.submittedTo = endAt;
    }

    if (result.submittedFrom && result.submittedTo && result.submittedFrom > result.submittedTo) {
      throw new BadRequestException('submittedFrom must be less than or equal to submittedTo');
    }

    return result;
  }

  private buildThreeYearWindow() {
    const now = new Date();
    const minDate = new Date(now);
    minDate.setFullYear(minDate.getFullYear() - 3);
    return { minDate, now };
  }

  private assertDimensionDetailsScope(departmentCode: string, dimensionType: string) {
    if (departmentCode === 'shipping_dept' && dimensionType !== 'vessel') {
      throw new BadRequestException('shipping_dept only supports vessel dimensionType');
    }

    if (departmentCode === 'logistics_dept' && dimensionType !== 'logistics_category') {
      throw new BadRequestException('logistics_dept only supports logistics_category dimensionType');
    }
  }

  private async computeReportSnapshotSummary(
    reportType: ProcurementReportType,
    periodYear: number,
    periodMonth: number | null,
    departmentCode: ProcurementDepartmentCode | null,
  ) {
    if (reportType === 'monthly') {
      const month = periodMonth ?? 1;
      const monthly = await this.getMonthlyReport({ year: periodYear, month, departmentCode: departmentCode ?? undefined }, { roles: ['all_authenticated'] } as CurrentUser);
      const totalAmount = monthly.items.reduce((sum, item) => sum + item.amount, 0);
      const totalOrderCount = monthly.items.reduce((sum, item) => sum + item.orderCount, 0);

      return {
        reportType,
        year: periodYear,
        month,
        departmentCode,
        totalAmount,
        totalOrderCount,
        items: monthly.items,
      };
    }

    const yearly = await this.getYearlyReport({ year: periodYear, departmentCode: departmentCode ?? undefined }, { roles: ['all_authenticated'] } as CurrentUser);
    const totalAmount = yearly.items.reduce((sum, item) => sum + item.amount, 0);
    const totalOrderCount = yearly.items.reduce((sum, item) => sum + item.orderCount, 0);

    return {
      reportType,
      year: periodYear,
      departmentCode,
      totalAmount,
      totalOrderCount,
      items: yearly.items,
    };
  }

  private async notifyOrderPendingApproval(order: ProcurementOrderEntity, approvalLevel: 'dept' | 'final') {
    const approverUserIds = await this.resolveOrderApproverUserIds(order.departmentCode, approvalLevel);
    if (approverUserIds.length === 0) {
      return;
    }

    await this.safeSendTextCard(
      approverUserIds,
      '采购审批待处理',
      `<div class="gray">单号：${order.orderNo}</div><div class="normal">${this.toDepartmentLabel(order.departmentCode)} · ${this.escapeHtml(order.title)}</div><div class="highlight">金额：¥${Number(order.amount).toFixed(2)}</div>`,
      `https://${appEnv.APP_DOMAIN}/procurement/orders/${order.id}`,
      '立即审批',
    );
  }

  private async notifyOrderApprovalResult(order: ProcurementOrderEntity, action: 'approve' | 'reject' | 'return') {
    if (action === 'approve' && order.status === 'dept_approved') {
      await this.notifyOrderPendingApproval(order, 'final');
      return;
    }

    if (action === 'approve' && order.status === 'final_approved') {
      await this.safeSendTextCard(
        [order.createdBy],
        '采购审批结果通知',
        `<div class="gray">单号：${order.orderNo}</div><div class="normal">${this.escapeHtml(order.title)}</div><div class="highlight">审批结果：已通过</div>`,
        `https://${appEnv.APP_DOMAIN}/procurement/orders/${order.id}`,
        '查看详情',
      );
      return;
    }

    if (action === 'reject' || action === 'return') {
      const resultText = action === 'reject' ? '已驳回' : '已退回';
      await this.safeSendTextCard(
        [order.createdBy],
        '采购审批结果通知',
        `<div class="gray">单号：${order.orderNo}</div><div class="normal">${this.escapeHtml(order.title)}</div><div class="highlight">审批结果：${resultText}</div>`,
        `https://${appEnv.APP_DOMAIN}/procurement/orders/${order.id}`,
        '查看详情',
      );
    }
  }

  private async notifyReportPendingApproval(report: ProcurementReportEntity, approvalLevel: ProcurementReportApprovalLevel) {
    const approverUserIds = await this.resolveReportApproverUserIds(report, approvalLevel);
    if (approverUserIds.length === 0) {
      return;
    }

    await this.safeSendTextCard(
      approverUserIds,
      '报表审批待处理',
      `<div class="gray">单号：${report.reportNo}</div><div class="normal">${this.getReportTitle(report)}</div><div class="highlight">请在系统中完成审批</div>`,
      `https://${appEnv.APP_DOMAIN}/procurement/report-approvals`,
      '查看报表',
    );
  }

  private async notifyReportApprovalResult(report: ProcurementReportEntity, action: 'approve' | 'reject' | 'return') {
    if (action === 'approve' && report.status === 'dept_approved') {
      await this.notifyReportPendingApproval(report, 'finance');
      return;
    }

    if (action === 'approve' && report.status === 'finance_approved') {
      await this.notifyReportPendingApproval(report, 'final');
      return;
    }

    if (action === 'approve' && report.status === 'final_approved') {
      await this.safeSendTextCard(
        [report.createdBy],
        '报表审批结果通知',
        `<div class="gray">单号：${report.reportNo}</div><div class="normal">${this.getReportTitle(report)}</div><div class="highlight">审批结果：已通过</div>`,
        `https://${appEnv.APP_DOMAIN}/procurement/report-requests/${report.id}`,
        '查看详情',
      );
      return;
    }

    if (action === 'reject' || action === 'return') {
      const resultText = action === 'reject' ? '已驳回' : '已退回';
      await this.safeSendTextCard(
        [report.createdBy],
        '报表审批结果通知',
        `<div class="gray">单号：${report.reportNo}</div><div class="normal">${this.getReportTitle(report)}</div><div class="highlight">审批结果：${resultText}</div>`,
        `https://${appEnv.APP_DOMAIN}/procurement/report-requests/${report.id}`,
        '查看详情',
      );
    }
  }

  private async resolveOrderApproverUserIds(
    departmentCode: ProcurementDepartmentCode,
    approvalLevel: 'dept' | 'final',
  ): Promise<string[]> {
    if (approvalLevel === 'dept') {
      return this.listWecomUserIdsByDepartmentCode(departmentCode);
    }

    return this.listGeneralOfficeApproverUserIds();
  }

  private async resolveReportApproverUserIds(
    report: ProcurementReportEntity,
    approvalLevel: ProcurementReportApprovalLevel,
  ): Promise<string[]> {
    if (approvalLevel === 'dept') {
      if (report.departmentCode) {
        return this.listWecomUserIdsByDepartmentCode(report.departmentCode);
      }

      return this.listGeneralOfficeApproverUserIds();
    }

    if (approvalLevel === 'finance') {
      return this.listFinanceApproverUserIds();
    }

    return this.listGeneralOfficeApproverUserIds();
  }

  private async listWecomUserIdsByDepartmentCode(departmentCode: ProcurementDepartmentCode): Promise<string[]> {
    const rows = await this.wecomUserRepository.find();
    const userIds = rows
      .filter((row) => row.departmentCodes.includes(departmentCode) || row.isSystemAdmin)
      .map((row) => row.userId);

    return [...new Set(userIds)];
  }

  private async listFinanceApproverUserIds(): Promise<string[]> {
    const rows = await this.wecomUserRepository.find();
    const userIds = rows
      .filter((row) => row.departmentCodes.includes('finance_dept') || row.isSystemAdmin)
      .map((row) => row.userId);

    return [...new Set(userIds)];
  }

  private async listGeneralOfficeApproverUserIds(): Promise<string[]> {
    const rows = await this.wecomUserRepository.find();
    const userIds = rows
      .filter((row) => row.departmentCodes.includes('general_office') || row.isSystemAdmin)
      .map((row) => row.userId);

    return [...new Set(userIds)];
  }

  private async safeSendTextCard(
    userIds: string[],
    title: string,
    description: string,
    url: string,
    btnText = '查看详情',
  ): Promise<void> {
    const uniqueUserIds = [...new Set(userIds.map((item) => item.trim()).filter(Boolean))];
    if (uniqueUserIds.length === 0) {
      return;
    }

    const resolvedUsers = await this.wecomUserRepository.find({ where: { userId: In(uniqueUserIds) } });
    const resolvedUserIds = [...new Set(resolvedUsers.map((item) => item.userId))];
    if (resolvedUserIds.length === 0) {
      return;
    }

    try {
      const result = await this.wecomMessageService.sendTextCard({
        userIds: resolvedUserIds,
        title,
        description,
        url,
        btnText,
      });

      if (!result.success || result.invalidUser.length > 0) {
        this.logger.warn(
          `wecom push partial failure: success=${String(result.success)} invalidUser=${result.invalidUser.join('|') || '-'} reason=${result.failureReason ?? '-'}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`wecom push failed: ${message}`);
    }
  }

  private async persistExportPdf(params: {
    fileName: string;
    category: string;
    buffer: Buffer;
    uploadedBy: string;
  }): Promise<PrintResultDto> {
    const ossKey = this.buildExportOssKey(params.category);

    try {
      await this.ossService.uploadBuffer(ossKey, params.buffer, 'application/pdf', params.fileName);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`oss upload failed for ${ossKey}: ${message}`);
    }

    const file = await this.fileRepository.save(
      this.fileRepository.create({
        ossKey,
        fileName: params.fileName,
        mimeType: 'application/pdf',
        fileSize: params.buffer.length,
        category: params.category,
        uploadedBy: params.uploadedBy,
      }),
    );

    const signature = this.ossService.createDownloadSignature(ossKey);
    return {
      fileId: file.id,
      downloadUrl: signature.downloadUrl,
    };
  }

  private buildExportOssKey(category: string): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${category}/${year}/${month}/${randomUUID()}.pdf`;
  }

  private buildA4Pdf(input: {
    title: string;
    lines: string[];
    rightAlignedLineIndexes: number[];
  }): Buffer {
    const pages: string[][] = [];
    for (let index = 0; index < input.lines.length; index += PDF_MAX_LINES_PER_PAGE) {
      pages.push(input.lines.slice(index, index + PDF_MAX_LINES_PER_PAGE));
    }

    const pageStreams = pages.map((pageLines, pageIndex) => {
      const commands: string[] = ['BT', '/F1 12 Tf'];

      const pageTitle = `${input.title}  Page ${pageIndex + 1}/${pages.length}`;
      commands.push(`1 0 0 1 ${PDF_MARGIN_LEFT.toFixed(2)} ${(PDF_PAGE_HEIGHT - PDF_MARGIN_TOP).toFixed(2)} Tm (${this.escapePdfText(pageTitle)}) Tj`);

      pageLines.forEach((line, lineIndex) => {
        const globalLineIndex = pageIndex * PDF_MAX_LINES_PER_PAGE + lineIndex;
        const isRightAligned = input.rightAlignedLineIndexes.includes(globalLineIndex);
        const y = PDF_PAGE_HEIGHT - PDF_MARGIN_TOP - PDF_LINE_HEIGHT * (lineIndex + 2);
        const x = isRightAligned
          ? Math.max(PDF_MARGIN_LEFT, PDF_PAGE_WIDTH - PDF_MARGIN_LEFT - this.estimatePdfTextWidth(line, 12))
          : PDF_MARGIN_LEFT;

        commands.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${this.escapePdfText(line)}) Tj`);
      });

      commands.push('ET');
      return commands.join('\n');
    });

    return this.composePdf(pageStreams);
  }

  private composePdf(pageStreams: string[]): Buffer {
    const objects: string[] = [];
    const pageObjectIds: number[] = [];

    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

    let nextObjectId = 4;
    pageStreams.forEach((stream) => {
      const pageObjectId = nextObjectId;
      const contentObjectId = nextObjectId + 1;

      pageObjectIds.push(pageObjectId);
      objects[pageObjectId] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
      objects[contentObjectId] = `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`;

      nextObjectId += 2;
    });

    objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;

    const maxObjectId = nextObjectId - 1;
    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];

    for (let id = 1; id <= maxObjectId; id += 1) {
      const objectBody = objects[id] ?? '<< >>';
      offsets[id] = Buffer.byteLength(pdf, 'utf8');
      pdf += `${id} 0 obj\n${objectBody}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${maxObjectId + 1}\n`;
    pdf += '0000000000 65535 f \n';

    for (let id = 1; id <= maxObjectId; id += 1) {
      pdf += `${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
  }

  private wrapTextLines(text: string, maxUnitsPerLine: number): string[] {
    const rawLines = text.replace(/\r\n/g, '\n').split('\n');
    const wrapped: string[] = [];

    rawLines.forEach((rawLine) => {
      if (!rawLine) {
        wrapped.push('');
        return;
      }

      let currentLine = '';
      let currentUnits = 0;
      for (const char of rawLine) {
        const charUnits = char.charCodeAt(0) > 255 ? 2 : 1;
        if (currentUnits + charUnits > maxUnitsPerLine) {
          wrapped.push(currentLine);
          currentLine = char;
          currentUnits = charUnits;
          continue;
        }

        currentLine += char;
        currentUnits += charUnits;
      }

      if (currentLine) {
        wrapped.push(currentLine);
      }
    });

    return wrapped;
  }

  private estimatePdfTextWidth(text: string, fontSize: number): number {
    const units = Array.from(text).reduce((sum, char) => sum + (char.charCodeAt(0) > 255 ? 2 : 1), 0);
    return units * fontSize * 0.48;
  }

  private escapePdfText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatDateTime(value: Date): string {
    return value.toISOString().replace('T', ' ').slice(0, 19);
  }

  private getReportTitle(report: ProcurementReportEntity): string {
    if (report.reportType === 'monthly' && report.periodMonth) {
      return `${report.periodYear}年${String(report.periodMonth).padStart(2, '0')}月采购月报`;
    }

    return `${report.periodYear}年采购年报`;
  }

  private toDepartmentLabel(code: ProcurementDepartmentCode): string {
    const labels: Record<ProcurementDepartmentCode, string> = {
      general_office: '总经办',
      business_dept: '业务部',
      finance_dept: '财务部',
      shipping_dept: '船务部',
      logistics_dept: '后勤部',
    };
    return labels[code];
  }

  private async mustFindDimensionItem(id: string): Promise<ProcurementDimensionItemEntity> {
    const item = await this.dimensionItemRepository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!item) {
      throw new NotFoundException('procurement dimension item not found');
    }
    return item;
  }

  private async mustFindOrder(id: string) {
    const order = await this.orderRepository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!order) {
      throw new NotFoundException('procurement order not found');
    }
    return order;
  }

  private async mustFindReport(id: string) {
    const report = await this.reportRepository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!report) {
      throw new NotFoundException('procurement report request not found');
    }
    return report;
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

  private toReportRequestItem(report: ProcurementReportEntity) {
    return {
      id: report.id,
      reportNo: report.reportNo,
      reportType: report.reportType,
      periodYear: report.periodYear,
      periodMonth: report.periodMonth,
      departmentCode: report.departmentCode,
      snapshotParams: report.snapshotParams,
      snapshotSummary: report.snapshotSummary,
      status: report.status,
      approvalChannel: report.approvalChannel,
      externalProcessInstanceId: report.externalProcessInstanceId,
      externalStatus: report.externalStatus,
      externalSyncedAt: report.externalSyncedAt?.toISOString() ?? null,
      submittedAt: report.submittedAt?.toISOString() ?? null,
      finalApprovedAt: report.finalApprovedAt?.toISOString() ?? null,
      exportPdfFileId: report.exportPdfFileId,
      createdBy: report.createdBy,
      updatedBy: report.updatedBy,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
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

  private toReportApprovalDto(row: ProcurementReportApprovalEntity) {
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

  private toReportDetailItem(row: ReportDetailRow) {
    return {
      orderId: row.id,
      orderNo: row.order_no,
      departmentCode: row.department_code,
      dimensionType: row.dimension_type,
      dimensionKey: row.dimension_key,
      title: row.title,
      amount: Number(row.amount),
      status: row.status,
      submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
    };
  }

  private toDimensionItemDto(item: ProcurementDimensionItemEntity): DimensionItemDto {
    return {
      id: item.id,
      departmentCode: item.departmentCode,
      dimensionType: item.dimensionType,
      dimensionKey: item.dimensionKey,
      dimensionName: item.dimensionName,
      sortOrder: item.sortOrder,
      isEnabled: item.isEnabled,
      createdBy: item.createdBy,
      updatedBy: item.updatedBy,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
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

  private async generateReportNo() {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = String(Math.floor(Math.random() * 10_000)).padStart(4, '0');
      const candidate = `RB${datePart}${suffix}`;
      const existed = await this.reportRepository.exist({ where: { reportNo: candidate } });
      if (!existed) {
        return candidate;
      }
    }

    throw new InternalServerErrorException('failed to generate report number');
  }
}
