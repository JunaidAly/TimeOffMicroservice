import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { requestsApi } from '../../api/requests.api';
import { LOCATIONS } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import type { CreateRequestPayload, TimeOffType } from '../../types';

interface RequestFormProps {
  employeeId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const TYPE_OPTIONS: { value: TimeOffType; label: string }[] = [
  { value: 'VACATION', label: 'Vacation' },
  { value: 'SICK',     label: 'Sick Leave' },
  { value: 'PERSONAL', label: 'Personal' },
];

export function RequestForm({ employeeId, onSuccess, onCancel }: RequestFormProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Omit<CreateRequestPayload, 'employeeId'>>({
    locationId: LOCATIONS[0].id,
    type: 'VACATION',
    startDate: '',
    endDate: '',
    notes: '',
  });
  const [apiError, setApiError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: CreateRequestPayload) =>
      requestsApi.create(payload, crypto.randomUUID()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
      onSuccess();
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; error?: string } | undefined;
        setApiError(data?.message ?? data?.error ?? err.message);
      } else {
        setApiError('Unexpected error. Please try again.');
      }
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setApiError(null);
    if (!form.startDate || !form.endDate) return;
    if (form.endDate < form.startDate) {
      setApiError('End date must be on or after start date.');
      return;
    }
    mutation.mutate({ ...form, employeeId });
  };

  const field = (id: string, label: string, children: JSX.Element) => (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {field(
        'location',
        'Location',
        <select
          id="location"
          value={form.locationId}
          onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}
          className={inputCls}
          required
        >
          {LOCATIONS.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name} ({loc.country})
            </option>
          ))}
        </select>,
      )}

      {field(
        'type',
        'Leave Type',
        <select
          id="type"
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TimeOffType }))}
          className={inputCls}
          required
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>,
      )}

      <div className="grid grid-cols-2 gap-3">
        {field(
          'startDate',
          'Start Date',
          <input
            id="startDate"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            className={inputCls}
            required
          />,
        )}
        {field(
          'endDate',
          'End Date',
          <input
            id="endDate"
            type="date"
            value={form.endDate}
            min={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            className={inputCls}
            required
          />,
        )}
      </div>

      {field(
        'notes',
        'Notes (optional)',
        <textarea
          id="notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className={`${inputCls} resize-none`}
          rows={3}
          placeholder="Any additional context for your manager…"
        />,
      )}

      {apiError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {apiError}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          Submit Request
        </Button>
      </div>
    </form>
  );
}
