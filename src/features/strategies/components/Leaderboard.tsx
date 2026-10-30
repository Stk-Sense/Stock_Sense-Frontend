import { useMemo, useState } from 'react';
import type { BacktestResult, Params, StrategyDef, SymbolSpec } from '../types';
import { DEFAULT_CONFIG } from '../lib/backtest';
import { backtestStrategy, WINDOWS } from '../lib/run';
import { resolveParams } from '../lib/params';
import { cn, num, pct, tone } from '../lib/format';
import { useCandles } from '../hooks';
import { CompareChart } from './charts';
import { Notice } from './Notice';
import { Badge, Select } from './ui';

type SortKey = 'totalReturnPct' | 'cagrPct' | 'sharpe' | 'maxDrawdownPct' | 'winRatePct' | 'trades';

const COLUMNS: { key: SortKey; label: string; fmt: (v: number) => string; colour?: boolean }[] = [
  { key: 'totalReturnPct', label: 'Return', fmt: (v) => pct(v), colour: true },
  { key: 'cagrPct', label: 'CAGR', fmt: (v) => pct(v), colour: true },
  { key: 'sharpe', label: 'Sharpe', fmt: (v) => num(v) },
  { key: 'maxDrawdownPct', label: 'Max DD', fmt: (v) => `${v.toFixed(1)}%` },
  { key: 'winRatePct', label: 'Win rate', fmt: (v) => `${v.toFixed(0)}%` },
  { key: 'trades', label: 'Trades', fmt: (v) => String(v) },
];

export function Leaderboard({
  strategies,
  saved,
  symbols,
  initialSymbol,
  onOpen,
}: {
  strategies: StrategyDef[];
  saved: Record<string, Params>;
  symbols: SymbolSpec[];
  initialSymbol: string;
  onOpen: (s: StrategyDef, symbol: string) => void;
}) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [windowBars, setWindowBars] = useState(756);
  const [sortKey, setSortKey] = useState<SortKey>('sharpe');
  const { candles, status, error } = useCandles(symbol);

  const rows = useMemo(() => {
    if (!candles.length) return [];
    return strategies
      .filter((s) => s.run && s.category !== 'Benchmark')
      .flatMap((s) => {
        const run = backtestStrategy(s, resolveParams(s, saved[s.id]), candles, windowBars, DEFAULT_CONFIG);
        return run ? [{ s, result: run.result }] : [];
      });
  }, [strategies, saved, candles, windowBars]);

  const sorted = useMemo(() => {
    // Max drawdown is negative; "better" = closer to zero, so descending sort works for every column.
    return [...rows].sort((a, b) => b.result.metrics[sortKey] - a.result.metrics[sortKey]);
  }, [rows, sortKey]);

  const chartSeries = useMemo(() => {
    const top = sorted.slice(0, 5);
    const first: BacktestResult | undefined = top[0]?.result ?? rows[0]?.result;
    if (!first) return [];
    return [
      ...top.map((r) => ({ name: r.s.name, dates: r.result.dates, equity: r.result.equity })),
      { name: 'Buy & hold', dates: first.dates, equity: first.benchmark, dashed: true },
    ];
  }, [sorted, rows]);

  const bhReturn = rows[0]?.result.metrics.buyHoldReturnPct;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          label="Symbol"
          value={symbol}
          onChange={setSymbol}
          options={symbols.map((s) => ({ value: s.symbol, label: `${s.symbol} · ${s.name}` }))}
        />
        <Select
          label="Period"
          value={String(windowBars)}
          onChange={(v) => setWindowBars(Number(v))}
          options={WINDOWS.map((w) => ({ value: String(w.value), label: w.label }))}
        />
        <span className="text-[12px] text-[var(--muted)]">
          {status === 'loading' ? 'Loading…' : status === 'error' ? 'Data unavailable' : 'API data'} · default parameters · {DEFAULT_CONFIG.feePct}% fee + {DEFAULT_CONFIG.slippagePct}% slippage per side
        </span>
      </div>

      {status === 'error' && <Notice title="Couldn't load price history">{error}</Notice>}
      {status === 'loading' && <Notice busy title="Loading market data…" />}

      <section className="border border-[var(--line)] p-3" hidden={status !== 'ready'}>
        <h3 className="m-0 text-[13px] font-semibold">Top 5 by {COLUMNS.find((c) => c.key === sortKey)?.label}, growth of 100</h3>
        {chartSeries.length > 0 ? <CompareChart series={chartSeries} /> : <div className="h-[300px]" />}
      </section>

      <div className="overflow-x-auto border border-[var(--ink)]" hidden={status !== 'ready'}>
        <table className="tabular w-full border-collapse text-left text-[13px]">
          <thead className="bg-[var(--soft)] text-[12px]">
            <tr>
              <th className="px-3 py-2 font-medium text-[var(--muted)]">#</th>
              <th className="px-3 py-2 font-medium text-[var(--muted)]">Strategy</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="px-3 py-2" aria-sort={sortKey === c.key ? 'descending' : 'none'}>
                  <button
                    onClick={() => setSortKey(c.key)}
                    className={cn('font-medium', sortKey === c.key ? 'text-[var(--ink)] underline' : 'text-[var(--muted)]')}
                  >
                    {c.label}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ s, result }, i) => (
              <tr key={s.id} className="border-t border-[var(--line)] hover:bg-[var(--soft)]">
                <td className="px-3 py-2 text-[var(--muted)]">{i + 1}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-[12px] text-[var(--muted)]">{s.category}{s.kind === 'rule' && ' · yours'}</div>
                </td>
                {COLUMNS.map((c) => {
                  const v = result.metrics[c.key];
                  return (
                    <td key={c.key} className={cn('px-3 py-2', c.colour && tone(v), c.key === 'maxDrawdownPct' && 'text-[var(--neg)]')}>
                      {c.fmt(v)}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right">
                  <button className="border border-[var(--ink)] bg-white px-2.5 py-1 text-[12px] hover:bg-[var(--soft)]" onClick={() => onOpen(s, symbol)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--muted)]">
        {bhReturn !== undefined && <Badge>Buy & hold over this window: {pct(bhReturn)}</Badge>}
        <span>Ranking one window on one asset is not evidence of future results. Switch symbol and period to check consistency.</span>
      </div>
    </div>
  );
}
