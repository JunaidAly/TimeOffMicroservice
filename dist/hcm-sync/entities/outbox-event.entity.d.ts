export declare enum OutboxStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    DONE = "DONE",
    FAILED = "FAILED"
}
export declare class OutboxEvent {
    id: string;
    aggregateId: string;
    aggregateType: string;
    eventType: string;
    payload: Record<string, unknown>;
    status: OutboxStatus;
    retryCount: number;
    lastAttemptAt: Date;
    createdAt: Date;
}
