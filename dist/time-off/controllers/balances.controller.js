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
exports.BalancesController = void 0;
const common_1 = require("@nestjs/common");
const balances_service_1 = require("../services/balances.service");
let BalancesController = class BalancesController {
    constructor(balancesService) {
        this.balancesService = balancesService;
    }
    async getBalances(employeeId, locationId, fresh) {
        const useFresh = fresh !== 'false';
        return this.balancesService.getBalancesForEmployee(employeeId, locationId, useFresh);
    }
};
exports.BalancesController = BalancesController;
__decorate([
    (0, common_1.Get)(':employeeId'),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Query)('locationId')),
    __param(2, (0, common_1.Query)('fresh')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], BalancesController.prototype, "getBalances", null);
exports.BalancesController = BalancesController = __decorate([
    (0, common_1.Controller)('api/v1/time-off/balances'),
    __metadata("design:paramtypes", [balances_service_1.BalancesService])
], BalancesController);
//# sourceMappingURL=balances.controller.js.map