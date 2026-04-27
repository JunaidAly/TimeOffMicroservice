import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { useAuth, SEEDED_USERS } from '../context/AuthContext';
import type { User } from '../types';

export function SettingsPage() {
  const { currentUser, login, logout } = useAuth();
  const navigate = useNavigate();

  const switchUser = (user: User) => {
    login(user);
    navigate(user.role === 'MANAGER' ? '/manager' : '/dashboard', { replace: true });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout title="Settings" subtitle="Account and preferences">
      <div className="max-w-lg space-y-6">
        {/* Current user */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Current Session</h2>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-sm font-bold">
              {currentUser?.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{currentUser?.name}</p>
              <p className="text-sm text-gray-500">{currentUser?.email}</p>
              <p className="text-xs text-gray-400">{currentUser?.role} · {currentUser?.id}</p>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="danger" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>

        {/* Switch user */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-gray-700">Switch User</h2>
          <p className="mb-4 text-xs text-gray-400">Demo mode: switch between seeded test accounts.</p>
          <div className="space-y-2">
            {SEEDED_USERS.filter((u) => u.id !== currentUser?.id).map((u) => (
              <button
                key={u.id}
                onClick={() => switchUser(u)}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-2.5 text-left text-sm transition hover:border-brand-400 hover:bg-brand-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-semibold">
                  {u.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.role}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Backend info */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Backend Connection</h2>
          <div className="space-y-1.5 text-sm text-gray-500">
            <p><span className="font-medium text-gray-700">API:</span> http://localhost:3000</p>
            <p><span className="font-medium text-gray-700">Auth:</span> Header-based (x-employee-id / x-manager-id)</p>
            <p><span className="font-medium text-gray-700">HCM:</span> Mock HCM at /mock-hcm/*</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
