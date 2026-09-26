import { Award, Clock, Lightbulb, MapPin, Megaphone, Send, Star } from 'lucide-react';
import { api } from '../../api/client';
import type { OpportunitySummaryDto, ProviderDashboardDto, SubmissionDto } from '../../api/types';
import { Link, navigate } from '../../app/router';
import {
  Badge, Button, Card, DataTable, EmptyState, ErrorBanner, Grid, KeyValues, Loading, Mono, PageHeader, Stat, StatusBadge, type Column,
} from '../../components/ui';
import { date, money, moneyShort, num } from '../../lib/format';
import { useApi } from '../../lib/hooks';
import { bbbee, CATEGORY_LABEL, MATURITY_LABEL, PROVIDER_TYPE_LABEL } from '../../lib/labels';

function OpportunityItem({ o, gold }: { o: OpportunitySummaryDto; gold?: boolean }) {
  return (
    <li>
      <Link
        to={`/opportunities/${o.id}`}
        className={`group block rounded-xl border px-4 py-3 transition hover:shadow-sm ${gold ? 'border-gold-100 bg-gold-50/50 hover:border-gold-400' : 'border-slate-100 hover:border-brand-300'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold text-slate-900 group-hover:text-brand-700">{o.title}</span>
          <StatusBadge status={o.displayStatus} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <Mono>{o.reference}</Mono>
          <span>{o.departmentName}</span>
          <span className="font-semibold text-slate-700">{moneyShort(o.budget)}</span>
          <span className="inline-flex items-center gap-1"><MapPin size={11} aria-hidden />{o.location.municipality}</span>
        </div>
        <div className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${gold ? 'text-gold-600' : 'text-slate-600'}`}>
          <Clock size={12} aria-hidden /> Closes {date(o.submissionDeadline)} · {o.daysToDeadline} day{o.daysToDeadline === 1 ? '' : 's'} left
        </div>
      </Link>
    </li>
  );
}

export default function ProviderDashboard() {
  const { data, error, loading, reload } = useApi(() => api.get<ProviderDashboardDto>('/dashboard/provider'));

  if (loading && !data) return <Loading label="Loading your dashboard…" />;
  if (error && !data) return <ErrorBanner error={error} onRetry={reload} />;
  if (!data) return null;

  const p = data.provider;

  const subCols: Column<SubmissionDto>[] = [
    {
      key: 'opp', header: 'Opportunity', render: (s) => (
        <div>
          <Link to={`/opportunities/${s.opportunityId}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{s.opportunityTitle}</Link>
          <div><Mono>{s.opportunityReference}</Mono>{s.solutionName && <span className="text-xs text-slate-500"> · {s.solutionName}</span>}</div>
        </div>
      ),
    },
    { key: 'price', header: 'Price', align: 'right', render: (s) => <span className="whitespace-nowrap">{money(s.proposedPrice)}</span> },
    { key: 'when', header: 'Submitted', render: (s) => <span className="whitespace-nowrap text-xs">{date(s.submittedAt)}</span> },
    {
      key: 'status', header: 'Status', render: (s) => (
        <div className="max-w-xs">
          <StatusBadge status={s.status} />
          {s.statusReason && <div className="mt-1 text-xs text-slate-500">{s.statusReason}</div>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Provider workspace"
        title={p.name}
        subtitle="Public problems you can solve, the status of your submissions, and your registered solutions."
        actions={<Button icon={<Megaphone size={16} />} onClick={() => navigate('/opportunities')}>Browse opportunities</Button>}
      />

      <Grid cols={3}>
        <Card title="Your profile" icon={<Star size={16} />} className="md:col-span-2 xl:col-span-1"
          actions={<Link to={`/providers/${p.id}`} className="text-xs font-semibold text-brand-700 hover:underline">View</Link>}>
          <KeyValues
            items={[
              ['Type', PROVIDER_TYPE_LABEL[p.providerType]],
              ['B-BBEE', <span>{bbbee(p.bbbeeLevel)}{p.bbbeeExpired && <Badge tone="danger" className="ml-1.5">Expired</Badge>}</span>],
              ['Location', `${p.location.municipality}, ${p.location.province}${p.location.ward ? ` · Ward ${p.location.ward}` : ''}`],
              ['Supplier status', p.supplierStatus ? <StatusBadge status={p.supplierStatus} /> : <span className="text-slate-500">Not yet a formal supplier</span>],
              ['Verification', <StatusBadge status={p.verificationStatus} />],
              ['Employees', num(p.employees)],
            ]}
          />
        </Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:col-span-2 md:grid-cols-3 xl:col-span-2">
          <Stat label="Submitted" value={num(data.counts.submitted)} icon={<Send size={16} />} tone="info" />
          <Stat label="Shortlisted" value={num(data.counts.shortlisted)} icon={<Star size={16} />} tone="gold" />
          <Stat label="Selected" value={num(data.counts.selected)} icon={<Award size={16} />} tone="success" />
          <div className="sm:col-span-3">
            <Card title="Closing soon" subtitle="Deadlines approaching" icon={<Clock size={16} className="text-gold-500" />}>
              {data.closingSoon.length === 0 ? <EmptyState title="Nothing closing soon" /> : (
                <ul className="space-y-2">{data.closingSoon.map((o) => <OpportunityItem key={o.id} o={o} gold />)}</ul>
              )}
            </Card>
          </div>
        </div>
      </Grid>

      <Card title="Open opportunities you are eligible for" subtitle="Filtered by the provider types each opportunity accepts" icon={<Megaphone size={16} />}
        actions={<Link to="/opportunities" className="text-xs font-semibold text-brand-700 hover:underline">All</Link>}>
        {data.available.length === 0 ? <EmptyState title="No eligible open opportunities" message="New opportunities appear here when they are published." /> : (
          <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">{data.available.map((o) => <OpportunityItem key={o.id} o={o} />)}</ul>
        )}
      </Card>

      <Card title="My submissions" padded={false} icon={<Send size={16} />}>
        <DataTable columns={subCols} rows={data.submissions} rowKey={(s) => s.id}
          empty={<div className="p-5"><EmptyState title="No submissions yet" message="Open an opportunity to submit your solution." /></div>} />
      </Card>

      <Card title="My solutions" subtitle="Your entries in the public solutions registry" icon={<Lightbulb size={16} />}
        actions={<Link to="/solutions" className="text-xs font-semibold text-brand-700 hover:underline">Manage</Link>}>
        {data.solutions.length === 0 ? <EmptyState title="No solutions registered" action={<Button size="sm" variant="secondary" onClick={() => navigate('/solutions')}>Add a solution</Button>} /> : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.solutions.map((s) => (
              <li key={s.id}>
                <Link to="/solutions" className="block h-full rounded-xl border border-slate-100 p-4 transition hover:border-brand-300">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{s.name}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{CATEGORY_LABEL[s.category]} · {MATURITY_LABEL[s.maturity]}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.isOpenSource && <Badge tone="brand">Open source{s.license ? ` · ${s.license}` : ''}</Badge>}
                    <Badge>{s.externalDeployments + s.platformDeployments} deployments</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
