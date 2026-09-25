import { Activity, Clock, FilePlus2, HardHat, Megaphone, Wallet } from 'lucide-react';
import { api } from '../../api/client';
import type { DepartmentDashboardDto, ImpactMetricDto, ImplementationSummaryDto, OpportunitySummaryDto, PurchaseRequestDto } from '../../api/types';
import { useAuth } from '../../app/auth';
import { Link, navigate } from '../../app/router';
import {
  Button, Card, DataTable, EmptyState, ErrorBanner, Grid, Loading, Mono, PageHeader, ProgressBar, Stat, StatusBadge, type Column,
} from '../../components/ui';
import { date, money, moneyShort, num, pct } from '../../lib/format';
import { useApi } from '../../lib/hooks';
import { SOURCING_LABEL } from '../../lib/labels';

export default function DepartmentDashboard({ departmentId }: { departmentId: string }) {
  const { has } = useAuth();
  const { data, error, loading, reload } = useApi(
    () => api.get<DepartmentDashboardDto>(`/dashboard/department/${encodeURIComponent(departmentId)}`),
    [departmentId],
  );

  if (loading && !data) return <Loading label="Loading department dashboard…" />;
  if (error && !data) return <ErrorBanner error={error} onRetry={reload} />;
  if (!data) return null;

  const d = data.department;
  const b = d.budget;
  const utilTone = b.utilisationPct >= 90 ? 'danger' : b.utilisationPct >= 75 ? 'warning' : 'brand';

  const reqCols: Column<PurchaseRequestDto>[] = [
    { key: 'ref', header: 'Reference', render: (r) => <Mono>{r.reference}</Mono> },
    {
      key: 'need', header: 'Public need', render: (r) => (
        <Link to={`/needs/${r.needId}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{r.needTitle}</Link>
      ),
    },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="whitespace-nowrap">{money(r.amount)}</span> },
    { key: 'src', header: 'Sourcing', render: (r) => <span className="text-xs text-slate-600">{SOURCING_LABEL[r.sourcingMethod]}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const oppCols: Column<OpportunitySummaryDto>[] = [
    {
      key: 'title', header: 'Opportunity', render: (o) => (
        <div><Link to={`/opportunities/${o.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{o.title}</Link><div><Mono>{o.reference}</Mono></div></div>
      ),
    },
    { key: 'deadline', header: 'Closes', render: (o) => <span className="whitespace-nowrap text-xs">{date(o.submissionDeadline)}</span> },
    { key: 'subs', header: 'Submissions', align: 'right', render: (o) => num(o.submissionCount) },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.displayStatus} /> },
  ];

  const implCols: Column<ImplementationSummaryDto>[] = [
    {
      key: 'title', header: 'Implementation', render: (i) => (
        <div><Link to={`/implementations/${i.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{i.needTitle}</Link><div className="text-xs text-slate-500">{i.supplierName}</div></div>
      ),
    },
    {
      key: 'progress', header: 'Progress', className: 'min-w-[140px]', render: (i) => (
        <div className="flex items-center gap-2">
          <ProgressBar value={i.progressPct} tone={i.status === 'AT_RISK' ? 'danger' : i.status === 'COMPLETED' ? 'success' : 'brand'} label={`${i.needTitle} progress`} />
          <span className="w-10 text-right text-xs font-semibold">{pct(i.progressPct, 0)}</span>
        </div>
      ),
    },
    { key: 'due', header: 'Expected', render: (i) => <span className="whitespace-nowrap text-xs">{date(i.expectedCompletion)}</span> },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
  ];

  const metricCols: Column<ImpactMetricDto>[] = [
    { key: 'name', header: 'Metric', render: (m) => <div><div className="font-medium text-slate-900">{m.name}</div><div className="text-xs text-slate-500">{m.needTitle}</div></div> },
    { key: 'vals', header: 'Baseline → current', render: (m) => <span className="whitespace-nowrap text-xs">{num(m.baseline, 1)} → <strong>{num(m.current, 1)}</strong> {m.unit} <span className="text-slate-400">(target {num(m.target, 1)})</span></span> },
    { key: 'chg', header: 'Change', align: 'right', render: (m) => <span className="font-semibold">{pct(m.changePct, 1, true)}</span> },
    { key: 'status', header: 'Status', render: (m) => <StatusBadge status={m.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${d.municipality} · FY ${d.financialYear}`}
        title={d.name}
        subtitle="Your department's public needs, spend commitments, delivery and measured outcomes."
        actions={has('DEPARTMENT_OFFICER', 'DEPARTMENT_MANAGER') && (
          <Button icon={<FilePlus2 size={16} />} onClick={() => navigate('/needs/new')}>New public need</Button>
        )}
      />

      <Grid cols={3}>
        <Card title="Budget" subtitle={`${d.code} · live commitments`} icon={<Wallet size={16} />} className="md:col-span-2 xl:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Allocated</div><div className="mt-1 text-xl font-bold">{money(b.allocated)}</div></div>
            <div><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Committed</div><div className="mt-1 text-xl font-bold text-amber-700">{money(b.committed)}</div></div>
            <div><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Available</div><div className="mt-1 text-xl font-bold text-brand-700">{money(b.available)}</div></div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <ProgressBar value={b.utilisationPct} tone={utilTone} label="Budget utilisation" />
            <span className="shrink-0 text-sm font-semibold text-slate-700">{pct(b.utilisationPct, 1)} used</span>
          </div>
        </Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1">
          <Stat label="Pending approvals" value={num(data.pendingApprovals)} icon={<Clock size={16} />} tone={data.pendingApprovals > 0 ? 'warning' : 'success'} onClick={() => navigate('/approvals')} />
          <Stat label="Implementations" value={num(data.implementations.length)} hint={`${data.opportunities.length} opportunities`} icon={<HardHat size={16} />} tone="brand" />
        </div>
      </Grid>

      <Card title="Purchase requests" subtitle="Budget-validated requests raised from your public needs" padded={false}
        actions={<Link to="/needs" className="text-xs font-semibold text-brand-700 hover:underline">All needs</Link>}>
        <DataTable columns={reqCols} rows={data.requests} rowKey={(r) => r.id}
          empty={<div className="p-5"><EmptyState title="No requests yet" message="Record a public need to start the lifecycle." /></div>} />
      </Card>

      <Grid cols={2}>
        <Card title="Opportunities" icon={<Megaphone size={16} />} padded={false}>
          <DataTable dense columns={oppCols} rows={data.opportunities} rowKey={(o) => o.id} empty={<div className="p-5"><EmptyState title="No opportunities" /></div>} />
        </Card>
        <Card title="Implementations" icon={<HardHat size={16} />} padded={false}>
          <DataTable dense columns={implCols} rows={data.implementations} rowKey={(i) => i.id} empty={<div className="p-5"><EmptyState title="No implementations" /></div>} />
        </Card>
      </Grid>

      <Card title="Impact metrics" subtitle={`Measured outcomes for ${moneyShort(b.committed)} committed`} icon={<Activity size={16} />} padded={false}
        actions={<Link to="/impact" className="text-xs font-semibold text-brand-700 hover:underline">Impact portfolio</Link>}>
        <DataTable columns={metricCols} rows={data.impact} rowKey={(m) => m.id} empty={<div className="p-5"><EmptyState title="No impact metrics yet" /></div>} />
      </Card>
    </div>
  );
}
