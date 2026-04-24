import { RequestStatus } from '../entities/time-off-request.entity';
export declare class ListRequestsDto {
    status?: RequestStatus;
    employeeId?: string;
    page?: number;
    limit?: number;
}
