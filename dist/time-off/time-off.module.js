"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeOffModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const time_off_request_entity_1 = require("./entities/time-off-request.entity");
const time_off_balance_entity_1 = require("./entities/time-off-balance.entity");
const requests_service_1 = require("./services/requests.service");
const balances_service_1 = require("./services/balances.service");
const business_days_service_1 = require("./services/business-days.service");
const requests_controller_1 = require("./controllers/requests.controller");
const balances_controller_1 = require("./controllers/balances.controller");
const employee_entity_1 = require("../common/entities/employee.entity");
const location_entity_1 = require("../common/entities/location.entity");
const outbox_event_entity_1 = require("../hcm-sync/entities/outbox-event.entity");
const hcm_sync_module_1 = require("../hcm-sync/hcm-sync.module");
const manager_guard_1 = require("../common/guards/manager.guard");
let TimeOffModule = class TimeOffModule {
};
exports.TimeOffModule = TimeOffModule;
exports.TimeOffModule = TimeOffModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([time_off_request_entity_1.TimeOffRequest, time_off_balance_entity_1.TimeOffBalance, employee_entity_1.Employee, location_entity_1.Location, outbox_event_entity_1.OutboxEvent]),
            hcm_sync_module_1.HcmSyncModule,
        ],
        controllers: [requests_controller_1.RequestsController, balances_controller_1.BalancesController],
        providers: [requests_service_1.RequestsService, balances_service_1.BalancesService, business_days_service_1.BusinessDaysService, manager_guard_1.ManagerGuard],
        exports: [requests_service_1.RequestsService, balances_service_1.BalancesService, business_days_service_1.BusinessDaysService],
    })
], TimeOffModule);
//# sourceMappingURL=time-off.module.js.map