import { TimeOffType } from '../entities/time-off-request.entity';
export declare class CreateRequestDto {
    employeeId: string;
    locationId: string;
    type: TimeOffType;
    startDate: string;
    endDate: string;
    notes?: string;
}
