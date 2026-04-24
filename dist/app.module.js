"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_1 = require("@nestjs/schedule");
const employee_entity_1 = require("./common/entities/employee.entity");
const location_entity_1 = require("./common/entities/location.entity");
const time_off_request_entity_1 = require("./time-off/entities/time-off-request.entity");
const time_off_balance_entity_1 = require("./time-off/entities/time-off-balance.entity");
const outbox_event_entity_1 = require("./hcm-sync/entities/outbox-event.entity");
const sync_event_entity_1 = require("./hcm-sync/entities/sync-event.entity");
const time_off_module_1 = require("./time-off/time-off.module");
const hcm_sync_module_1 = require("./hcm-sync/hcm-sync.module");
const mock_hcm_module_1 = require("./mock-hcm/mock-hcm.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRoot({
                type: 'sqlite',
                database: process.env.DB_PATH || 'timeoff.db',
                entities: [employee_entity_1.Employee, location_entity_1.Location, time_off_request_entity_1.TimeOffRequest, time_off_balance_entity_1.TimeOffBalance, outbox_event_entity_1.OutboxEvent, sync_event_entity_1.SyncEvent],
                synchronize: true,
                logging: process.env.NODE_ENV === 'development',
            }),
            schedule_1.ScheduleModule.forRoot(),
            time_off_module_1.TimeOffModule,
            hcm_sync_module_1.HcmSyncModule,
            mock_hcm_module_1.MockHcmModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map