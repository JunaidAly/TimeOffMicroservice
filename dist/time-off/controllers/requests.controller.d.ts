import { RequestsService } from '../services/requests.service';
import { CreateRequestDto } from '../dto/create-request.dto';
import { ApproveRejectDto } from '../dto/approve-reject.dto';
import { ListRequestsDto } from '../dto/list-requests.dto';
export declare class RequestsController {
    private readonly requestsService;
    constructor(requestsService: RequestsService);
    create(dto: CreateRequestDto, idempotencyKey?: string): Promise<import("../entities/time-off-request.entity").TimeOffRequest>;
    list(query: ListRequestsDto, requesterId: string, managerId: string): Promise<{
        data: import("../entities/time-off-request.entity").TimeOffRequest[];
        total: number;
        page: number;
        limit: number;
    }>;
    getOne(id: string): Promise<import("../entities/time-off-request.entity").TimeOffRequest>;
    approve(id: string, dto: ApproveRejectDto, req: {
        manager: import('../../common/entities/employee.entity').Employee;
    }): Promise<import("../entities/time-off-request.entity").TimeOffRequest>;
    reject(id: string, dto: ApproveRejectDto, req: {
        manager: import('../../common/entities/employee.entity').Employee;
    }): Promise<import("../entities/time-off-request.entity").TimeOffRequest>;
    cancel(id: string, employeeId: string): Promise<import("../entities/time-off-request.entity").TimeOffRequest>;
}
