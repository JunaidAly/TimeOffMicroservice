import { BatchSyncService, BatchSyncPayload } from './services/batch-sync.service';
export declare class HcmSyncController {
    private readonly batchSyncService;
    constructor(batchSyncService: BatchSyncService);
    processBatch(payload: BatchSyncPayload): Promise<import("./services/batch-sync.service").BatchSyncResult>;
    getStatus(): Promise<{
        lastBatchSync: Date | null;
        lastRealtimeSync: Date | null;
        pendingOutboxEvents: number;
        flaggedRequests: number;
        syncIntervalMinutes: number;
    }>;
}
