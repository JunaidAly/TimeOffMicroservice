import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxEvent, OutboxStatus } from '../entities/outbox-event.entity';
import { TimeOffRequest, RequestStatus } from '../../time-off/entities/time-off-request.entity';
import { TimeOffBalance } from '../../time-off/entities/time-off-balance.entity';
import { IHcmClient, HCM_CLIENT } from '../interfaces/hcm-client.interface';
import { TimeOffType } from '../../time-off/entities/time-off-request.entity';

const MAX_RETRIES = 5;

@Injectable()
export class OutboxWorkerService {
  private readonly logger = new Logger(OutboxWorkerService.name);
  private isRunning = false;

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepo: Repository<OutboxEvent>,
    @InjectRepository(TimeOffRequest)
    private readonly requestRepo: Repository<TimeOffRequest>,
    @InjectRepository(TimeOffBalance)
    private readonly balanceRepo: Repository<TimeOffBalance>,
    @Inject(HCM_CLIENT)
    private readonly hcmClient: IHcmClient,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processOutbox(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const pending = await this.outboxRepo.find({
        where: { status: OutboxStatus.PENDING },
        order: { createdAt: 'ASC' },
        take: 20,
      });

      if (pending.length > 0) {
        this.logger.debug(`Processing ${pending.length} outbox events`);
      }

      for (const event of pending) {
        await this.processEvent(event);
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async processEvent(event: OutboxEvent): Promise<void> {
    if (event.retryCount >= MAX_RETRIES) {
      await this.outboxRepo.update(event.id, { status: OutboxStatus.FAILED });
      this.logger.error(`Outbox event ${event.id} exceeded max retries, marked FAILED`);
      return;
    }

    await this.outboxRepo.update(event.id, {
      status: OutboxStatus.PROCESSING,
      lastAttemptAt: new Date(),
    });

    const payload = event.payload as {
      employeeId: string;
      locationId: string;
      type: TimeOffType;
      delta: number;
      idempotencyKey: string;
    };

    try {
      const result = await this.hcmClient.updateBalance(
        payload.employeeId,
        payload.locationId,
        payload.type,
        payload.delta,
        payload.idempotencyKey,
      );

      await this.outboxRepo.update(event.id, { status: OutboxStatus.DONE });

      // Confirm the decrement on the request
      const request = await this.requestRepo.findOne({ where: { id: event.aggregateId } });
      if (request && !request.hcmDecrementConfirmed) {
        request.hcmDecrementConfirmed = true;
        request.hcmErrorMessage = null;
        await this.requestRepo.save(request);

        const balance = await this.balanceRepo.findOne({
          where: { employeeId: payload.employeeId, locationId: payload.locationId, type: payload.type },
        });
        if (balance) {
          const absDelta = Math.abs(payload.delta);
          balance.pendingDays = Math.max(0, balance.pendingDays - absDelta);
          balance.usedDays += absDelta;
          balance.availableDays = result.newAvailableDays - balance.pendingDays;
          balance.lastSyncedAt = new Date();
          await this.balanceRepo.save(balance);
        }
      }

      this.logger.log(`Outbox event ${event.id} processed successfully`);
    } catch (err) {
      const error = err as Error & { status?: number };
      const isNonRetryable = error.status !== undefined && error.status >= 400 && error.status < 500;

      if (isNonRetryable) {
        // Rollback: 4xx from HCM means the operation is permanently invalid
        await this.outboxRepo.update(event.id, { status: OutboxStatus.FAILED });

        const request = await this.requestRepo.findOne({ where: { id: event.aggregateId } });
        if (request) {
          request.status = RequestStatus.PENDING_RETRY;
          request.hcmErrorMessage = `HCM permanently rejected: ${error.message}`;
          await this.requestRepo.save(request);

          // Release locked pending days
          const balance = await this.balanceRepo.findOne({
            where: { employeeId: payload.employeeId, locationId: payload.locationId, type: payload.type },
          });
          if (balance) {
            const absDelta = Math.abs(payload.delta);
            balance.pendingDays = Math.max(0, balance.pendingDays - absDelta);
            balance.availableDays = balance.totalDays - balance.usedDays - balance.pendingDays;
            await this.balanceRepo.save(balance);
          }
        }

        this.logger.error(`Outbox event ${event.id} permanently failed (${error.status}): ${error.message}`);
      } else {
        // Transient failure — schedule retry with backoff
        await this.outboxRepo.update(event.id, {
          status: OutboxStatus.PENDING,
          retryCount: event.retryCount + 1,
        });
        this.logger.warn(`Outbox event ${event.id} retry ${event.retryCount + 1}/${MAX_RETRIES}: ${error.message}`);
      }
    }
  }
}
