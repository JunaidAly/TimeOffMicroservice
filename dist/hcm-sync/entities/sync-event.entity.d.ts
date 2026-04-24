export declare enum SyncEventType {
    BATCH_SYNC = "BATCH_SYNC",
    REALTIME_SYNC = "REALTIME_SYNC",
    ANNIVERSARY_BONUS = "ANNIVERSARY_BONUS",
    YEARLY_REFRESH = "YEARLY_REFRESH",
    MANUAL_RECONCILE = "MANUAL_RECONCILE",
    RECONCILE_ALERT = "RECONCILE_ALERT"
}
export declare enum SyncEventStatus {
    SUCCESS = "SUCCESS",
    PARTIAL = "PARTIAL",
    FAILED = "FAILED"
}
export declare class SyncEvent {
    id: string;
    type: SyncEventType;
    employeeId: string | null;
    locationId: string | null;
    previousBalance: number | null;
    newBalance: number | null;
    triggeredBy: string;
    status: SyncEventStatus;
    errorMessage: string | null;
    processedAt: Date | null;
    createdAt: Date;
}
