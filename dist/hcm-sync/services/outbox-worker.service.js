"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OutboxWorkerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxWorkerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const schedule_1 = require("@nestjs/schedule");
const outbox_event_entity_1 = require("../entities/outbox-event.entity");
const time_off_request_entity_1 = require("../../time-off/entities/time-off-request.entity");
const time_off_balance_entity_1 = require("../../time-off/entities/time-off-balance.entity");
const hcm_client_interface_1 = require("../interfaces/hcm-client.interface");
const MAX_RETRIES = 5;
let OutboxWorkerService = OutboxWorkerService_1 = class OutboxWorkerService {
    constructor(outboxRepo, requestRepo, balanceRepo, hcmClient) {
        this.outboxRepo = outboxRepo;
        this.requestRepo = requestRepo;
        this.balanceRepo = balanceRepo;
        this.hcmClient = hcmClient;
        this.logger = new common_1.Logger(OutboxWorkerService_1.name);
        this.isRunning = false;
    }
    async processOutbox() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        try {
            const pending = await this.outboxRepo.find({
                where: { status: outbox_event_entity_1.OutboxStatus.PENDING },
                order: { createdAt: 'ASC' },
                take: 20,
            });
            if (pending.length > 0) {
                this.logger.debug(`Processing ${pending.length} outbox events`);
            }
            for (const event of pending) {
                await this.processEvent(event);
            }
        }
        finally {
            this.isRunning = false;
        }
    }
    async processEvent(event) {
        if (event.retryCount >= MAX_RETRIES) {
            await this.outboxRepo.update(event.id, { status: outbox_event_entity_1.OutboxStatus.FAILED });
            this.logger.error(`Outbox event ${event.id} exceeded max retries, marked FAILED`);
            return;
        }
        await this.outboxRepo.update(event.id, {
            status: outbox_event_entity_1.OutboxStatus.PROCESSING,
            lastAttemptAt: new Date(),
        });
        const payload = event.payload;
        try {
            const result = await this.hcmClient.updateBalance(payload.employeeId, payload.locationId, payload.type, payload.delta, payload.idempotencyKey);
            await this.outboxRepo.update(event.id, { status: outbox_event_entity_1.OutboxStatus.DONE });
            const request = await this.requestRepo.findOne({ where: { id: event.aggregateId } });
            if (request && !request.hcmDecrementConfirmed) {
                request.hcmDecrementConfirmed = true;
                request.hcmErrorMessage = null;
                await this.requestRepo.save(request);
                const balance = await this.balanceRepo.findOne({
                    where: { employeeId: payload.employeeId, locationId: payload.locationId, type: payload.type },
                });
                if (balance) {
                    const absDelta = Math.abs(payload.delta);
                    balance.pendingDays = Math.max(0, balance.pendingDays - absDelta);
                    balance.usedDays += absDelta;
                    balance.availableDays = result.newAvailableDays - balance.pendingDays;
                    balance.lastSyncedAt = new Date();
                    await this.balanceRepo.save(balance);
                }
            }
            this.logger.log(`Outbox event ${event.id} processed successfully`);
        }
        catch (err) {
            const error = err;
            const isNonRetryable = error.status !== undefined && error.status >= 400 && error.status < 500;
            if (isNonRetryable) {
                await this.outboxRepo.update(event.id, { status: outbox_event_entity_1.OutboxStatus.FAILED });
                const request = await this.requestRepo.findOne({ where: { id: event.aggregateId } });
                if (request) {
                    request.status = time_off_request_entity_1.RequestStatus.PENDING_RETRY;
                    request.hcmErrorMessage = `HCM permanently rejected: ${error.message}`;
                    await this.requestRepo.save(request);
                    const balance = await this.balanceRepo.findOne({
                        where: { employeeId: payload.employeeId, locationId: payload.locationId, type: payload.type },
                    });
                    if (balance) {
                        const absDelta = Math.abs(payload.delta);
                        balance.pendingDays = Math.max(0, balance.pendingDays - absDelta);
                        balance.availableDays = balance.totalDays - balance.usedDays - balance.pendingDays;
                        await this.balanceRepo.save(balance);
                    }
                }
                this.logger.error(`Outbox event ${event.id} permanently failed (${error.status}): ${error.message}`);
            }
            else {
                await this.outboxRepo.update(event.id, {
                    status: outbox_event_entity_1.OutboxStatus.PENDING,
                    retryCount: event.retryCount + 1,
                });
                this.logger.warn(`Outbox event ${event.id} retry ${event.retryCount + 1}/${MAX_RETRIES}: ${error.message}`);
            }
        }
    }
};
exports.OutboxWorkerService = OutboxWorkerService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_SECONDS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OutboxWorkerService.prototype, "processOutbox", null);
exports.OutboxWorkerService = OutboxWorkerService = OutboxWorkerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(outbox_event_entity_1.OutboxEvent)),
    __param(1, (0, typeorm_1.InjectRepository)(time_off_request_entity_1.TimeOffRequest)),
    __param(2, (0, typeorm_1.InjectRepository)(time_off_balance_entity_1.TimeOffBalance)),
    __param(3, (0, common_1.Inject)(hcm_client_interface_1.HCM_CLIENT)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, Object])
], OutboxWorkerService);
//# sourceMappingURL=outbox-worker.service.js.map