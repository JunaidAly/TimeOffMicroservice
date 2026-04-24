import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Employee } from './common/entities/employee.entity';
import { Location } from './common/entities/location.entity';
import { TimeOffRequest } from './time-off/entities/time-off-request.entity';
import { TimeOffBalance } from './time-off/entities/time-off-balance.entity';
import { OutboxEvent } from './hcm-sync/entities/outbox-event.entity';
import { SyncEvent } from './hcm-sync/entities/sync-event.entity';
import { TimeOffModule } from './time-off/time-off.module';
import { HcmSyncModule } from './hcm-sync/hcm-sync.module';
import { MockHcmModule } from './mock-hcm/mock-hcm.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_PATH || 'timeoff.db',
      entities: [Employee, Location, TimeOffRequest, TimeOffBalance, OutboxEvent, SyncEvent],
      synchronize: true,
      logging: process.env.NODE_ENV === 'development',
    }),
    ScheduleModule.forRoot(),
    TimeOffModule,
    HcmSyncModule,
    MockHcmModule,
  ],
})
export class AppModule {}
