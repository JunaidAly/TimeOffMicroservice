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
exports.SyncEvent = exports.SyncEventStatus = exports.SyncEventType = void 0;
const typeorm_1 = require("typeorm");
var SyncEventType;
(function (SyncEventType) {
    SyncEventType["BATCH_SYNC"] = "BATCH_SYNC";
    SyncEventType["REALTIME_SYNC"] = "REALTIME_SYNC";
    SyncEventType["ANNIVERSARY_BONUS"] = "ANNIVERSARY_BONUS";
    SyncEventType["YEARLY_REFRESH"] = "YEARLY_REFRESH";
    SyncEventType["MANUAL_RECONCILE"] = "MANUAL_RECONCILE";
    SyncEventType["RECONCILE_ALERT"] = "RECONCILE_ALERT";
})(SyncEventType || (exports.SyncEventType = SyncEventType = {}));
var SyncEventStatus;
(function (SyncEventStatus) {
    SyncEventStatus["SUCCESS"] = "SUCCESS";
    SyncEventStatus["PARTIAL"] = "PARTIAL";
    SyncEventStatus["FAILED"] = "FAILED";
})(SyncEventStatus || (exports.SyncEventStatus = SyncEventStatus = {}));
let SyncEvent = class SyncEvent {
};
exports.SyncEvent = SyncEvent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SyncEvent.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SyncEvent.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], SyncEvent.prototype, "employeeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], SyncEvent.prototype, "locationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'real', nullable: true }),
    __metadata("design:type", Object)
], SyncEvent.prototype, "previousBalance", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'real', nullable: true }),
    __metadata("design:type", Object)
], SyncEvent.prototype, "newBalance", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SyncEvent.prototype, "triggeredBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SyncEvent.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], SyncEvent.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], SyncEvent.prototype, "processedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SyncEvent.prototype, "createdAt", void 0);
exports.SyncEvent = SyncEvent = __decorate([
    (0, typeorm_1.Entity)('sync_events')
], SyncEvent);
//# sourceMappingURL=sync-event.entity.js.map