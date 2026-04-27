interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };

export function LoadingSpinner({ label = 'Loading…', size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-400">
      <svg
        className={`${SIZE_MAP[size]} animate-spin text-brand-500`}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span className="text-sm">{label}</span>
    </div>
  );
}
