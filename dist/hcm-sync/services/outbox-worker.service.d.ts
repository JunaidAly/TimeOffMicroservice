import { Repository } from 'typeorm';
import { OutboxEvent } from '../entities/outbox-event.entity';
import { TimeOffRequest } from '../../time-off/entities/time-off-request.entity';
import { TimeOffBalance } from '../../time-off/entities/time-off-balance.entity';
import { IHcmClient } from '../interfaces/hcm-client.interface';
export declare class OutboxWorkerService {
    private readonly outboxRepo;
    private readonly requestRepo;
    private readonly balanceRepo;
    private readonly hcmClient;
    private readonly logger;
    private isRunning;
    constructor(outboxRepo: Repository<OutboxEvent>, requestRepo: Repository<TimeOffRequest>, balanceRepo: Repository<TimeOffBalance>, hcmClient: IHcmClient);
    processOutbox(): Promise<void>;
    private processEvent;
}
