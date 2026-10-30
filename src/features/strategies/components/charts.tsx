import { Suspense, lazy } from 'react';
import type { Data } from 'plotly.js';
import type { BacktestResult, Candle } from '../types';

const PlotlyChart = lazy(() => import('./PlotlyChart'));

const INK = '#1f2328';
const POS = '#1a7f4b';
const NEG = '#c9302c';
const BLUE = '#2b6cb0';
const GREY = '#8b949e';
export const SERIES_COLORS = [INK, BLUE, '#b7791f', '#6b46c1', '#0f766e', '#be185d'];

function Chart({ data, layout, height }: { data: Data[]; layout?: object; height: number }) {
  return (
    <Suspense fallback={<div style={{ height }} className="animate-pulse bg-[var(--soft)]" aria-label="Loading chart" />}>
      <PlotlyChart data={data} layout={layout} height={height} />
    </Suspense>
  );
}

export function PriceTradesChart({ candles, result }: { candles: Candle[]; result: BacktestResult }) {
  const x = candles.map((c) => c.t);
  const { trades } = result;
  const data: Data[] = [
    { x, y: candles.map((c) => c.c), type: 'scatter', mode: 'lines', name: 'Close', line: { color: GREY, width: 1.4 } },
    {
      x: trades.map((t) => t.entryDate),
      y: trades.map((t) => t.entryPrice),
      type: 'scatter',
      mode: 'markers',
      name: 'Buy',
      marker: { symbol: 'triangle-up', color: POS, size: 9 },
      hovertemplate: 'Buy %{y:.2f}<extra></extra>',
    },
    {
      x: trades.map((t) => t.exitDate),
      y: trades.map((t) => t.exitPrice),
      type: 'scatter',
      mode: 'markers',
      name: 'Sell',
      marker: { symbol: 'triangle-down', color: NEG, size: 9 },
      hovertemplate: 'Sell %{y:.2f}<extra></extra>',
    },
  ];
  return <Chart data={data} height={240} />;
}

export function EquityChart({ result, name }: { result: BacktestResult; name: string }) {
  const data: Data[] = [
    { x: result.dates, y: result.equity, type: 'scatter', mode: 'lines', name, line: { color: INK, width: 2 } },
    { x: result.dates, y: result.benchmark, type: 'scatter', mode: 'lines', name: 'Buy & hold', line: { color: GREY, width: 1.4, dash: 'dot' } },
  ];
  return <Chart data={data} height={240} layout={{ yaxis: { tickformat: ',.0f', gridcolor: '#eaeef2', zeroline: false } }} />;
}

export function DrawdownChart({ result }: { result: BacktestResult }) {
  const data: Data[] = [
    {
      x: result.dates,
      y: result.drawdownPct,
      type: 'scatter',
      mode: 'lines',
      name: 'Drawdown %',
      fill: 'tozeroy',
      line: { color: NEG, width: 1 },
      fillcolor: 'rgba(201,48,44,0.15)',
    },
  ];
  return <Chart data={data} height={150} layout={{ yaxis: { ticksuffix: '%', gridcolor: '#eaeef2', zeroline: false }, showlegend: false }} />;
}

/** Overlay of several equity curves, each normalised to 100 at the start. */
export function CompareChart({ series }: { series: { name: string; dates: string[]; equity: number[]; dashed?: boolean }[] }) {
  const data: Data[] = series.map((s, i) => ({
    x: s.dates,
    y: s.equity.map((e) => (e / s.equity[0]) * 100),
    type: 'scatter',
    mode: 'lines',
    name: s.name,
    line: { color: s.dashed ? GREY : SERIES_COLORS[i % SERIES_COLORS.length], width: s.dashed ? 1.4 : 1.8, dash: s.dashed ? 'dot' : 'solid' },
  }));
  return <Chart data={data} height={300} layout={{ hovermode: 'x', yaxis: { title: { text: 'Growth of 100' }, gridcolor: '#eaeef2', zeroline: false } }} />;
}
