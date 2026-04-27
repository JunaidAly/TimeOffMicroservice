import { apiClient } from './client';
import type { EmployeeBalances } from '../types';

export const balancesApi = {
  getForEmployee(
    employeeId: string,
    locationId?: string,
    fresh = true,
  ): Promise<EmployeeBalances> {
    return apiClient
      .get<EmployeeBalances>(`/api/v1/time-off/balances/${employeeId}`, {
        params: { locationId, fresh },
      })
      .then((r) => r.data);
  },
};
