import { BusinessDaysService } from './business-days.service';
import { BadRequestException } from '@nestjs/common';

describe('BusinessDaysService', () => {
  let service: BusinessDaysService;

  beforeEach(() => {
    service = new BusinessDaysService();
  });

  describe('calculate', () => {
    it('counts a single Monday as 1 business day', () => {
      expect(service.calculate('2026-04-27', '2026-04-27')).toBe(1); // Monday
    });

    it('returns 0 for a single Saturday', () => {
      expect(service.calculate('2026-04-25', '2026-04-25')).toBe(0); // Saturday
    });

    it('returns 0 for a single Sunday', () => {
      expect(service.calculate('2026-04-26', '2026-04-26')).toBe(0); // Sunday
    });

    it('counts Mon–Fri as 5 business days', () => {
      expect(service.calculate('2026-04-27', '2026-05-01')).toBe(5);
    });

    it('counts Mon–Mon spanning a weekend as 6 business days', () => {
      expect(service.calculate('2026-04-27', '2026-05-04')).toBe(6);
    });

    it('counts a full two-week span correctly', () => {
      expect(service.calculate('2026-04-27', '2026-05-08')).toBe(10);
    });

    it('throws BadRequestException when start > end', () => {
      expect(() => service.calculate('2026-05-01', '2026-04-27')).toThrow(BadRequestException);
    });

    it('throws BadRequestException for invalid date format', () => {
      expect(() => service.calculate('not-a-date', '2026-05-01')).toThrow(BadRequestException);
    });

    it('handles same start and end on a weekday', () => {
      expect(service.calculate('2026-05-01', '2026-05-01')).toBe(1); // Friday
    });
  });
});
