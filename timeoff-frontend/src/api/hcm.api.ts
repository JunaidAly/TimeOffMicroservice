import { apiClient } from './client';
import type { HcmBalance, SyncStatus } from '../types';

export const hcmApi = {
  getSyncStatus(): Promise<SyncStatus> {
    return apiClient.get<SyncStatus>('/api/v1/hcm-sync/status').then((r) => r.data);
  },

  triggerBatchSync(): Promise<unknown> {
    return apiClient.post('/mock-hcm/batch-push').then((r) => r.data);
  },

  getAllBalances(): Promise<HcmBalance[]> {
    return apiClient.get<HcmBalance[]>('/mock-hcm/balances').then((r) => r.data);
  },

  simulateAnniversaryBonus(employeeId: string, bonusDays: number): Promise<unknown> {
    return apiClient
      .post('/mock-hcm/simulate/anniversary-bonus', { employeeId, bonusDays })
      .then((r) => r.data);
  },

  simulateYearlyRefresh(): Promise<unknown> {
    return apiClient.post('/mock-hcm/simulate/yearly-refresh').then((r) => r.data);
  },
};
