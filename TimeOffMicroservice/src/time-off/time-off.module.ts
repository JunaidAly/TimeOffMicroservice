import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeOffRequest } from './entities/time-off-request.entity';
import { TimeOffBalance } from './entities/time-off-balance.entity';
import { RequestsService } from './services/requests.service';
import { BalancesService } from './services/balances.service';
import { BusinessDaysService } from './services/business-days.service';
import { RequestsController } from './controllers/requests.controller';
import { BalancesController } from './controllers/balances.controller';
import { Employee } from '../common/entities/employee.entity';
import { Location } from '../common/entities/location.entity';
import { OutboxEvent } from '../hcm-sync/entities/outbox-event.entity';
import { HcmSyncModule } from '../hcm-sync/hcm-sync.module';
import { ManagerGuard } from '../common/guards/manager.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimeOffRequest, TimeOffBalance, Employee, Location, OutboxEvent]),
    HcmSyncModule,
  ],
  controllers: [RequestsController, BalancesController],
  providers: [RequestsService, BalancesService, BusinessDaysService, ManagerGuard],
  exports: [RequestsService, BalancesService, BusinessDaysService],
})
export class TimeOffModule {}
