import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEvent } from './entities/outbox-event.entity';
import { SyncEvent } from './entities/sync-event.entity';
import { HcmClientService } from './services/hcm-client.service';
import { BatchSyncService } from './services/batch-sync.service';
import { OutboxWorkerService } from './services/outbox-worker.service';
import { SyncSchedulerService } from './services/sync-scheduler.service';
import { HcmSyncController } from './hcm-sync.controller';
import { TimeOffRequest } from '../time-off/entities/time-off-request.entity';
import { TimeOffBalance } from '../time-off/entities/time-off-balance.entity';
import { HCM_CLIENT } from './interfaces/hcm-client.interface';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboxEvent, SyncEvent, TimeOffRequest, TimeOffBalance]),
  ],
  controllers: [HcmSyncController],
  providers: [
    {
      provide: HCM_CLIENT,
      useClass: HcmClientService,
    },
    BatchSyncService,
    OutboxWorkerService,
    SyncSchedulerService,
  ],
  exports: [HCM_CLIENT, BatchSyncService],
})
export class HcmSyncModule {}
