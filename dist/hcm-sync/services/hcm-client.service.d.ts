import { IHcmClient, HcmBalance, HcmUpdateResult } from '../interfaces/hcm-client.interface';
import { TimeOffType } from '../../time-off/entities/time-off-request.entity';
export declare class HcmClientService implements IHcmClient {
    private readonly logger;
    getBalance(employeeId: string, locationId: string, type: TimeOffType): Promise<HcmBalance>;
    updateBalance(employeeId: string, locationId: string, type: TimeOffType, delta: number, idempotencyKey: string): Promise<HcmUpdateResult>;
    private withRetry;
    private isRetryableError;
    private fetchJson;
}
