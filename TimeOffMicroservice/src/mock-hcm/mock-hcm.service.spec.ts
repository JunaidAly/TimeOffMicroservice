import { MockHcmService } from './mock-hcm.service';
import { TimeOffType } from '../time-off/entities/time-off-request.entity';
import { NotFoundException, BadRequestException, UnprocessableEntityException } from '@nestjs/common';

describe('MockHcmService', () => {
  let service: MockHcmService;

  beforeEach(() => {
    service = new MockHcmService();
  });

  describe('getBalance', () => {
    it('returns a seeded balance', () => {
      const balance = service.getBalance('emp-001', 'loc-nyc', TimeOffType.VACATION);
      expect(balance.employeeId).toBe('emp-001');
      expect(balance.locationId).toBe('loc-nyc');
      expect(balance.type).toBe(TimeOffType.VACATION);
      expect(balance.totalDays).toBe(15);
      expect(balance.availableDays).toBe(15);
    });

    it('throws NotFoundException for unknown employee', () => {
      expect(() => service.getBalance('unknown', 'loc-nyc', TimeOffType.VACATION)).toThrow(NotFoundException);
    });

    it('throws BadRequestException for invalid type', () => {
      expect(() => service.getBalance('emp-001', 'loc-nyc', 'INVALID' as TimeOffType)).toThrow(BadRequestException);
    });
  });

  describe('updateBalance', () => {
    it('decrements available days correctly', () => {
      const result = service.updateBalance('emp-001', 'loc-nyc', TimeOffType.VACATION, -3, 'key-1');
      expect(result.availableDays).toBe(12);
      expect(result.usedDays).toBe(3);
    });

    it('increments available days correctly', () => {
      service.updateBalance('emp-001', 'loc-nyc', TimeOffType.VACATION, -5, 'key-dec');
      const result = service.updateBalance('emp-001', 'loc-nyc', TimeOffType.VACATION, 2, 'key-inc');
      expect(result.availableDays).toBe(12);
    });

    it('throws UnprocessableEntityException when balance insufficient', () => {
      expect(() =>
        service.updateBalance('emp-001', 'loc-nyc', TimeOffType.VACATION, -20, 'key-over'),
      ).toThrow(UnprocessableEntityException);
    });

    it('is idempotent — replays cached result for same key', () => {
      const first = service.updateBalance('emp-001', 'loc-nyc', TimeOffType.VACATION, -3, 'idem-1');
      const second = service.updateBalance('emp-001', 'loc-nyc', TimeOffType.VACATION, -3, 'idem-1');
      expect(first.availableDays).toBe(second.availableDays);
      // Verify balance wasn't double-decremented
      const current = service.getBalance('emp-001', 'loc-nyc', TimeOffType.VACATION);
      expect(current.availableDays).toBe(12); // only decremented once
    });

    it('throws NotFoundException for unknown record', () => {
      expect(() =>
        service.updateBalance('unknown', 'loc-nyc', TimeOffType.VACATION, -1, 'key-x'),
      ).toThrow(NotFoundException);
    });
  });

  describe('simulateAnniversaryBonus', () => {
    it('adds bonus days to all vacation balances for an employee', () => {
      service.simulateAnniversaryBonus('emp-001', 3);
      const nyc = service.getBalance('emp-001', 'loc-nyc', TimeOffType.VACATION);
      const lon = service.getBalance('emp-001', 'loc-lon', TimeOffType.VACATION);
      expect(nyc.totalDays).toBe(18);
      expect(nyc.availableDays).toBe(18);
      expect(lon.totalDays).toBe(18);
    });

    it('does not affect SICK or PERSONAL balances', () => {
      service.simulateAnniversaryBonus('emp-001', 3);
      const sick = service.getBalance('emp-001', 'loc-nyc', TimeOffType.SICK);
      expect(sick.totalDays).toBe(10); // unchanged
    });

    it('throws NotFoundException for unknown employee', () => {
      expect(() => service.simulateAnniversaryBonus('unknown', 3)).toThrow(NotFoundException);
    });
  });

  describe('simulateYearlyRefresh', () => {
    it('resets all balances to defaults', () => {
      service.updateBalance('emp-001', 'loc-nyc', TimeOffType.VACATION, -10, 'key-pre');
      const result = service.simulateYearlyRefresh();
      expect(result.refreshed).toBeGreaterThan(0);
      const balance = service.getBalance('emp-001', 'loc-nyc', TimeOffType.VACATION);
      expect(balance.availableDays).toBe(15);
      expect(balance.usedDays).toBe(0);
    });
  });

  describe('buildBatchPayload', () => {
    it('includes all seeded balances', () => {
      const payload = service.buildBatchPayload() as {
        syncId: string;
        generatedAt: string;
        balances: unknown[];
      };
      expect(payload.syncId).toMatch(/^batch-/);
      expect(Array.isArray(payload.balances)).toBe(true);
      expect(payload.balances.length).toBeGreaterThan(0);
    });
  });
});
