import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { MockHcmService } from './mock-hcm.service';
import { TimeOffType } from '../time-off/entities/time-off-request.entity';

@Controller('mock-hcm')
export class MockHcmController {
  constructor(private readonly mockHcmService: MockHcmService) {}

  @Get('balances/:employeeId/:locationId/:type')
  getBalance(
    @Param('employeeId') employeeId: string,
    @Param('locationId') locationId: string,
    @Param('type') type: string,
  ) {
    return this.mockHcmService.getBalance(employeeId, locationId, type as TimeOffType);
  }

  @Put('balances/:employeeId/:locationId/:type')
  updateBalance(
    @Param('employeeId') employeeId: string,
    @Param('locationId') locationId: string,
    @Param('type') type: string,
    @Body() body: { delta: number },
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) throw new BadRequestException('X-Idempotency-Key header is required');
    if (body.delta === undefined) throw new BadRequestException('delta is required');
    return this.mockHcmService.updateBalance(
      employeeId,
      locationId,
      type as TimeOffType,
      body.delta,
      idempotencyKey,
    );
  }

  @Get('balances')
  getAllBalances() {
    return this.mockHcmService.getAllBalances();
  }

  @Post('batch-push')
  getBatchPayload() {
    return this.mockHcmService.buildBatchPayload();
  }

  @Post('simulate/anniversary-bonus')
  simulateAnniversaryBonus(@Body() body: { employeeId: string; bonusDays: number }) {
    if (!body.employeeId || !body.bonusDays) {
      throw new BadRequestException('employeeId and bonusDays are required');
    }
    return this.mockHcmService.simulateAnniversaryBonus(body.employeeId, body.bonusDays);
  }

  @Post('simulate/yearly-refresh')
  simulateYearlyRefresh() {
    return this.mockHcmService.simulateYearlyRefresh();
  }
}
