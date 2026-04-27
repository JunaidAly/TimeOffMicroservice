import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { BatchSyncService, BatchSyncPayload } from './services/batch-sync.service';

@Controller('api/v1/hcm-sync')
export class HcmSyncController {
  constructor(private readonly batchSyncService: BatchSyncService) {}

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  async processBatch(@Body() payload: BatchSyncPayload) {
    return this.batchSyncService.processBatch(payload);
  }

  @Get('status')
  async getStatus() {
    return this.batchSyncService.getSyncStatus();
  }
}
