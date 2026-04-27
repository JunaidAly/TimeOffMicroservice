import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requestsApi } from '../../api/requests.api';
import { StatusBadge, TypeBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { TimeOffRequest, RequestStatus } from '../../types';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

interface RequestRowProps {
  request: TimeOffRequest;
  onCancel?: (id: string) => void;
  cancellingId?: string;
}

function RequestRow({ request, onCancel, cancellingId }: RequestRowProps) {
  const canCancel = request.status === 'PENDING' && onCancel;

  return (
    <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={request.type} />
          <StatusBadge status={request.status} />
          {request.hcmDecrementConfirmed && (
            <span className="rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-700 border border-green-200">
              HCM confirmed
            </span>
          )}
          {request.hcmErrorMessage && (
            <span className="rounded bg-orange-50 px-1.5 py-0.5 text-xs text-orange-700 border border-orange-200" title={request.hcmErrorMessage}>
              HCM retry pending
            </span>
          )}
        </div>

        <p className="text-sm font-medium text-gray-900">
          {formatDate(request.startDate)} → {formatDate(request.endDate)}
          <span className="ml-2 text-gray-500 font-normal">({request.daysRequested} day{request.daysRequested !== 1 ? 's' : ''})</span>
        </p>

        <p className="text-xs text-gray-400">
          {request.locationId} · Submitted {formatDate(request.createdAt)}
        </p>

        {request.notes && (
          <p className="text-xs text-gray-500 italic">"{request.notes}"</p>
        )}

        {request.managerNotes && (
          <p className="text-xs text-gray-500">
            <span className="font-medium">Manager note:</span> {request.managerNotes}
          </p>
        )}
      </div>

      {canCancel && (
        <Button
          variant="ghost"
          size="sm"
          loading={cancellingId === request.id}
          onClick={() => onCancel(request.id)}
          className="shrink-0 text-red-500 hover:bg-red-50 hover:text-red-700"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}

interface RequestListProps {
  requests: TimeOffRequest[] | undefined;
  isLoading: boolean;
  error: Error | null;
  showCancel?: boolean;
  statusFilter?: RequestStatus | 'ALL';
  onFilterChange?: (status: RequestStatus | 'ALL') => void;
}

const STATUS_FILTERS: { value: RequestStatus | 'ALL'; label: string }[] = [
  { value: 'ALL',     label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED',label: 'Approved' },
  { value: 'REJECTED',label: 'Rejected' },
  { value: 'CANCELLED',label:'Cancelled' },
];

export function RequestList({
  requests,
  isLoading,
  error,
  showCancel = false,
  statusFilter = 'ALL',
  onFilterChange,
}: RequestListProps) {
  const qc = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | undefined>();

  const cancelMutation = useMutation({
    mutationFn: (id: string) => requestsApi.cancel(id),
    onMutate: (id) => setCancellingId(id),
    onSettled: () => {
      setCancellingId(undefined);
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
    },
  });

  if (isLoading) return <LoadingSpinner label="Loading requests…" />;

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
        Failed to load requests: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      {onFilterChange && (
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={[
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                statusFilter === f.value
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-500 hover:text-gray-800',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Rows */}
      {!requests || requests.length === 0 ? (
        <EmptyState
          title="No requests found"
          description="Time-off requests will appear here once submitted."
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
      ) : (
        requests.map((r) => (
          <RequestRow
            key={r.id}
            request={r}
            onCancel={showCancel ? (id) => cancelMutation.mutate(id) : undefined}
            cancellingId={cancellingId}
          />
        ))
      )}
    </div>
  );
}
