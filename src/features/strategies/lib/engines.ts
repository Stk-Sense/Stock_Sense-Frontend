import type { Candle, Params, Signal } from '../types';
import {
  bollinger,
  ema,
  highest,
  lowest,
  macd,
  roc,
  rsi,
  sma,
  stochastic,
  supertrend,
} from './indicators';

/**
 * SIGNAL LOGIC ONLY. No names, descriptions, parameter ranges, dates or any other catalog data lives here;
 * that comes from `GET /strategies`. The API entry's `engine` (or its `id`) selects one of these functions.
 *
 * A signal function receives OHLCV history and the user's parameters and returns the target position
 * (1 = long, 0 = flat) after each bar's close.
 */
export type SignalEngine = (candles: Candle[], params: Params) => Signal[];

const closes = (c: Candle[]) => c.map((x) => x.c);
const highs = (c: Candle[]) => c.map((x) => x.h);
const lows = (c: Candle[]) => c.map((x) => x.l);

/** Tiny state machine: flat -> long when `enter`, long -> flat when `exit`. NaN comparisons are false. */
function fsm(n: number, enter: (i: number) => boolean, exit: (i: number) => boolean): Signal[] {
  const out: Signal[] = new Array<Signal>(n).fill(0);
  let pos: Signal = 0;
  for (let i = 0; i < n; i++) {
    if (pos === 0 && enter(i)) pos = 1;
    else if (pos === 1 && exit(i)) pos = 0;
    out[i] = pos;
  }
  return out;
}

export const SIGNAL_ENGINES: Record<string, SignalEngine> = {
  'sma-cross': (c, { fast, slow }) => {
      const cl = closes(c);
      const f = sma(cl, fast);
      const s = sma(cl, slow);
      return cl.map((_, i) => (f[i] > s[i] ? 1 : 0));
    },
  'ema-cross': (c, { fast, slow }) => {
      const cl = closes(c);
      const f = ema(cl, fast);
      const s = ema(cl, slow);
      return cl.map((_, i) => (f[i] > s[i] ? 1 : 0));
    },
  'macd': (c, { fast, slow, signal }) => {
      const { hist } = macd(closes(c), fast, slow, signal);
      return hist.map((h) => (h > 0 ? 1 : 0));
    },
  'supertrend': (c, { period, mult }) => {
      const { dir } = supertrend(highs(c), lows(c), closes(c), period, mult);
      return dir.map((d) => (d === 1 ? 1 : 0));
    },
  'rsi-mr': (c, { period, oversold, exit }) => {
      const r = rsi(closes(c), period);
      return fsm(c.length, (i) => r[i] < oversold, (i) => r[i] > exit);
    },
  'bb-mr': (c, { period, k }) => {
      const cl = closes(c);
      const b = bollinger(cl, period, k);
      return fsm(c.length, (i) => cl[i] < b.lower[i], (i) => cl[i] >= b.mid[i]);
    },
  'trend-filter': (c, { period, buffer }) => {
      const cl = closes(c);
      const m = sma(cl, period);
      const up = 1 + buffer / 100;
      const dn = 1 - buffer / 100;
      return fsm(c.length, (i) => cl[i] > m[i] * up, (i) => cl[i] < m[i] * dn);
    },
  'rsi2-pullback': (c, { trend, rsiPeriod, entry, exitSma }) => {
      const cl = closes(c);
      const t = sma(cl, trend);
      const r = rsi(cl, rsiPeriod);
      const x = sma(cl, exitSma);
      return fsm(c.length, (i) => cl[i] > t[i] && r[i] < entry, (i) => cl[i] > x[i]);
    },
  'bb-breakout': (c, { period, k }) => {
      const cl = closes(c);
      const b = bollinger(cl, period, k);
      return fsm(c.length, (i) => cl[i] > b.upper[i], (i) => cl[i] < b.mid[i]);
    },
  'donchian': (c, { entryN, exitN }) => {
      const cl = closes(c);
      const hh = highest(highs(c), entryN);
      const ll = lowest(lows(c), exitN);
      // Compare against the PREVIOUS bar's channel so today's bar can't break its own level.
      return fsm(c.length, (i) => i > 0 && cl[i] > hh[i - 1], (i) => i > 0 && cl[i] < ll[i - 1]);
    },
  'stochastic': (c, { kPeriod, dPeriod, oversold, overbought }) => {
      const { k, d } = stochastic(highs(c), lows(c), closes(c), kPeriod, dPeriod);
      return fsm(
        c.length,
        (i) => i > 0 && k[i - 1] <= d[i - 1] && k[i] > d[i] && k[i - 1] < oversold,
        (i) => k[i] > overbought,
      );
    },
  'tsmom': (c, { lookback, threshold }) => {
      const r = roc(closes(c), lookback);
      return r.map((x) => (x * 100 > threshold ? 1 : 0));
    },
  'buy-hold': (c) => c.map(() => 1 as Signal),
};
