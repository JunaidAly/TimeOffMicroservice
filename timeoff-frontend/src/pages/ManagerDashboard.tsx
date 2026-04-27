import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Layout } from '../components/layout/Layout';
import { StatusBadge, TypeBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { requestsApi } from '../api/requests.api';
import { SEEDED_USERS } from '../context/AuthContext';
import type { TimeOffRequest, RequestStatus } from '../types';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const EMPLOYEE_MAP = Object.fromEntries(SEEDED_USERS.map((u) => [u.id, u.name]));

interface ActionModalProps {
  request: TimeOffRequest | null;
  action: 'approve' | 'reject' | null;
  onClose: () => void;
}

function ActionModal({ request, action, onClose }: ActionModalProps) {
  const [notes, setNotes] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      if (!request || !action) throw new Error('Missing request/action');
      const fn = action === 'approve' ? requestsApi.approve : requestsApi.reject;
      return fn(request.id, { managerNotes: notes || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      onClose();
      setNotes('');
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string } | undefined;
        setApiError(data?.message ?? err.message);
      } else {
        setApiError('Unexpected error.');
      }
    },
  });

  const isApprove = action === 'approve';

  return (
    <Modal
      open={!!request && !!action}
      onClose={() => { onClose(); setNotes(''); setApiError(null); }}
      title={isApprove ? 'Approve Request' : 'Reject Request'}
    >
      {request && (
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
            <p><span className="font-medium">Employee:</span> {EMPLOYEE_MAP[request.employeeId] ?? request.employeeId}</p>
            <p><span className="font-medium">Type:</span> <TypeBadge type={request.type} /></p>
            <p><span className="font-medium">Dates:</span> {formatDate(request.startDate)} → {formatDate(request.endDate)}</p>
            <p><span className="font-medium">Days:</span> {request.daysRequested}</p>
            {request.notes && <p><span className="font-medium">Note:</span> {request.notes}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Manager notes {isApprove ? '(optional)' : '(recommended)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
              placeholder={isApprove ? 'Any notes for the employee…' : 'Reason for rejection…'}
            />
          </div>

          {apiError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{apiError}</div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
              variant={isApprove ? 'success' : 'danger'}
              loading={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {isApprove ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

interface PendingCardProps {
  request: TimeOffRequest;
  onApprove: () => void;
  onReject: () => void;
}

function PendingCard({ request, onApprove, onReject }: PendingCardProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-semibold text-gray-900 text-sm">
          {EMPLOYEE_MAP[request.employeeId] ?? request.employeeId}
        </span>
        <TypeBadge type={request.type} />
        <StatusBadge status={request.status} />
      </div>

      <p className="mb-1 text-sm text-gray-700">
        {formatDate(request.startDate)} → {formatDate(request.endDate)}
        <span className="ml-2 text-gray-500">({request.daysRequested} days)</span>
      </p>
      <p className="mb-3 text-xs text-gray-400">
        {request.locationId} · Submitted {formatDate(request.createdAt)}
      </p>

      {request.notes && (
        <p className="mb-3 text-xs text-gray-500 italic">"{request.notes}"</p>
      )}

      <div className="flex gap-2">
        <Button variant="success" size="sm" onClick={onApprove}>Approve</Button>
        <Button variant="danger"  size="sm" onClick={onReject}>Reject</Button>
      </div>
    </div>
  );
}

const STATUS_FILTERS: { value: RequestStatus | 'ALL'; label: string }[] = [
  { value: 'ALL',      label: 'All' },
  { value: 'PENDING',  label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

export function ManagerDashboard() {
  const [activeRequest, setActiveRequest] = useState<TimeOffRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [historyFilter, setHistoryFilter] = useState<RequestStatus | 'ALL'>('ALL');

  const pendingQuery = useQuery({
    queryKey: ['requests', 'manager', 'pending'],
    queryFn: () => requestsApi.list({ status: 'PENDING', limit: 50 }),
    refetchInterval: 30_000,
  });

  const historyQuery = useQuery({
    queryKey: ['requests', 'manager', 'all', historyFilter],
    queryFn: () =>
      requestsApi.list({
        status: historyFilter === 'ALL' ? undefined : historyFilter,
        limit: 50,
      }),
  });

  const openAction = (request: TimeOffRequest, action: 'approve' | 'reject') => {
    setActiveRequest(request);
    setActionType(action);
  };

  const closeAction = () => {
    setActiveRequest(null);
    setActionType(null);
  };

  const pendingCount = pendingQuery.data?.total ?? 0;

  return (
    <Layout
      title="Team Requests"
      subtitle="Review and action your team's time-off requests"
    >
      <div className="space-y-8">
        {/* Pending approvals */}
        <section>
          <h2 className="mb-4 text-base font-semibold text-gray-900 flex items-center gap-2">
            Pending Approval
            {pendingCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                {pendingCount}
              </span>
            )}
          </h2>

          {pendingQuery.isLoading ? (
            <LoadingSpinner label="Loading pending requests…" />
          ) : pendingQuery.error ? (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              Failed to load: {pendingQuery.error.message}
            </div>
          ) : (pendingQuery.data?.data ?? []).length === 0 ? (
            <EmptyState
              title="All caught up!"
              description="No pending requests require your attention."
              icon={
                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pendingQuery.data!.data.map((r) => (
                <PendingCard
                  key={r.id}
                  request={r}
                  onApprove={() => openAction(r, 'approve')}
                  onReject={() => openAction(r, 'reject')}
                />
              ))}
            </div>
          )}
        </section>

        {/* Full history */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Request History
            </h2>
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setHistoryFilter(f.value)}
                  className={[
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    historyFilter === f.value
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-500 hover:text-gray-800',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {historyQuery.isLoading ? (
            <LoadingSpinner label="Loading history…" />
          ) : historyQuery.error ? (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              Failed to load: {historyQuery.error.message}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {(historyQuery.data?.data ?? []).length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-gray-400">No requests found.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Employee', 'Type', 'Dates', 'Days', 'Status', 'Submitted'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyQuery.data!.data.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                          {EMPLOYEE_MAP[r.employeeId] ?? r.employeeId}
                        </td>
                        <td className="px-4 py-3"><TypeBadge type={r.type} /></td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {formatDate(r.startDate)} → {formatDate(r.endDate)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.daysRequested}</td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                          {formatDate(r.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      </div>

      <ActionModal
        request={activeRequest}
        action={actionType}
        onClose={closeAction}
      />
    </Layout>
  );
}
