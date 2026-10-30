import type { StrategyDef, StrategyDto } from '../types';
import { SIGNAL_ENGINES } from './engines';
import { describeRule, runRule } from './ruleEngine';

/** Turns an API record into what the UI uses. Unknown engines become `run: null` (listed, but not simulatable). */
export function toStrategyDef(d: StrategyDto): StrategyDef {
  const base = {
    id: d.id,
    name: d.name,
    kind: d.kind,
    category: d.category || 'Other',
    summary: d.summary,
    logic: d.logic,
    bestFor: d.best_for ?? '',
    weakness: d.weakness ?? '',
    origin: d.origin ?? '',
    updatedAt: (d.updated_at ?? '').slice(0, 10),
  };

  if (d.kind === 'rule' && d.rule) {
    const rule = d.rule;
    const text = describeRule(rule);
    return {
      ...base,
      category: d.category || 'Custom',
      summary: d.summary || text,
      logic: d.logic || text,
      params: [],
      rule,
      run: (candles) => runRule(rule, candles),
    };
  }

  return { ...base, params: d.params ?? [], run: SIGNAL_ENGINES[d.engine ?? d.id] ?? null };
}
