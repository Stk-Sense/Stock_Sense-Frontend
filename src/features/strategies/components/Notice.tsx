import type { ReactNode } from 'react';
import { Button } from './ui';

/** Used for loading / error / empty states so the page never shows made-up data. */
export function Notice({
  title,
  children,
  onRetry,
  busy,
}: {
  title: string;
  children?: ReactNode;
  onRetry?: () => void;
  busy?: boolean;
}) {
  return (
    <div
      role={busy ? 'status' : 'alert'}
      className="grid justify-items-start gap-2 border border-dashed border-[var(--muted)] bg-[var(--soft)] p-5"
    >
      <h3 className="m-0 text-sm font-semibold">{title}</h3>
      {children && <p className="m-0 text-[13px] text-[var(--muted)]">{children}</p>}
      {onRetry && !busy && <Button small onClick={onRetry}>Try again</Button>}
    </div>
  );
}
