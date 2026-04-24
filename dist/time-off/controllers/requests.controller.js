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
exports.RequestsController = void 0;
const common_1 = require("@nestjs/common");
const requests_service_1 = require("../services/requests.service");
const create_request_dto_1 = require("../dto/create-request.dto");
const approve_reject_dto_1 = require("../dto/approve-reject.dto");
const list_requests_dto_1 = require("../dto/list-requests.dto");
const manager_guard_1 = require("../../common/guards/manager.guard");
let RequestsController = class RequestsController {
    constructor(requestsService) {
        this.requestsService = requestsService;
    }
    async create(dto, idempotencyKey) {
        return this.requestsService.createRequest(dto, idempotencyKey);
    }
    async list(query, requesterId, managerId) {
        const isManager = !!managerId;
        const actorId = managerId || requesterId;
        return this.requestsService.listRequests(query, actorId, isManager);
    }
    async getOne(id) {
        return this.requestsService.getRequest(id);
    }
    async approve(id, dto, req) {
        return this.requestsService.approveRequest(id, req.manager, dto);
    }
    async reject(id, dto, req) {
        return this.requestsService.rejectRequest(id, req.manager, dto);
    }
    async cancel(id, employeeId) {
        return this.requestsService.cancelRequest(id, employeeId);
    }
};
exports.RequestsController = RequestsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_request_dto_1.CreateRequestDto, String]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Headers)('x-employee-id')),
    __param(2, (0, common_1.Headers)('x-manager-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_requests_dto_1.ListRequestsDto, String, String]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "getOne", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, common_1.UseGuards)(manager_guard_1.ManagerGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, approve_reject_dto_1.ApproveRejectDto, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "approve", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    (0, common_1.UseGuards)(manager_guard_1.ManagerGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, approve_reject_dto_1.ApproveRejectDto, Object]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "reject", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-employee-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RequestsController.prototype, "cancel", null);
exports.RequestsController = RequestsController = __decorate([
    (0, common_1.Controller)('api/v1/time-off/requests'),
    __metadata("design:paramtypes", [requests_service_1.RequestsService])
], RequestsController);
//# sourceMappingURL=requests.controller.js.map