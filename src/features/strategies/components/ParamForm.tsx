import type { ParamDef, Params } from '../types';
import { NumberField } from './ui';

export function ParamForm({
  defs,
  values,
  onChange,
}: {
  defs: ParamDef[];
  values: Params;
  onChange: (next: Params) => void;
}) {
  if (!defs.length) return <p className="m-0 text-[13px] text-[var(--muted)]">No parameters for this strategy.</p>;
  return (
    <div className="grid gap-3">
      {defs.map((d) => (
        <div key={d.key}>
          <NumberField
            label={d.label}
            value={values[d.key] ?? d.default}
            min={d.min}
            max={d.max}
            step={d.step}
            hint={d.hint}
            suffix={`${d.min}–${d.max}`}
            onChange={(v) => onChange({ ...values, [d.key]: v })}
          />
        </div>
      ))}
    </div>
  );
}
