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
import { ProcurementReportApprovalEntity } from 'src/database/entities/procurement-report-approval.entity';
import { ProcurementReportEntity } from 'src/database/entities/procurement-report.entity';
import { ProcurementApprovalActionDto } from './dto/procurement-approval-action.dto';
import { ProcurementApprovalListQueryDto } from './dto/procurement-approval-list-query.dto';
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

interface NormalizedDimension {
  dimensionType: ProcurementDimensionType;
  dimensionKey: string | null;
}

interface NormalizedDateRange {
  startAt: Date;
  endAt: Date;
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

@Injectable()
export class ProcurementService {
  constructor(
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

    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 3);

    if (startAt < minDate || endAt < minDate) {
      throw new BadRequestException('date range must be in last three years');
    }

    return { startAt, endAt };
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
