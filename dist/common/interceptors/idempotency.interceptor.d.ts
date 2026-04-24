import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Repository } from 'typeorm';
import { TimeOffRequest } from '../../time-off/entities/time-off-request.entity';
export declare class IdempotencyInterceptor implements NestInterceptor {
    private readonly requestRepo;
    private readonly logger;
    constructor(requestRepo: Repository<TimeOffRequest>);
    intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>>;
}
