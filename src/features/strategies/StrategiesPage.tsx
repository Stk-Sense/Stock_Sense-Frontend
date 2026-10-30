import { useMemo, useState } from 'react';
import type { RuleSet, StrategyDef } from './types';
import { resolveParams } from './lib/params';
import { describeRule } from './lib/ruleEngine';
import { useStrategyLibrary, useSymbols } from './hooks';
import { StrategyCard } from './components/StrategyCard';
import { BacktestModal } from './components/BacktestModal';
import { StrategyEditModal } from './components/StrategyEditModal';
import { RuleBuilderModal } from './components/RuleBuilderModal';
import { Leaderboard } from './components/Leaderboard';
import { Notice } from './components/Notice';
import { Badge, Button } from './components/ui';
import { cn } from './lib/format';

type Tab = 'library' | 'leaderboard';
const ALL = 'All';

type Dialog =
  | { kind: 'backtest'; strategy: StrategyDef; symbol: string }
  | { kind: 'edit'; strategy: StrategyDef }
  | { kind: 'rule'; rule?: RuleSet }
  | null;

export default function StrategiesPage() {
  const lib = useStrategyLibrary();
  const market = useSymbols();
  const [tab, setTab] = useState<Tab>('library');
  const [filter, setFilter] = useState(ALL);
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const defaultSymbol = market.symbols[0]?.symbol ?? '';
  const marketReady = market.status === 'ready' && market.symbols.length > 0;

  // Categories come from the API data, not from a hardcoded list.
  const categories = useMemo(() => [ALL, ...new Set(lib.strategies.map((s) => s.category))], [lib.strategies]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lib.strategies.filter(
      (s) => (filter === ALL || s.category === filter) && (!q || `${s.name} ${s.summary} ${s.category}`.toLowerCase().includes(q)),
    );
  }, [lib.strategies, filter, query]);

  const exampleRule = lib.strategies.find((s) => s.rule)?.rule;

  const edit = (s: StrategyDef) =>
    s.kind === 'rule' ? setDialog({ kind: 'rule', rule: s.rule }) : setDialog({ kind: 'edit', strategy: s });

  const marketProblem = market.status === 'error'
    ? market.error
    : market.status === 'ready' && market.symbols.length === 0
      ? 'The API returned no symbols.'
      : '';

  const close = () => setDialog(null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-bold">Strategies</h1>
          <p className="m-0 mt-1 text-[13px] text-[var(--muted)]">
            {lib.status === 'ready' ? `${lib.strategies.length} strategies · ` : ''}backtest any of them on historical data. Paper money only.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setDialog({ kind: 'rule' })}>+ Rule builder</Button>
          <Button disabled title="Coming in Phase 7" aria-describedby="phase7-note">+ Code editor</Button>
        </div>
      </div>

      <div role="tablist" aria-label="Strategy views" className="mt-5 flex gap-0 border-b border-[var(--line)]">
        {([['library', 'Library'], ['leaderboard', 'Compare all']] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium',
              tab === id ? 'border-[var(--ink)] text-[var(--ink)]' : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4">
        {marketProblem && (
          <Notice title="Market data unavailable" onRetry={market.reload} busy={market.status === 'loading'}>
            {marketProblem} Backtests need the symbol list and price history from the API.
          </Notice>
        )}

        {lib.status === 'loading' && <Notice busy title="Loading strategies…" />}
        {lib.status === 'error' && (
          <Notice title="Couldn't load strategies" onRetry={lib.reload}>
            {lib.error} Strategies are loaded from the API (GET /strategies).
          </Notice>
        )}
        {lib.status === 'ready' && lib.strategies.length === 0 && (
          <Notice title="No strategies yet">The API returned an empty list.</Notice>
        )}

        {lib.status === 'ready' && lib.strategies.length > 0 && (tab === 'library' ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                aria-label="Search strategies"
                placeholder="Search strategies…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full max-w-xs border border-[var(--line)] px-3 py-1.5 text-sm sm:w-64"
              />
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
                {categories.map((f) => (
                  <button
                    key={f}
                    aria-pressed={filter === f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      'border px-2.5 py-1 text-[12px]',
                      filter === f ? 'border-[var(--ink)] bg-[var(--ink)] text-white' : 'border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--ink)]',
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <p className="m-0 border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--muted)]">No strategies match your search.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((s) => (
                  <StrategyCard
                    key={s.id}
                    strategy={s}
                    blockedReason={marketReady ? undefined : 'Market data is not available from the API yet'}
                    onBacktest={() => setDialog({ kind: 'backtest', strategy: s, symbol: defaultSymbol })}
                    onEdit={() => edit(s)}
                  />
                ))}
              </div>
            )}
          </>
        ) : marketReady ? (
          <Leaderboard
            strategies={lib.strategies}
            saved={lib.saved}
            symbols={market.symbols}
            initialSymbol={defaultSymbol}
            onOpen={(s, symbol) => setDialog({ kind: 'backtest', strategy: s, symbol })}
          />
        ) : null)}
      </div>

      {/* Phase 7 block from the wireframe */}
      <section id="phase7-note" className="mt-8 border border-dashed border-[var(--muted)] p-4">
        <h2 className="m-0 mb-3 text-sm font-semibold">Rule builder and code editor <span className="font-normal text-[var(--muted)]">(code editor: Phase 7)</span></h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="border border-dashed border-[var(--muted)] bg-[var(--soft)] p-3 text-[13px]">
            <div className="mb-1 flex items-center justify-between gap-2">
              <strong>Rule builder</strong> <Badge>Available</Badge>
            </div>
            <p className="m-0 mb-3 text-[var(--muted)]">{exampleRule ? describeRule(exampleRule) : 'IF [RSI(14)] [<] [30] AND [close > SMA(200)] THEN BUY. EXIT when …'}</p>
            <Button small onClick={() => setDialog({ kind: 'rule' })}>Build a rule</Button>
          </div>
          <div className="border border-dashed border-[var(--muted)] bg-[var(--soft)] p-3 text-[13px]">
            <div className="mb-1 flex items-center justify-between gap-2">
              <strong>Code editor (Monaco)</strong> <Badge>Phase 7</Badge>
            </div>
            <p className="m-0 text-[var(--muted)]">
              Write a Strategy class and run it in a sandbox with time and memory limits. This runs on the backend, so it is not enabled in the browser.
            </p>
          </div>
        </div>
      </section>

      {dialog?.kind === 'backtest' && (
        <BacktestModal
          key={dialog.strategy.id + dialog.symbol}
          strategy={dialog.strategy}
          initialParams={resolveParams(dialog.strategy, lib.saved[dialog.strategy.id])}
          symbols={market.symbols}
          initialSymbol={dialog.symbol}
          onClose={close}
        />
      )}
      {dialog?.kind === 'edit' && (
        <StrategyEditModal
          strategy={dialog.strategy}
          params={resolveParams(dialog.strategy, lib.saved[dialog.strategy.id])}
          onSave={(p) => lib.saveParams(dialog.strategy.id, p)}
          onReset={() => lib.resetParams(dialog.strategy.id)}
          onClose={close}
        />
      )}
      {dialog?.kind === 'rule' && (
        <RuleBuilderModal initial={dialog.rule} onSave={lib.saveRule} onDelete={lib.removeStrategy} onClose={close} />
      )}
    </div>
  );
}
