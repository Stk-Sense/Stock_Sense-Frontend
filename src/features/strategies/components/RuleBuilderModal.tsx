import { useState } from 'react';
import type { Comparator, Condition, ConditionGroup, Operand, OperandType, RuleSet } from '../types';
import { COMPARATOR_LABEL, OPERAND_META, describeRule, makeCondition, makeOperand, newId } from '../lib/ruleEngine';
import { Button, Modal, Select } from './ui';

const OPERAND_OPTIONS = (Object.keys(OPERAND_META) as OperandType[]).map((v) => ({ value: v, label: OPERAND_META[v].label }));
const OP_OPTIONS = (Object.keys(COMPARATOR_LABEL) as Comparator[]).map((v) => ({ value: v, label: COMPARATOR_LABEL[v] }));

function OperandEditor({ side, value, onChange }: { side: string; value: Operand; onChange: (o: Operand) => void }) {
  const meta = OPERAND_META[value.type];
  return (
    <span className="inline-flex items-center gap-1">
      <Select
        label={`${side} operand`}
        value={value.type}
        options={OPERAND_OPTIONS}
        onChange={(type) => onChange(makeOperand(type, { value: value.value }))}
      />
      {meta.hasPeriod && (
        <input
          aria-label={`${side} period`}
          type="number"
          min={1}
          max={400}
          value={value.period}
          onChange={(e) => onChange({ ...value, period: Math.max(1, Math.round(Number(e.target.value) || 1)) })}
          className="tabular w-16 border border-[var(--line)] px-2 py-1.5 text-sm"
        />
      )}
      {value.type === 'value' && (
        <input
          aria-label={`${side} number`}
          type="number"
          step="any"
          value={value.value}
          onChange={(e) => onChange({ ...value, value: Number(e.target.value) || 0 })}
          className="tabular w-20 border border-[var(--line)] px-2 py-1.5 text-sm"
        />
      )}
    </span>
  );
}

function GroupEditor({
  title,
  hint,
  group,
  onChange,
}: {
  title: string;
  hint: string;
  group: ConditionGroup;
  onChange: (g: ConditionGroup) => void;
}) {
  const update = (id: string, patch: Partial<Condition>) =>
    onChange({ ...group, conditions: group.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  return (
    <section className="grid gap-2 border border-[var(--line)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="m-0 text-sm font-semibold">{title}</h3>
          <p className="m-0 text-[12px] text-[var(--muted)]">{hint}</p>
        </div>
        {group.conditions.length > 1 && (
          <Select
            label={`${title} logic`}
            value={group.logic}
            onChange={(logic) => onChange({ ...group, logic })}
            options={[
              { value: 'AND', label: 'ALL must be true (AND)' },
              { value: 'OR', label: 'ANY can be true (OR)' },
            ]}
          />
        )}
      </div>
      {group.conditions.map((c, i) => (
        <div key={c.id} className="flex flex-wrap items-center gap-2 bg-[var(--soft)] p-2">
          <span className="w-8 text-[12px] font-semibold text-[var(--muted)]">{i === 0 ? 'IF' : group.logic}</span>
          <OperandEditor side="Left" value={c.left} onChange={(left) => update(c.id, { left })} />
          <Select label="Comparison" value={c.op} options={OP_OPTIONS} onChange={(op) => update(c.id, { op })} />
          <OperandEditor side="Right" value={c.right} onChange={(right) => update(c.id, { right })} />
          <Button
            small
            variant="ghost"
            aria-label="Remove condition"
            onClick={() => onChange({ ...group, conditions: group.conditions.filter((x) => x.id !== c.id) })}
          >
            Remove
          </Button>
        </div>
      ))}
      <div>
        <Button small onClick={() => onChange({ ...group, conditions: [...group.conditions, makeCondition()] })}>+ Add condition</Button>
      </div>
    </section>
  );
}

export function RuleBuilderModal({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial?: RuleSet;
  onSave: (r: RuleSet, isNew: boolean) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const attempt = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  };
  const [rule, setRule] = useState<RuleSet>(
    () =>
      initial ?? {
        id: newId('rule'),
        name: 'My new strategy',
        updatedAt: new Date().toISOString().slice(0, 10),
        entry: { logic: 'AND', conditions: [makeCondition()] },
        exit: { logic: 'OR', conditions: [] },
      },
  );
  const valid = rule.name.trim().length > 0 && rule.entry.conditions.length > 0;

  return (
    <Modal
      wide
      onClose={onClose}
      title={initial ? 'Edit rule-based strategy' : 'New rule-based strategy'}
      subtitle="Combine indicators with AND / OR. No code needed."
      footer={
        <>
          {initial && onDelete && (
            <Button
              variant="danger"
              className="mr-auto"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Delete "${rule.name}"?`)) void attempt(() => onDelete(rule.id));
              }}
            >
              Delete
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="solid"
            disabled={!valid || busy}
            onClick={() => void attempt(() => onSave({ ...rule, name: rule.name.trim() }, !initial))}
          >
            {busy ? 'Saving…' : 'Save strategy'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div>
          <label htmlFor="rule-name" className="mb-1 block text-[13px] font-medium">Strategy name</label>
          <input
            id="rule-name"
            value={rule.name}
            maxLength={60}
            onChange={(e) => setRule({ ...rule, name: e.target.value })}
            className="w-full max-w-md border border-[var(--line)] px-2 py-1.5 text-sm"
          />
        </div>
        <GroupEditor title="Entry" hint="When these hold and you are flat, BUY at the next open." group={rule.entry} onChange={(entry) => setRule({ ...rule, entry })} />
        <GroupEditor
          title="Exit"
          hint="Leave empty to exit as soon as the entry condition stops being true."
          group={rule.exit}
          onChange={(exit) => setRule({ ...rule, exit })}
        />
        <div className="border border-dashed border-[var(--muted)] bg-[var(--soft)] px-3 py-2.5 text-[13px]" aria-live="polite">
          <span className="text-[var(--muted)]">Preview: </span>
          {describeRule(rule)}
        </div>
        {!valid && <p className="m-0 text-[13px] text-[var(--neg)]">Add a name and at least one entry condition.</p>}
        {error && <p role="alert" className="m-0 text-[13px] text-[var(--neg)]">Couldn't save: {error}</p>}
      </div>
    </Modal>
  );
}
