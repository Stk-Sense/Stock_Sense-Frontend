export interface Candle {
  /** ISO date (YYYY-MM-DD) */
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

/** Target position after the bar closes: 1 = long, 0 = flat. Long-only (educational scope). */
export type Signal = 0 | 1;

export type Params = Record<string, number>;

export interface ParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  hint?: string;
}

/** Free text from the API (e.g. "Trend", "Mean reversion"). The filter chips are built from whatever comes back. */
export type StrategyCategory = string;

export interface StrategyDef {
  id: string;
  name: string;
  kind: 'builtin' | 'rule';
  category: StrategyCategory;
  /** One line shown on the card. */
  summary: string;
  /** Plain-English rules (entry / exit). */
  logic: string;
  bestFor: string;
  weakness: string;
  /** Where the idea comes from. */
  origin: string;
  params: ParamDef[];
  updatedAt: string;
  /** Present for rule-builder strategies so they can be edited. */
  rule?: RuleSet;
  /** null = the API listed this strategy but this frontend has no signal logic for it yet. */
  run: ((candles: Candle[], params: Params) => Signal[]) | null;
}

/** Shape returned by `GET /strategies` (snake_case, as FastAPI/Pydantic usually emits). */
export interface StrategyDto {
  id: string;
  name: string;
  kind: 'builtin' | 'rule';
  category: string;
  summary: string;
  logic: string;
  best_for?: string;
  weakness?: string;
  origin?: string;
  /** ISO date or datetime. */
  updated_at: string;
  /** Which signal function to use. Defaults to `id`. Ignored for kind === 'rule'. */
  engine?: string;
  params?: ParamDef[];
  /** Required when kind === 'rule'. Stored by the backend as an opaque JSON document. */
  rule?: RuleSet;
}

/** Shape returned by `GET /market/{symbol}/ohlcv`. Oldest bar first. */
export interface OhlcvDto {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/* ---------------- Rule builder ---------------- */

export type OperandType =
  | 'close'
  | 'open'
  | 'high'
  | 'low'
  | 'volume'
  | 'sma'
  | 'ema'
  | 'rsi'
  | 'roc'
  | 'bbUpper'
  | 'bbLower'
  | 'highest'
  | 'lowest'
  | 'value';

export interface Operand {
  type: OperandType;
  /** Lookback for indicators. */
  period: number;
  /** Constant for type === 'value'. */
  value: number;
}

export type Comparator = '<' | '>' | '<=' | '>=' | 'crossesAbove' | 'crossesBelow';

export interface Condition {
  id: string;
  left: Operand;
  op: Comparator;
  right: Operand;
}

export interface ConditionGroup {
  logic: 'AND' | 'OR';
  conditions: Condition[];
}

export interface RuleSet {
  id: string;
  name: string;
  updatedAt: string;
  entry: ConditionGroup;
  exit: ConditionGroup;
}

/* ---------------- Backtest ---------------- */

export interface BacktestConfig {
  initialCapital: number;
  /** Per side, % of traded value. */
  feePct: number;
  /** Per side, % adverse price move. */
  slippagePct: number;
  /** % of current equity allocated on entry. */
  positionPct: number;
  /** 0 = disabled. */
  stopLossPct: number;
  /** 0 = disabled. */
  takeProfitPct: number;
}

export type ExitReason = 'signal' | 'stop' | 'target' | 'end';

export interface Trade {
  entryIdx: number;
  exitIdx: number;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  qty: number;
  pnl: number;
  retPct: number;
  bars: number;
  reason: ExitReason;
}

export interface Metrics {
  totalReturnPct: number;
  buyHoldReturnPct: number;
  cagrPct: number;
  sharpe: number;
  sortino: number;
  maxDrawdownPct: number;
  calmar: number;
  winRatePct: number;
  profitFactor: number;
  trades: number;
  avgTradePct: number;
  exposurePct: number;
  finalEquity: number;
}

export interface BacktestResult {
  dates: string[];
  equity: number[];
  benchmark: number[];
  drawdownPct: number[];
  trades: Trade[];
  metrics: Metrics;
}

/** `GET /market/symbols` */
export interface SymbolSpec {
  symbol: string;
  name: string;
  /** ISO 4217 code. Defaults to INR when omitted. */
  currency?: string;
}
