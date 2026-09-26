import { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CalendarClock, Hammer, UserRound } from 'lucide-react';
import { api } from '../../api/client';
import type { ImplementationStatus, ImplementationSummaryDto } from '../../api/types';
import { Link } from '../../app/router';
import { Badge, EmptyState, ErrorBanner, Loading, Mono, PageHeader, ProgressBar, StatusBadge } from '../../components/ui';
import { useApi } from '../../lib/hooks';
import { date, money } from '../../lib/format';
import { CATEGORY_LABEL, statusTone } from '../../lib/labels';

const STATUSES: ImplementationStatus[] = ['NOT_STARTED', 'PLANNED', 'IN_PROGRESS', 'AT_RISK', 'COMPLETED', 'CANCELLED'];

export default function ImplementationsList() {
  const list = useApi(() => api.get<ImplementationSummaryDto[]>('/implementations'));
  const [filter, setFilter] = useState<ImplementationStatus | 'ALL'>('ALL');

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (list.data ?? []).forEach((i) => { c[i.status] = (c[i.status] ?? 0) + 1; });
    return c;
  }, [list.data]);
  const rows = (list.data ?? []).filter((i) => filter === 'ALL' || i.status === filter);

  return (
    <div>
      <PageHeader eyebrow="Implementation" title="Implementations" subtitle="A purchase order is the midpoint, not the end." />

      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
        <FilterChip active={filter === 'ALL'} onClick={() => setFilter('ALL')} label="All" count={list.data?.length} />
        {STATUSES.filter((s) => counts[s]).map((s) => (
          <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)} label={statusTone(s).label} count={counts[s]} />
        ))}
      </div>

      <ErrorBanner error={list.error} onRetry={list.reload} />
      {list.loading && !list.data && <Loading />}
      {list.data && rows.length === 0 && (
        <EmptyState icon={<Hammer size={32} />} title="No implementations" message="An implementation starts when a purchase order is issued." />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((i) => (
          <Link key={i.id} to={`/implementations/${i.id}`}
            className={`group flex flex-col rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-brand-300 hover:shadow-md ${i.status === 'AT_RISK' ? 'border-rose-200' : 'border-slate-200/80'}`}>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={i.status} />
              {i.isLate && <Badge tone="danger"><AlertTriangle size={11} /> Late</Badge>}
              <Mono className="ml-auto">{i.poNumber}</Mono>
            </div>
            <h2 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-brand-700">{i.needTitle}</h2>
            <div className="mt-0.5 text-xs text-slate-500">{i.departmentName} · {CATEGORY_LABEL[i.needCategory]}</div>
            <div className="mt-3 text-sm text-slate-700"><span className="text-slate-400">Supplier</span> {i.supplierName} · <span className="font-semibold">{money(i.amount)}</span></div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">Progress</span><span className="font-semibold text-slate-800">{i.progressPct}%</span></div>
              <ProgressBar value={i.progressPct} tone={i.status === 'AT_RISK' ? 'danger' : i.status === 'COMPLETED' ? 'success' : 'brand'} label={`${i.needTitle} progress`} />
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><UserRound size={12} />{i.managerName}</span>
              <span className={`inline-flex items-center gap-1 ${i.isLate ? 'font-semibold text-rose-700' : ''}`}>
                <CalendarClock size={12} />{i.actualCompletion ? `Completed ${date(i.actualCompletion)}` : `Due ${date(i.expectedCompletion)}`}
              </span>
              <span className="inline-flex items-center gap-1"><BarChart3 size={12} />{i.metricCount} impact metric{i.metricCount === 1 ? '' : 's'}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition ${active ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}>
      {label}{count !== undefined && <span className={active ? 'text-brand-100' : 'text-slate-400'}>{count}</span>}
    </button>
  );
}
