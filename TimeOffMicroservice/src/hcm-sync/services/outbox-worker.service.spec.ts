import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OutboxWorkerService } from './outbox-worker.service';
import { OutboxEvent, OutboxStatus } from '../entities/outbox-event.entity';
import { TimeOffRequest, RequestStatus, TimeOffType } from '../../time-off/entities/time-off-request.entity';
import { TimeOffBalance } from '../../time-off/entities/time-off-balance.entity';
import { HCM_CLIENT } from '../interfaces/hcm-client.interface';

const makeRepo = (overrides = {}) => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  create: jest.fn((d) => d),
  ...overrides,
});

const makeHcmClient = () => ({
  getBalance: jest.fn(),
  updateBalance: jest.fn(),
});

describe('OutboxWorkerService', () => {
  let service: OutboxWorkerService;
  let outboxRepo: ReturnType<typeof makeRepo>;
  let requestRepo: ReturnType<typeof makeRepo>;
  let balanceRepo: ReturnType<typeof makeRepo>;
  let hcmClient: ReturnType<typeof makeHcmClient>;

  const pendingEvent: OutboxEvent = {
    id: 'outbox-1',
    aggregateId: 'req-1',
    aggregateType: 'TimeOffRequest',
    eventType: 'BALANCE_DECREMENT',
    payload: {
      employeeId: 'emp-001',
      locationId: 'loc-nyc',
      type: TimeOffType.VACATION,
      delta: -3,
      idempotencyKey: 'idem-key-1',
    },
    status: OutboxStatus.PENDING,
    retryCount: 0,
    lastAttemptAt: new Date(),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    outboxRepo = makeRepo();
    requestRepo = makeRepo();
    balanceRepo = makeRepo();
    hcmClient = makeHcmClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxWorkerService,
        { provide: getRepositoryToken(OutboxEvent), useValue: outboxRepo },
        { provide: getRepositoryToken(TimeOffRequest), useValue: requestRepo },
        { provide: getRepositoryToken(TimeOffBalance), useValue: balanceRepo },
        { provide: HCM_CLIENT, useValue: hcmClient },
      ],
    }).compile();

    service = module.get<OutboxWorkerService>(OutboxWorkerService);
  });

  it('processes a pending event and marks it DONE on HCM success', async () => {
    outboxRepo.find.mockResolvedValue([pendingEvent]);
    outboxRepo.update.mockResolvedValue({});
    hcmClient.updateBalance.mockResolvedValue({
      employeeId: 'emp-001',
      locationId: 'loc-nyc',
      type: TimeOffType.VACATION,
      newAvailableDays: 12,
      newUsedDays: 3,
    });
    requestRepo.findOne.mockResolvedValue({ id: 'req-1', hcmDecrementConfirmed: false });
    requestRepo.save.mockResolvedValue({});
    balanceRepo.findOne.mockResolvedValue({
      pendingDays: 3,
      usedDays: 0,
      totalDays: 15,
    });
    balanceRepo.save.mockResolvedValue({});

    await service.processOutbox();

    expect(outboxRepo.update).toHaveBeenCalledWith('outbox-1', { status: OutboxStatus.DONE });
    expect(requestRepo.save).toHaveBeenCalledWith(expect.objectContaining({ hcmDecrementConfirmed: true }));
  });

  it('retries on transient 5xx error and increments retryCount', async () => {
    outboxRepo.find.mockResolvedValue([pendingEvent]);
    outboxRepo.update.mockResolvedValue({});

    const transientErr = Object.assign(new Error('500 Internal Server Error'), { status: 500 });
    hcmClient.updateBalance.mockRejectedValue(transientErr);

    await service.processOutbox();

    expect(outboxRepo.update).toHaveBeenCalledWith(
      'outbox-1',
      expect.objectContaining({ retryCount: 1, status: OutboxStatus.PENDING }),
    );
  });

  it('marks FAILED and rolls back request on non-retryable 422 error', async () => {
    const eventWith0Retries = { ...pendingEvent };
    outboxRepo.find.mockResolvedValue([eventWith0Retries]);
    outboxRepo.update.mockResolvedValue({});

    const hcmErr = Object.assign(new Error('422 Insufficient Balance'), { status: 422 });
    hcmClient.updateBalance.mockRejectedValue(hcmErr);

    requestRepo.findOne.mockResolvedValue({
      id: 'req-1',
      status: RequestStatus.APPROVED,
      hcmDecrementConfirmed: false,
    });
    requestRepo.save.mockResolvedValue({});
    balanceRepo.findOne.mockResolvedValue({ pendingDays: 3, usedDays: 0, totalDays: 15 });
    balanceRepo.save.mockResolvedValue({});

    await service.processOutbox();

    expect(outboxRepo.update).toHaveBeenCalledWith('outbox-1', { status: OutboxStatus.FAILED });
    expect(requestRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: RequestStatus.PENDING_RETRY }));
  });

  it('marks FAILED after exceeding MAX_RETRIES', async () => {
    const exhaustedEvent = { ...pendingEvent, retryCount: 5 };
    outboxRepo.find.mockResolvedValue([exhaustedEvent]);
    outboxRepo.update.mockResolvedValue({});

    await service.processOutbox();

    expect(outboxRepo.update).toHaveBeenCalledWith('outbox-1', { status: OutboxStatus.FAILED });
    expect(hcmClient.updateBalance).not.toHaveBeenCalled();
  });

  it('does not run concurrently (guards with isRunning flag)', async () => {
    outboxRepo.find.mockImplementation(() => new Promise((r) => setTimeout(() => r([]), 100)));

    const p1 = service.processOutbox();
    const p2 = service.processOutbox();
    await Promise.all([p1, p2]);

    expect(outboxRepo.find).toHaveBeenCalledTimes(1);
  });
});
