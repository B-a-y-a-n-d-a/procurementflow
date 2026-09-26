import { useMemo } from 'react';
import { AlertTriangle, ArrowRight, BarChart3, CircleDashed, Target, TrendingUp, Trophy } from 'lucide-react';
import { api } from '../../api/client';
import type { ImpactMetricDto } from '../../api/types';
import { Link } from '../../app/router';
import { AiInline } from '../../components/AiPanel';
import { Card, EmptyState, ErrorBanner, Loading, PageHeader, Stat, StatusBadge } from '../../components/ui';
import { useApi } from '../../lib/hooks';
import { date, num, pct } from '../../lib/format';
import { DIRECTION_LABEL } from '../../lib/labels';

export default function ImpactPortfolio() {
  const metrics = useApi(() => api.get<ImpactMetricDto[]>('/impact'));
  const list = metrics.data ?? [];

  const counts = useMemo(() => {
    const c = { ACHIEVED: 0, ON_TRACK: 0, AT_RISK: 0, NOT_MEASURED: 0 };
    list.forEach((m) => { c[m.status] += 1; });
    return c;
  }, [list]);

  const groups = useMemo(() => {
    const map = new Map<string, { needId: string; needTitle: string; departmentName: string; implementationId: string; items: ImpactMetricDto[] }>();
    list.forEach((m) => {
      const key = m.implementationId;
      if (!map.has(key)) map.set(key, { needId: m.needId, needTitle: m.needTitle, departmentName: m.departmentName, implementationId: m.implementationId, items: [] });
      map.get(key)!.items.push(m);
    });
    return [...map.values()].sort((a, b) => a.needTitle.localeCompare(b.needTitle));
  }, [list]);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Measurable impact" title="Impact portfolio" subtitle="Did the investment produce measurable results?" />

      <ErrorBanner error={metrics.error} onRetry={metrics.reload} />
      {metrics.loading && !metrics.data && <Loading />}

      {metrics.data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Stat label="Metrics tracked" value={list.length} icon={<BarChart3 size={16} />} tone="neutral" />
            <Stat label="Achieved" value={counts.ACHIEVED} icon={<Trophy size={16} />} tone="success" />
            <Stat label="On track" value={counts.ON_TRACK} icon={<TrendingUp size={16} />} tone="brand" />
            <Stat label="At risk" value={counts.AT_RISK} icon={<AlertTriangle size={16} />} tone="danger" />
            <Stat label="Not measured" value={counts.NOT_MEASURED} icon={<CircleDashed size={16} />} tone="neutral" />
          </div>

          <Card title="CIVIC AI" subtitle="A grounded summary of outcomes across the portfolio, for human review.">
            <AiInline task="impact-summary" />
          </Card>

          {groups.length === 0 && <EmptyState icon={<Target size={32} />} title="No impact metrics yet" message="Metrics are added to implementations once a PO is issued." />}

          {groups.map((g) => (
            <Card key={g.implementationId} padded={false}
              title={<Link to={`/needs/${g.needId}`} className="hover:text-brand-700">{g.needTitle}</Link>}
              subtitle={`${g.departmentName} · ${g.items.length} metric${g.items.length === 1 ? '' : 's'}`}
              actions={<Link to={`/implementations/${g.implementationId}`} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-brand-700 hover:underline">Implementation <ArrowRight size={12} /></Link>}>
              {/* md+: table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-2">Metric</th>
                      <th className="px-3 py-2 text-right">Baseline</th>
                      <th className="px-3 py-2 text-right">Current</th>
                      <th className="px-3 py-2 text-right">Target</th>
                      <th className="px-3 py-2 text-right">Change</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-5 py-2">Last measured</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {g.items.map((m) => (
                      <tr key={m.id}>
                        <td className="px-5 py-2.5"><div className="font-medium text-slate-800">{m.name}</div><div className="text-[11px] text-slate-500">{m.unit} · {DIRECTION_LABEL[m.direction]}</div></td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{num(m.baseline, 2)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{num(m.current, 2)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-brand-700">{num(m.target, 2)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{pct(m.changePct, 1, true)}</td>
                        <td className="px-3 py-2.5"><StatusBadge status={m.status} /></td>
                        <td className="px-5 py-2.5 whitespace-nowrap text-xs text-slate-500">{date(m.lastMeasuredAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* mobile: list */}
              <ul className="divide-y divide-slate-100 md:hidden">
                {g.items.map((m) => (
                  <li key={m.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><div className="text-sm font-medium text-slate-800">{m.name}</div><div className="text-[11px] text-slate-500">{m.unit} · {DIRECTION_LABEL[m.direction]}</div></div>
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-slate-600">
                      <span>{num(m.baseline, 2)} → <strong className="text-slate-900">{num(m.current, 2)}</strong> (target {num(m.target, 2)})</span>
                      <span className="font-semibold">{pct(m.changePct, 1, true)}</span>
                      <span className="text-slate-400">{date(m.lastMeasuredAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
