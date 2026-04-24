"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HcmClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HcmClientService = void 0;
const common_1 = require("@nestjs/common");
const HCM_BASE_URL = process.env.HCM_BASE_URL || 'http://localhost:3000/mock-hcm';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
let HcmClientService = HcmClientService_1 = class HcmClientService {
    constructor() {
        this.logger = new common_1.Logger(HcmClientService_1.name);
    }
    async getBalance(employeeId, locationId, type) {
        const url = `${HCM_BASE_URL}/balances/${employeeId}/${locationId}/${type}`;
        return this.withRetry(() => this.fetchJson(url, 'GET'), `getBalance(${employeeId},${locationId},${type})`);
    }
    async updateBalance(employeeId, locationId, type, delta, idempotencyKey) {
        const url = `${HCM_BASE_URL}/balances/${employeeId}/${locationId}/${type}`;
        return this.withRetry(() => this.fetchJson(url, 'PUT', { delta }, { 'X-Idempotency-Key': idempotencyKey }), `updateBalance(${employeeId},${locationId},${type},delta=${delta})`);
    }
    async withRetry(fn, label) {
        let lastError = null;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                return await fn();
            }
            catch (err) {
                lastError = err;
                const isRetryable = this.isRetryableError(err);
                this.logger.warn(`HCM [${label}] attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`);
                if (!isRetryable || attempt === MAX_RETRIES)
                    break;
                const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                await new Promise((r) => setTimeout(r, delay));
            }
        }
        throw new common_1.ServiceUnavailableException({
            error: 'HCM_UNAVAILABLE',
            message: `HCM system unavailable: ${lastError?.message}`,
        });
    }
    isRetryableError(err) {
        const status = err?.status;
        return !status || status >= 500;
    }
    async fetchJson(url, method, body, headers) {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const err = new Error(`HCM ${response.status}: ${JSON.stringify(errorBody)}`);
            err.status = response.status;
            throw err;
        }
        return response.json();
    }
};
exports.HcmClientService = HcmClientService;
exports.HcmClientService = HcmClientService = HcmClientService_1 = __decorate([
    (0, common_1.Injectable)()
], HcmClientService);
//# sourceMappingURL=hcm-client.service.js.map