import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { TimeOffRequest, RequestStatus, TimeOffType } from '../entities/time-off-request.entity';
import { TimeOffBalance } from '../entities/time-off-balance.entity';
import { OutboxEvent } from '../../hcm-sync/entities/outbox-event.entity';
import { Employee, EmployeeRole } from '../../common/entities/employee.entity';
import { HCM_CLIENT } from '../../hcm-sync/interfaces/hcm-client.interface';
import { BalancesService } from './balances.service';
import { BusinessDaysService } from './business-days.service';

const mockEmployee: Employee = {
  id: 'emp-001',
  name: 'Alice',
  email: 'alice@test.com',
  managerId: 'mgr-001',
  role: EmployeeRole.EMPLOYEE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockManager: Employee = {
  id: 'mgr-001',
  name: 'Sarah',
  email: 'sarah@test.com',
  managerId: null,
  role: EmployeeRole.MANAGER,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockBalance: TimeOffBalance = {
  id: 'bal-1',
  employeeId: 'emp-001',
  locationId: 'loc-nyc',
  type: TimeOffType.VACATION,
  totalDays: 15,
  usedDays: 0,
  pendingDays: 0,
  availableDays: 15,
  lastSyncedAt: new Date(),
  hcmChecksum: 'abc',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRequest: TimeOffRequest = {
  id: 'req-1',
  employeeId: 'emp-001',
  locationId: 'loc-nyc',
  type: TimeOffType.VACATION,
  startDate: '2026-05-01',
  endDate: '2026-05-05',
  daysRequested: 3,
  status: RequestStatus.PENDING,
  notes: null,
  managerId: null,
  managerNotes: null,
  idempotencyKey: 'idem-1',
  hcmDecrementConfirmed: false,
  hcmErrorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  approvedAt: null,
};

const makeTransactionManager = (overrides: Record<string, jest.Mock> = {}) => ({
  create: jest.fn((_entity: unknown, data: unknown) => data),
  save: jest.fn((_entity: unknown, data: unknown) => Promise.resolve(data)),
  findOne: jest.fn(),
  update: jest.fn(),
  increment: jest.fn().mockResolvedValue({}),
  ...overrides,
});

describe('RequestsService', () => {
  let service: RequestsService;
  let requestRepo: jest.Mocked<any>;
  let balanceRepo: jest.Mocked<any>;
  let outboxRepo: jest.Mocked<any>;
  let employeeRepo: jest.Mocked<any>;
  let hcmClient: jest.Mocked<any>;
  let balancesService: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;

  beforeEach(async () => {
    requestRepo = { findOne: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() };
    balanceRepo = { findOne: jest.fn(), save: jest.fn() };
    outboxRepo = { create: jest.fn((d: unknown) => d), save: jest.fn() };
    employeeRepo = { findOne: jest.fn() };
    hcmClient = { getBalance: jest.fn(), updateBalance: jest.fn() };
    balancesService = { getOrCreateBalance: jest.fn() };

    const txManager = makeTransactionManager();
    txManager.findOne.mockResolvedValue({ ...mockBalance });

    dataSource = {
      transaction: jest.fn(async (fn: (mgr: typeof txManager) => Promise<unknown>) => fn(txManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        { provide: getRepositoryToken(TimeOffRequest), useValue: requestRepo },
        { provide: getRepositoryToken(TimeOffBalance), useValue: balanceRepo },
        { provide: getRepositoryToken(OutboxEvent), useValue: outboxRepo },
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
        { provide: HCM_CLIENT, useValue: hcmClient },
        { provide: BalancesService, useValue: balancesService },
        { provide: BusinessDaysService, useValue: new BusinessDaysService() },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<RequestsService>(RequestsService);
  });

  describe('createRequest', () => {
    it('creates a PENDING request when balance is sufficient', async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      hcmClient.getBalance.mockResolvedValue({ availableDays: 15 });
      balancesService.getOrCreateBalance.mockResolvedValue({ pendingDays: 0 });

      const result = await service.createRequest({
        employeeId: 'emp-001',
        locationId: 'loc-nyc',
        type: TimeOffType.VACATION,
        startDate: '2026-05-04', // Monday
        endDate: '2026-05-06',   // Wednesday → 3 business days
      });

      expect(result.status).toBe(RequestStatus.PENDING);
      expect(result.daysRequested).toBe(3);
    });

    it('throws NotFoundException when employee does not exist', async () => {
      employeeRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createRequest({
          employeeId: 'unknown',
          locationId: 'loc-nyc',
          type: TimeOffType.VACATION,
          startDate: '2026-05-04',
          endDate: '2026-05-06',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws UnprocessableEntityException when HCM is unavailable', async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      hcmClient.getBalance.mockRejectedValue(new Error('HCM down'));

      await expect(
        service.createRequest({
          employeeId: 'emp-001',
          locationId: 'loc-nyc',
          type: TimeOffType.VACATION,
          startDate: '2026-05-04',
          endDate: '2026-05-06',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when balance is insufficient', async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      hcmClient.getBalance.mockResolvedValue({ availableDays: 2 });
      balancesService.getOrCreateBalance.mockResolvedValue({ pendingDays: 0 });

      await expect(
        service.createRequest({
          employeeId: 'emp-001',
          locationId: 'loc-nyc',
          type: TimeOffType.VACATION,
          startDate: '2026-05-04',
          endDate: '2026-05-06', // 3 days but only 2 available
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws BadRequestException for zero business days (weekend only range)', async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      await expect(
        service.createRequest({
          employeeId: 'emp-001',
          locationId: 'loc-nyc',
          type: TimeOffType.VACATION,
          startDate: '2026-04-25', // Saturday
          endDate: '2026-04-26',   // Sunday
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accounts for existing pendingDays when checking available balance', async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      hcmClient.getBalance.mockResolvedValue({ availableDays: 5 });
      balancesService.getOrCreateBalance.mockResolvedValue({ pendingDays: 4 }); // effective: 5-4=1

      await expect(
        service.createRequest({
          employeeId: 'emp-001',
          locationId: 'loc-nyc',
          type: TimeOffType.VACATION,
          startDate: '2026-05-04',
          endDate: '2026-05-06', // 3 days, only 1 effective
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('approveRequest', () => {
    it('approves and confirms HCM decrement when balance is sufficient', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest });
      balanceRepo.findOne.mockResolvedValue({ ...mockBalance });
      hcmClient.getBalance.mockResolvedValue({ availableDays: 15 });
      hcmClient.updateBalance.mockResolvedValue({ newAvailableDays: 12, newUsedDays: 3 });

      const txManager = makeTransactionManager();
      txManager.findOne.mockResolvedValue({ ...mockBalance });
      txManager.update = jest.fn();
      dataSource.transaction.mockImplementation(async (fn: (mgr: typeof txManager) => Promise<unknown>) => fn(txManager));

      const result = await service.approveRequest('req-1', mockManager, {});
      expect(result.hcmDecrementConfirmed).toBe(true);
      expect(result.status).toBe(RequestStatus.APPROVED);
    });

    it('throws NotFoundException when request does not exist', async () => {
      requestRepo.findOne.mockResolvedValue(null);
      await expect(service.approveRequest('bad-id', mockManager, {})).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException for non-PENDING requests', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest, status: RequestStatus.APPROVED });
      await expect(service.approveRequest('req-1', mockManager, {})).rejects.toThrow(ConflictException);
    });

    it('throws UnprocessableEntityException when HCM unavailable at approval time', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest });
      balanceRepo.findOne.mockResolvedValue({ ...mockBalance });
      hcmClient.getBalance.mockRejectedValue(new Error('HCM down'));

      await expect(service.approveRequest('req-1', mockManager, {})).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws ConflictException (BALANCE_CHANGED) when HCM balance is now insufficient', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest, daysRequested: 5 });
      balanceRepo.findOne.mockResolvedValue({ ...mockBalance, pendingDays: 5 });
      hcmClient.getBalance.mockResolvedValue({ availableDays: 3 }); // not enough

      await expect(service.approveRequest('req-1', mockManager, {})).rejects.toThrow(ConflictException);
    });

    it('stays APPROVED with hcmDecrementConfirmed=false when HCM fails — outbox retries', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest });
      balanceRepo.findOne.mockResolvedValue({ ...mockBalance });
      hcmClient.getBalance.mockResolvedValue({ availableDays: 15 });
      hcmClient.updateBalance.mockRejectedValue(Object.assign(new Error('HCM 503'), { status: 503 }));
      requestRepo.save.mockResolvedValue({});

      const txManager = makeTransactionManager();
      dataSource.transaction.mockImplementation(async (fn: (mgr: typeof txManager) => Promise<unknown>) => fn(txManager));

      const result = await service.approveRequest('req-1', mockManager, {});
      expect(result.status).toBe(RequestStatus.APPROVED);
      expect(result.hcmDecrementConfirmed).toBe(false);
    });
  });

  describe('rejectRequest', () => {
    it('rejects a PENDING request and releases pending days', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest });
      const txManager = makeTransactionManager();
      txManager.findOne.mockResolvedValue({ ...mockBalance, pendingDays: 3 });
      dataSource.transaction.mockImplementation(async (fn: (mgr: typeof txManager) => Promise<unknown>) => fn(txManager));

      const result = await service.rejectRequest('req-1', mockManager, { managerNotes: 'No coverage' });
      expect(result.status).toBe(RequestStatus.REJECTED);
    });

    it('throws ConflictException when trying to reject an already-approved request', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest, status: RequestStatus.APPROVED });
      await expect(service.rejectRequest('req-1', mockManager, {})).rejects.toThrow(ConflictException);
    });
  });

  describe('cancelRequest', () => {
    it('cancels own PENDING request and releases pending days', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest });
      const txManager = makeTransactionManager();
      txManager.findOne.mockResolvedValue({ ...mockBalance, pendingDays: 3 });
      dataSource.transaction.mockImplementation(async (fn: (mgr: typeof txManager) => Promise<unknown>) => fn(txManager));

      const result = await service.cancelRequest('req-1', 'emp-001');
      expect(result.status).toBe(RequestStatus.CANCELLED);
    });

    it("throws ForbiddenException when employee cancels someone else's request", async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest, employeeId: 'emp-002' });
      await expect(service.cancelRequest('req-1', 'emp-001')).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when cancelling an approved request', async () => {
      requestRepo.findOne.mockResolvedValue({ ...mockRequest, status: RequestStatus.APPROVED });
      await expect(service.cancelRequest('req-1', 'emp-001')).rejects.toThrow(ConflictException);
    });
  });
});
