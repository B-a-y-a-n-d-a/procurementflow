import { AlertTriangle, Clock } from 'lucide-react';
import type { ApprovalStepDto, SlaDto } from '../../api/types';
import { Badge, StatusBadge } from '../../components/ui';
import { dateTime, hours } from '../../lib/format';
import { ROLE_LABEL } from '../../lib/labels';

/** SLA state from the server + hours remaining (negative = overdue). */
export function SlaBadge({ sla }: { sla: SlaDto }) {
  if (sla.state === 'DONE' || sla.state === 'NOT_ACTIVE') return <StatusBadge status={sla.state} />;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <StatusBadge status={sla.state} />
      {sla.hoursRemaining !== null && sla.hoursRemaining !== undefined && (
        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${sla.state === 'OVERDUE' ? 'text-rose-700' : sla.state === 'DUE_SOON' ? 'text-amber-700' : 'text-slate-500'}`}>
          <Clock size={11} /> {hours(sla.hoursRemaining)}
        </span>
      )}
    </span>
  );
}

/** Vertical list of approval steps, in sequence. Optionally highlights the step the current user can act on. */
export function ApprovalSteps({ steps, highlightId }: { steps: ApprovalStepDto[]; highlightId?: string | null }) {
  if (steps.length === 0) return <p className="text-sm text-slate-400">No approval steps.</p>;
  const sorted = [...steps].sort((a, b) => a.sequence - b.sequence);
  return (
    <ol className="space-y-2">
      {sorted.map((s) => {
        const active = s.id === highlightId;
        const pending = s.status === 'PENDING';
        return (
          <li key={s.id} className={`rounded-xl border p-3 ${active ? 'border-brand-400 bg-brand-50/60 ring-2 ring-brand-500/15' : 'border-slate-200 bg-white'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{s.sequence}</span>
              <span className="text-sm font-semibold text-slate-900">{ROLE_LABEL[s.requiredRole]}</span>
              <StatusBadge status={s.status} />
              {active && <Badge tone="brand">Your action</Badge>}
              {s.escalatedAt && <Badge tone="warning" title={`Escalated ${dateTime(s.escalatedAt)}`}><AlertTriangle size={11} /> Escalated</Badge>}
            </div>
            <div className="mt-1.5 space-y-1 pl-8 text-xs text-slate-500">
              {s.approverName && <div>Decided by <span className="font-medium text-slate-700">{s.approverName}</span>{s.decidedAt ? ` · ${dateTime(s.decidedAt)}` : ''}</div>}
              {!s.approverName && s.decidedAt && <div>Decided {dateTime(s.decidedAt)}</div>}
              {pending && (
                <div className="flex flex-wrap items-center gap-2">
                  <SlaBadge sla={s.sla} />
                  {s.dueAt && <span>Due {dateTime(s.dueAt)}</span>}
                </div>
              )}
              {s.status === 'WAITING' && <div>Starts when the previous step is approved.</div>}
              {s.comment && <blockquote className="border-l-2 border-slate-200 pl-2 italic text-slate-600">"{s.comment}"</blockquote>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
