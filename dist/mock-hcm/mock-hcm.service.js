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
var MockHcmService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockHcmService = void 0;
const common_1 = require("@nestjs/common");
const time_off_request_entity_1 = require("../time-off/entities/time-off-request.entity");
let MockHcmService = MockHcmService_1 = class MockHcmService {
    constructor() {
        this.logger = new common_1.Logger(MockHcmService_1.name);
        this.store = new Map();
        this.idempotencyStore = new Map();
        this.seed();
    }
    seed() {
        const employees = ['emp-001', 'emp-002', 'emp-003', 'emp-004'];
        const locations = ['loc-nyc', 'loc-lon', 'loc-syd'];
        const types = [time_off_request_entity_1.TimeOffType.VACATION, time_off_request_entity_1.TimeOffType.SICK, time_off_request_entity_1.TimeOffType.PERSONAL];
        const defaults = {
            [time_off_request_entity_1.TimeOffType.VACATION]: 15,
            [time_off_request_entity_1.TimeOffType.SICK]: 10,
            [time_off_request_entity_1.TimeOffType.PERSONAL]: 5,
        };
        for (const emp of employees) {
            for (const loc of locations) {
                for (const type of types) {
                    const totalDays = defaults[type];
                    this.store.set(this.key(emp, loc, type), {
                        employeeId: emp,
                        locationId: loc,
                        type,
                        totalDays,
                        usedDays: 0,
                        availableDays: totalDays,
                        lastModifiedAt: new Date(),
                    });
                }
            }
        }
        this.logger.log(`Mock HCM seeded with ${this.store.size} balance records`);
    }
    key(employeeId, locationId, type) {
        return `${employeeId}:${locationId}:${type}`;
    }
    getBalance(employeeId, locationId, type) {
        const validTypes = Object.values(time_off_request_entity_1.TimeOffType);
        if (!validTypes.includes(type)) {
            throw new common_1.BadRequestException(`Invalid type: ${type}. Must be one of ${validTypes.join(', ')}`);
        }
        const record = this.store.get(this.key(employeeId, locationId, type));
        if (!record) {
            throw new common_1.NotFoundException(`No HCM balance for employee=${employeeId}, location=${locationId}, type=${type}`);
        }
        return { ...record };
    }
    updateBalance(employeeId, locationId, type, delta, idempotencyKey) {
        const cached = this.idempotencyStore.get(idempotencyKey);
        if (cached) {
            this.logger.debug(`Idempotency replay for key ${idempotencyKey}`);
            return { ...cached };
        }
        const record = this.store.get(this.key(employeeId, locationId, type));
        if (!record) {
            throw new common_1.NotFoundException(`No HCM balance for employee=${employeeId}, location=${locationId}, type=${type}`);
        }
        const newAvailable = record.availableDays + delta;
        if (newAvailable < 0) {
            throw new common_1.UnprocessableEntityException({
                error: 'INSUFFICIENT_BALANCE',
                message: `Cannot decrement: available=${record.availableDays}, delta=${delta}`,
                details: { available: record.availableDays, delta },
            });
        }
        record.availableDays = newAvailable;
        record.usedDays = record.usedDays + (delta < 0 ? Math.abs(delta) : -delta);
        record.lastModifiedAt = new Date();
        this.store.set(this.key(employeeId, locationId, type), record);
        this.idempotencyStore.set(idempotencyKey, { ...record });
        this.logger.log(`HCM balance updated: ${employeeId}/${locationId}/${type} delta=${delta} → available=${record.availableDays}`);
        return { ...record };
    }
    getAllBalances() {
        return Array.from(this.store.values()).map((r) => ({ ...r }));
    }
    simulateAnniversaryBonus(employeeId, bonusDays) {
        const affected = [];
        for (const [k, record] of this.store.entries()) {
            if (record.employeeId === employeeId && record.type === time_off_request_entity_1.TimeOffType.VACATION) {
                record.totalDays += bonusDays;
                record.availableDays += bonusDays;
                record.lastModifiedAt = new Date();
                this.store.set(k, record);
                affected.push({ ...record });
                this.logger.log(`Anniversary bonus: +${bonusDays}d for ${employeeId}/${record.locationId}`);
            }
        }
        if (affected.length === 0) {
            throw new common_1.NotFoundException(`No VACATION balances found for employee ${employeeId}`);
        }
        return affected;
    }
    simulateYearlyRefresh() {
        const defaults = {
            [time_off_request_entity_1.TimeOffType.VACATION]: 15,
            [time_off_request_entity_1.TimeOffType.SICK]: 10,
            [time_off_request_entity_1.TimeOffType.PERSONAL]: 5,
        };
        let refreshed = 0;
        for (const [k, record] of this.store.entries()) {
            record.totalDays = defaults[record.type];
            record.usedDays = 0;
            record.availableDays = record.totalDays;
            record.lastModifiedAt = new Date();
            this.store.set(k, record);
            refreshed++;
        }
        this.logger.log(`Yearly refresh: reset ${refreshed} balance records`);
        return { refreshed };
    }
    buildBatchPayload() {
        const balances = this.getAllBalances().map((r) => ({
            employeeId: r.employeeId,
            locationId: r.locationId,
            type: r.type,
            totalDays: r.totalDays,
            usedDays: r.usedDays,
        }));
        return {
            syncId: `batch-${Date.now()}`,
            generatedAt: new Date().toISOString(),
            balances,
        };
    }
};
exports.MockHcmService = MockHcmService;
exports.MockHcmService = MockHcmService = MockHcmService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MockHcmService);
//# sourceMappingURL=mock-hcm.service.js.map