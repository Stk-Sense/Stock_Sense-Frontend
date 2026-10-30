import type { Candle, OhlcvDto, RuleSet, StrategyDto, SymbolSpec } from '../types';

/**
 * Every piece of data on the Strategies page comes from here. There is no bundled sample data.
 *
 * Endpoints this page expects (adjust the paths below if the backend differs):
 *   GET    /strategies                 -> StrategyDto[]
 *   POST   /strategies                 -> StrategyDto      body: { name, kind: 'rule', rule }
 *   PUT    /strategies/{id}            -> StrategyDto      body: { name, kind: 'rule', rule }
 *   DELETE /strategies/{id}            -> 204
 *   GET    /market/symbols             -> SymbolSpec[]
 *   GET    /market/{symbol}/ohlcv      -> OhlcvDto[]       (oldest first)
 */
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api';

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** TODO: attach the JWT here, using whatever the rest of the app uses (e.g. `Authorization: Bearer <token>`). */
function authHeaders(): Record<string, string> {
  return {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders(), ...init.headers },
    });
  } catch {
    throw new ApiError('Cannot reach the API. Is the backend running?');
  }
  if (!res.ok) throw new ApiError(`The API returned an error (${res.status}).`, res.status);
  if (res.status === 204) return undefined as T;
  if (!res.headers.get('content-type')?.includes('json')) {
    throw new ApiError('The API returned an unexpected response (not JSON).');
  }
  return (await res.json()) as T;
}

export const fetchStrategies = () => request<StrategyDto[]>('/strategies');

export const fetchSymbols = () => request<SymbolSpec[]>('/market/symbols');

export async function fetchCandles(symbol: string): Promise<Candle[]> {
  const rows = await request<OhlcvDto[]>(`/market/${encodeURIComponent(symbol)}/ohlcv`);
  const candles = rows
    .map((r) => ({ t: String(r.date).slice(0, 10), o: r.open, h: r.high, l: r.low, c: r.close, v: r.volume }))
    .filter((c) => [c.o, c.h, c.l, c.c].every(Number.isFinite))
    .sort((a, b) => a.t.localeCompare(b.t));
  if (candles.length < 2) throw new ApiError(`No price history available for ${symbol}.`);
  return candles;
}

export const createRuleStrategy = (name: string, rule: RuleSet) =>
  request<StrategyDto>('/strategies', { method: 'POST', body: JSON.stringify({ name, kind: 'rule', rule }) });

export const updateRuleStrategy = (id: string, name: string, rule: RuleSet) =>
  request<StrategyDto>(`/strategies/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ name, kind: 'rule', rule }),
  });

export const deleteStrategy = (id: string) =>
  request<void>(`/strategies/${encodeURIComponent(id)}`, { method: 'DELETE' });
