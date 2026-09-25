import {
  AlertTriangle, ArrowRight, Banknote, Bot, Briefcase, Clock, Gauge, HardHat, Megaphone, Store, TimerOff, TrendingDown, TrendingUp,
} from 'lucide-react';
import { api } from '../../api/client';
import type { ExecutiveDashboardDto, ImpactHighlightDto, ImpactStatus } from '../../api/types';
import { useUser } from '../../app/auth';
import { Link, navigate } from '../../app/router';
import { AiInline } from '../../components/AiPanel';
import {
  Card, DataTable, EmptyState, ErrorBanner, Grid, Loading, Mono, PageHeader, ProgressBar, Stat, StatusBadge, type Column,
} from '../../components/ui';
import { hours, money, moneyShort, num, pct } from '../../lib/format';
import { useApi } from '../../lib/hooks';
import { STAGE_LABEL, type Tone } from '../../lib/labels';
import type { DepartmentDto } from '../../api/types';

const IMPACT_TEXT: Record<ImpactStatus, string> = {
  ACHIEVED: 'text-emerald-700',
  ON_TRACK: 'text-brand-700',
  AT_RISK: 'text-rose-700',
  NOT_MEASURED: 'text-slate-500',
};

function utilTone(p: number): Tone {
  return p >= 90 ? 'danger' : p >= 75 ? 'warning' : 'brand';
}

function HighlightCard({ h }: { h: ImpactHighlightDto }) {
  return (
    <article className="flex flex-col rounded-2xl border border-brand-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/needs/${h.needId}`} className="min-w-0 text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline">
          {h.needTitle}
        </Link>
        <StatusBadge status={h.status} />
      </div>
      <div className="mt-1 text-xs text-slate-500">Delivered by {h.supplierName}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Invested</span>
        <span className="text-lg font-bold text-slate-900">{money(h.invested)}</span>
      </div>
      <div className="my-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gold-600">
        <ArrowRight size={12} /> Outcome
      </div>
      {h.metrics.length === 0 ? (
        <p className="text-xs text-slate-500">No impact metrics defined yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {h.metrics.map((m, i) => {
            const up = (m.changePct ?? 0) >= 0;
            return (
              <li key={i} className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-slate-700">{m.name}</span>
                  <StatusBadge status={m.status} />
                </div>
                <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-xs text-slate-500">
                    {num(m.baseline, 1)} → <strong className="text-slate-900">{num(m.current, 1)}</strong> {m.unit}
                    <span className="text-slate-400"> · target {num(m.target, 1)}</span>
                  </span>
                  {m.changePct !== null && m.changePct !== undefined && (
                    <span className={`inline-flex items-center gap-1 text-sm font-bold ${IMPACT_TEXT[m.status]}`}>
                      {up ? <TrendingUp size={14} aria-hidden /> : <TrendingDown size={14} aria-hidden />}
                      {pct(m.changePct, 1, true)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Link to={`/implementations/${h.implementationId}`} className="mt-auto pt-3 text-xs font-semibold text-brand-700 hover:underline">
        View implementation →
      </Link>
    </article>
  );
}

export default function ExecutiveDashboard() {
  const user = useUser();
  const { data, error, loading, reload } = useApi(() => api.get<ExecutiveDashboardDto>('/dashboard/executive'));

  if (loading && !data) return <Loading label="Loading executive dashboard…" />;
  if (error && !data) return <ErrorBanner error={error} onRetry={reload} />;
  if (!data) return null;

  const k = data.kpis;
  const maxFunnel = Math.max(1, ...data.funnel.map((f) => f.count));

  const deptCols: Column<DepartmentDto>[] = [
    { key: 'name', header: 'Department', render: (d) => <div><div className="font-medium text-slate-900">{d.name}</div><Mono>{d.code} · FY {d.financialYear}</Mono></div> },
    { key: 'alloc', header: 'Allocated', align: 'right', render: (d) => moneyShort(d.budget.allocated) },
    { key: 'comm', header: 'Committed', align: 'right', render: (d) => moneyShort(d.budget.committed) },
    { key: 'avail', header: 'Available', align: 'right', render: (d) => <span className="font-semibold">{moneyShort(d.budget.available)}</span> },
    {
      key: 'util', header: 'Utilisation', className: 'min-w-[140px]', render: (d) => (
        <div className="flex items-center gap-2">
          <ProgressBar value={d.budget.utilisationPct} tone={utilTone(d.budget.utilisationPct)} label={`${d.name} budget utilisation`} />
          <span className="w-12 shrink-0 text-right text-xs font-semibold text-slate-600">{pct(d.budget.utilisationPct, 0)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Executive overview · Mzansi Metro"
        title={`Good day, ${user.fullName.split(' ')[0]}`}
        subtitle="Where public money is going, and what it is changing on the ground."
      />

      <section aria-labelledby="impact-band" className="rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2 text-white">
          <div>
            <h2 id="impact-band" className="text-base font-bold">Investment → outcome</h2>
            <p className="text-xs text-brand-100">Measured change against baseline for delivered and in-flight projects.</p>
          </div>
          <Link to="/impact" className="text-xs font-semibold text-gold-400 hover:underline">Impact portfolio →</Link>
        </div>
        {data.impactHighlights.length === 0 ? (
          <div className="rounded-xl bg-white/10 px-4 py-6 text-center text-sm text-brand-50">No measured outcomes yet.</div>
        ) : (
          <Grid cols={3}>{data.impactHighlights.map((h) => <HighlightCard key={h.implementationId} h={h} />)}</Grid>
        )}
      </section>

      <Grid cols={4}>
        <Stat label="Total procurement value" value={moneyShort(k.totalProcurementValue)} hint={money(k.totalProcurementValue)} icon={<Banknote size={16} />} tone="brand" />
        <Stat label="Active opportunities" value={num(k.activeOpportunities)} icon={<Megaphone size={16} />} tone="info" onClick={() => navigate('/opportunities')} />
        <Stat label="Active implementations" value={num(k.activeImplementations)} icon={<HardHat size={16} />} tone="brand" onClick={() => navigate('/implementations')} />
        <Stat label="Budget utilisation" value={pct(k.budgetUtilisationPct, 1)} icon={<Gauge size={16} />} tone={utilTone(k.budgetUtilisationPct)} />
        <Stat label="Local providers engaged" value={num(k.localProvidersEngaged)} icon={<Store size={16} />} tone="gold" onClick={() => navigate('/providers')} />
        <Stat label="Pending approvals" value={num(k.pendingApprovals)} icon={<Clock size={16} />} tone="warning" onClick={() => navigate('/approvals')} />
        <Stat label="SLA breaches" value={num(k.slaBreaches)} icon={<TimerOff size={16} />} tone={k.slaBreaches > 0 ? 'danger' : 'success'} hint={k.slaBreaches > 0 ? 'Approvals past their SLA' : 'All approvals within SLA'} />
        <Stat label="Projects at risk" value={num(k.projectsAtRisk)} icon={<AlertTriangle size={16} />} tone={k.projectsAtRisk > 0 ? 'danger' : 'success'} />
      </Grid>

      <Grid cols={2}>
        <Card title="Lifecycle funnel" subtitle="Public needs by current lifecycle stage" icon={<Briefcase size={16} />}>
          {data.funnel.length === 0 ? <EmptyState title="No needs yet" /> : (
            <ul className="space-y-2.5">
              {data.funnel.map((f) => (
                <li key={f.stage} className="grid grid-cols-[100px_1fr_36px] items-center gap-3 sm:grid-cols-[120px_1fr_40px]">
                  <span className="truncate text-xs font-medium text-slate-600">{STAGE_LABEL[f.stage]}</span>
                  <div className="h-6 overflow-hidden rounded-md bg-slate-100" aria-hidden>
                    <div
                      className={`h-full rounded-md ${f.stage === 'REJECTED' ? 'bg-rose-400' : f.stage === 'IMPACT' || f.stage === 'CLOSED' ? 'bg-gold-400' : 'bg-brand-500'}`}
                      style={{ width: `${Math.max(f.count > 0 ? 4 : 0, (f.count / maxFunnel) * 100)}%` }}
                    />
                  </div>
                  <span className="text-right text-sm font-bold text-slate-900" aria-label={`${STAGE_LABEL[f.stage]}: ${f.count}`}>{f.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="CIVIC AI" subtitle="Grounded briefing from platform records · AI assists, humans decide" icon={<Bot size={16} className="text-gold-500" />}>
          <p className="mb-3 text-sm text-slate-600">
            Generate a draft briefing covering spend, approvals, evaluations, delivery risk and measured impact. Every claim cites a record reference.
          </p>
          <AiInline task="executive-briefing" />
        </Card>
      </Grid>

      <Card title="Department budgets" subtitle="Allocated vs committed for the current financial year" padded={false}>
        <DataTable columns={deptCols} rows={data.departments} rowKey={(d) => d.id} empty={<div className="p-5"><EmptyState title="No departments" /></div>} />
      </Card>

      <Grid cols={2}>
        <Card title="Implementations at risk" subtitle="Late or flagged at risk" icon={<AlertTriangle size={16} className="text-rose-600" />}
          actions={<Link to="/implementations" className="text-xs font-semibold text-brand-700 hover:underline">All</Link>}>
          {data.atRisk.length === 0 ? <EmptyState title="Nothing at risk" message="All implementations are on schedule." /> : (
            <ul className="divide-y divide-slate-100">
              {data.atRisk.map((i) => (
                <li key={i.id} className="py-3 first:pt-0 last:pb-0">
                  <Link to={`/implementations/${i.id}`} className="group block">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900 group-hover:text-brand-700 group-hover:underline">{i.needTitle}</span>
                      <StatusBadge status={i.status} />
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">{i.supplierName} · {i.departmentName} · {moneyShort(i.amount)}{i.isLate ? ' · late' : ''}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <ProgressBar value={i.progressPct} tone="danger" label={`${i.needTitle} progress`} />
                      <span className="w-10 text-right text-xs font-semibold text-slate-600">{pct(i.progressPct, 0)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Overdue approvals" subtitle="Requests with an approval step past its SLA" icon={<TimerOff size={16} className="text-rose-600" />}
          actions={<Link to="/approvals" className="text-xs font-semibold text-brand-700 hover:underline">Approvals</Link>}>
          {data.overdueApprovals.length === 0 ? <EmptyState title="No overdue approvals" /> : (
            <ul className="divide-y divide-slate-100">
              {data.overdueApprovals.map((r) => {
                const step = r.steps.find((s) => s.status === 'PENDING');
                return (
                  <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                    <Link to="/approvals" className="group block">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900 group-hover:text-brand-700 group-hover:underline">{r.needTitle}</span>
                        <StatusBadge status={step?.sla.state ?? 'OVERDUE'} />
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        <Mono>{r.reference}</Mono> · {r.departmentName} · {money(r.amount)}
                        {step && <> · {hours(step.sla.hoursRemaining)}</>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </Grid>
    </div>
  );
}
