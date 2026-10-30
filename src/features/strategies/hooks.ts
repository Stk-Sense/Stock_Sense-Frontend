import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Candle, Params, RuleSet, StrategyDef, SymbolSpec } from './types';
import { createRuleStrategy, deleteStrategy, fetchCandles, fetchStrategies, fetchSymbols, updateRuleStrategy } from './lib/api';
import { toStrategyDef } from './lib/catalog';

export type Status = 'loading' | 'ready' | 'error';

const messageOf = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

/** Per-user UI preference only (saved parameter defaults). Not market or strategy data. */
function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage blocked or full: preference just won't persist */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

/** Loads something from the API on mount and whenever `reload` is called. */
function useApiResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<{ status: Status; data: T | null; error: string }>({
    status: 'loading',
    data: null,
    error: '',
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    load().then(
      (data) => alive && setState({ status: 'ready', data, error: '' }),
      (e: unknown) => alive && setState({ status: 'error', data: null, error: messageOf(e) }),
    );
    return () => {
      alive = false;
    };
    // `load` is a stable module-level function for every caller.
  }, [load, tick]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading', error: '' }));
    setTick((t) => t + 1);
  }, []);

  return { ...state, reload };
}

export function useSymbols() {
  const r = useApiResource<SymbolSpec[]>(fetchSymbols);
  return { symbols: r.data ?? [], status: r.status, error: r.error, reload: r.reload };
}

/**
 * Strategy catalog from `GET /strategies`, plus create/update/delete for rule-builder strategies.
 * Save/delete throw on failure so the calling dialog can show the message.
 */
export function useStrategyLibrary() {
  const r = useApiResource(fetchStrategies);
  const [saved, setSaved] = usePersistentState<Record<string, Params>>('stocksense.params.v1', {});

  const strategies: StrategyDef[] = useMemo(() => (r.data ?? []).map(toStrategyDef), [r.data]);

  const { reload } = r;
  const saveRule = useCallback(
    async (rule: RuleSet, isNew: boolean) => {
      if (isNew) await createRuleStrategy(rule.name, rule);
      else await updateRuleStrategy(rule.id, rule.name, rule);
      reload();
    },
    [reload],
  );
  const removeStrategy = useCallback(
    async (id: string) => {
      await deleteStrategy(id);
      reload();
    },
    [reload],
  );
  const saveParams = useCallback((id: string, p: Params) => setSaved((prev) => ({ ...prev, [id]: p })), [setSaved]);
  const resetParams = useCallback(
    (id: string) =>
      setSaved((prev) => {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }),
    [setSaved],
  );

  return { strategies, status: r.status, error: r.error, reload, saved, saveRule, removeStrategy, saveParams, resetParams };
}

export function useCandles(symbol: string) {
  const [state, setState] = useState<{ candles: Candle[]; status: Status; error: string }>({
    candles: [],
    status: 'loading',
    error: '',
  });
  useEffect(() => {
    if (!symbol) return;
    let alive = true;
    setState((s) => ({ ...s, status: 'loading', error: '' }));
    fetchCandles(symbol).then(
      (candles) => alive && setState({ candles, status: 'ready', error: '' }),
      (e: unknown) => alive && setState({ candles: [], status: 'error', error: messageOf(e) }),
    );
    return () => {
      alive = false;
    };
  }, [symbol]);
  return state;
}
