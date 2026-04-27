import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Employee, EmployeeRole } from '../src/common/entities/employee.entity';
import { Location } from '../src/common/entities/location.entity';
import { TimeOffRequest, TimeOffType, RequestStatus } from '../src/time-off/entities/time-off-request.entity';
import { TimeOffBalance } from '../src/time-off/entities/time-off-balance.entity';
import { OutboxEvent } from '../src/hcm-sync/entities/outbox-event.entity';
import { SyncEvent } from '../src/hcm-sync/entities/sync-event.entity';
import { TimeOffModule } from '../src/time-off/time-off.module';
import { HcmSyncModule } from '../src/hcm-sync/hcm-sync.module';
import { MockHcmModule } from '../src/mock-hcm/mock-hcm.module';
import { MockHcmService } from '../src/mock-hcm/mock-hcm.service';
import { DataSource } from 'typeorm';
import { HCM_CLIENT } from '../src/hcm-sync/interfaces/hcm-client.interface';

/**
 * Routes HCM calls directly to the in-process MockHcmService — no HTTP needed.
 */
class InProcessHcmClient {
  constructor(private readonly mockHcm: MockHcmService) {}

  getBalance(employeeId: string, locationId: string, type: TimeOffType) {
    const r = this.mockHcm.getBalance(employeeId, locationId, type);
    return Promise.resolve(r);
  }

  updateBalance(employeeId: string, locationId: string, type: TimeOffType, delta: number, idempotencyKey: string) {
    const r = this.mockHcm.updateBalance(employeeId, locationId, type, delta, idempotencyKey);
    return Promise.resolve({ ...r, newAvailableDays: r.availableDays, newUsedDays: r.usedDays });
  }
}

async function seedTestData(dataSource: DataSource) {
  await dataSource.getRepository(Location).save([
    { id: 'loc-nyc', name: 'New York', country: 'US', timezone: 'America/New_York' },
    { id: 'loc-lon', name: 'London', country: 'UK', timezone: 'Europe/London' },
  ]);
  await dataSource.getRepository(Employee).save([
    { id: 'mgr-001', name: 'Sarah', email: 'sarah@test.com', role: EmployeeRole.MANAGER },
    { id: 'emp-001', name: 'Alice', email: 'alice@test.com', managerId: 'mgr-001', role: EmployeeRole.EMPLOYEE },
    { id: 'emp-002', name: 'Bob', email: 'bob@test.com', managerId: 'mgr-001', role: EmployeeRole.EMPLOYEE },
    { id: 'emp-003', name: 'Carol', email: 'carol@test.com', managerId: 'mgr-001', role: EmployeeRole.EMPLOYEE },
  ]);
}

async function seedBalance(dataSource: DataSource, partial: Partial<TimeOffBalance> & {
  employeeId: string; locationId: string; type: TimeOffType;
}) {
  const repo = dataSource.getRepository(TimeOffBalance);
  return repo.save(repo.create({
    totalDays: 15, usedDays: 0, pendingDays: 0, availableDays: 15,
    ...partial,
  }));
}

describe('Time-Off Microservice (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  // Shared instance — both MockHcmController and InProcessHcmClient use the same store
  const sharedMockHcm = new MockHcmService();
  const inProcessHcmClient = new InProcessHcmClient(sharedMockHcm);
  // Expose for test assertions
  const mockHcmService = sharedMockHcm;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Employee, Location, TimeOffRequest, TimeOffBalance, OutboxEvent, SyncEvent],
          synchronize: true,
          dropSchema: true,
        }),
        ScheduleModule.forRoot(),
        MockHcmModule,
        TimeOffModule,
        HcmSyncModule,
      ],
    })
      .overrideProvider(HCM_CLIENT)
      .useValue(inProcessHcmClient)
      // Override DI MockHcmService so the controller uses our shared instance
      .overrideProvider(MockHcmService)
      .useValue(sharedMockHcm)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    await seedTestData(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // TypeORM's clear() truncates all rows without needing criteria
    await dataSource.getRepository(TimeOffRequest).clear();
    await dataSource.getRepository(TimeOffBalance).clear();
    await dataSource.getRepository(OutboxEvent).clear();
    // Reset mock HCM store between tests
    (mockHcmService as any).store.clear();
    (mockHcmService as any).idempotencyStore.clear();
    (mockHcmService as any).seed();
  });

  // ─── Balance Endpoint ────────────────────────────────────────────────────────

  describe('GET /api/v1/time-off/balances/:employeeId', () => {
    it('returns empty balances array when no local data', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/time-off/balances/emp-001')
        .expect(200);
      expect(res.body.employeeId).toBe('emp-001');
      expect(Array.isArray(res.body.balances)).toBe(true);
    });

    it('returns 404 for unknown employee', async () => {
      await request(app.getHttpServer()).get('/api/v1/time-off/balances/no-such-emp').expect(404);
    });
  });

  // ─── Request Creation ────────────────────────────────────────────────────────

  describe('POST /api/v1/time-off/requests', () => {
    beforeEach(async () => {
      await seedBalance(dataSource, { employeeId: 'emp-001', locationId: 'loc-nyc', type: TimeOffType.VACATION });
    });

    it('creates a PENDING request when balance is sufficient', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/time-off/requests')
        .set('X-Idempotency-Key', 'e2e-create-ok')
        .send({ employeeId: 'emp-001', locationId: 'loc-nyc', type: 'VACATION', startDate: '2026-05-04', endDate: '2026-05-06' })
        .expect(201);

      expect(res.body.status).toBe('PENDING');
      expect(res.body.daysRequested).toBe(3);
    });

    it('returns 422 when balance is insufficient', async () => {
      (mockHcmService as any).store.set('emp-001:loc-nyc:VACATION', {
        employeeId: 'emp-001', locationId: 'loc-nyc', type: TimeOffType.VACATION,
        totalDays: 1, usedDays: 0, availableDays: 1, lastModifiedAt: new Date(),
      });

      await request(app.getHttpServer())
        .post('/api/v1/time-off/requests')
        .set('X-Idempotency-Key', 'e2e-insuf')
        .send({ employeeId: 'emp-001', locationId: 'loc-nyc', type: 'VACATION', startDate: '2026-05-04', endDate: '2026-05-06' })
        .expect(422);
    });

    it('returns 404 for unknown employee', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/time-off/requests')
        .send({ employeeId: 'ghost', locationId: 'loc-nyc', type: 'VACATION', startDate: '2026-05-04', endDate: '2026-05-06' })
        .expect(404);
    });

    it('returns 400 when request spans zero business days (weekend)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/time-off/requests')
        .send({ employeeId: 'emp-001', locationId: 'loc-nyc', type: 'VACATION', startDate: '2026-04-25', endDate: '2026-04-26' })
        .expect(400);
    });
  });

  // ─── Full Lifecycle ──────────────────────────────────────────────────────────

  describe('Full lifecycle: submit → approve', () => {
    beforeEach(async () => {
      await seedBalance(dataSource, { employeeId: 'emp-001', locationId: 'loc-nyc', type: TimeOffType.VACATION });
    });

    it('employee submits → manager approves → HCM balance decremented', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/time-off/requests')
        .set('X-Idempotency-Key', 'lifecycle-1')
        .send({ employeeId: 'emp-001', locationId: 'loc-nyc', type: 'VACATION', startDate: '2026-05-04', endDate: '2026-05-06' })
        .expect(201);

      const approveRes = await request(app.getHttpServer())
        .patch(`/api/v1/time-off/requests/${createRes.body.id}/approve`)
        .set('X-Manager-Id', 'mgr-001')
        .send({ managerNotes: 'Approved!' })
        .expect(200);

      expect(approveRes.body.status).toBe('APPROVED');
      expect(approveRes.body.hcmDecrementConfirmed).toBe(true);

      const hcmBal = mockHcmService.getBalance('emp-001', 'loc-nyc', TimeOffType.VACATION);
      expect(hcmBal.availableDays).toBe(12);
    });

    it('employee submits → employee cancels → pending days released', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/time-off/requests')
        .set('X-Idempotency-Key', 'lifecycle-cancel')
        .send({ employeeId: 'emp-001', locationId: 'loc-nyc', type: 'VACATION', startDate: '2026-05-04', endDate: '2026-05-06' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/time-off/requests/${createRes.body.id}/cancel`)
        .set('X-Employee-Id', 'emp-001')
        .expect(200);

      const bal = await dataSource.getRepository(TimeOffBalance).findOne({
        where: { employeeId: 'emp-001', locationId: 'loc-nyc', type: TimeOffType.VACATION },
      });
      expect(bal?.pendingDays).toBe(0);
    });

    it('manager rejects → pending days released', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/time-off/requests')
        .set('X-Idempotency-Key', 'lifecycle-reject')
        .send({ employeeId: 'emp-001', locationId: 'loc-nyc', type: 'VACATION', startDate: '2026-05-04', endDate: '2026-05-06' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/time-off/requests/${createRes.body.id}/reject`)
        .set('X-Manager-Id', 'mgr-001')
        .send({ managerNotes: 'Denied' })
        .expect(200);

      const bal = await dataSource.getRepository(TimeOffBalance).findOne({
        where: { employeeId: 'emp-001', locationId: 'loc-nyc', type: TimeOffType.VACATION },
      });
      expect(bal?.pendingDays).toBe(0);
    });
  });

  // ─── Manager Guard ───────────────────────────────────────────────────────────

  describe('Manager guard', () => {
    it('returns 403 without X-Manager-Id header', async () => {
      await request(app.getHttpServer()).patch('/api/v1/time-off/requests/x/approve').send({}).expect(403);
    });

    it('returns 403 when X-Manager-Id is a non-manager employee', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/time-off/requests/x/approve')
        .set('X-Manager-Id', 'emp-001')
        .send({})
        .expect(403);
    });
  });

  // ─── Idempotency ─────────────────────────────────────────────────────────────

  describe('Request idempotency', () => {
    beforeEach(async () => {
      await seedBalance(dataSource, { employeeId: 'emp-001', locationId: 'loc-nyc', type: TimeOffType.VACATION });
    });

    it('returns 409 when same idempotency key used twice', async () => {
      const payload = { employeeId: 'emp-001', locationId: 'loc-nyc', type: 'VACATION', startDate: '2026-05-04', endDate: '2026-05-06' };
      await request(app.getHttpServer()).post('/api/v1/time-off/requests').set('X-Idempotency-Key', 'idem-dup').send(payload).expect(201);
      await request(app.getHttpServer()).post('/api/v1/time-off/requests').set('X-Idempotency-Key', 'idem-dup').send(payload).expect(409);
    });
  });

  // ─── HCM Mock Idempotency ────────────────────────────────────────────────────

  describe('HCM balance idempotency (mock)', () => {
    it('does not double-decrement on duplicate HCM update key', () => {
      mockHcmService.updateBalance('emp-003', 'loc-nyc', TimeOffType.VACATION, -3, 'hcm-idem-x');
      mockHcmService.updateBalance('emp-003', 'loc-nyc', TimeOffType.VACATION, -3, 'hcm-idem-x');
      const bal = mockHcmService.getBalance('emp-003', 'loc-nyc', TimeOffType.VACATION);
      expect(bal.availableDays).toBe(12); // 15 - 3, not 15 - 6
    });
  });

  // ─── Batch Sync ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/hcm-sync/batch', () => {
    it('inserts new balances from batch', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/hcm-sync/batch')
        .send({
          syncId: 'batch-new',
          generatedAt: new Date().toISOString(),
          balances: [{ employeeId: 'emp-001', locationId: 'loc-nyc', type: 'VACATION', totalDays: 15, usedDays: 0 }],
        })
        .expect(200);

      expect(res.body.processed).toBe(1);
      expect(res.body.updated).toBe(1);
    });

    it('updates balance when HCM value differs from local', async () => {
      await seedBalance(dataSource, {
        employeeId: 'emp-001', locationId: 'loc-nyc', type: TimeOffType.VACATION,
        totalDays: 10, hcmChecksum: 'stale',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/hcm-sync/batch')
        .send({
          syncId: 'batch-drift',
          generatedAt: new Date().toISOString(),
          balances: [{ employeeId: 'emp-001', locationId: 'loc-nyc', type: 'VACATION', totalDays: 15, usedDays: 0 }],
        })
        .expect(200);

      expect(res.body.updated).toBe(1);
    });

    it('rejects stale batch (older than 1 hour)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/hcm-sync/batch')
        .send({ syncId: 'old', generatedAt: new Date(Date.now() - 7_200_000).toISOString(), balances: [] })
        .expect(400);
    });

    it('flags over-committed PENDING requests', async () => {
      await seedBalance(dataSource, {
        employeeId: 'emp-002', locationId: 'loc-nyc', type: TimeOffType.VACATION,
        totalDays: 15, pendingDays: 12, availableDays: 3, hcmChecksum: 'old',
      });

      await dataSource.getRepository(TimeOffRequest).save({
        id: 'req-overcommit',
        employeeId: 'emp-002', locationId: 'loc-nyc', type: TimeOffType.VACATION,
        startDate: '2026-05-04', endDate: '2026-05-15', daysRequested: 12,
        status: RequestStatus.PENDING, idempotencyKey: 'idem-oc', hcmDecrementConfirmed: false,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/hcm-sync/batch')
        .send({
          syncId: 'batch-overcommit',
          generatedAt: new Date().toISOString(),
          balances: [{ employeeId: 'emp-002', locationId: 'loc-nyc', type: 'VACATION', totalDays: 5, usedDays: 0 }],
        })
        .expect(200);

      expect(res.body.flaggedForReview).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Mock HCM Simulations ────────────────────────────────────────────────────

  describe('Mock HCM simulation endpoints', () => {
    it('POST /mock-hcm/simulate/anniversary-bonus adds vacation days', async () => {
      const before = mockHcmService.getBalance('emp-001', 'loc-nyc', TimeOffType.VACATION);

      const res = await request(app.getHttpServer())
        .post('/mock-hcm/simulate/anniversary-bonus')
        .send({ employeeId: 'emp-001', bonusDays: 5 })
        .expect(201);

      expect(Array.isArray(res.body)).toBe(true);
      const after = mockHcmService.getBalance('emp-001', 'loc-nyc', TimeOffType.VACATION);
      expect(after.totalDays).toBe(before.totalDays + 5);
    });

    it('POST /mock-hcm/simulate/yearly-refresh resets all balances', async () => {
      mockHcmService.updateBalance('emp-001', 'loc-nyc', TimeOffType.VACATION, -10, 'pre-refresh');

      await request(app.getHttpServer()).post('/mock-hcm/simulate/yearly-refresh').expect(201);

      const after = mockHcmService.getBalance('emp-001', 'loc-nyc', TimeOffType.VACATION);
      expect(after.availableDays).toBe(15);
      expect(after.usedDays).toBe(0);
    });

    it('GET /mock-hcm/balances returns all seeded balances', async () => {
      const res = await request(app.getHttpServer()).get('/mock-hcm/balances').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  // ─── Sync Status ─────────────────────────────────────────────────────────────

  describe('GET /api/v1/hcm-sync/status', () => {
    it('returns sync health with correct structure', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/hcm-sync/status').expect(200);
      expect(res.body).toHaveProperty('syncIntervalMinutes', 15);
      expect(res.body).toHaveProperty('pendingOutboxEvents');
      expect(res.body).toHaveProperty('flaggedRequests');
    });
  });

  // ─── Balance Conflict at Approval ────────────────────────────────────────────

  describe('Balance conflict detection at approval', () => {
    it('returns 409 when HCM balance drops between submission and approval', async () => {
      await seedBalance(dataSource, { employeeId: 'emp-001', locationId: 'loc-nyc', type: TimeOffType.VACATION });

      const createRes = await request(app.getHttpServer())
        .post('/api/v1/time-off/requests')
        .set('X-Idempotency-Key', 'conflict-test')
        .send({ employeeId: 'emp-001', locationId: 'loc-nyc', type: 'VACATION', startDate: '2026-05-04', endDate: '2026-05-06' })
        .expect(201);

      // Simulate HCM externally reducing balance below requested amount
      (mockHcmService as any).store.set('emp-001:loc-nyc:VACATION', {
        employeeId: 'emp-001', locationId: 'loc-nyc', type: TimeOffType.VACATION,
        totalDays: 15, usedDays: 14, availableDays: 1, lastModifiedAt: new Date(),
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/time-off/requests/${createRes.body.id}/approve`)
        .set('X-Manager-Id', 'mgr-001')
        .send({})
        .expect(409);
    });
  });
});
