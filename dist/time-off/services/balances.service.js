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
var BalancesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalancesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const time_off_balance_entity_1 = require("../entities/time-off-balance.entity");
const hcm_client_interface_1 = require("../../hcm-sync/interfaces/hcm-client.interface");
const employee_entity_1 = require("../../common/entities/employee.entity");
const location_entity_1 = require("../../common/entities/location.entity");
const crypto = __importStar(require("crypto"));
const CACHE_TTL_MS = 15 * 60 * 1000;
let BalancesService = BalancesService_1 = class BalancesService {
    constructor(balanceRepo, employeeRepo, locationRepo, hcmClient) {
        this.balanceRepo = balanceRepo;
        this.employeeRepo = employeeRepo;
        this.locationRepo = locationRepo;
        this.hcmClient = hcmClient;
        this.logger = new common_1.Logger(BalancesService_1.name);
    }
    async getBalancesForEmployee(employeeId, locationId, fresh = true) {
        const employee = await this.employeeRepo.findOne({ where: { id: employeeId } });
        if (!employee)
            throw new common_1.NotFoundException(`Employee ${employeeId} not found`);
        const query = this.balanceRepo.createQueryBuilder('b').where('b.employeeId = :employeeId', { employeeId });
        if (locationId)
            query.andWhere('b.locationId = :locationId', { locationId });
        const localBalances = await query.getMany();
        const results = [];
        for (const balance of localBalances) {
            if (fresh || this.isCacheStale(balance.lastSyncedAt)) {
                try {
                    const hcmData = await this.hcmClient.getBalance(employeeId, balance.locationId, balance.type);
                    await this.updateFromHcm(balance, hcmData);
                    const loc = await this.locationRepo.findOne({ where: { id: balance.locationId } });
                    results.push(this.toView(balance, loc?.name, 'hcm-realtime'));
                }
                catch (err) {
                    this.logger.warn(`HCM fetch failed for ${employeeId}/${balance.locationId}, using cache: ${err.message}`);
                    const loc = await this.locationRepo.findOne({ where: { id: balance.locationId } });
                    results.push(this.toView(balance, loc?.name, 'cache-stale'));
                }
            }
            else {
                const loc = await this.locationRepo.findOne({ where: { id: balance.locationId } });
                results.push(this.toView(balance, loc?.name, 'cache'));
            }
        }
        return { employeeId, balances: results };
    }
    async getOrCreateBalance(employeeId, locationId, type) {
        let balance = await this.balanceRepo.findOne({ where: { employeeId, locationId, type } });
        if (!balance) {
            balance = this.balanceRepo.create({
                employeeId,
                locationId,
                type,
                totalDays: 0,
                usedDays: 0,
                pendingDays: 0,
                availableDays: 0,
            });
            await this.balanceRepo.save(balance);
        }
        return balance;
    }
    async syncFromHcm(employeeId, locationId, type) {
        const hcmData = await this.hcmClient.getBalance(employeeId, locationId, type);
        const balance = await this.getOrCreateBalance(employeeId, locationId, type);
        await this.updateFromHcm(balance, hcmData);
        return balance;
    }
    async addPendingDays(employeeId, locationId, type, days) {
        const balance = await this.getOrCreateBalance(employeeId, locationId, type);
        balance.pendingDays += days;
        balance.availableDays = balance.totalDays - balance.usedDays - balance.pendingDays;
        await this.balanceRepo.save(balance);
    }
    async releasePendingDays(employeeId, locationId, type, days) {
        const balance = await this.getOrCreateBalance(employeeId, locationId, type);
        balance.pendingDays = Math.max(0, balance.pendingDays - days);
        balance.availableDays = balance.totalDays - balance.usedDays - balance.pendingDays;
        await this.balanceRepo.save(balance);
    }
    async confirmUsedDays(employeeId, locationId, type, days) {
        const balance = await this.getOrCreateBalance(employeeId, locationId, type);
        balance.pendingDays = Math.max(0, balance.pendingDays - days);
        balance.usedDays += days;
        balance.availableDays = balance.totalDays - balance.usedDays - balance.pendingDays;
        await this.balanceRepo.save(balance);
    }
    async updateFromHcm(balance, hcmData) {
        balance.totalDays = hcmData.totalDays;
        balance.availableDays = hcmData.availableDays - balance.pendingDays;
        balance.lastSyncedAt = new Date();
        balance.hcmChecksum = crypto
            .createHash('md5')
            .update(`${hcmData.totalDays}:${hcmData.usedDays}`)
            .digest('hex');
        await this.balanceRepo.save(balance);
    }
    isCacheStale(lastSyncedAt) {
        if (!lastSyncedAt)
            return true;
        return Date.now() - lastSyncedAt.getTime() > CACHE_TTL_MS;
    }
    toView(balance, locationName, source) {
        return {
            locationId: balance.locationId,
            locationName: locationName ?? balance.locationId,
            type: balance.type,
            totalDays: balance.totalDays,
            usedDays: balance.usedDays,
            pendingDays: balance.pendingDays,
            availableDays: balance.availableDays,
            lastSyncedAt: balance.lastSyncedAt,
            source: source ?? 'cache',
        };
    }
};
exports.BalancesService = BalancesService;
exports.BalancesService = BalancesService = BalancesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(time_off_balance_entity_1.TimeOffBalance)),
    __param(1, (0, typeorm_1.InjectRepository)(employee_entity_1.Employee)),
    __param(2, (0, typeorm_1.InjectRepository)(location_entity_1.Location)),
    __param(3, (0, common_1.Inject)(hcm_client_interface_1.HCM_CLIENT)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, Object])
], BalancesService);
//# sourceMappingURL=balances.service.js.map