import { Repository } from 'typeorm';
import { TimeOffRequest } from '../../time-off/entities/time-off-request.entity';
import { TimeOffBalance } from '../../time-off/entities/time-off-balance.entity';
import { SyncEvent } from '../entities/sync-event.entity';
import { IHcmClient } from '../interfaces/hcm-client.interface';
export declare class SyncSchedulerService {
    private readonly requestRepo;
    private readonly balanceRepo;
    private readonly syncEventRepo;
    private readonly hcmClient;
    private readonly logger;
    constructor(requestRepo: Repository<TimeOffRequest>, balanceRepo: Repository<TimeOffBalance>, syncEventRepo: Repository<SyncEvent>, hcmClient: IHcmClient);
    syncActivePendingBalances(): Promise<void>;
}
