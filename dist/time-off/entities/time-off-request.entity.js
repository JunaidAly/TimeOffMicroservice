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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeOffRequest = exports.RequestStatus = exports.TimeOffType = void 0;
const typeorm_1 = require("typeorm");
var TimeOffType;
(function (TimeOffType) {
    TimeOffType["VACATION"] = "VACATION";
    TimeOffType["SICK"] = "SICK";
    TimeOffType["PERSONAL"] = "PERSONAL";
})(TimeOffType || (exports.TimeOffType = TimeOffType = {}));
var RequestStatus;
(function (RequestStatus) {
    RequestStatus["DRAFT"] = "DRAFT";
    RequestStatus["PENDING"] = "PENDING";
    RequestStatus["APPROVED"] = "APPROVED";
    RequestStatus["REJECTED"] = "REJECTED";
    RequestStatus["CANCELLED"] = "CANCELLED";
    RequestStatus["PENDING_RETRY"] = "PENDING_RETRY";
})(RequestStatus || (exports.RequestStatus = RequestStatus = {}));
let TimeOffRequest = class TimeOffRequest {
};
exports.TimeOffRequest = TimeOffRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TimeOffRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TimeOffRequest.prototype, "employeeId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TimeOffRequest.prototype, "locationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], TimeOffRequest.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], TimeOffRequest.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], TimeOffRequest.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'real' }),
    __metadata("design:type", Number)
], TimeOffRequest.prototype, "daysRequested", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: RequestStatus.PENDING }),
    __metadata("design:type", String)
], TimeOffRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], TimeOffRequest.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], TimeOffRequest.prototype, "managerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], TimeOffRequest.prototype, "managerNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', unique: true, nullable: true }),
    __metadata("design:type", Object)
], TimeOffRequest.prototype, "idempotencyKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], TimeOffRequest.prototype, "hcmDecrementConfirmed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], TimeOffRequest.prototype, "hcmErrorMessage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TimeOffRequest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], TimeOffRequest.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], TimeOffRequest.prototype, "approvedAt", void 0);
exports.TimeOffRequest = TimeOffRequest = __decorate([
    (0, typeorm_1.Entity)('time_off_requests'),
    (0, typeorm_1.Index)(['employeeId', 'status']),
    (0, typeorm_1.Index)(['locationId', 'status'])
], TimeOffRequest);
//# sourceMappingURL=time-off-request.entity.js.map