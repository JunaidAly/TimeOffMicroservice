import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeOffRequest } from '../../time-off/entities/time-off-request.entity';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    @InjectRepository(TimeOffRequest)
    private readonly requestRepo: Repository<TimeOffRequest>,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['x-idempotency-key'];

    if (!idempotencyKey) {
      return next.handle();
    }

    const existing = await this.requestRepo.findOne({ where: { idempotencyKey } });
    if (existing) {
      this.logger.warn(`Duplicate idempotency key: ${idempotencyKey}`);
      throw new ConflictException({
        error: 'DUPLICATE_REQUEST',
        message: 'A request with this idempotency key already exists',
        existingRequestId: existing.id,
      });
    }

    return next.handle().pipe(
      tap(() => {
        this.logger.debug(`Processed idempotency key: ${idempotencyKey}`);
      }),
    );
  }
}
