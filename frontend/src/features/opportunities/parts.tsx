import { useEffect, useState } from 'react';
import type { ApiRequestError } from '../../api/client';
import { Button, Field, Modal, Textarea } from '../../components/ui';
import { FormError } from '../needs/formBits';

/** Live countdown to a deadline (display only; the server decides whether the deadline has passed). */
export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const ms = new Date(to).getTime() - now;
  if (ms <= 0) return <span className="font-semibold text-slate-500">Deadline passed</span>;
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  const parts = d > 0 ? [[d, 'd'], [h, 'h']] : [[h, 'h'], [m, 'm']];
  return (
    <span className="inline-flex items-baseline gap-1 font-semibold tabular-nums" aria-label={`${d} days ${h} hours ${m} minutes left`}>
      {parts.map(([v, u]) => <span key={u}>{v}<span className="text-xs font-medium opacity-70">{u}</span></span>)}
      <span className="text-xs font-medium opacity-70">left</span>
    </span>
  );
}

/** Modal asking for a required reason, then calling onConfirm(reason). Closes itself on success. */
export function ReasonModal({ open, title, subtitle, label, hint, confirmLabel, danger, loading, error, onClose, onConfirm }: {
  open: boolean; title: string; subtitle?: string; label: string; hint?: string; confirmLabel: string; danger?: boolean;
  loading: boolean; error: ApiRequestError | null; onClose: () => void; onConfirm: (reason: string) => Promise<boolean>;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);
  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} disabled={!reason.trim()}
            onClick={async () => { if (await onConfirm(reason.trim())) onClose(); }}>
            {confirmLabel}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Field label={label} required hint={hint}>
          <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </Field>
        <FormError error={error} />
      </div>
    </Modal>
  );
}
