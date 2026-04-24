import { Repository } from 'typeorm';
import { TimeOffBalance } from '../entities/time-off-balance.entity';
import { TimeOffType } from '../entities/time-off-request.entity';
import { IHcmClient } from '../../hcm-sync/interfaces/hcm-client.interface';
import { Employee } from '../../common/entities/employee.entity';
import { Location } from '../../common/entities/location.entity';
export declare class BalancesService {
    private readonly balanceRepo;
    private readonly employeeRepo;
    private readonly locationRepo;
    private readonly hcmClient;
    private readonly logger;
    constructor(balanceRepo: Repository<TimeOffBalance>, employeeRepo: Repository<Employee>, locationRepo: Repository<Location>, hcmClient: IHcmClient);
    getBalancesForEmployee(employeeId: string, locationId?: string, fresh?: boolean): Promise<{
        employeeId: string;
        balances: BalanceView[];
    }>;
    getOrCreateBalance(employeeId: string, locationId: string, type: TimeOffType): Promise<TimeOffBalance>;
    syncFromHcm(employeeId: string, locationId: string, type: TimeOffType): Promise<TimeOffBalance>;
    addPendingDays(employeeId: string, locationId: string, type: TimeOffType, days: number): Promise<void>;
    releasePendingDays(employeeId: string, locationId: string, type: TimeOffType, days: number): Promise<void>;
    confirmUsedDays(employeeId: string, locationId: string, type: TimeOffType, days: number): Promise<void>;
    private updateFromHcm;
    private isCacheStale;
    private toView;
}
export interface BalanceView {
    locationId: string;
    locationName: string;
    type: TimeOffType;
    totalDays: number;
    usedDays: number;
    pendingDays: number;
    availableDays: number;
    lastSyncedAt: Date | null;
    source: string;
}
