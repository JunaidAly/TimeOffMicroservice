import { TimeOffType } from './time-off-request.entity';
export declare class TimeOffBalance {
    id: string;
    employeeId: string;
    locationId: string;
    type: TimeOffType;
    totalDays: number;
    usedDays: number;
    pendingDays: number;
    availableDays: number;
    lastSyncedAt: Date | null;
    hcmChecksum: string | null;
    createdAt: Date;
    updatedAt: Date;
}
