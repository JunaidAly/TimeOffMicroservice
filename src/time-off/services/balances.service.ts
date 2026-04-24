import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeOffBalance } from '../entities/time-off-balance.entity';
import { TimeOffType } from '../entities/time-off-request.entity';
import { IHcmClient, HCM_CLIENT } from '../../hcm-sync/interfaces/hcm-client.interface';
import { Employee } from '../../common/entities/employee.entity';
import { Location } from '../../common/entities/location.entity';
import * as crypto from 'crypto';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class BalancesService {
  private readonly logger = new Logger(BalancesService.name);

  constructor(
    @InjectRepository(TimeOffBalance)
    private readonly balanceRepo: Repository<TimeOffBalance>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    @Inject(HCM_CLIENT)
    private readonly hcmClient: IHcmClient,
  ) {}

  async getBalancesForEmployee(
    employeeId: string,
    locationId?: string,
    fresh = true,
  ): Promise<{ employeeId: string; balances: BalanceView[] }> {
    const employee = await this.employeeRepo.findOne({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

    const query = this.balanceRepo.createQueryBuilder('b').where('b.employeeId = :employeeId', { employeeId });
    if (locationId) query.andWhere('b.locationId = :locationId', { locationId });

    const localBalances = await query.getMany();

    const results: BalanceView[] = [];

    for (const balance of localBalances) {
      if (fresh || this.isCacheStale(balance.lastSyncedAt)) {
        try {
          const hcmData = await this.hcmClient.getBalance(employeeId, balance.locationId, balance.type);
          await this.updateFromHcm(balance, hcmData);
          const loc = await this.locationRepo.findOne({ where: { id: balance.locationId } });
          results.push(this.toView(balance, loc?.name, 'hcm-realtime'));
        } catch (err) {
          this.logger.warn(`HCM fetch failed for ${employeeId}/${balance.locationId}, using cache: ${(err as Error).message}`);
          const loc = await this.locationRepo.findOne({ where: { id: balance.locationId } });
          results.push(this.toView(balance, loc?.name, 'cache-stale'));
        }
      } else {
        const loc = await this.locationRepo.findOne({ where: { id: balance.locationId } });
        results.push(this.toView(balance, loc?.name, 'cache'));
      }
    }

    return { employeeId, balances: results };
  }

  async getOrCreateBalance(
    employeeId: string,
    locationId: string,
    type: TimeOffType,
  ): Promise<TimeOffBalance> {
    let balance = await this.balanceRepo.findOne({ where: { employeeId, locationId, type } });

    if (!balance) {
      balance = this.balanceRepo.create({
        employeeId,
        locationId,
        type,
        totalDays: 0,
        usedDays: 0,
        pendingDays: 0,
        availableDays: 0,
      });
      await this.balanceRepo.save(balance);
    }

    return balance;
  }

  async syncFromHcm(
    employeeId: string,
    locationId: string,
    type: TimeOffType,
  ): Promise<TimeOffBalance> {
    const hcmData = await this.hcmClient.getBalance(employeeId, locationId, type);
    const balance = await this.getOrCreateBalance(employeeId, locationId, type);
    await this.updateFromHcm(balance, hcmData);
    return balance;
  }

  async addPendingDays(employeeId: string, locationId: string, type: TimeOffType, days: number): Promise<void> {
    const balance = await this.getOrCreateBalance(employeeId, locationId, type);
    balance.pendingDays += days;
    balance.availableDays = balance.totalDays - balance.usedDays - balance.pendingDays;
    await this.balanceRepo.save(balance);
  }

  async releasePendingDays(employeeId: string, locationId: string, type: TimeOffType, days: number): Promise<void> {
    const balance = await this.getOrCreateBalance(employeeId, locationId, type);
    balance.pendingDays = Math.max(0, balance.pendingDays - days);
    balance.availableDays = balance.totalDays - balance.usedDays - balance.pendingDays;
    await this.balanceRepo.save(balance);
  }

  async confirmUsedDays(employeeId: string, locationId: string, type: TimeOffType, days: number): Promise<void> {
    const balance = await this.getOrCreateBalance(employeeId, locationId, type);
    balance.pendingDays = Math.max(0, balance.pendingDays - days);
    balance.usedDays += days;
    balance.availableDays = balance.totalDays - balance.usedDays - balance.pendingDays;
    await this.balanceRepo.save(balance);
  }

  private async updateFromHcm(balance: TimeOffBalance, hcmData: {
    totalDays: number;
    usedDays: number;
    availableDays: number;
  }): Promise<void> {
    balance.totalDays = hcmData.totalDays;
    balance.availableDays = hcmData.availableDays - balance.pendingDays;
    balance.lastSyncedAt = new Date();
    balance.hcmChecksum = crypto
      .createHash('md5')
      .update(`${hcmData.totalDays}:${hcmData.usedDays}`)
      .digest('hex');
    await this.balanceRepo.save(balance);
  }

  private isCacheStale(lastSyncedAt: Date | null): boolean {
    if (!lastSyncedAt) return true;
    return Date.now() - lastSyncedAt.getTime() > CACHE_TTL_MS;
  }

  private toView(
    balance: TimeOffBalance,
    locationName?: string,
    source?: string,
  ): BalanceView {
    return {
      locationId: balance.locationId,
      locationName: locationName ?? balance.locationId,
      type: balance.type,
      totalDays: balance.totalDays,
      usedDays: balance.usedDays,
      pendingDays: balance.pendingDays,
      availableDays: balance.availableDays,
      lastSyncedAt: balance.lastSyncedAt,
      source: source ?? 'cache',
    };
  }
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
