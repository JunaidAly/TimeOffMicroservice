import { useNavigate } from 'react-router-dom';
import { useAuth, SEEDED_USERS } from '../context/AuthContext';
import type { User } from '../types';

const EMPLOYEES = SEEDED_USERS.filter((u) => u.role === 'EMPLOYEE');
const MANAGERS  = SEEDED_USERS.filter((u) => u.role === 'MANAGER');

function UserCard({ user, onSelect }: { user: User; onSelect: (u: User) => void }) {
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  const isManager = user.role === 'MANAGER';

  return (
    <button
      onClick={() => onSelect(user)}
      className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          isManager ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-700'
        }`}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-gray-900">{user.name}</p>
        <p className="truncate text-sm text-gray-500">{user.email}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
          isManager ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {user.role}
      </span>
    </button>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (user: User) => {
    login(user);
    navigate(user.role === 'MANAGER' ? '/manager' : '/dashboard', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-50 via-white to-indigo-50 p-6">
      {/* Card */}
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-lg">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ExampleHR</h1>
          <p className="mt-1 text-sm text-gray-500">Time-Off Management</p>
        </div>

        <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-700">
          Demo mode — select a user to sign in
        </p>

        {/* Managers */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Managers
          </h2>
          <div className="space-y-2">
            {MANAGERS.map((u) => (
              <UserCard key={u.id} user={u} onSelect={handleSelect} />
            ))}
          </div>
        </div>

        {/* Employees */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Employees
          </h2>
          <div className="space-y-2">
            {EMPLOYEES.map((u) => (
              <UserCard key={u.id} user={u} onSelect={handleSelect} />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        ExampleHR Time-Off Microservice — Take-Home Exercise
      </p>
    </div>
  );
}
