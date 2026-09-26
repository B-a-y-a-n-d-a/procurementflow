import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, Scale, ShieldAlert, Wallet } from 'lucide-react';
import { api, qs, ApiRequestError } from '../../api/client';
import type { RoutingPreviewDto } from '../../api/types';
import { Badge, Callout, ErrorBanner, ProgressBar } from '../../components/ui';
import { money } from '../../lib/format';
import { ROLE_LABEL } from '../../lib/labels';

/** Debounced GET /rules/routing-preview. The server computes budget, routing and SLA; the UI only displays it. */
export function useRoutingPreview(departmentId: string | null | undefined, amount: number, delay = 300) {
  const [data, setData] = useState<RoutingPreviewDto | null>(null);
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!departmentId || !(amount > 0)) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      api.get<RoutingPreviewDto>(`/rules/routing-preview${qs({ departmentId, amount })}`)
        .then((d) => { if (!cancelled) { setData(d); setError(null); } })
        .catch((e) => { if (!cancelled) setError(e instanceof ApiRequestError ? e : new ApiRequestError({ status: 0, code: 'UNKNOWN', message: String(e) })); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, delay);
    return () => { cancelled = true; clearTimeout(t); };
  }, [departmentId, amount, delay]);

  return { data, error, loading };
}

export function RoutingPreviewPanel({ preview, error, loading, amount }: {
  preview: RoutingPreviewDto | null; error: ApiRequestError | null; loading: boolean; amount: number;
}) {
  if (!(amount > 0)) {
    return <p className="text-sm text-slate-500">Enter an estimated budget to see the budget check and the approval route that will apply.</p>;
  }
  if (error) return <ErrorBanner error={error} />;
  if (!preview) return <p className="text-sm text-slate-400">{loading ? 'Checking budget and routing…' : 'No preview available.'}</p>;

  const b = preview.budget;
  return (
    <div className={`space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-live="polite">
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <Wallet size={12} /> Department budget
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[['Allocated', b.allocated], ['Committed', b.committed], ['Available', b.available]].map(([k, v]) => (
            <div key={k as string} className="rounded-lg bg-slate-50 px-1.5 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
              <dd className={`mt-0.5 text-xs font-bold sm:text-sm ${k === 'Available' ? (preview.withinBudget ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-800'}`}>{money(v as number)}</dd>
            </div>
          ))}
        </dl>
        <ProgressBar className="mt-3" value={b.utilisationPct} tone={b.utilisationPct > 90 ? 'danger' : b.utilisationPct > 75 ? 'warning' : 'brand'} label="Budget utilisation" />
        <div className="mt-1 text-[11px] text-slate-500">{b.utilisationPct.toFixed(1)}% of the allocation already committed</div>
      </div>

      {preview.withinBudget ? (
        <Callout tone="success" icon={<CheckCircle2 size={16} />} title="Within available budget">
          {money(preview.amount)} fits within the {money(b.available)} available.
        </Callout>
      ) : (
        <Callout tone="danger" icon={<ShieldAlert size={16} />} title="Exceeds available budget">
          {money(preview.amount)} is more than the {money(b.available)} available.{' '}
          {preview.budgetMode === 'BLOCK'
            ? 'The organisational rules are set to block, so submitting will be refused (BUDGET_EXCEEDED). You can still save a draft.'
            : 'The organisational rules are set to warn, so the request can be submitted but will be flagged.'}
        </Callout>
      )}

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <Scale size={12} /> Approval route
        </div>
        {preview.autoApproved ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success"><CheckCircle2 size={11} /> Auto-approved</Badge>
            <span className="text-xs text-slate-500">Below the approval threshold, so no manual sign-off is needed.</span>
          </div>
        ) : (
          <ol className="flex flex-wrap items-center gap-1.5">
            {preview.approverRoles.map((r, i) => (
              <li key={r + i} className="flex items-center gap-1.5">
                {i > 0 && <ArrowRight size={13} className="text-slate-300" aria-hidden />}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 ring-1 ring-inset ring-brand-200">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[9px] text-white">{i + 1}</span>
                  {ROLE_LABEL[r]}
                </span>
              </li>
            ))}
          </ol>
        )}
        {!preview.autoApproved && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={12} /> Each approver has {preview.slaHours} h (SLA) once their step is active.
          </p>
        )}
      </div>

      {preview.minOffersApplies && (
        <Callout tone="info" title="Competition rule applies">
          At least {preview.minCompetitiveOffers} competitive offers are needed before a purchase order can be issued.
        </Callout>
      )}
    </div>
  );
}
