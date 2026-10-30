import type {
  Candle,
  Comparator,
  Condition,
  ConditionGroup,
  Operand,
  OperandType,
  RuleSet,
  Signal,
} from '../types';
import { bollinger, ema, highest, lowest, roc, rsi, sma } from './indicators';
import type { Series } from './indicators';

export const OPERAND_META: Record<OperandType, { label: string; hasPeriod: boolean; defaultPeriod: number }> = {
  close: { label: 'Close', hasPeriod: false, defaultPeriod: 0 },
  open: { label: 'Open', hasPeriod: false, defaultPeriod: 0 },
  high: { label: 'High', hasPeriod: false, defaultPeriod: 0 },
  low: { label: 'Low', hasPeriod: false, defaultPeriod: 0 },
  volume: { label: 'Volume', hasPeriod: false, defaultPeriod: 0 },
  sma: { label: 'SMA', hasPeriod: true, defaultPeriod: 50 },
  ema: { label: 'EMA', hasPeriod: true, defaultPeriod: 21 },
  rsi: { label: 'RSI', hasPeriod: true, defaultPeriod: 14 },
  roc: { label: 'ROC %', hasPeriod: true, defaultPeriod: 20 },
  bbUpper: { label: 'Bollinger upper', hasPeriod: true, defaultPeriod: 20 },
  bbLower: { label: 'Bollinger lower', hasPeriod: true, defaultPeriod: 20 },
  highest: { label: 'Highest high', hasPeriod: true, defaultPeriod: 20 },
  lowest: { label: 'Lowest low', hasPeriod: true, defaultPeriod: 20 },
  value: { label: 'Number', hasPeriod: false, defaultPeriod: 0 },
};

export const COMPARATOR_LABEL: Record<Comparator, string> = {
  '<': '<',
  '>': '>',
  '<=': '≤',
  '>=': '≥',
  crossesAbove: 'crosses above',
  crossesBelow: 'crosses below',
};

export const makeOperand = (type: OperandType, extra: Partial<Operand> = {}): Operand => ({
  type,
  period: OPERAND_META[type].defaultPeriod,
  value: 0,
  ...extra,
});

let seq = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const makeCondition = (): Condition => ({
  id: newId('c'),
  left: makeOperand('rsi', { period: 14 }),
  op: '<',
  right: makeOperand('value', { value: 30 }),
});

export const describeOperand = (o: Operand): string => {
  if (o.type === 'value') return String(o.value);
  const m = OPERAND_META[o.type];
  return m.hasPeriod ? `${m.label}(${o.period})` : m.label.toLowerCase();
};

export const describeCondition = (c: Condition): string =>
  `${describeOperand(c.left)} ${COMPARATOR_LABEL[c.op]} ${describeOperand(c.right)}`;

export const describeGroup = (g: ConditionGroup): string =>
  g.conditions.map(describeCondition).join(` ${g.logic} `);

export const describeRule = (r: RuleSet): string => {
  const entry = describeGroup(r.entry) || '…';
  const exit = r.exit.conditions.length ? describeGroup(r.exit) : 'the entry condition stops being true';
  return `IF ${entry} THEN BUY. EXIT when ${exit}.`;
};

/* ---------------- evaluation ---------------- */

function operandSeries(o: Operand, candles: Candle[], cache: Map<string, Series>): Series {
  const key = o.type === 'value' ? `value:${o.value}` : `${o.type}:${o.period}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const n = candles.length;
  const period = Math.max(1, Math.round(o.period));
  let s: Series;
  switch (o.type) {
    case 'close': s = candles.map((c) => c.c); break;
    case 'open': s = candles.map((c) => c.o); break;
    case 'high': s = candles.map((c) => c.h); break;
    case 'low': s = candles.map((c) => c.l); break;
    case 'volume': s = candles.map((c) => c.v); break;
    case 'sma': s = sma(candles.map((c) => c.c), period); break;
    case 'ema': s = ema(candles.map((c) => c.c), period); break;
    case 'rsi': s = rsi(candles.map((c) => c.c), period); break;
    case 'roc': s = roc(candles.map((c) => c.c), period).map((x) => x * 100); break;
    case 'bbUpper': s = bollinger(candles.map((c) => c.c), period, 2).upper; break;
    case 'bbLower': s = bollinger(candles.map((c) => c.c), period, 2).lower; break;
    case 'highest': s = highest(candles.map((c) => c.h), period); break;
    case 'lowest': s = lowest(candles.map((c) => c.l), period); break;
    case 'value': s = new Array<number>(n).fill(o.value); break;
  }
  cache.set(key, s);
  return s;
}

function conditionSeries(c: Condition, candles: Candle[], cache: Map<string, Series>): boolean[] {
  const L = operandSeries(c.left, candles, cache);
  const R = operandSeries(c.right, candles, cache);
  return candles.map((_, i) => {
    const l = L[i];
    const r = R[i];
    switch (c.op) {
      case '<': return l < r;
      case '>': return l > r;
      case '<=': return l <= r;
      case '>=': return l >= r;
      case 'crossesAbove': return i > 0 && L[i - 1] <= R[i - 1] && l > r;
      case 'crossesBelow': return i > 0 && L[i - 1] >= R[i - 1] && l < r;
    }
  });
}

function groupSeries(g: ConditionGroup, candles: Candle[], cache: Map<string, Series>): boolean[] | null {
  if (!g.conditions.length) return null;
  const all = g.conditions.map((c) => conditionSeries(c, candles, cache));
  return candles.map((_, i) => (g.logic === 'AND' ? all.every((s) => s[i]) : all.some((s) => s[i])));
}

export function runRule(rule: RuleSet, candles: Candle[]): Signal[] {
  const cache = new Map<string, Series>();
  const entry = groupSeries(rule.entry, candles, cache);
  const exit = groupSeries(rule.exit, candles, cache);
  const out: Signal[] = new Array<Signal>(candles.length).fill(0);
  if (!entry) return out;
  let pos: Signal = 0;
  for (let i = 0; i < candles.length; i++) {
    if (pos === 0 && entry[i]) pos = 1;
    else if (pos === 1 && (exit ? exit[i] : !entry[i])) pos = 0;
    out[i] = pos;
  }
  return out;
}
