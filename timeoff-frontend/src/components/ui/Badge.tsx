import type { RequestStatus, TimeOffType } from '../../types';

const STATUS_STYLES: Record<RequestStatus, string> = {
  PENDING:       'bg-amber-100  text-amber-800',
  APPROVED:      'bg-green-100  text-green-800',
  REJECTED:      'bg-red-100    text-red-800',
  CANCELLED:     'bg-gray-100   text-gray-600',
  DRAFT:         'bg-slate-100  text-slate-600',
  PENDING_RETRY: 'bg-orange-100 text-orange-800',
};

const TYPE_STYLES: Record<TimeOffType, string> = {
  VACATION: 'bg-blue-100   text-blue-800',
  SICK:     'bg-purple-100 text-purple-800',
  PERSONAL: 'bg-teal-100   text-teal-800',
};

interface StatusBadgeProps {
  status: RequestStatus;
}

interface TypeBadgeProps {
  type: TimeOffType;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_STYLES[type]}`}>
      {type}
    </span>
  );
}

interface SourceBadgeProps {
  source: string;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const style =
    source === 'hcm-realtime'
      ? 'bg-green-50 text-green-700 border border-green-200'
      : source === 'cache-stale'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : 'bg-gray-50 text-gray-600 border border-gray-200';

  const label =
    source === 'hcm-realtime' ? 'Live' : source === 'cache-stale' ? 'Stale cache' : 'Cached';

  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
