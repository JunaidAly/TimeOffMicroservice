import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/layout/Layout';
import { BalanceGrid } from '../components/balances/BalanceGrid';
import { RequestList } from '../components/requests/RequestList';
import { RequestForm } from '../components/requests/RequestForm';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { balancesApi } from '../api/balances.api';
import { requestsApi } from '../api/requests.api';
import type { RequestStatus } from '../types';

export function EmployeeDashboard() {
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('ALL');

  const balancesQuery = useQuery({
    queryKey: ['balances', currentUser!.id],
    queryFn: () => balancesApi.getForEmployee(currentUser!.id),
    enabled: !!currentUser,
  });

  const requestsQuery = useQuery({
    queryKey: ['requests', 'employee', currentUser!.id, statusFilter],
    queryFn: () =>
      requestsApi.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 50,
      }),
    enabled: !!currentUser,
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <Layout
      title="My Dashboard"
      subtitle={`${greeting()}, ${currentUser?.name.split(' ')[0]}!`}
    >
      <div className="space-y-8">
        {/* Balances section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Leave Balances</h2>
              <p className="text-sm text-gray-500">Live data pulled from HCM</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => balancesQuery.refetch()}
              disabled={balancesQuery.isFetching}
            >
              <svg className={`h-4 w-4 ${balancesQuery.isFetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>

          <BalanceGrid
            balances={balancesQuery.data?.balances}
            isLoading={balancesQuery.isLoading}
            error={balancesQuery.error}
          />
        </section>

        {/* Requests section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">My Requests</h2>
              <p className="text-sm text-gray-500">
                {requestsQuery.data?.total ?? 0} total request{requestsQuery.data?.total !== 1 ? 's' : ''}
              </p>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Request
            </Button>
          </div>

          <RequestList
            requests={requestsQuery.data?.data}
            isLoading={requestsQuery.isLoading}
            error={requestsQuery.error}
            showCancel
            statusFilter={statusFilter}
            onFilterChange={setStatusFilter}
          />
        </section>
      </div>

      {/* New Request Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Request Time Off"
        size="md"
      >
        <RequestForm
          employeeId={currentUser!.id}
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </Layout>
  );
}
