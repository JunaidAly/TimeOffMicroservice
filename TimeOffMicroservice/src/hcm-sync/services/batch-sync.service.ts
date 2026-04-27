import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeOffBalance } from '../../time-off/entities/time-off-balance.entity';
import { TimeOffRequest, RequestStatus, TimeOffType } from '../../time-off/entities/time-off-request.entity';
import { SyncEvent, SyncEventType, SyncEventStatus } from '../entities/sync-event.entity';
import * as crypto from 'crypto';

export interface BatchBalanceEntry {
  employeeId: string;
  locationId: string;
  type: TimeOffType;
  totalDays: number;
  usedDays: number;
}

export interface BatchSyncPayload {
  syncId: string;
  generatedAt: string;
  balances: BatchBalanceEntry[];
}

export interface BatchSyncResult {
  syncId: string;
  processed: number;
  updated: number;
  flaggedForReview: number;
  errors: string[];
  duration: string;
}

@Injectable()
export class BatchSyncService {
  private readonly logger = new Logger(BatchSyncService.name);
  private readonly STALE_BATCH_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    @InjectRepository(TimeOffBalance)
    private readonly balanceRepo: Repository<TimeOffBalance>,
    @InjectRepository(TimeOffRequest)
    private readonly requestRepo: Repository<TimeOffRequest>,
    @InjectRepository(SyncEvent)
    private readonly syncEventRepo: Repository<SyncEvent>,
  ) {}

  async processBatch(payload: BatchSyncPayload): Promise<BatchSyncResult> {
    const startTime = Date.now();

    const generatedAt = new Date(payload.generatedAt);
    if (isNaN(generatedAt.getTime()) || Date.now() - generatedAt.getTime() > this.STALE_BATCH_THRESHOLD_MS) {
      throw new BadRequestException('Batch is stale or has an invalid timestamp (must be within 1 hour)');
    }

    this.logger.log(`Processing batch sync ${payload.syncId} with ${payload.balances.length} entries`);

    let updated = 0;
    let flaggedForReview = 0;
    const errors: string[] = [];

    for (const entry of payload.balances) {
      try {
        const result = await this.reconcileBalance(entry);
        if (result.updated) updated++;
        if (result.flagged) flaggedForReview++;
      } catch (err) {
        const msg = `Failed to reconcile ${entry.employeeId}/${entry.locationId}/${entry.type}: ${(err as Error).message}`;
        this.logger.error(msg);
        errors.push(msg);
      }
    }

    const duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;

    await this.syncEventRepo.save(
      this.syncEventRepo.create({
        type: SyncEventType.BATCH_SYNC,
        triggeredBy: 'batch-endpoint',
        status: errors.length === 0 ? SyncEventStatus.SUCCESS : SyncEventStatus.PARTIAL,
        errorMessage: errors.length > 0 ? errors.slice(0, 3).join('; ') : undefined,
        processedAt: new Date(),
      }),
    );

    this.logger.log(`Batch sync ${payload.syncId} complete: ${updated} updated, ${flaggedForReview} flagged, ${errors.length} errors`);

    return {
      syncId: payload.syncId,
      processed: payload.balances.length,
      updated,
      flaggedForReview,
      errors,
      duration,
    };
  }

  private async reconcileBalance(entry: BatchBalanceEntry): Promise<{ updated: boolean; flagged: boolean }> {
    let balance = await this.balanceRepo.findOne({
      where: { employeeId: entry.employeeId, locationId: entry.locationId, type: entry.type },
    });

    const hcmAvailable = entry.totalDays - entry.usedDays;
    const newChecksum = crypto
      .createHash('md5')
      .update(`${entry.totalDays}:${entry.usedDays}`)
      .digest('hex');

    let updated = false;
    let flagged = false;

    if (!balance) {
      balance = this.balanceRepo.create({
        employeeId: entry.employeeId,
        locationId: entry.locationId,
        type: entry.type,
        totalDays: entry.totalDays,
        usedDays: entry.usedDays,
        pendingDays: 0,
        availableDays: hcmAvailable,
        lastSyncedAt: new Date(),
        hcmChecksum: newChecksum,
      });
      await this.balanceRepo.save(balance);
      return { updated: true, flagged: false };
    }

    if (balance.hcmChecksum !== newChecksum) {
      this.logger.warn(
        `Balance drift for ${entry.employeeId}/${entry.locationId}/${entry.type}: ` +
        `local=${balance.totalDays}/${balance.usedDays} → hcm=${entry.totalDays}/${entry.usedDays}`,
      );

      // HCM wins on conflict
      const previousTotal = balance.totalDays;
      balance.totalDays = entry.totalDays;
      balance.usedDays = entry.usedDays;
      balance.availableDays = hcmAvailable - balance.pendingDays;
      balance.lastSyncedAt = new Date();
      balance.hcmChecksum = newChecksum;
      await this.balanceRepo.save(balance);
      updated = true;

      await this.syncEventRepo.save(
        this.syncEventRepo.create({
          type: SyncEventType.BATCH_SYNC,
          employeeId: entry.employeeId,
          locationId: entry.locationId,
          previousBalance: previousTotal,
          newBalance: entry.totalDays,
          triggeredBy: 'batch-endpoint',
          status: SyncEventStatus.SUCCESS,
          processedAt: new Date(),
        }),
      );
    }

    // Check for over-commitment: HCM says less available than what we've locked as pending
    if (hcmAvailable < balance.pendingDays) {
      this.logger.warn(
        `Over-commitment detected for ${entry.employeeId}/${entry.locationId}: ` +
        `HCM available=${hcmAvailable}, pending=${balance.pendingDays}`,
      );

      // Flag all PENDING requests for this combination
      await this.requestRepo.update(
        {
          employeeId: entry.employeeId,
          locationId: entry.locationId,
          type: entry.type,
          status: RequestStatus.PENDING,
        },
        { status: RequestStatus.PENDING_RETRY, hcmErrorMessage: 'Flagged by batch sync: insufficient HCM balance' },
      );

      await this.syncEventRepo.save(
        this.syncEventRepo.create({
          type: SyncEventType.RECONCILE_ALERT,
          employeeId: entry.employeeId,
          locationId: entry.locationId,
          previousBalance: balance.pendingDays,
          newBalance: hcmAvailable,
          triggeredBy: 'batch-endpoint',
          status: SyncEventStatus.PARTIAL,
          errorMessage: `HCM available (${hcmAvailable}) < pending (${balance.pendingDays})`,
          processedAt: new Date(),
        }),
      );

      flagged = true;
    }

    return { updated, flagged };
  }

  async getSyncStatus() {
    const lastBatchEvent = await this.syncEventRepo.findOne({
      where: { type: SyncEventType.BATCH_SYNC },
      order: { createdAt: 'DESC' },
    });

    const lastRealtimeEvent = await this.syncEventRepo.findOne({
      where: { type: SyncEventType.REALTIME_SYNC },
      order: { createdAt: 'DESC' },
    });

    const pendingOutbox = await this.requestRepo.count({ where: { hcmDecrementConfirmed: false, status: RequestStatus.APPROVED } });
    const flaggedRequests = await this.requestRepo.count({ where: { status: RequestStatus.PENDING_RETRY } });

    return {
      lastBatchSync: lastBatchEvent?.processedAt ?? null,
      lastRealtimeSync: lastRealtimeEvent?.processedAt ?? null,
      pendingOutboxEvents: pendingOutbox,
      flaggedRequests,
      syncIntervalMinutes: 15,
    };
  }
}
