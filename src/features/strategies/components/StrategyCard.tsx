import type { StrategyDef } from '../types';
import { Badge, Button } from './ui';
import { cn } from '../lib/format';

export function StrategyCard({
  strategy,
  onBacktest,
  onEdit,
  blockedReason,
}: {
  strategy: StrategyDef;
  onBacktest: () => void;
  onEdit: () => void;
  /** When set, Backtest is disabled and this is shown as the tooltip. */
  blockedReason?: string;
}) {
  const custom = strategy.kind === 'rule';
  return (
    <article
      className={cn(
        'flex flex-col border border-[var(--ink)] p-4',
        custom ? 'bg-[var(--soft)]' : 'bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="m-0 text-[15px] font-semibold leading-snug">{strategy.name}</h3>
        <Badge className="shrink-0">{custom ? 'Rule builder' : 'Built-in'}</Badge>
      </div>
      <div className="mt-0.5 text-[12px] text-[var(--muted)]">
        {strategy.category} · Updated {strategy.updatedAt}
      </div>
      <p className="mb-4 mt-2 flex-1 text-[13px] leading-relaxed text-[var(--ink)]">{strategy.summary}</p>
      <div className="flex gap-2">
        <Button
          variant="solid"
          small
          onClick={onBacktest}
          disabled={!strategy.run || !!blockedReason}
          title={blockedReason ?? (strategy.run ? undefined : 'No signal logic for this strategy in the frontend yet')}
        >
          Backtest
        </Button>
        <Button small onClick={onEdit}>Edit</Button>
      </div>
    </article>
  );
}
