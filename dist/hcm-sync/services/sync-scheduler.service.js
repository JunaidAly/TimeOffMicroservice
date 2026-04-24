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
var SyncSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncSchedulerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const time_off_request_entity_1 = require("../../time-off/entities/time-off-request.entity");
const time_off_balance_entity_1 = require("../../time-off/entities/time-off-balance.entity");
const sync_event_entity_1 = require("../entities/sync-event.entity");
const hcm_client_interface_1 = require("../interfaces/hcm-client.interface");
const crypto = __importStar(require("crypto"));
let SyncSchedulerService = SyncSchedulerService_1 = class SyncSchedulerService {
    constructor(requestRepo, balanceRepo, syncEventRepo, hcmClient) {
        this.requestRepo = requestRepo;
        this.balanceRepo = balanceRepo;
        this.syncEventRepo = syncEventRepo;
        this.hcmClient = hcmClient;
        this.logger = new common_1.Logger(SyncSchedulerService_1.name);
    }
    async syncActivePendingBalances() {
        this.logger.debug('Running scheduled balance sync for active pending requests');
        const pendingRequests = await this.requestRepo.find({
            where: { status: time_off_request_entity_1.RequestStatus.PENDING },
        });
        const seen = new Set();
        const toSync = pendingRequests.filter((r) => {
            const key = `${r.employeeId}:${r.locationId}:${r.type}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
        for (const req of toSync) {
            try {
                const hcmBalance = await this.hcmClient.getBalance(req.employeeId, req.locationId, req.type);
                const balance = await this.balanceRepo.findOne({
                    where: { employeeId: req.employeeId, locationId: req.locationId, type: req.type },
                });
                if (!balance)
                    continue;
                const newChecksum = crypto
                    .createHash('md5')
                    .update(`${hcmBalance.totalDays}:${hcmBalance.usedDays}`)
                    .digest('hex');
                if (balance.hcmChecksum !== newChecksum) {
                    balance.totalDays = hcmBalance.totalDays;
                    balance.availableDays = hcmBalance.availableDays - balance.pendingDays;
                    balance.lastSyncedAt = new Date();
                    balance.hcmChecksum = newChecksum;
                    await this.balanceRepo.save(balance);
                    await this.syncEventRepo.save(this.syncEventRepo.create({
                        type: sync_event_entity_1.SyncEventType.REALTIME_SYNC,
                        employeeId: req.employeeId,
                        locationId: req.locationId,
                        newBalance: hcmBalance.totalDays,
                        triggeredBy: 'scheduler',
                        status: sync_event_entity_1.SyncEventStatus.SUCCESS,
                        processedAt: new Date(),
                    }));
                    this.logger.log(`Scheduler updated balance for ${req.employeeId}/${req.locationId}`);
                }
            }
            catch (err) {
                this.logger.warn(`Scheduler sync failed for ${req.employeeId}/${req.locationId}: ${err.message}`);
            }
        }
    }
};
exports.SyncSchedulerService = SyncSchedulerService;
__decorate([
    (0, schedule_1.Cron)('0 */15 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SyncSchedulerService.prototype, "syncActivePendingBalances", null);
exports.SyncSchedulerService = SyncSchedulerService = SyncSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(time_off_request_entity_1.TimeOffRequest)),
    __param(1, (0, typeorm_1.InjectRepository)(time_off_balance_entity_1.TimeOffBalance)),
    __param(2, (0, typeorm_1.InjectRepository)(sync_event_entity_1.SyncEvent)),
    __param(3, (0, common_1.Inject)(hcm_client_interface_1.HCM_CLIENT)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, Object])
], SyncSchedulerService);
//# sourceMappingURL=sync-scheduler.service.js.map