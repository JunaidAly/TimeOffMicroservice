import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
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

@Injectable()
export class MockHcmService {
  private readonly logger = new Logger(MockHcmService.name);

  // In-memory store: key = `${employeeId}:${locationId}:${type}`
  private readonly store = new Map<string, HcmBalanceRecord>();
  // Idempotency key store
  private readonly idempotencyStore = new Map<string, HcmBalanceRecord>();

  constructor() {
    this.seed();
  }

  private seed(): void {
    const employees = ['mgr-001', 'emp-001', 'emp-002', 'emp-003', 'emp-004'];
    const locations = ['loc-nyc', 'loc-lon', 'loc-syd'];
    const types = [TimeOffType.VACATION, TimeOffType.SICK, TimeOffType.PERSONAL];
    const defaults: Record<TimeOffType, number> = {
      [TimeOffType.VACATION]: 15,
      [TimeOffType.SICK]: 10,
      [TimeOffType.PERSONAL]: 5,
    };

    for (const emp of employees) {
      for (const loc of locations) {
        for (const type of types) {
          const totalDays = defaults[type];
          this.store.set(this.key(emp, loc, type), {
            employeeId: emp,
            locationId: loc,
            type,
            totalDays,
            usedDays: 0,
            availableDays: totalDays,
            lastModifiedAt: new Date(),
          });
        }
      }
    }

    this.logger.log(`Mock HCM seeded with ${this.store.size} balance records`);
  }

  private key(employeeId: string, locationId: string, type: TimeOffType): string {
    return `${employeeId}:${locationId}:${type}`;
  }

  getBalance(employeeId: string, locationId: string, type: TimeOffType): HcmBalanceRecord {
    const validTypes = Object.values(TimeOffType);
    if (!validTypes.includes(type)) {
      throw new BadRequestException(`Invalid type: ${type}. Must be one of ${validTypes.join(', ')}`);
    }

    const record = this.store.get(this.key(employeeId, locationId, type));
    if (!record) {
      throw new NotFoundException(
        `No HCM balance for employee=${employeeId}, location=${locationId}, type=${type}`,
      );
    }
    return { ...record };
  }

  updateBalance(
    employeeId: string,
    locationId: string,
    type: TimeOffType,
    delta: number,
    idempotencyKey: string,
  ): HcmBalanceRecord {
    // Idempotency: replay cached result
    const cached = this.idempotencyStore.get(idempotencyKey);
    if (cached) {
      this.logger.debug(`Idempotency replay for key ${idempotencyKey}`);
      return { ...cached };
    }

    const record = this.store.get(this.key(employeeId, locationId, type));
    if (!record) {
      throw new NotFoundException(
        `No HCM balance for employee=${employeeId}, location=${locationId}, type=${type}`,
      );
    }

    const newAvailable = record.availableDays + delta;
    if (newAvailable < 0) {
      throw new UnprocessableEntityException({
        error: 'INSUFFICIENT_BALANCE',
        message: `Cannot decrement: available=${record.availableDays}, delta=${delta}`,
        details: { available: record.availableDays, delta },
      });
    }

    record.availableDays = newAvailable;
    record.usedDays = record.usedDays + (delta < 0 ? Math.abs(delta) : -delta);
    record.lastModifiedAt = new Date();

    this.store.set(this.key(employeeId, locationId, type), record);
    this.idempotencyStore.set(idempotencyKey, { ...record });

    this.logger.log(`HCM balance updated: ${employeeId}/${locationId}/${type} delta=${delta} → available=${record.availableDays}`);
    return { ...record };
  }

  getAllBalances(): HcmBalanceRecord[] {
    return Array.from(this.store.values()).map((r) => ({ ...r }));
  }

  simulateAnniversaryBonus(employeeId: string, bonusDays: number): HcmBalanceRecord[] {
    const affected: HcmBalanceRecord[] = [];

    for (const [k, record] of this.store.entries()) {
      if (record.employeeId === employeeId && record.type === TimeOffType.VACATION) {
        record.totalDays += bonusDays;
        record.availableDays += bonusDays;
        record.lastModifiedAt = new Date();
        this.store.set(k, record);
        affected.push({ ...record });

        this.logger.log(`Anniversary bonus: +${bonusDays}d for ${employeeId}/${record.locationId}`);
      }
    }

    if (affected.length === 0) {
      throw new NotFoundException(`No VACATION balances found for employee ${employeeId}`);
    }

    return affected;
  }

  simulateYearlyRefresh(): { refreshed: number } {
    const defaults: Record<TimeOffType, number> = {
      [TimeOffType.VACATION]: 15,
      [TimeOffType.SICK]: 10,
      [TimeOffType.PERSONAL]: 5,
    };

    let refreshed = 0;
    for (const [k, record] of this.store.entries()) {
      record.totalDays = defaults[record.type];
      record.usedDays = 0;
      record.availableDays = record.totalDays;
      record.lastModifiedAt = new Date();
      this.store.set(k, record);
      refreshed++;
    }

    this.logger.log(`Yearly refresh: reset ${refreshed} balance records`);
    return { refreshed };
  }

  // Build a batch-push payload representing all current balances
  buildBatchPayload(): object {
    const balances = this.getAllBalances().map((r) => ({
      employeeId: r.employeeId,
      locationId: r.locationId,
      type: r.type,
      totalDays: r.totalDays,
      usedDays: r.usedDays,
    }));

    return {
      syncId: `batch-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      balances,
    };
  }
}
