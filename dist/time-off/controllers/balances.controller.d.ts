import { BalancesService } from '../services/balances.service';
export declare class BalancesController {
    private readonly balancesService;
    constructor(balancesService: BalancesService);
    getBalances(employeeId: string, locationId?: string, fresh?: string): Promise<{
        employeeId: string;
        balances: import("../services/balances.service").BalanceView[];
    }>;
}
