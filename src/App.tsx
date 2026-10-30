import { lazy, Suspense, useState } from 'react';
import Dashboard from './Dashboard';

// Hidden until VITE_ENABLE_STRATEGIES=true is set in .env
const STRATEGIES_ENABLED = import.meta.env.VITE_ENABLE_STRATEGIES === 'true';
const StrategiesPage = lazy(() => import('./features/strategies/StrategiesPage'));

type Page = 'dashboard' | 'strategies';

function App() {
  const [page, setPage] = useState<Page>('dashboard');

  if (!STRATEGIES_ENABLED) return <Dashboard />;

  return (
    <>
      <div className="flex gap-2 border-b border-[var(--ink)] bg-white px-4 py-2">
        {(['dashboard', 'strategies'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={
              page === p
                ? 'bg-[var(--ink)] px-3 py-1 text-sm capitalize text-white'
                : 'border border-[var(--ink)] px-3 py-1 text-sm capitalize'
            }
          >
            {p}
          </button>
        ))}
      </div>

      {page === 'dashboard' ? (
        <Dashboard />
      ) : (
        <Suspense fallback={<p className="p-6 text-sm">Loading…</p>}>
          <div className="p-6">
            <StrategiesPage />
          </div>
        </Suspense>
      )}
    </>
  );
}

export default App;