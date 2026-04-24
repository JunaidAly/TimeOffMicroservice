import { MockHcmService } from './mock-hcm.service';
export declare class MockHcmController {
    private readonly mockHcmService;
    constructor(mockHcmService: MockHcmService);
    getBalance(employeeId: string, locationId: string, type: string): import("./mock-hcm.service").HcmBalanceRecord;
    updateBalance(employeeId: string, locationId: string, type: string, body: {
        delta: number;
    }, idempotencyKey: string): import("./mock-hcm.service").HcmBalanceRecord;
    getAllBalances(): import("./mock-hcm.service").HcmBalanceRecord[];
    getBatchPayload(): object;
    simulateAnniversaryBonus(body: {
        employeeId: string;
        bonusDays: number;
    }): import("./mock-hcm.service").HcmBalanceRecord[];
    simulateYearlyRefresh(): {
        refreshed: number;
    };
}
