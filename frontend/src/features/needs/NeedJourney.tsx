import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, History, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client';
import type { AuditEntryDto } from '../../api/types';
import { Badge, Card, EmptyState, ErrorBanner, Loading, Mono } from '../../components/ui';
import { dateTime } from '../../lib/format';
import { useApi } from '../../lib/hooks';
import { ROLE_LABEL, type Tone } from '../../lib/labels';

function actionTone(action: string): Tone {
  if (/REJECT|CANCEL|AT_RISK|FAIL|BREACH/.test(action)) return 'danger';
  if (/ESCALAT|OVERDUE|DEVIATION|WITHDRAW/.test(action)) return 'warning';
  if (/APPROV|SELECT|ISSUED|COMPLETED|VERIFIED|ACHIEVED|VALIDATED|AWARD/.test(action)) return 'success';
  if (/PUBLISH|OPPORTUNITY|SUBMISSION|EVALUAT/.test(action)) return 'info';
  if (/IMPACT|METRIC|MEASURE/.test(action)) return 'gold';
  return 'brand';
}

function Entry({ e, n, last }: { e: AuditEntryDto; n: number; last: boolean }) {
  const [open, setOpen] = useState(false);
  const hasMeta = !!e.metadata && Object.keys(e.metadata).length > 0;
  return (
    <li className="relative flex gap-3 pb-6">
      {!last && <span className="absolute left-[11px] top-7 h-[calc(100%-1.25rem)] w-px bg-slate-200" aria-hidden />}
      <span className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-brand-500 bg-white text-[10px] font-bold text-brand-700">
        {n}
      </span>
      <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge tone={actionTone(e.action)}>{e.action.replaceAll('_', ' ')}</Badge>
          <time dateTime={e.occurredAt} className="text-xs text-slate-500">{dateTime(e.occurredAt)}</time>
        </div>
        <p className="mt-1.5 break-words text-sm text-slate-800">{e.summary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span><span className="font-semibold text-slate-700">{e.actorName}</span>{e.actorRole ? ` · ${ROLE_LABEL[e.actorRole]}` : ''}</span>
          <span className="hidden sm:inline" aria-hidden>·</span>
          <span>{e.entityType} · #{e.sequence}</span>
          <span title={`Hash ${e.hash}\nPrevious ${e.prevHash}`} className="inline-flex items-center gap-1">
            <ShieldCheck size={12} className="text-brand-600" /> <Mono>{e.hash.slice(0, 10)}</Mono>
          </span>
        </div>
        {hasMeta && (
          <div className="mt-2">
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline">
              {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Metadata
            </button>
            {open && (
              <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
                {JSON.stringify(e.metadata, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export function NeedJourney({ needId }: { needId: string }) {
  const journey = useApi(() => api.get<AuditEntryDto[]>(`/needs/${needId}/journey`), [needId]);
  return (
    <Card
      title="Complete, tamper-evident history of this need"
      subtitle="Every state change, in order. Each entry is SHA-256 hash-chained to the previous one."
      icon={<History size={16} />}
      actions={journey.data && <Badge tone="brand">{journey.data.length} entries</Badge>}
    >
      {journey.loading && !journey.data ? <Loading label="Loading journey…" /> : journey.error ? (
        <ErrorBanner error={journey.error} onRetry={journey.reload} />
      ) : (journey.data ?? []).length === 0 ? (
        <EmptyState title="No audit entries yet" />
      ) : (
        <ol className="pt-1">
          {journey.data!.map((e, i) => <Fragment key={e.id}><Entry e={e} n={i + 1} last={i === journey.data!.length - 1} /></Fragment>)}
        </ol>
      )}
    </Card>
  );
}
