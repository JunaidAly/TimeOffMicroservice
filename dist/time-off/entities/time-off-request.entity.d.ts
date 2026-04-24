export declare enum TimeOffType {
    VACATION = "VACATION",
    SICK = "SICK",
    PERSONAL = "PERSONAL"
}
export declare enum RequestStatus {
    DRAFT = "DRAFT",
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED",
    PENDING_RETRY = "PENDING_RETRY"
}
export declare class TimeOffRequest {
    id: string;
    employeeId: string;
    locationId: string;
    type: TimeOffType;
    startDate: string;
    endDate: string;
    daysRequested: number;
    status: RequestStatus;
    notes: string | null;
    managerId: string | null;
    managerNotes: string | null;
    idempotencyKey: string | null;
    hcmDecrementConfirmed: boolean;
    hcmErrorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
    approvedAt: Date | null;
}
