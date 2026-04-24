import { Controller, Get, Param, Query } from '@nestjs/common';
import { BalancesService } from '../services/balances.service';

@Controller('api/v1/time-off/balances')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get(':employeeId')
  async getBalances(
    @Param('employeeId') employeeId: string,
    @Query('locationId') locationId?: string,
    @Query('fresh') fresh?: string,
  ) {
    const useFresh = fresh !== 'false';
    return this.balancesService.getBalancesForEmployee(employeeId, locationId, useFresh);
  }
}
