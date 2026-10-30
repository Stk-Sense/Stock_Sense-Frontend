import { useMemo, useState } from 'react';
import type { BacktestConfig, Params, StrategyDef, SymbolSpec } from '../types';
import { DEFAULT_CONFIG, explainResult } from '../lib/backtest';
import { backtestStrategy, WINDOWS } from '../lib/run';
import { money, num, pct, tone, cn } from '../lib/format';
import { useCandles } from '../hooks';
import { DrawdownChart, EquityChart, PriceTradesChart } from './charts';
import { ParamForm } from './ParamForm';
import { Notice } from './Notice';
import { Badge, Modal, NumberField, Select, Stat } from './ui';

const REASON: Record<string, string> = { signal: 'Signal', stop: 'Stop-loss', target: 'Take-profit', end: 'End of data' };

export function BacktestModal({
  strategy,
  initialParams,
  symbols,
  initialSymbol,
  onClose,
}: {
  strategy: StrategyDef;
  initialParams: Params;
  symbols: SymbolSpec[];
  initialSymbol: string;
  onClose: () => void;
}) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [windowBars, setWindowBars] = useState(756);
  const [params, setParams] = useState<Params>(initialParams);
  const [cfg, setCfg] = useState<BacktestConfig>(DEFAULT_CONFIG);
  const { candles, status, error } = useCandles(symbol);
  const ccy = symbols.find((s) => s.symbol === symbol)?.currency ?? 'INR';

  const run = useMemo(
    () => (candles.length ? backtestStrategy(strategy, params, candles, windowBars, cfg) : null),
    [strategy, params, candles, windowBars, cfg],
  );
  const m = run?.result.metrics;
  const set = <K extends keyof BacktestConfig>(k: K) => (v: number) => setCfg((c) => ({ ...c, [k]: v }));

  return (
    <Modal
      wide
      onClose={onClose}
      title={
        <span className="flex flex-wrap items-center gap-2">
          {strategy.name} <Badge>{strategy.kind === 'rule' ? 'Rule builder' : 'Built-in'}</Badge>
        </span>
      }
      subtitle={strategy.logic}
    >
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* ---------- controls ---------- */}
        <aside className="grid content-start gap-5">
          <section className="grid gap-3">
            <h3 className="m-0 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">Market</h3>
            <div className="flex flex-wrap gap-2">
              <Select
                label="Symbol"
                value={symbol}
                onChange={setSymbol}
                className="min-w-0 flex-1"
                options={symbols.map((s) => ({ value: s.symbol, label: `${s.symbol} · ${s.name}` }))}
              />
              <Select
                label="Period"
                value={String(windowBars)}
                onChange={(v) => setWindowBars(Number(v))}
                options={WINDOWS.map((w) => ({ value: String(w.value), label: w.label }))}
              />
            </div>
            <p className="m-0 text-[12px] text-[var(--muted)]">
              Data: {status === 'loading' ? 'loading…' : status === 'error' ? 'unavailable' : `${candles.length} daily bars from the API`}
            </p>
          </section>

          {strategy.params.length > 0 && (
            <section className="grid gap-3">
              <h3 className="m-0 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">Parameters</h3>
              <ParamForm defs={strategy.params} values={params} onChange={setParams} />
            </section>
          )}

          <section className="grid gap-3">
            <h3 className="m-0 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">Capital & costs</h3>
            <NumberField label="Initial capital" value={cfg.initialCapital} min={1000} step={1000} onChange={set('initialCapital')} />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Fee / side" suffix="%" value={cfg.feePct} min={0} max={5} step={0.01} onChange={set('feePct')} />
              <NumberField label="Slippage / side" suffix="%" value={cfg.slippagePct} min={0} max={5} step={0.01} onChange={set('slippagePct')} />
            </div>
            <NumberField label="Position size" suffix="% of equity" value={cfg.positionPct} min={1} max={100} onChange={set('positionPct')} />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Stop-loss" suffix="% (0 = off)" value={cfg.stopLossPct} min={0} max={50} step={0.5} onChange={set('stopLossPct')} />
              <NumberField label="Take-profit" suffix="% (0 = off)" value={cfg.takeProfitPct} min={0} max={200} step={0.5} onChange={set('takeProfitPct')} />
            </div>
          </section>
        </aside>

        {/* ---------- results ---------- */}
        <div className="min-w-0">
          {!strategy.run ? (
            <Notice title="This strategy can't be simulated here yet">
              The API lists it, but the frontend has no signal logic for engine "{strategy.id}".
            </Notice>
          ) : status === 'error' ? (
            <Notice title="Couldn't load price history">{error}</Notice>
          ) : !run || !m ? (
            <Notice busy title="Loading market data…" />
          ) : (
            <div className="grid gap-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                <Stat label="Total return" value={pct(m.totalReturnPct)} valueClass={tone(m.totalReturnPct)} sub={`Buy & hold ${pct(m.buyHoldReturnPct)}`} />
                <Stat label="CAGR" value={pct(m.cagrPct)} valueClass={tone(m.cagrPct)} />
                <Stat label="Max drawdown" value={`${m.maxDrawdownPct.toFixed(1)}%`} valueClass="text-[var(--neg)]" />
                <Stat label="Sharpe" value={num(m.sharpe)} sub={`Sortino ${num(m.sortino)}`} />
                <Stat label="Final equity" value={money(m.finalEquity, ccy)} sub={`from ${money(cfg.initialCapital, ccy)}`} />
                <Stat label="Trades" value={m.trades} sub={`Avg ${pct(m.avgTradePct, 2)}`} />
                <Stat label="Win rate" value={`${m.winRatePct.toFixed(0)}%`} />
                <Stat label="Profit factor" value={num(m.profitFactor)} />
                <Stat label="Time in market" value={`${m.exposurePct.toFixed(0)}%`} />
                <Stat label="Calmar" value={num(m.calmar)} />
              </div>

              <section aria-label="What this result means" className="border border-[var(--line)] bg-[var(--soft)] px-4 py-3">
                <h3 className="m-0 mb-1 text-[13px] font-semibold">What this result means</h3>
                <ul className="m-0 grid list-none gap-1 p-0 text-[13px]">
                  {explainResult(m).map((x, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden className={cn('mt-0.5 font-bold', x.tone === 'good' ? 'text-[var(--pos)]' : x.tone === 'warn' ? 'text-[var(--neg)]' : 'text-[var(--muted)]')}>
                        {x.tone === 'good' ? '✓' : x.tone === 'warn' ? '!' : '·'}
                      </span>
                      <span>{x.text}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="m-0 mb-1 text-[13px] font-semibold">Equity curve vs buy & hold</h3>
                <EquityChart result={run.result} name={strategy.name} />
              </section>
              <section>
                <h3 className="m-0 mb-1 text-[13px] font-semibold">Drawdown</h3>
                <DrawdownChart result={run.result} />
              </section>
              <section>
                <h3 className="m-0 mb-1 text-[13px] font-semibold">Price and trades</h3>
                <PriceTradesChart candles={run.window} result={run.result} />
              </section>

              <section>
                <h3 className="m-0 mb-2 text-[13px] font-semibold">Trades ({run.result.trades.length})</h3>
                {run.result.trades.length === 0 ? (
                  <p className="m-0 text-[13px] text-[var(--muted)]">No trades were triggered in this window. Try a longer period or looser parameters.</p>
                ) : (
                  <div className="max-h-72 overflow-auto border border-[var(--line)]">
                    <table className="tabular w-full border-collapse text-left text-[13px]">
                      <thead className="sticky top-0 bg-[var(--soft)] text-[12px] text-[var(--muted)]">
                        <tr>
                          {['Entry', 'Exit', 'Buy', 'Sell', 'Qty', 'P/L', 'Return', 'Bars', 'Exit reason'].map((h) => (
                            <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...run.result.trades].reverse().map((t) => (
                          <tr key={t.entryIdx} className="border-t border-[var(--line)]">
                            <td className="px-3 py-1.5">{t.entryDate}</td>
                            <td className="px-3 py-1.5">{t.exitDate}</td>
                            <td className="px-3 py-1.5">{t.entryPrice.toFixed(2)}</td>
                            <td className="px-3 py-1.5">{t.exitPrice.toFixed(2)}</td>
                            <td className="px-3 py-1.5">{t.qty}</td>
                            <td className={cn('px-3 py-1.5', tone(t.pnl))}>{money(t.pnl, ccy)}</td>
                            <td className={cn('px-3 py-1.5', tone(t.retPct))}>{pct(t.retPct, 2)}</td>
                            <td className="px-3 py-1.5">{t.bars}</td>
                            <td className="px-3 py-1.5">{REASON[t.reason]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <p className="m-0 text-[12px] text-[var(--muted)]">
                Simulated results only. Not financial advice. Signals execute at the next bar's open; fees and slippage are applied to every fill.
                Past performance does not guarantee future results.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
