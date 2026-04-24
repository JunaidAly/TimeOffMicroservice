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
exports.MockHcmController = void 0;
const common_1 = require("@nestjs/common");
const mock_hcm_service_1 = require("./mock-hcm.service");
let MockHcmController = class MockHcmController {
    constructor(mockHcmService) {
        this.mockHcmService = mockHcmService;
    }
    getBalance(employeeId, locationId, type) {
        return this.mockHcmService.getBalance(employeeId, locationId, type);
    }
    updateBalance(employeeId, locationId, type, body, idempotencyKey) {
        if (!idempotencyKey)
            throw new common_1.BadRequestException('X-Idempotency-Key header is required');
        if (body.delta === undefined)
            throw new common_1.BadRequestException('delta is required');
        return this.mockHcmService.updateBalance(employeeId, locationId, type, body.delta, idempotencyKey);
    }
    getAllBalances() {
        return this.mockHcmService.getAllBalances();
    }
    getBatchPayload() {
        return this.mockHcmService.buildBatchPayload();
    }
    simulateAnniversaryBonus(body) {
        if (!body.employeeId || !body.bonusDays) {
            throw new common_1.BadRequestException('employeeId and bonusDays are required');
        }
        return this.mockHcmService.simulateAnniversaryBonus(body.employeeId, body.bonusDays);
    }
    simulateYearlyRefresh() {
        return this.mockHcmService.simulateYearlyRefresh();
    }
};
exports.MockHcmController = MockHcmController;
__decorate([
    (0, common_1.Get)('balances/:employeeId/:locationId/:type'),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Param)('locationId')),
    __param(2, (0, common_1.Param)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], MockHcmController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Put)('balances/:employeeId/:locationId/:type'),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Param)('locationId')),
    __param(2, (0, common_1.Param)('type')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Headers)('x-idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, String]),
    __metadata("design:returntype", void 0)
], MockHcmController.prototype, "updateBalance", null);
__decorate([
    (0, common_1.Get)('balances'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MockHcmController.prototype, "getAllBalances", null);
__decorate([
    (0, common_1.Post)('batch-push'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MockHcmController.prototype, "getBatchPayload", null);
__decorate([
    (0, common_1.Post)('simulate/anniversary-bonus'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MockHcmController.prototype, "simulateAnniversaryBonus", null);
__decorate([
    (0, common_1.Post)('simulate/yearly-refresh'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MockHcmController.prototype, "simulateYearlyRefresh", null);
exports.MockHcmController = MockHcmController = __decorate([
    (0, common_1.Controller)('mock-hcm'),
    __metadata("design:paramtypes", [mock_hcm_service_1.MockHcmService])
], MockHcmController);
//# sourceMappingURL=mock-hcm.controller.js.map