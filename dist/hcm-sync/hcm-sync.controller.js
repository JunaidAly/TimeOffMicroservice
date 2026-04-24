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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HcmSyncController = void 0;
const common_1 = require("@nestjs/common");
const batch_sync_service_1 = require("./services/batch-sync.service");
let HcmSyncController = class HcmSyncController {
    constructor(batchSyncService) {
        this.batchSyncService = batchSyncService;
    }
    async processBatch(payload) {
        return this.batchSyncService.processBatch(payload);
    }
    async getStatus() {
        return this.batchSyncService.getSyncStatus();
    }
};
exports.HcmSyncController = HcmSyncController;
__decorate([
    (0, common_1.Post)('batch'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HcmSyncController.prototype, "processBatch", null);
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HcmSyncController.prototype, "getStatus", null);
exports.HcmSyncController = HcmSyncController = __decorate([
    (0, common_1.Controller)('api/v1/hcm-sync'),
    __metadata("design:paramtypes", [batch_sync_service_1.BatchSyncService])
], HcmSyncController);
//# sourceMappingURL=hcm-sync.controller.js.map