import type { Params, StrategyDef } from '../types';

export const defaultParams = (s: StrategyDef): Params =>
  Object.fromEntries(s.params.map((d) => [d.key, d.default]));

/** Merge a user's saved defaults over the API's defaults, ignoring keys that no longer exist. */
export const resolveParams = (s: StrategyDef, saved?: Params): Params => {
  const base = defaultParams(s);
  if (!saved) return base;
  for (const k of Object.keys(base)) if (typeof saved[k] === 'number') base[k] = saved[k];
  return base;
};
