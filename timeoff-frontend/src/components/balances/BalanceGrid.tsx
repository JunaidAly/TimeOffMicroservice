import { SourceBadge, TypeBadge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import type { BalanceView } from '../../types';

interface BalanceCardProps {
  balance: BalanceView;
}

function BalanceCard({ balance }: BalanceCardProps) {
  const pct = balance.totalDays > 0
    ? Math.round((balance.availableDays / balance.totalDays) * 100)
    : 0;

  const barColor =
    pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">{balance.locationName}</p>
          <p className="text-xs text-gray-400">{balance.locationId}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <TypeBadge type={balance.type} />
          <SourceBadge source={balance.source} />
        </div>
      </div>

      {/* Available days — hero number */}
      <div className="mb-3">
        <span className="text-4xl font-bold tabular-nums text-gray-900">
          {balance.availableDays}
        </span>
        <span className="ml-1 text-sm text-gray-500">/ {balance.totalDays} days available</span>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span>
          <span className="font-medium text-gray-700">{balance.usedDays}</span> used
        </span>
        {balance.pendingDays > 0 && (
          <span>
            <span className="font-medium text-amber-600">{balance.pendingDays}</span> pending
          </span>
        )}
        {balance.lastSyncedAt && (
          <span className="ml-auto truncate">
            synced {new Date(balance.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}

interface BalanceGridProps {
  balances: BalanceView[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function BalanceGrid({ balances, isLoading, error }: BalanceGridProps) {
  if (isLoading) return <LoadingSpinner label="Fetching balances from HCM…" />;

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
        Failed to load balances: {error.message}
      </div>
    );
  }

  if (!balances || balances.length === 0) {
    return (
      <EmptyState
        title="No balances yet"
        description="Submit your first time-off request to initialize your balances."
        icon={
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {balances.map((b) => (
        <BalanceCard key={`${b.locationId}-${b.type}`} balance={b} />
      ))}
    </div>
  );
}
