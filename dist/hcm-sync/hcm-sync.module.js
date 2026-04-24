"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HcmSyncModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const outbox_event_entity_1 = require("./entities/outbox-event.entity");
const sync_event_entity_1 = require("./entities/sync-event.entity");
const hcm_client_service_1 = require("./services/hcm-client.service");
const batch_sync_service_1 = require("./services/batch-sync.service");
const outbox_worker_service_1 = require("./services/outbox-worker.service");
const sync_scheduler_service_1 = require("./services/sync-scheduler.service");
const hcm_sync_controller_1 = require("./hcm-sync.controller");
const time_off_request_entity_1 = require("../time-off/entities/time-off-request.entity");
const time_off_balance_entity_1 = require("../time-off/entities/time-off-balance.entity");
const hcm_client_interface_1 = require("./interfaces/hcm-client.interface");
let HcmSyncModule = class HcmSyncModule {
};
exports.HcmSyncModule = HcmSyncModule;
exports.HcmSyncModule = HcmSyncModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([outbox_event_entity_1.OutboxEvent, sync_event_entity_1.SyncEvent, time_off_request_entity_1.TimeOffRequest, time_off_balance_entity_1.TimeOffBalance]),
        ],
        controllers: [hcm_sync_controller_1.HcmSyncController],
        providers: [
            {
                provide: hcm_client_interface_1.HCM_CLIENT,
                useClass: hcm_client_service_1.HcmClientService,
            },
            batch_sync_service_1.BatchSyncService,
            outbox_worker_service_1.OutboxWorkerService,
            sync_scheduler_service_1.SyncSchedulerService,
        ],
        exports: [hcm_client_interface_1.HCM_CLIENT, batch_sync_service_1.BatchSyncService],
    })
], HcmSyncModule);
//# sourceMappingURL=hcm-sync.module.js.map