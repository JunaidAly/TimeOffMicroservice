import { Repository } from 'typeorm';
import { TimeOffBalance } from '../../time-off/entities/time-off-balance.entity';
import { TimeOffRequest, TimeOffType } from '../../time-off/entities/time-off-request.entity';
import { SyncEvent } from '../entities/sync-event.entity';
export interface BatchBalanceEntry {
    employeeId: string;
    locationId: string;
    type: TimeOffType;
    totalDays: number;
    usedDays: number;
}
export interface BatchSyncPayload {
    syncId: string;
    generatedAt: string;
    balances: BatchBalanceEntry[];
}
export interface BatchSyncResult {
    syncId: string;
    processed: number;
    updated: number;
    flaggedForReview: number;
    errors: string[];
    duration: string;
}
export declare class BatchSyncService {
    private readonly balanceRepo;
    private readonly requestRepo;
    private readonly syncEventRepo;
    private readonly logger;
    private readonly STALE_BATCH_THRESHOLD_MS;
    constructor(balanceRepo: Repository<TimeOffBalance>, requestRepo: Repository<TimeOffRequest>, syncEventRepo: Repository<SyncEvent>);
    processBatch(payload: BatchSyncPayload): Promise<BatchSyncResult>;
    private reconcileBalance;
    getSyncStatus(): Promise<{
        lastBatchSync: Date | null;
        lastRealtimeSync: Date | null;
        pendingOutboxEvents: number;
        flaggedRequests: number;
        syncIntervalMinutes: number;
    }>;
}
