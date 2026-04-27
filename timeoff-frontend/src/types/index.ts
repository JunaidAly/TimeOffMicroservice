export type TimeOffType = 'VACATION' | 'SICK' | 'PERSONAL';

export type RequestStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'PENDING_RETRY';

export type EmployeeRole = 'EMPLOYEE' | 'MANAGER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
}

export interface Location {
  id: string;
  name: string;
  country: string;
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  locationId: string;
  type: TimeOffType;
  startDate: string;
  endDate: string;
  daysRequested: number;
  status: RequestStatus;
  notes: string | null;
  managerId: string | null;
  managerNotes: string | null;
  hcmDecrementConfirmed: boolean;
  hcmErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
}

export interface PaginatedRequests {
  data: TimeOffRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface BalanceView {
  locationId: string;
  locationName: string;
  type: TimeOffType;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
  lastSyncedAt: string | null;
  source: 'hcm-realtime' | 'cache' | 'cache-stale';
}

export interface EmployeeBalances {
  employeeId: string;
  balances: BalanceView[];
}

export interface CreateRequestPayload {
  employeeId: string;
  locationId: string;
  type: TimeOffType;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface ApproveRejectPayload {
  managerNotes?: string;
}

export interface SyncStatus {
  lastBatchSyncAt: string | null;
  pendingOutboxEvents: number;
  failedOutboxEvents: number;
}

export interface HcmBalance {
  employeeId: string;
  locationId: string;
  type: TimeOffType;
  totalDays: number;
  usedDays: number;
  availableDays: number;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  details?: Record<string, unknown>;
}
