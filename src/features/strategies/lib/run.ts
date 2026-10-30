import type { BacktestConfig, BacktestResult, Candle, Params, StrategyDef } from '../types';
import { runBacktest } from './backtest';

export const WINDOWS = [
  { value: 126, label: '6 months' },
  { value: 252, label: '1 year' },
  { value: 504, label: '2 years' },
  { value: 756, label: '3 years' },
  { value: 0, label: 'All data' },
] as const;

/**
 * Signals are computed on the FULL history (so a 200-day SMA is already warmed up on day one of the
 * window), then both candles and signals are cropped to the requested window before simulating.
 */
export function backtestStrategy(
  strategy: StrategyDef,
  params: Params,
  candles: Candle[],
  windowBars: number,
  cfg: BacktestConfig,
): { window: Candle[]; result: BacktestResult } | null {
  if (!strategy.run) return null;
  const signals = strategy.run(candles, params);
  const start = windowBars > 0 ? Math.max(0, candles.length - windowBars) : 0;
  const window = candles.slice(start);
  return { window, result: runBacktest(window, signals.slice(start), cfg) };
}
