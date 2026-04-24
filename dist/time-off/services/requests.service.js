"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RequestsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const time_off_request_entity_1 = require("../entities/time-off-request.entity");
const time_off_balance_entity_1 = require("../entities/time-off-balance.entity");
const outbox_event_entity_1 = require("../../hcm-sync/entities/outbox-event.entity");
const hcm_client_interface_1 = require("../../hcm-sync/interfaces/hcm-client.interface");
const balances_service_1 = require("./balances.service");
const business_days_service_1 = require("./business-days.service");
const employee_entity_1 = require("../../common/entities/employee.entity");
const crypto = __importStar(require("crypto"));
let RequestsService = RequestsService_1 = class RequestsService {
    constructor(requestRepo, balanceRepo, outboxRepo, employeeRepo, hcmClient, balancesService, businessDaysService, dataSource) {
        this.requestRepo = requestRepo;
        this.balanceRepo = balanceRepo;
        this.outboxRepo = outboxRepo;
        this.employeeRepo = employeeRepo;
        this.hcmClient = hcmClient;
        this.balancesService = balancesService;
        this.businessDaysService = businessDaysService;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(RequestsService_1.name);
    }
    async createRequest(dto, idempotencyKey) {
        const employee = await this.employeeRepo.findOne({ where: { id: dto.employeeId } });
        if (!employee)
            throw new common_1.NotFoundException(`Employee ${dto.employeeId} not found`);
        const daysRequested = this.businessDaysService.calculate(dto.startDate, dto.endDate);
        if (daysRequested === 0) {
            throw new common_1.BadRequestException('Request must span at least one business day');
        }
        let hcmBalance;
        try {
            hcmBalance = await this.hcmClient.getBalance(dto.employeeId, dto.locationId, dto.type);
        }
        catch {
            throw new common_1.UnprocessableEntityException({
                error: 'HCM_UNAVAILABLE',
                message: 'Cannot submit request: HCM balance check failed',
            });
        }
        const localBalance = await this.balancesService.getOrCreateBalance(dto.employeeId, dto.locationId, dto.type);
        const effectiveAvailable = hcmBalance.availableDays - localBalance.pendingDays;
        if (effectiveAvailable < daysRequested) {
            throw new common_1.UnprocessableEntityException({
                error: 'INSUFFICIENT_BALANCE',
                message: `Employee has ${effectiveAvailable} days available but requested ${daysRequested} days`,
                details: { available: effectiveAvailable, requested: daysRequested },
            });
        }
        return this.dataSource.transaction(async (entityManager) => {
            const request = entityManager.create(time_off_request_entity_1.TimeOffRequest, {
                employeeId: dto.employeeId,
                locationId: dto.locationId,
                type: dto.type,
                startDate: dto.startDate,
                endDate: dto.endDate,
                daysRequested,
                status: time_off_request_entity_1.RequestStatus.PENDING,
                notes: dto.notes,
                idempotencyKey: idempotencyKey ?? crypto.randomUUID(),
            });
            await entityManager.save(time_off_request_entity_1.TimeOffRequest, request);
            await entityManager.increment(time_off_balance_entity_1.TimeOffBalance, { employeeId: dto.employeeId, locationId: dto.locationId, type: dto.type }, 'pendingDays', daysRequested);
            const balance = await entityManager.findOne(time_off_balance_entity_1.TimeOffBalance, {
                where: { employeeId: dto.employeeId, locationId: dto.locationId, type: dto.type },
            });
            if (balance) {
                balance.availableDays = balance.totalDays - balance.usedDays - balance.pendingDays;
                await entityManager.save(time_off_balance_entity_1.TimeOffBalance, balance);
            }
            this.logger.log(`Created request ${request.id}: ${daysRequested}d ${dto.type} for ${dto.employeeId}`);
            return request;
        });
    }
    async listRequests(dto, requesterId, isManager) {
        const query = this.requestRepo.createQueryBuilder('r');
        if (!isManager) {
            query.where('r.employeeId = :requesterId', { requesterId });
        }
        else if (dto.employeeId) {
            query.where('r.employeeId = :employeeId', { employeeId: dto.employeeId });
        }
        if (dto.status) {
            query.andWhere('r.status = :status', { status: dto.status });
        }
        query.orderBy('r.createdAt', 'DESC');
        const page = dto.page ?? 1;
        const limit = dto.limit ?? 20;
        query.skip((page - 1) * limit).take(limit);
        const [data, total] = await query.getManyAndCount();
        return { data, total, page, limit };
    }
    async getRequest(id) {
        const request = await this.requestRepo.findOne({ where: { id } });
        if (!request)
            throw new common_1.NotFoundException(`Request ${id} not found`);
        return request;
    }
    async approveRequest(id, approver, dto) {
        const request = await this.requestRepo.findOne({ where: { id } });
        if (!request)
            throw new common_1.NotFoundException(`Request ${id} not found`);
        if (request.status !== time_off_request_entity_1.RequestStatus.PENDING) {
            throw new common_1.ConflictException({
                error: 'INVALID_STATUS_TRANSITION',
                message: `Cannot approve a request in status ${request.status}`,
            });
        }
        let hcmBalance;
        try {
            hcmBalance = await this.hcmClient.getBalance(request.employeeId, request.locationId, request.type);
        }
        catch {
            throw new common_1.UnprocessableEntityException({
                error: 'HCM_UNAVAILABLE',
                message: 'Cannot approve: HCM is currently unavailable',
            });
        }
        const localBalance = await this.balanceRepo.findOne({
            where: { employeeId: request.employeeId, locationId: request.locationId, type: request.type },
        });
        const otherPendingDays = Math.max(0, (localBalance?.pendingDays ?? 0) - request.daysRequested);
        const effectiveAvailable = hcmBalance.availableDays - otherPendingDays;
        if (effectiveAvailable < request.daysRequested) {
            throw new common_1.ConflictException({
                error: 'BALANCE_CHANGED',
                message: `Balance insufficient. Available: ${effectiveAvailable}, Requested: ${request.daysRequested}`,
                details: { available: effectiveAvailable, requested: request.daysRequested },
            });
        }
        const idempotencyKey = crypto
            .createHash('sha256')
            .update(`${request.id}:DECREMENT`)
            .digest('hex');
        await this.dataSource.transaction(async (entityManager) => {
            request.status = time_off_request_entity_1.RequestStatus.APPROVED;
            request.managerId = approver.id;
            request.managerNotes = dto.managerNotes ?? null;
            request.approvedAt = new Date();
            await entityManager.save(time_off_request_entity_1.TimeOffRequest, request);
            const outbox = entityManager.create(outbox_event_entity_1.OutboxEvent, {
                aggregateId: request.id,
                aggregateType: 'TimeOffRequest',
                eventType: 'BALANCE_DECREMENT',
                payload: {
                    employeeId: request.employeeId,
                    locationId: request.locationId,
                    type: request.type,
                    delta: -request.daysRequested,
                    idempotencyKey,
                },
                status: outbox_event_entity_1.OutboxStatus.PENDING,
            });
            await entityManager.save(outbox_event_entity_1.OutboxEvent, outbox);
        });
        try {
            const result = await this.hcmClient.updateBalance(request.employeeId, request.locationId, request.type, -request.daysRequested, idempotencyKey);
            await this.dataSource.transaction(async (entityManager) => {
                request.hcmDecrementConfirmed = true;
                await entityManager.save(time_off_request_entity_1.TimeOffRequest, request);
                const balance = await entityManager.findOne(time_off_balance_entity_1.TimeOffBalance, {
                    where: { employeeId: request.employeeId, locationId: request.locationId, type: request.type },
                });
                if (balance) {
                    balance.pendingDays = Math.max(0, balance.pendingDays - request.daysRequested);
                    balance.usedDays += request.daysRequested;
                    balance.availableDays = result.newAvailableDays - balance.pendingDays;
                    balance.lastSyncedAt = new Date();
                    await entityManager.save(time_off_balance_entity_1.TimeOffBalance, balance);
                }
                await entityManager.update(outbox_event_entity_1.OutboxEvent, { aggregateId: request.id, eventType: 'BALANCE_DECREMENT' }, { status: outbox_event_entity_1.OutboxStatus.DONE });
            });
            this.logger.log(`Approved request ${id}, HCM decrement confirmed`);
        }
        catch (err) {
            this.logger.warn(`HCM decrement failed for ${id}, outbox will retry: ${err.message}`);
            request.hcmErrorMessage = err.message;
            await this.requestRepo.save(request);
        }
        return request;
    }
    async rejectRequest(id, approver, dto) {
        const request = await this.requestRepo.findOne({ where: { id } });
        if (!request)
            throw new common_1.NotFoundException(`Request ${id} not found`);
        if (request.status !== time_off_request_entity_1.RequestStatus.PENDING) {
            throw new common_1.ConflictException({
                error: 'INVALID_STATUS_TRANSITION',
                message: `Cannot reject a request in status ${request.status}`,
            });
        }
        await this.dataSource.transaction(async (entityManager) => {
            request.status = time_off_request_entity_1.RequestStatus.REJECTED;
            request.managerId = approver.id;
            request.managerNotes = dto.managerNotes ?? null;
            await entityManager.save(time_off_request_entity_1.TimeOffRequest, request);
            const balance = await entityManager.findOne(time_off_balance_entity_1.TimeOffBalance, {
                where: { employeeId: request.employeeId, locationId: request.locationId, type: request.type },
            });
            if (balance) {
                balance.pendingDays = Math.max(0, balance.pendingDays - request.daysRequested);
                balance.availableDays = balance.totalDays - balance.usedDays - balance.pendingDays;
                await entityManager.save(time_off_balance_entity_1.TimeOffBalance, balance);
            }
        });
        this.logger.log(`Rejected request ${id}`);
        return request;
    }
    async cancelRequest(id, employeeId) {
        const request = await this.requestRepo.findOne({ where: { id } });
        if (!request)
            throw new common_1.NotFoundException(`Request ${id} not found`);
        if (request.employeeId !== employeeId) {
            throw new common_1.ForbiddenException('You can only cancel your own requests');
        }
        if (request.status !== time_off_request_entity_1.RequestStatus.PENDING) {
            throw new common_1.ConflictException({
                error: 'INVALID_STATUS_TRANSITION',
                message: `Cannot cancel a request in status ${request.status}`,
            });
        }
        await this.dataSource.transaction(async (entityManager) => {
            request.status = time_off_request_entity_1.RequestStatus.CANCELLED;
            await entityManager.save(time_off_request_entity_1.TimeOffRequest, request);
            const balance = await entityManager.findOne(time_off_balance_entity_1.TimeOffBalance, {
                where: { employeeId: request.employeeId, locationId: request.locationId, type: request.type },
            });
            if (balance) {
                balance.pendingDays = Math.max(0, balance.pendingDays - request.daysRequested);
                balance.availableDays = balance.totalDays - balance.usedDays - balance.pendingDays;
                await entityManager.save(time_off_balance_entity_1.TimeOffBalance, balance);
            }
        });
        this.logger.log(`Cancelled request ${id}`);
        return request;
    }
};
exports.RequestsService = RequestsService;
exports.RequestsService = RequestsService = RequestsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(time_off_request_entity_1.TimeOffRequest)),
    __param(1, (0, typeorm_1.InjectRepository)(time_off_balance_entity_1.TimeOffBalance)),
    __param(2, (0, typeorm_1.InjectRepository)(outbox_event_entity_1.OutboxEvent)),
    __param(3, (0, typeorm_1.InjectRepository)(employee_entity_1.Employee)),
    __param(4, (0, common_1.Inject)(hcm_client_interface_1.HCM_CLIENT)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, Object, balances_service_1.BalancesService,
        business_days_service_1.BusinessDaysService,
        typeorm_2.DataSource])
], RequestsService);
//# sourceMappingURL=requests.service.js.map