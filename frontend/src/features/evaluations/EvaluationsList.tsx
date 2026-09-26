import { useMemo } from 'react';
import { ArrowRight, Scale, Users } from 'lucide-react';
import { api } from '../../api/client';
import type { OpportunitySummaryDto, OpportunityStatus } from '../../api/types';
import { Link } from '../../app/router';
import { Callout, Card, EmptyState, ErrorBanner, Loading, Mono, PageHeader, StatusBadge } from '../../components/ui';
import { useApi } from '../../lib/hooks';
import { money, date } from '../../lib/format';
import { CATEGORY_LABEL } from '../../lib/labels';

const EVALUATION_STATUSES: OpportunityStatus[] = ['EVALUATION', 'CLOSED', 'AWARDED'];
const ORDER: Record<string, number> = { EVALUATION: 0, CLOSED: 1, AWARDED: 2 };

export default function EvaluationsList() {
  const opps = useApi(() => api.get<OpportunitySummaryDto[]>('/opportunities'));

  const rows = useMemo(
    () =>
      (opps.data ?? [])
        .filter((o) => EVALUATION_STATUSES.includes(o.status))
        .sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9)),
    [opps.data],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Transparent procurement"
        title="Evaluations"
        subtitle="Closed opportunities, scored against published criteria. The system recommends. A human decides."
      />
      <div className="mb-4">
        <Callout tone="brand" icon={<Scale size={16} />}>
          Price, B-BBEE and local participation are scored automatically by the rule engine. Evaluators score the rest, with a
          rationale. Every point is explained on the board.
        </Callout>
      </div>
      <ErrorBanner error={opps.error} onRetry={opps.reload} />
      {opps.loading && !opps.data && <Loading />}
      {opps.data && rows.length === 0 && (
        <EmptyState title="No opportunities in evaluation" message="Opportunities appear here once they close or evaluation starts." />
      )}
      {rows.length > 0 && (
        <Card padded={false}>
          <ul className="divide-y divide-slate-100">
            {rows.map((o) => (
              <li key={o.id}>
                <Link to={`/evaluations/${o.id}`} className="group flex flex-col gap-3 px-5 py-4 transition hover:bg-brand-50/40 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Mono>{o.reference}</Mono>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-slate-900 group-hover:text-brand-700">{o.title}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {o.departmentName} · {CATEGORY_LABEL[o.category]} · closed {date(o.submissionDeadline)}
                    </div>
                  </div>
                  <div className="flex items-center gap-5 text-sm">
                    <div className="text-left sm:text-right">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Budget</div>
                      <div className="font-semibold text-slate-800">{money(o.budget)}</div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Submissions</div>
                      <div className="flex items-center gap-1 font-semibold text-slate-800"><Users size={14} className="text-slate-400" />{o.submissionCount}</div>
                    </div>
                    <ArrowRight size={16} className="ml-auto text-slate-300 group-hover:text-brand-600 sm:ml-0" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
