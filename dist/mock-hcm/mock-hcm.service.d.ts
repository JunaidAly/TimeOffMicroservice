import { TimeOffType } from '../time-off/entities/time-off-request.entity';
export interface HcmBalanceRecord {
    employeeId: string;
    locationId: string;
    type: TimeOffType;
    totalDays: number;
    usedDays: number;
    availableDays: number;
    lastModifiedAt: Date;
}
export declare class MockHcmService {
    private readonly logger;
    private readonly store;
    private readonly idempotencyStore;
    constructor();
    private seed;
    private key;
    getBalance(employeeId: string, locationId: string, type: TimeOffType): HcmBalanceRecord;
    updateBalance(employeeId: string, locationId: string, type: TimeOffType, delta: number, idempotencyKey: string): HcmBalanceRecord;
    getAllBalances(): HcmBalanceRecord[];
    simulateAnniversaryBonus(employeeId: string, bonusDays: number): HcmBalanceRecord[];
    simulateYearlyRefresh(): {
        refreshed: number;
    };
    buildBatchPayload(): object;
}
