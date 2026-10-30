import { useState } from 'react';
import type { Params, StrategyDef } from '../types';
import { defaultParams } from '../lib/params';
import { ParamForm } from './ParamForm';
import { Badge, Button, Modal } from './ui';

/** Edit view for BUILT-IN strategies: read the rules, save your own default parameters. */
export function StrategyEditModal({
  strategy,
  params,
  onSave,
  onReset,
  onClose,
}: {
  strategy: StrategyDef;
  params: Params;
  onSave: (p: Params) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Params>(params);
  const facts: [string, string][] = [
    ['Best for', strategy.bestFor],
    ['Weakness', strategy.weakness],
    ['Origin', strategy.origin],
  ];
  return (
    <Modal
      onClose={onClose}
      title={<span className="flex flex-wrap items-center gap-2">{strategy.name} <Badge>Built-in</Badge></span>}
      subtitle={`${strategy.category} · Updated ${strategy.updatedAt}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => { onReset(); setDraft(defaultParams(strategy)); }}>Reset to factory defaults</Button>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="solid" onClick={() => { onSave(draft); onClose(); }}>Save defaults</Button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <section className="grid content-start gap-3">
          <h3 className="m-0 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">How it works</h3>
          <p className="m-0 text-sm leading-relaxed">{strategy.logic}</p>
          <dl className="m-0 grid gap-2 text-[13px]">
            {facts.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[84px_1fr] gap-2">
                <dt className="text-[var(--muted)]">{k}</dt>
                <dd className="m-0">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="grid content-start gap-3">
          <h3 className="m-0 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">Default parameters</h3>
          <ParamForm defs={strategy.params} values={draft} onChange={setDraft} />
          <p className="m-0 text-[12px] text-[var(--muted)]">
            Saved defaults are used the next time you open Backtest. Tuning parameters until a past result looks great is called
            overfitting, so check the same settings on other symbols and periods.
          </p>
        </section>
      </div>
    </Modal>
  );
}
