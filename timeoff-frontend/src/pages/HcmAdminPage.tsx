import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { TypeBadge } from '../components/ui/Badge';
import { hcmApi } from '../api/hcm.api';
import { SEEDED_USERS } from '../context/AuthContext';
import type { HcmBalance } from '../types';

const EMPLOYEES = SEEDED_USERS.filter((u) => u.role === 'EMPLOYEE');

function SyncStatusCard() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['sync-status'],
    queryFn: hcmApi.getSyncStatus,
    refetchInterval: 15_000,
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Sync Status</h3>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <svg className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner size="sm" label="Fetching sync status…" />
      ) : error ? (
        <p className="text-sm text-red-600">{(error as Error).message}</p>
      ) : data ? (
        <div className="grid grid-cols-3 gap-4 text-center">
          <StatTile
            label="Last Batch Sync"
            value={data.lastBatchSyncAt ? new Date(data.lastBatchSyncAt).toLocaleString() : 'Never'}
            subtle
          />
          <StatTile
            label="Pending Outbox"
            value={String(data.pendingOutboxEvents)}
            highlight={data.pendingOutboxEvents > 0 ? 'amber' : 'green'}
          />
          <StatTile
            label="Failed Outbox"
            value={String(data.failedOutboxEvents)}
            highlight={data.failedOutboxEvents > 0 ? 'red' : 'green'}
          />
        </div>
      ) : null}
    </div>
  );
}

function StatTile({
  label,
  value,
  highlight,
  subtle,
}: {
  label: string;
  value: string;
  highlight?: 'green' | 'amber' | 'red';
  subtle?: boolean;
}) {
  const colorMap = {
    green: 'text-green-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  };
  const valueClass = highlight ? colorMap[highlight] : subtle ? 'text-gray-500 text-sm' : 'text-gray-900';

  return (
    <div className="rounded-xl bg-gray-50 px-4 py-3">
      <p className={`font-semibold ${valueClass}`}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-400">{label}</p>
    </div>
  );
}

function AnniversaryBonusForm() {
  const [employeeId, setEmployeeId] = useState(EMPLOYEES[0]?.id ?? '');
  const [bonusDays, setBonusDays] = useState('5');
  const [result, setResult] = useState<string | null>(null);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => hcmApi.simulateAnniversaryBonus(employeeId, Number(bonusDays)),
    onSuccess: (data) => {
      setResult(JSON.stringify(data, null, 2));
      qc.invalidateQueries({ queryKey: ['hcm-balances'] });
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        const d = err.response?.data as { message?: string } | undefined;
        setResult(`Error: ${d?.message ?? err.message}`);
      } else {
        setResult(`Error: ${(err as Error).message}`);
      }
    },
  });

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Anniversary Bonus</h3>
        <p className="text-sm text-gray-500">Simulate HCM adding a work anniversary bonus to an employee's balance.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">Employee</label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputCls}>
            {EMPLOYEES.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">Bonus Days</label>
          <input
            type="number"
            min={1}
            max={30}
            value={bonusDays}
            onChange={(e) => setBonusDays(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <Button
        variant="secondary"
        loading={mutation.isPending}
        onClick={() => { setResult(null); mutation.mutate(); }}
      >
        Trigger Anniversary Bonus
      </Button>

      {result && (
        <pre className="rounded-lg bg-gray-800 p-4 text-xs text-green-300 overflow-auto max-h-40">
          {result}
        </pre>
      )}
    </div>
  );
}

function YearlyRefreshPanel() {
  const [result, setResult] = useState<string | null>(null);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => hcmApi.simulateYearlyRefresh(),
    onSuccess: (data) => {
      setResult(JSON.stringify(data, null, 2));
      qc.invalidateQueries({ queryKey: ['hcm-balances'] });
    },
    onError: (err) => {
      setResult(`Error: ${(err as Error).message}`);
    },
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Yearly Refresh</h3>
        <p className="text-sm text-gray-500">Reset all employees' balances as if it's the start of a new year.</p>
      </div>

      <Button
        variant="secondary"
        loading={mutation.isPending}
        onClick={() => { setResult(null); mutation.mutate(); }}
      >
        Trigger Yearly Refresh
      </Button>

      {result && (
        <pre className="rounded-lg bg-gray-800 p-4 text-xs text-green-300 overflow-auto max-h-40">
          {result}
        </pre>
      )}
    </div>
  );
}

function BatchSyncPanel() {
  const [result, setResult] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => hcmApi.triggerBatchSync(),
    onSuccess: (data) => setResult(JSON.stringify(data, null, 2)),
    onError: (err) => {
      setResult(`Error: ${(err as Error).message}`);
    },
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Batch Sync</h3>
        <p className="text-sm text-gray-500">Push the full HCM balance corpus to ExampleHR — simulates HCM's nightly batch.</p>
      </div>

      <Button loading={mutation.isPending} onClick={() => { setResult(null); mutation.mutate(); }}>
        Trigger Batch Sync
      </Button>

      {result && (
        <pre className="rounded-lg bg-gray-800 p-4 text-xs text-green-300 overflow-auto max-h-40">
          {result}
        </pre>
      )}
    </div>
  );
}

function HcmBalancesTable() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['hcm-balances'],
    queryFn: hcmApi.getAllBalances,
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">HCM Raw Balances</h3>
        <p className="text-sm text-gray-500">Source of truth from the Mock HCM store</p>
      </div>

      {isLoading ? (
        <div className="p-6"><LoadingSpinner label="Fetching HCM balances…" /></div>
      ) : error ? (
        <p className="p-6 text-sm text-red-600">{(error as Error).message}</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Employee', 'Location', 'Type', 'Total', 'Used', 'Available'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(data as HcmBalance[] | undefined ?? []).map((b, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5 text-gray-700">{b.employeeId}</td>
                <td className="px-4 py-2.5 text-gray-500">{b.locationId}</td>
                <td className="px-4 py-2.5"><TypeBadge type={b.type} /></td>
                <td className="px-4 py-2.5 tabular-nums text-gray-900 font-medium">{b.totalDays}</td>
                <td className="px-4 py-2.5 tabular-nums text-gray-500">{b.usedDays}</td>
                <td className="px-4 py-2.5 tabular-nums font-semibold text-green-700">{b.availableDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function HcmAdminPage() {
  return (
    <Layout
      title="HCM Admin"
      subtitle="Inspect HCM state and trigger synchronization events"
    >
      <div className="space-y-6">
        <SyncStatusCard />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnniversaryBonusForm />
          <YearlyRefreshPanel />
          <BatchSyncPanel />
        </div>

        <HcmBalancesTable />
      </div>
    </Layout>
  );
}
