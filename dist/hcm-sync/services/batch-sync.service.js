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
var BatchSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchSyncService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const time_off_balance_entity_1 = require("../../time-off/entities/time-off-balance.entity");
const time_off_request_entity_1 = require("../../time-off/entities/time-off-request.entity");
const sync_event_entity_1 = require("../entities/sync-event.entity");
const crypto = __importStar(require("crypto"));
let BatchSyncService = BatchSyncService_1 = class BatchSyncService {
    constructor(balanceRepo, requestRepo, syncEventRepo) {
        this.balanceRepo = balanceRepo;
        this.requestRepo = requestRepo;
        this.syncEventRepo = syncEventRepo;
        this.logger = new common_1.Logger(BatchSyncService_1.name);
        this.STALE_BATCH_THRESHOLD_MS = 60 * 60 * 1000;
    }
    async processBatch(payload) {
        const startTime = Date.now();
        const generatedAt = new Date(payload.generatedAt);
        if (isNaN(generatedAt.getTime()) || Date.now() - generatedAt.getTime() > this.STALE_BATCH_THRESHOLD_MS) {
            throw new common_1.BadRequestException('Batch is stale or has an invalid timestamp (must be within 1 hour)');
        }
        this.logger.log(`Processing batch sync ${payload.syncId} with ${payload.balances.length} entries`);
        let updated = 0;
        let flaggedForReview = 0;
        const errors = [];
        for (const entry of payload.balances) {
            try {
                const result = await this.reconcileBalance(entry);
                if (result.updated)
                    updated++;
                if (result.flagged)
                    flaggedForReview++;
            }
            catch (err) {
                const msg = `Failed to reconcile ${entry.employeeId}/${entry.locationId}/${entry.type}: ${err.message}`;
                this.logger.error(msg);
                errors.push(msg);
            }
        }
        const duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
        await this.syncEventRepo.save(this.syncEventRepo.create({
            type: sync_event_entity_1.SyncEventType.BATCH_SYNC,
            triggeredBy: 'batch-endpoint',
            status: errors.length === 0 ? sync_event_entity_1.SyncEventStatus.SUCCESS : sync_event_entity_1.SyncEventStatus.PARTIAL,
            errorMessage: errors.length > 0 ? errors.slice(0, 3).join('; ') : undefined,
            processedAt: new Date(),
        }));
        this.logger.log(`Batch sync ${payload.syncId} complete: ${updated} updated, ${flaggedForReview} flagged, ${errors.length} errors`);
        return {
            syncId: payload.syncId,
            processed: payload.balances.length,
            updated,
            flaggedForReview,
            errors,
            duration,
        };
    }
    async reconcileBalance(entry) {
        let balance = await this.balanceRepo.findOne({
            where: { employeeId: entry.employeeId, locationId: entry.locationId, type: entry.type },
        });
        const hcmAvailable = entry.totalDays - entry.usedDays;
        const newChecksum = crypto
            .createHash('md5')
            .update(`${entry.totalDays}:${entry.usedDays}`)
            .digest('hex');
        let updated = false;
        let flagged = false;
        if (!balance) {
            balance = this.balanceRepo.create({
                employeeId: entry.employeeId,
                locationId: entry.locationId,
                type: entry.type,
                totalDays: entry.totalDays,
                usedDays: entry.usedDays,
                pendingDays: 0,
                availableDays: hcmAvailable,
                lastSyncedAt: new Date(),
                hcmChecksum: newChecksum,
            });
            await this.balanceRepo.save(balance);
            return { updated: true, flagged: false };
        }
        if (balance.hcmChecksum !== newChecksum) {
            this.logger.warn(`Balance drift for ${entry.employeeId}/${entry.locationId}/${entry.type}: ` +
                `local=${balance.totalDays}/${balance.usedDays} → hcm=${entry.totalDays}/${entry.usedDays}`);
            const previousTotal = balance.totalDays;
            balance.totalDays = entry.totalDays;
            balance.usedDays = entry.usedDays;
            balance.availableDays = hcmAvailable - balance.pendingDays;
            balance.lastSyncedAt = new Date();
            balance.hcmChecksum = newChecksum;
            await this.balanceRepo.save(balance);
            updated = true;
            await this.syncEventRepo.save(this.syncEventRepo.create({
                type: sync_event_entity_1.SyncEventType.BATCH_SYNC,
                employeeId: entry.employeeId,
                locationId: entry.locationId,
                previousBalance: previousTotal,
                newBalance: entry.totalDays,
                triggeredBy: 'batch-endpoint',
                status: sync_event_entity_1.SyncEventStatus.SUCCESS,
                processedAt: new Date(),
            }));
        }
        if (hcmAvailable < balance.pendingDays) {
            this.logger.warn(`Over-commitment detected for ${entry.employeeId}/${entry.locationId}: ` +
                `HCM available=${hcmAvailable}, pending=${balance.pendingDays}`);
            await this.requestRepo.update({
                employeeId: entry.employeeId,
                locationId: entry.locationId,
                type: entry.type,
                status: time_off_request_entity_1.RequestStatus.PENDING,
            }, { status: time_off_request_entity_1.RequestStatus.PENDING_RETRY, hcmErrorMessage: 'Flagged by batch sync: insufficient HCM balance' });
            await this.syncEventRepo.save(this.syncEventRepo.create({
                type: sync_event_entity_1.SyncEventType.RECONCILE_ALERT,
                employeeId: entry.employeeId,
                locationId: entry.locationId,
                previousBalance: balance.pendingDays,
                newBalance: hcmAvailable,
                triggeredBy: 'batch-endpoint',
                status: sync_event_entity_1.SyncEventStatus.PARTIAL,
                errorMessage: `HCM available (${hcmAvailable}) < pending (${balance.pendingDays})`,
                processedAt: new Date(),
            }));
            flagged = true;
        }
        return { updated, flagged };
    }
    async getSyncStatus() {
        const lastBatchEvent = await this.syncEventRepo.findOne({
            where: { type: sync_event_entity_1.SyncEventType.BATCH_SYNC },
            order: { createdAt: 'DESC' },
        });
        const lastRealtimeEvent = await this.syncEventRepo.findOne({
            where: { type: sync_event_entity_1.SyncEventType.REALTIME_SYNC },
            order: { createdAt: 'DESC' },
        });
        const pendingOutbox = await this.requestRepo.count({ where: { hcmDecrementConfirmed: false, status: time_off_request_entity_1.RequestStatus.APPROVED } });
        const flaggedRequests = await this.requestRepo.count({ where: { status: time_off_request_entity_1.RequestStatus.PENDING_RETRY } });
        return {
            lastBatchSync: lastBatchEvent?.processedAt ?? null,
            lastRealtimeSync: lastRealtimeEvent?.processedAt ?? null,
            pendingOutboxEvents: pendingOutbox,
            flaggedRequests,
            syncIntervalMinutes: 15,
        };
    }
};
exports.BatchSyncService = BatchSyncService;
exports.BatchSyncService = BatchSyncService = BatchSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(time_off_balance_entity_1.TimeOffBalance)),
    __param(1, (0, typeorm_1.InjectRepository)(time_off_request_entity_1.TimeOffRequest)),
    __param(2, (0, typeorm_1.InjectRepository)(sync_event_entity_1.SyncEvent)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], BatchSyncService);
//# sourceMappingURL=batch-sync.service.js.map