import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { TimeOffRequest, RequestStatus } from '../../time-off/entities/time-off-request.entity';
import { TimeOffBalance } from '../../time-off/entities/time-off-balance.entity';
import { SyncEvent, SyncEventType, SyncEventStatus } from '../entities/sync-event.entity';
import { IHcmClient, HCM_CLIENT } from '../interfaces/hcm-client.interface';
import * as crypto from 'crypto';

@Injectable()
export class SyncSchedulerService {
  private readonly logger = new Logger(SyncSchedulerService.name);

  constructor(
    @InjectRepository(TimeOffRequest)
    private readonly requestRepo: Repository<TimeOffRequest>,
    @InjectRepository(TimeOffBalance)
    private readonly balanceRepo: Repository<TimeOffBalance>,
    @InjectRepository(SyncEvent)
    private readonly syncEventRepo: Repository<SyncEvent>,
    @Inject(HCM_CLIENT)
    private readonly hcmClient: IHcmClient,
  ) {}

  // Every 15 minutes — sync balances for employees with active PENDING requests
  @Cron('0 */15 * * * *')
  async syncActivePendingBalances(): Promise<void> {
    this.logger.debug('Running scheduled balance sync for active pending requests');

    const pendingRequests = await this.requestRepo.find({
      where: { status: RequestStatus.PENDING },
    });

    // Deduplicate by (employeeId, locationId, type)
    const seen = new Set<string>();
    const toSync = pendingRequests.filter((r) => {
      const key = `${r.employeeId}:${r.locationId}:${r.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    for (const req of toSync) {
      try {
        const hcmBalance = await this.hcmClient.getBalance(req.employeeId, req.locationId, req.type);
        const balance = await this.balanceRepo.findOne({
          where: { employeeId: req.employeeId, locationId: req.locationId, type: req.type },
        });

        if (!balance) continue;

        const newChecksum = crypto
          .createHash('md5')
          .update(`${hcmBalance.totalDays}:${hcmBalance.usedDays}`)
          .digest('hex');

        if (balance.hcmChecksum !== newChecksum) {
          balance.totalDays = hcmBalance.totalDays;
          balance.availableDays = hcmBalance.availableDays - balance.pendingDays;
          balance.lastSyncedAt = new Date();
          balance.hcmChecksum = newChecksum;
          await this.balanceRepo.save(balance);

          await this.syncEventRepo.save(
            this.syncEventRepo.create({
              type: SyncEventType.REALTIME_SYNC,
              employeeId: req.employeeId,
              locationId: req.locationId,
              newBalance: hcmBalance.totalDays,
              triggeredBy: 'scheduler',
              status: SyncEventStatus.SUCCESS,
              processedAt: new Date(),
            }),
          );

          this.logger.log(`Scheduler updated balance for ${req.employeeId}/${req.locationId}`);
        }
      } catch (err) {
        this.logger.warn(`Scheduler sync failed for ${req.employeeId}/${req.locationId}: ${(err as Error).message}`);
      }
    }
  }
}
