import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RequestsService } from '../services/requests.service';
import { CreateRequestDto } from '../dto/create-request.dto';
import { ApproveRejectDto } from '../dto/approve-reject.dto';
import { ListRequestsDto } from '../dto/list-requests.dto';
import { ManagerGuard } from '../../common/guards/manager.guard';
import { EmployeeRole } from '../../common/entities/employee.entity';

@Controller('api/v1/time-off/requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateRequestDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.requestsService.createRequest(dto, idempotencyKey);
  }

  @Get()
  async list(
    @Query() query: ListRequestsDto,
    @Headers('x-employee-id') requesterId: string,
    @Headers('x-manager-id') managerId: string,
  ) {
    const isManager = !!managerId;
    const actorId = managerId || requesterId;
    return this.requestsService.listRequests(query, actorId, isManager);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.requestsService.getRequest(id);
  }

  @Patch(':id/approve')
  @UseGuards(ManagerGuard)
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
    @Request() req: { manager: import('../../common/entities/employee.entity').Employee },
  ) {
    return this.requestsService.approveRequest(id, req.manager, dto);
  }

  @Patch(':id/reject')
  @UseGuards(ManagerGuard)
  async reject(
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
    @Request() req: { manager: import('../../common/entities/employee.entity').Employee },
  ) {
    return this.requestsService.rejectRequest(id, req.manager, dto);
  }

  @Patch(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Headers('x-employee-id') employeeId: string,
  ) {
    return this.requestsService.cancelRequest(id, employeeId);
  }
}
