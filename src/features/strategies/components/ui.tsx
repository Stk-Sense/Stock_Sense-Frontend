import { useEffect, useId, useRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/format';

type Variant = 'solid' | 'outline' | 'ghost' | 'danger';

export function Button({
  variant = 'outline',
  small,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean }) {
  const styles: Record<Variant, string> = {
    solid: 'bg-[var(--ink)] text-white border-[var(--ink)] hover:bg-black',
    outline: 'bg-white text-[var(--ink)] border-[var(--ink)] hover:bg-[var(--soft)]',
    ghost: 'bg-transparent text-[var(--muted)] border-transparent hover:bg-[var(--soft)]',
    danger: 'bg-white text-[var(--neg)] border-[var(--neg)] hover:bg-red-50',
  };
  return (
    <button
      {...rest}
      className={cn(
        'border font-medium transition-colors disabled:opacity-50',
        small ? 'px-3 py-1 text-[13px]' : 'px-4 py-2 text-sm',
        styles[variant],
        className,
      )}
    />
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-block border border-[var(--muted)] px-2 py-0.5 text-[11px] leading-4 text-[var(--ink)]', className)}>
      {children}
    </span>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  wide,
  children,
  footer,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-0 sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn('w-full border border-[var(--ink)] bg-white outline-none', wide ? 'max-w-[1180px]' : 'max-w-3xl')}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="m-0 text-lg font-semibold">{title}</h2>
            {subtitle && <div className="mt-0.5 text-[13px] text-[var(--muted)]">{subtitle}</div>}
          </div>
          <Button small onClick={onClose} aria-label="Close dialog">Close</Button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--line)] px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 flex items-baseline justify-between text-[13px] font-medium">
        <span>{label}</span>
        {suffix && <span className="font-normal text-[var(--muted)]">{suffix}</span>}
      </label>
      <input
        id={id}
        type="number"
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(Number.isFinite(v) ? v : 0);
        }}
        onBlur={() => {
          let v = value;
          if (min !== undefined) v = Math.max(min, v);
          if (max !== undefined) v = Math.min(max, v);
          if (v !== value) onChange(v);
        }}
        className="tabular w-full border border-[var(--line)] bg-white px-2 py-1.5 text-sm"
      />
      {hint && <p className="mt-1 text-[12px] text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn('border border-[var(--line)] bg-white px-2 py-1.5 text-sm', className)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function Stat({ label, value, sub, valueClass }: { label: string; value: ReactNode; sub?: ReactNode; valueClass?: string }) {
  return (
    <div className="border border-[var(--line)] px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className={cn('tabular mt-0.5 text-lg font-semibold', valueClass)}>{value}</div>
      {sub && <div className="tabular text-[12px] text-[var(--muted)]">{sub}</div>}
    </div>
  );
}
