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
var IdempotencyInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const time_off_request_entity_1 = require("../../time-off/entities/time-off-request.entity");
let IdempotencyInterceptor = IdempotencyInterceptor_1 = class IdempotencyInterceptor {
    constructor(requestRepo) {
        this.requestRepo = requestRepo;
        this.logger = new common_1.Logger(IdempotencyInterceptor_1.name);
    }
    async intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const idempotencyKey = request.headers['x-idempotency-key'];
        if (!idempotencyKey) {
            return next.handle();
        }
        const existing = await this.requestRepo.findOne({ where: { idempotencyKey } });
        if (existing) {
            this.logger.warn(`Duplicate idempotency key: ${idempotencyKey}`);
            throw new common_1.ConflictException({
                error: 'DUPLICATE_REQUEST',
                message: 'A request with this idempotency key already exists',
                existingRequestId: existing.id,
            });
        }
        return next.handle().pipe((0, rxjs_1.tap)(() => {
            this.logger.debug(`Processed idempotency key: ${idempotencyKey}`);
        }));
    }
};
exports.IdempotencyInterceptor = IdempotencyInterceptor;
exports.IdempotencyInterceptor = IdempotencyInterceptor = IdempotencyInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(time_off_request_entity_1.TimeOffRequest)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], IdempotencyInterceptor);
//# sourceMappingURL=idempotency.interceptor.js.map