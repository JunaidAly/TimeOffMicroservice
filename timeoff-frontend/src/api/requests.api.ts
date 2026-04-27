import { apiClient } from './client';
import type {
  TimeOffRequest,
  PaginatedRequests,
  CreateRequestPayload,
  ApproveRejectPayload,
  RequestStatus,
} from '../types';

export interface ListRequestsParams {
  status?: RequestStatus;
  employeeId?: string;
  page?: number;
  limit?: number;
}

export const requestsApi = {
  list(params: ListRequestsParams = {}): Promise<PaginatedRequests> {
    return apiClient
      .get<PaginatedRequests>('/api/v1/time-off/requests', { params })
      .then((r) => r.data);
  },

  getOne(id: string): Promise<TimeOffRequest> {
    return apiClient
      .get<TimeOffRequest>(`/api/v1/time-off/requests/${id}`)
      .then((r) => r.data);
  },

  create(payload: CreateRequestPayload, idempotencyKey?: string): Promise<TimeOffRequest> {
    return apiClient
      .post<TimeOffRequest>('/api/v1/time-off/requests', payload, {
        headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : {},
      })
      .then((r) => r.data);
  },

  approve(id: string, payload: ApproveRejectPayload): Promise<TimeOffRequest> {
    return apiClient
      .patch<TimeOffRequest>(`/api/v1/time-off/requests/${id}/approve`, payload)
      .then((r) => r.data);
  },

  reject(id: string, payload: ApproveRejectPayload): Promise<TimeOffRequest> {
    return apiClient
      .patch<TimeOffRequest>(`/api/v1/time-off/requests/${id}/reject`, payload)
      .then((r) => r.data);
  },

  cancel(id: string): Promise<TimeOffRequest> {
    return apiClient
      .patch<TimeOffRequest>(`/api/v1/time-off/requests/${id}/cancel`, {})
      .then((r) => r.data);
  },
};
