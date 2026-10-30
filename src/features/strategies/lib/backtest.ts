import type { BacktestConfig, BacktestResult, Candle, Metrics, Signal, Trade, ExitReason } from '../types';

export const DEFAULT_CONFIG: BacktestConfig = {
  initialCapital: 100_000,
  feePct: 0.1,
  slippagePct: 0.05,
  positionPct: 100,
  stopLossPct: 0,
  takeProfitPct: 0,
};

const TRADING_DAYS = 252;

/**
 * Event-driven, long-only, single-asset backtester.
 *
 * Realism rules (these are what make a backtest honest):
 *  - A signal computed on bar i-1's close is executed at bar i's OPEN (no look-ahead).
 *  - Fees and slippage are charged on every fill.
 *  - Whole shares only; unused cash is held flat.
 *  - Stop-loss / take-profit are checked intrabar; if both could trigger, the stop wins.
 *  - After a stop/target exit we stay flat until the signal resets to 0, so we don't re-enter instantly.
 *  - An open trade is closed at the final bar's close so every trade is accounted for.
 */
export function runBacktest(candles: Candle[], signals: Signal[], cfg: BacktestConfig): BacktestResult {
  const n = candles.length;
  const fee = cfg.feePct / 100;
  const slip = cfg.slippagePct / 100;
  const sl = cfg.stopLossPct / 100;
  const tp = cfg.takeProfitPct / 100;

  let cash = cfg.initialCapital;
  let qty = 0;
  let entryPrice = 0;
  let entryIdx = 0;
  let entryCost = 0;
  let blocked = false;
  let barsInPosition = 0;

  const trades: Trade[] = [];
  const equity: number[] = new Array<number>(n).fill(cfg.initialCapital);

  const close = (i: number, price: number, reason: ExitReason) => {
    const proceeds = qty * price * (1 - fee);
    cash += proceeds;
    const pnl = proceeds - entryCost;
    trades.push({
      entryIdx,
      exitIdx: i,
      entryDate: candles[entryIdx].t,
      exitDate: candles[i].t,
      entryPrice,
      exitPrice: price,
      qty,
      pnl,
      retPct: (pnl / entryCost) * 100,
      bars: i - entryIdx,
      reason,
    });
    qty = 0;
  };

  for (let i = 0; i < n; i++) {
    const bar = candles[i];
    const want: Signal = i > 0 ? signals[i - 1] : 0;
    if (want === 0) blocked = false;

    if (i > 0) {
      if (qty > 0 && want === 0) {
        close(i, bar.o * (1 - slip), 'signal');
      } else if (qty === 0 && want === 1 && !blocked) {
        const price = bar.o * (1 + slip);
        const budget = (cash * cfg.positionPct) / 100;
        const q = Math.floor(budget / (price * (1 + fee)));
        if (q > 0) {
          const cost = q * price * (1 + fee);
          cash -= cost;
          qty = q;
          entryPrice = price;
          entryIdx = i;
          entryCost = cost;
        }
      }

      if (qty > 0) {
        const stop = sl > 0 ? entryPrice * (1 - sl) : -Infinity;
        const target = tp > 0 ? entryPrice * (1 + tp) : Infinity;
        if (bar.l <= stop) {
          close(i, Math.min(bar.o, stop) * (1 - slip), 'stop');
          blocked = true;
        } else if (bar.h >= target) {
          close(i, Math.max(bar.o, target) * (1 - slip), 'target');
          blocked = true;
        }
      }
    }

    if (qty > 0) barsInPosition++;
    if (i === n - 1 && qty > 0) close(i, bar.c * (1 - slip), 'end');
    equity[i] = cash + qty * bar.c;
  }

  const base = candles[0]?.c ?? 1;
  const benchmark = candles.map((b) => (cfg.initialCapital * b.c) / base);

  let peak = -Infinity;
  const drawdownPct = equity.map((e) => {
    peak = Math.max(peak, e);
    return peak > 0 ? (e / peak - 1) * 100 : 0;
  });

  return {
    dates: candles.map((b) => b.t),
    equity,
    benchmark,
    drawdownPct,
    trades,
    metrics: computeMetrics(equity, benchmark, drawdownPct, trades, barsInPosition, cfg.initialCapital),
  };
}

function computeMetrics(
  equity: number[],
  benchmark: number[],
  drawdownPct: number[],
  trades: Trade[],
  barsInPosition: number,
  initial: number,
): Metrics {
  const n = equity.length;
  const final = equity[n - 1] ?? initial;
  const totalReturn = (final / initial - 1) * 100;
  const bh = ((benchmark[n - 1] ?? initial) / initial - 1) * 100;
  const years = Math.max(n / TRADING_DAYS, 1 / TRADING_DAYS);
  const cagr = final > 0 ? (Math.pow(final / initial, 1 / years) - 1) * 100 : -100;

  const rets: number[] = [];
  for (let i = 1; i < n; i++) rets.push(equity[i] / equity[i - 1] - 1);
  const mean = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : 0;
  const sd = Math.sqrt(rets.reduce((a, r) => a + (r - mean) ** 2, 0) / Math.max(rets.length - 1, 1));
  const downside = Math.sqrt(rets.reduce((a, r) => a + Math.min(r, 0) ** 2, 0) / Math.max(rets.length, 1));
  const sharpe = sd > 0 ? (mean / sd) * Math.sqrt(TRADING_DAYS) : 0;
  const sortino = downside > 0 ? (mean / downside) * Math.sqrt(TRADING_DAYS) : 0;

  const maxDd = Math.min(0, ...drawdownPct);
  const calmar = maxDd < 0 ? cagr / Math.abs(maxDd) : 0;

  const wins = trades.filter((t) => t.pnl > 0);
  const grossWin = wins.reduce((a, t) => a + t.pnl, 0);
  const grossLoss = trades.filter((t) => t.pnl <= 0).reduce((a, t) => a + Math.abs(t.pnl), 0);

  return {
    totalReturnPct: totalReturn,
    buyHoldReturnPct: bh,
    cagrPct: cagr,
    sharpe,
    sortino,
    maxDrawdownPct: maxDd,
    calmar,
    winRatePct: trades.length ? (wins.length / trades.length) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    trades: trades.length,
    avgTradePct: trades.length ? trades.reduce((a, t) => a + t.retPct, 0) / trades.length : 0,
    exposurePct: n ? (barsInPosition / n) * 100 : 0,
    finalEquity: final,
  };
}

/** Plain-English observations that keep the user honest about what a result means. */
export function explainResult(m: Metrics): { tone: 'good' | 'warn' | 'info'; text: string }[] {
  const out: { tone: 'good' | 'warn' | 'info'; text: string }[] = [];
  const diff = m.totalReturnPct - m.buyHoldReturnPct;
  out.push({
    tone: diff >= 0 ? 'good' : 'info',
    text:
      diff >= 0
        ? `Beat buy & hold by ${diff.toFixed(1)} percentage points over this window.`
        : `Trailed buy & hold by ${Math.abs(diff).toFixed(1)} percentage points. Simply holding did better here.`,
  });
  if (m.trades < 10)
    out.push({ tone: 'warn', text: `Only ${m.trades} trade(s). Too few to say anything statistically meaningful.` });
  if (m.maxDrawdownPct < -30)
    out.push({ tone: 'warn', text: `Max drawdown of ${m.maxDrawdownPct.toFixed(1)}%. Most people abandon a strategy long before this point.` });
  if (m.exposurePct < 30 && m.trades > 0)
    out.push({ tone: 'info', text: `In the market only ${m.exposurePct.toFixed(0)}% of the time, so part of the return gap is simply idle cash.` });
  if (m.winRatePct < 40 && m.profitFactor > 1.3)
    out.push({ tone: 'info', text: 'Low win rate but profitable: typical of trend followers, where a few big winners pay for many small losses.' });
  if (m.winRatePct > 65 && m.profitFactor < 1.2 && m.trades > 0)
    out.push({ tone: 'warn', text: 'High win rate but thin profit factor: typical of mean reversion, where a few large losses can erase many small wins.' });
  out.push({ tone: 'info', text: 'One window on one asset is not proof. Test other symbols and periods before trusting a result.' });
  return out;
}
