import { TimeOffType } from '../../time-off/entities/time-off-request.entity';

export interface HcmBalance {
  employeeId: string;
  locationId: string;
  type: TimeOffType;
  totalDays: number;
  usedDays: number;
  availableDays: number;
}

export interface HcmUpdateResult {
  employeeId: string;
  locationId: string;
  type: TimeOffType;
  newAvailableDays: number;
  newUsedDays: number;
}

export const HCM_CLIENT = 'HCM_CLIENT';

export interface IHcmClient {
  getBalance(employeeId: string, locationId: string, type: TimeOffType): Promise<HcmBalance>;
  updateBalance(
    employeeId: string,
    locationId: string,
    type: TimeOffType,
    delta: number,
    idempotencyKey: string,
  ): Promise<HcmUpdateResult>;
}
