import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BatchSyncService, BatchSyncPayload } from './batch-sync.service';
import { TimeOffBalance } from '../../time-off/entities/time-off-balance.entity';
import { TimeOffRequest, RequestStatus } from '../../time-off/entities/time-off-request.entity';
import { SyncEvent } from '../entities/sync-event.entity';
import { TimeOffType } from '../../time-off/entities/time-off-request.entity';
import { BadRequestException } from '@nestjs/common';

const makeBalanceRepo = (overrides = {}) => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn((data) => data),
  ...overrides,
});

const makeRequestRepo = (overrides = {}) => ({
  update: jest.fn(),
  ...overrides,
});

const makeSyncRepo = (overrides = {}) => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn((data) => data),
  ...overrides,
});

describe('BatchSyncService', () => {
  let service: BatchSyncService;
  let balanceRepo: ReturnType<typeof makeBalanceRepo>;
  let requestRepo: ReturnType<typeof makeRequestRepo>;
  let syncRepo: ReturnType<typeof makeSyncRepo>;

  beforeEach(async () => {
    balanceRepo = makeBalanceRepo();
    requestRepo = makeRequestRepo();
    syncRepo = makeSyncRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchSyncService,
        { provide: getRepositoryToken(TimeOffBalance), useValue: balanceRepo },
        { provide: getRepositoryToken(TimeOffRequest), useValue: requestRepo },
        { provide: getRepositoryToken(SyncEvent), useValue: syncRepo },
      ],
    }).compile();

    service = module.get<BatchSyncService>(BatchSyncService);
  });

  function makePayload(overrides: Partial<BatchSyncPayload> = {}): BatchSyncPayload {
    return {
      syncId: 'test-sync-1',
      generatedAt: new Date().toISOString(),
      balances: [
        {
          employeeId: 'emp-001',
          locationId: 'loc-nyc',
          type: TimeOffType.VACATION,
          totalDays: 15,
          usedDays: 3,
        },
      ],
      ...overrides,
    };
  }

  it('rejects stale batches older than 1 hour', async () => {
    const staleDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    await expect(service.processBatch(makePayload({ generatedAt: staleDate }))).rejects.toThrow(BadRequestException);
  });

  it('inserts a new balance when none exists locally', async () => {
    balanceRepo.findOne.mockResolvedValue(null);
    balanceRepo.save.mockImplementation((b) => Promise.resolve(b));
    syncRepo.save.mockResolvedValue({});

    const result = await service.processBatch(makePayload());
    expect(result.processed).toBe(1);
    expect(result.updated).toBe(1);
    expect(balanceRepo.save).toHaveBeenCalledTimes(1);
  });

  it('skips update when checksum matches (no drift)', async () => {
    const crypto = require('crypto');
    const existingChecksum = crypto.createHash('md5').update('15:3').digest('hex');

    balanceRepo.findOne.mockResolvedValue({
      id: 'bal-1',
      totalDays: 15,
      usedDays: 3,
      pendingDays: 0,
      hcmChecksum: existingChecksum,
    });
    syncRepo.save.mockResolvedValue({});

    const result = await service.processBatch(makePayload());
    expect(result.updated).toBe(0);
  });

  it('updates balance when checksum differs (drift detected)', async () => {
    balanceRepo.findOne.mockResolvedValue({
      id: 'bal-1',
      totalDays: 10, // local says 10
      usedDays: 0,
      pendingDays: 0,
      hcmChecksum: 'old-checksum',
    });
    balanceRepo.save.mockImplementation((b) => Promise.resolve(b));
    syncRepo.save.mockResolvedValue({});

    const result = await service.processBatch(makePayload()); // HCM says 15 total
    expect(result.updated).toBe(1);
    expect(balanceRepo.save).toHaveBeenCalled();
  });

  it('flags PENDING requests when HCM available < pending days (over-commitment)', async () => {
    balanceRepo.findOne.mockResolvedValue({
      id: 'bal-1',
      totalDays: 5,
      usedDays: 0,
      pendingDays: 8, // MORE than HCM available
      hcmChecksum: 'old',
    });
    balanceRepo.save.mockImplementation((b) => Promise.resolve(b));
    requestRepo.update.mockResolvedValue({ affected: 2 });
    syncRepo.save.mockResolvedValue({});

    const result = await service.processBatch(
      makePayload({
        balances: [{
          employeeId: 'emp-001',
          locationId: 'loc-nyc',
          type: TimeOffType.VACATION,
          totalDays: 5,
          usedDays: 0, // available = 5, but pending = 8
        }],
      }),
    );

    expect(result.flaggedForReview).toBe(1);
    expect(requestRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: RequestStatus.PENDING }),
      expect.objectContaining({ status: RequestStatus.PENDING_RETRY }),
    );
  });

  it('continues processing remaining entries after one fails', async () => {
    balanceRepo.findOne
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce(null);
    balanceRepo.save.mockImplementation((b) => Promise.resolve(b));
    syncRepo.save.mockResolvedValue({});

    const result = await service.processBatch(
      makePayload({
        balances: [
          { employeeId: 'emp-001', locationId: 'loc-nyc', type: TimeOffType.VACATION, totalDays: 15, usedDays: 0 },
          { employeeId: 'emp-002', locationId: 'loc-nyc', type: TimeOffType.VACATION, totalDays: 15, usedDays: 0 },
        ],
      }),
    );

    expect(result.processed).toBe(2);
    expect(result.errors.length).toBe(1);
    expect(result.updated).toBe(1);
  });
});
