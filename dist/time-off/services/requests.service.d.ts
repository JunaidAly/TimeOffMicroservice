import { Repository, DataSource } from 'typeorm';
import { TimeOffRequest } from '../entities/time-off-request.entity';
import { TimeOffBalance } from '../entities/time-off-balance.entity';
import { OutboxEvent } from '../../hcm-sync/entities/outbox-event.entity';
import { IHcmClient } from '../../hcm-sync/interfaces/hcm-client.interface';
import { BalancesService } from './balances.service';
import { BusinessDaysService } from './business-days.service';
import { CreateRequestDto } from '../dto/create-request.dto';
import { ApproveRejectDto } from '../dto/approve-reject.dto';
import { ListRequestsDto } from '../dto/list-requests.dto';
import { Employee } from '../../common/entities/employee.entity';
export declare class RequestsService {
    private readonly requestRepo;
    private readonly balanceRepo;
    private readonly outboxRepo;
    private readonly employeeRepo;
    private readonly hcmClient;
    private readonly balancesService;
    private readonly businessDaysService;
    private readonly dataSource;
    private readonly logger;
    constructor(requestRepo: Repository<TimeOffRequest>, balanceRepo: Repository<TimeOffBalance>, outboxRepo: Repository<OutboxEvent>, employeeRepo: Repository<Employee>, hcmClient: IHcmClient, balancesService: BalancesService, businessDaysService: BusinessDaysService, dataSource: DataSource);
    createRequest(dto: CreateRequestDto, idempotencyKey?: string): Promise<TimeOffRequest>;
    listRequests(dto: ListRequestsDto, requesterId: string, isManager: boolean): Promise<{
        data: TimeOffRequest[];
        total: number;
        page: number;
        limit: number;
    }>;
    getRequest(id: string): Promise<TimeOffRequest>;
    approveRequest(id: string, approver: Employee, dto: ApproveRejectDto): Promise<TimeOffRequest>;
    rejectRequest(id: string, approver: Employee, dto: ApproveRejectDto): Promise<TimeOffRequest>;
    cancelRequest(id: string, employeeId: string): Promise<TimeOffRequest>;
}
