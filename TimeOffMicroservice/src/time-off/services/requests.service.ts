import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TimeOffRequest, RequestStatus } from '../entities/time-off-request.entity';
import { TimeOffBalance } from '../entities/time-off-balance.entity';
import { OutboxEvent, OutboxStatus } from '../../hcm-sync/entities/outbox-event.entity';
import { IHcmClient, HCM_CLIENT } from '../../hcm-sync/interfaces/hcm-client.interface';
import { BalancesService } from './balances.service';
import { BusinessDaysService } from './business-days.service';
import { CreateRequestDto } from '../dto/create-request.dto';
import { ApproveRejectDto } from '../dto/approve-reject.dto';
import { ListRequestsDto } from '../dto/list-requests.dto';
import { Employee } from '../../common/entities/employee.entity';
import * as crypto from 'crypto';

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    @InjectRepository(TimeOffRequest)
    private readonly requestRepo: Repository<TimeOffRequest>,
    @InjectRepository(TimeOffBalance)
    private readonly balanceRepo: Repository<TimeOffBalance>,
    @InjectRepository(OutboxEvent)
    private readonly outboxRepo: Repository<OutboxEvent>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @Inject(HCM_CLIENT)
    private readonly hcmClient: IHcmClient,
    private readonly balancesService: BalancesService,
    private readonly businessDaysService: BusinessDaysService,
    private readonly dataSource: DataSource,
  ) {}

  async createRequest(dto: CreateRequestDto, idempotencyKey?: string): Promise<TimeOffRequest> {
    // Check idempotency before any expensive work
    if (idempotencyKey) {
      const existing = await this.requestRepo.findOne({ where: { idempotencyKey } });
      if (existing) {
        throw new ConflictException({
          error: 'DUPLICATE_REQUEST',
          message: 'A request with this idempotency key already exists',
          existingRequestId: existing.id,
        });
      }
    }

    const employee = await this.employeeRepo.findOne({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException(`Employee ${dto.employeeId} not found`);

    const daysRequested = this.businessDaysService.calculate(dto.startDate, dto.endDate);
    if (daysRequested === 0) {
      throw new BadRequestException('Request must span at least one business day');
    }

    // Always fetch fresh from HCM before creating a request
    let hcmBalance;
    try {
      hcmBalance = await this.hcmClient.getBalance(dto.employeeId, dto.locationId, dto.type);
    } catch {
      throw new UnprocessableEntityException({
        error: 'HCM_UNAVAILABLE',
        message: 'Cannot submit request: HCM balance check failed',
      });
    }

    // Compute available considering existing pending days
    const localBalance = await this.balancesService.getOrCreateBalance(dto.employeeId, dto.locationId, dto.type);
    const effectiveAvailable = hcmBalance.availableDays - localBalance.pendingDays;

    if (effectiveAvailable < daysRequested) {
      throw new UnprocessableEntityException({
        error: 'INSUFFICIENT_BALANCE',
        message: `Employee has ${effectiveAvailable} days available but requested ${daysRequested} days`,
        details: { available: effectiveAvailable, requested: daysRequested },
      });
    }

    return this.dataSource.transaction(async (entityManager) => {
      const request = entityManager.create(TimeOffRequest, {
        employeeId: dto.employeeId,
        locationId: dto.locationId,
        type: dto.type,
        startDate: dto.startDate,
        endDate: dto.endDate,
        daysRequested,
        status: RequestStatus.PENDING,
        notes: dto.notes,
        idempotencyKey: idempotencyKey ?? crypto.randomUUID(),
      });
      await entityManager.save(TimeOffRequest, request);

      // Lock pending days in a balance row
      await entityManager.increment(
        TimeOffBalance,
        { employeeId: dto.employeeId, locationId: dto.locationId, type: dto.type },
        'pendingDays',
        daysRequested,
      );

      const balance = await entityManager.findOne(TimeOffBalance, {
        where: { employeeId: dto.employeeId, locationId: dto.locationId, type: dto.type },
      });
      if (balance) {
        balance.availableDays = balance.totalDays - balance.usedDays - balance.pendingDays;
        await entityManager.save(TimeOffBalance, balance);
      }

      this.logger.log(`Created request ${request.id}: ${daysRequested}d ${dto.type} for ${dto.employeeId}`);
      return request;
    });
  }

  async listRequests(dto: ListRequestsDto, requesterId: string, isManager: boolean) {
    const query = this.requestRepo.createQueryBuilder('r');

    if (!isManager) {
      query.where('r.employeeId = :requesterId', { requesterId });
    } else if (dto.employeeId) {
      query.where('r.employeeId = :employeeId', { employeeId: dto.employeeId });
    }

    if (dto.status) {
      query.andWhere('r.status = :status', { status: dto.status });
    }

    query.orderBy('r.createdAt', 'DESC');

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();
    return { data, total, page, limit };
  }

  async getRequest(id: string): Promise<TimeOffRequest> {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException(`Request ${id} not found`);
    return request;
  }

  async approveRequest(id: string, approver: Employee, dto: ApproveRejectDto): Promise<TimeOffRequest> {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException(`Request ${id} not found`);

    if (request.status !== RequestStatus.PENDING) {
      throw new ConflictException({
        error: 'INVALID_STATUS_TRANSITION',
        message: `Cannot approve a request in status ${request.status}`,
      });
    }

    // Re-validate balance from HCM — never trust cache for approval
    let hcmBalance;
    try {
      hcmBalance = await this.hcmClient.getBalance(request.employeeId, request.locationId, request.type);
    } catch {
      throw new UnprocessableEntityException({
        error: 'HCM_UNAVAILABLE',
        message: 'Cannot approve: HCM is currently unavailable',
      });
    }

    // Exclude this request's own pending days from the conflict check
    const localBalance = await this.balanceRepo.findOne({
      where: { employeeId: request.employeeId, locationId: request.locationId, type: request.type },
    });
    const otherPendingDays = Math.max(0, (localBalance?.pendingDays ?? 0) - request.daysRequested);
    const effectiveAvailable = hcmBalance.availableDays - otherPendingDays;

    if (effectiveAvailable < request.daysRequested) {
      throw new ConflictException({
        error: 'BALANCE_CHANGED',
        message: `Balance insufficient. Available: ${effectiveAvailable}, Requested: ${request.daysRequested}`,
        details: { available: effectiveAvailable, requested: request.daysRequested },
      });
    }

    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${request.id}:DECREMENT`)
      .digest('hex');

    // Atomic: write outbox event + update request status
    await this.dataSource.transaction(async (entityManager) => {
      request.status = RequestStatus.APPROVED;
      request.managerId = approver.id;
      request.managerNotes = dto.managerNotes ?? null;
      request.approvedAt = new Date();
      await entityManager.save(TimeOffRequest, request);

      const outbox = entityManager.create(OutboxEvent, {
        aggregateId: request.id,
        aggregateType: 'TimeOffRequest',
        eventType: 'BALANCE_DECREMENT',
        payload: {
          employeeId: request.employeeId,
          locationId: request.locationId,
          type: request.type,
          delta: -request.daysRequested,
          idempotencyKey,
        },
        status: OutboxStatus.PENDING,
      });
      await entityManager.save(OutboxEvent, outbox);
    });

    // Attempt synchronous HCM decrement
    try {
      const result = await this.hcmClient.updateBalance(
        request.employeeId,
        request.locationId,
        request.type,
        -request.daysRequested,
        idempotencyKey,
      );

      await this.dataSource.transaction(async (entityManager) => {
        request.hcmDecrementConfirmed = true;
        await entityManager.save(TimeOffRequest, request);

        const balance = await entityManager.findOne(TimeOffBalance, {
          where: { employeeId: request.employeeId, locationId: request.locationId, type: request.type },
        });
        if (balance) {
          balance.pendingDays = Math.max(0, balance.pendingDays - request.daysRequested);
          balance.usedDays += request.daysRequested;
          balance.availableDays = result.newAvailableDays - balance.pendingDays;
          balance.lastSyncedAt = new Date();
          await entityManager.save(TimeOffBalance, balance);
        }

        await entityManager.update(
          OutboxEvent,
          { aggregateId: request.id, eventType: 'BALANCE_DECREMENT' },
          { status: OutboxStatus.DONE },
        );
      });

      this.logger.log(`Approved request ${id}, HCM decrement confirmed`);
    } catch (err) {
      this.logger.warn(`HCM decrement failed for ${id}, outbox will retry: ${(err as Error).message}`);
      request.hcmErrorMessage = (err as Error).message;
      await this.requestRepo.save(request);
    }

    return request;
  }

  async rejectRequest(id: string, approver: Employee, dto: ApproveRejectDto): Promise<TimeOffRequest> {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException(`Request ${id} not found`);

    if (request.status !== RequestStatus.PENDING) {
      throw new ConflictException({
        error: 'INVALID_STATUS_TRANSITION',
        message: `Cannot reject a request in status ${request.status}`,
      });
    }

    await this.dataSource.transaction(async (entityManager) => {
      request.status = RequestStatus.REJECTED;
      request.managerId = approver.id;
      request.managerNotes = dto.managerNotes ?? null;
      await entityManager.save(TimeOffRequest, request);

      const balance = await entityManager.findOne(TimeOffBalance, {
        where: { employeeId: request.employeeId, locationId: request.locationId, type: request.type },
      });
      if (balance) {
        balance.pendingDays = Math.max(0, balance.pendingDays - request.daysRequested);
        balance.availableDays = balance.totalDays - balance.usedDays - balance.pendingDays;
        await entityManager.save(TimeOffBalance, balance);
      }
    });

    this.logger.log(`Rejected request ${id}`);
    return request;
  }

  async cancelRequest(id: string, employeeId: string): Promise<TimeOffRequest> {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException(`Request ${id} not found`);

    if (request.employeeId !== employeeId) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new ConflictException({
        error: 'INVALID_STATUS_TRANSITION',
        message: `Cannot cancel a request in status ${request.status}`,
      });
    }

    await this.dataSource.transaction(async (entityManager) => {
      request.status = RequestStatus.CANCELLED;
      await entityManager.save(TimeOffRequest, request);

      const balance = await entityManager.findOne(TimeOffBalance, {
        where: { employeeId: request.employeeId, locationId: request.locationId, type: request.type },
      });
      if (balance) {
        balance.pendingDays = Math.max(0, balance.pendingDays - request.daysRequested);
        balance.availableDays = balance.totalDays - balance.usedDays - balance.pendingDays;
        await entityManager.save(TimeOffBalance, balance);
      }
    });

    this.logger.log(`Cancelled request ${id}`);
    return request;
  }
}
