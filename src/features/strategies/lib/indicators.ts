/**
 * Pure indicator functions. Every function returns an array the same length as its input,
 * with NaN during the warm-up period. Comparisons against NaN are always false, which is
 * exactly what we want: no signal until an indicator is fully formed.
 */

export type Series = number[];

const blank = (n: number): Series => new Array<number>(n).fill(Number.NaN);

/** Simple moving average (NaN-safe: a window containing NaN yields NaN). */
export function sma(v: Series, n: number): Series {
  const out = blank(v.length);
  if (n < 1) return out;
  for (let i = n - 1; i < v.length; i++) {
    let s = 0;
    let ok = true;
    for (let j = i - n + 1; j <= i; j++) {
      if (!Number.isFinite(v[j])) {
        ok = false;
        break;
      }
      s += v[j];
    }
    if (ok) out[i] = s / n;
  }
  return out;
}

/** Exponential moving average, seeded with the SMA of the first full window. */
export function ema(v: Series, n: number): Series {
  const out = blank(v.length);
  const start = v.findIndex((x) => Number.isFinite(x));
  if (start < 0 || n < 1 || v.length - start < n) return out;
  const k = 2 / (n + 1);
  let seed = 0;
  for (let i = start; i < start + n; i++) seed += v[i];
  let prev = seed / n;
  out[start + n - 1] = prev;
  for (let i = start + n; i < v.length; i++) {
    prev = v[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Wilder's RSI. */
export function rsi(close: Series, n: number): Series {
  const out = blank(close.length);
  if (close.length <= n || n < 1) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = close[i] - close[i - 1];
    gain += Math.max(d, 0);
    loss += Math.max(-d, 0);
  }
  let ag = gain / n;
  let al = loss / n;
  out[n] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  for (let i = n + 1; i < close.length; i++) {
    const d = close[i] - close[i - 1];
    ag = (ag * (n - 1) + Math.max(d, 0)) / n;
    al = (al * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return out;
}

export function macd(close: Series, fast: number, slow: number, signal: number) {
  const f = ema(close, fast);
  const s = ema(close, slow);
  const line = close.map((_, i) => f[i] - s[i]);
  const sig = ema(line, signal);
  const hist = line.map((x, i) => x - sig[i]);
  return { line, signal: sig, hist };
}

/** Rolling population standard deviation. */
export function rollingStd(v: Series, n: number): Series {
  const out = blank(v.length);
  for (let i = n - 1; i < v.length; i++) {
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += v[j];
    const m = s / n;
    let q = 0;
    for (let j = i - n + 1; j <= i; j++) q += (v[j] - m) ** 2;
    out[i] = Math.sqrt(q / n);
  }
  return out;
}

export function bollinger(close: Series, n: number, k: number) {
  const mid = sma(close, n);
  const sd = rollingStd(close, n);
  return {
    mid,
    upper: mid.map((m, i) => m + k * sd[i]),
    lower: mid.map((m, i) => m - k * sd[i]),
  };
}

export function highest(v: Series, n: number): Series {
  const out = blank(v.length);
  for (let i = n - 1; i < v.length; i++) {
    let m = -Infinity;
    for (let j = i - n + 1; j <= i; j++) m = Math.max(m, v[j]);
    out[i] = m;
  }
  return out;
}

export function lowest(v: Series, n: number): Series {
  const out = blank(v.length);
  for (let i = n - 1; i < v.length; i++) {
    let m = Infinity;
    for (let j = i - n + 1; j <= i; j++) m = Math.min(m, v[j]);
    out[i] = m;
  }
  return out;
}

/** Rate of change as a fraction (0.05 = +5%). */
export function roc(v: Series, n: number): Series {
  const out = blank(v.length);
  for (let i = n; i < v.length; i++) out[i] = v[i] / v[i - n] - 1;
  return out;
}

/** Wilder's Average True Range. */
export function atr(high: Series, low: Series, close: Series, n: number): Series {
  const out = blank(close.length);
  if (close.length <= n) return out;
  const tr = close.map((_, i) =>
    i === 0
      ? high[0] - low[0]
      : Math.max(high[i] - low[i], Math.abs(high[i] - close[i - 1]), Math.abs(low[i] - close[i - 1])),
  );
  let a = 0;
  for (let i = 1; i <= n; i++) a += tr[i];
  a /= n;
  out[n] = a;
  for (let i = n + 1; i < close.length; i++) {
    a = (a * (n - 1) + tr[i]) / n;
    out[i] = a;
  }
  return out;
}

/** Stochastic oscillator (%K smoothed lightly by %D). */
export function stochastic(high: Series, low: Series, close: Series, kPeriod: number, dPeriod: number) {
  const hh = highest(high, kPeriod);
  const ll = lowest(low, kPeriod);
  const k = close.map((c, i) => {
    const range = hh[i] - ll[i];
    return Number.isFinite(range) && range > 0 ? ((c - ll[i]) / range) * 100 : Number.NaN;
  });
  return { k, d: sma(k, dPeriod) };
}

/** SuperTrend. dir = 1 in an up-trend, -1 in a down-trend. */
export function supertrend(high: Series, low: Series, close: Series, n: number, mult: number) {
  const len = close.length;
  const a = atr(high, low, close, n);
  const dir = blank(len);
  const line = blank(len);
  let fu = Number.NaN;
  let fl = Number.NaN;
  let d = 1;
  for (let i = 0; i < len; i++) {
    if (!Number.isFinite(a[i])) continue;
    const mid = (high[i] + low[i]) / 2;
    const ub = mid + mult * a[i];
    const lb = mid - mult * a[i];
    if (!Number.isFinite(fu)) {
      fu = ub;
      fl = lb;
      d = 1;
    } else {
      const pfu = fu;
      const pfl = fl;
      fu = ub < pfu || close[i - 1] > pfu ? ub : pfu;
      fl = lb > pfl || close[i - 1] < pfl ? lb : pfl;
      if (d === 1 && close[i] < fl) d = -1;
      else if (d === -1 && close[i] > fu) d = 1;
    }
    dir[i] = d;
    line[i] = d === 1 ? fl : fu;
  }
  return { dir, line };
}

/** Rolling z-score of price vs its own moving average. */
export function zscore(v: Series, n: number): Series {
  const m = sma(v, n);
  const s = rollingStd(v, n);
  return v.map((x, i) => (s[i] > 0 ? (x - m[i]) / s[i] : Number.NaN));
}
