import { Fragment, useMemo, useState } from 'react';
import { Building2, CalendarClock, Code2, FileStack, MapPin, Megaphone, Search, Users } from 'lucide-react';
import { api } from '../../api/client';
import type { NeedCategory, OpportunityDisplayStatus, OpportunitySummaryDto } from '../../api/types';
import { Link } from '../../app/router';
import { Badge, Checkbox, EmptyState, ErrorBanner, Input, Loading, Mono, PageHeader, Select, StatusBadge } from '../../components/ui';
import { date, moneyShort, relative } from '../../lib/format';
import { useApi } from '../../lib/hooks';
import { CATEGORY_LABEL, PROVIDER_TYPE_LABEL, PROVINCES, statusTone } from '../../lib/labels';

const STATUSES: OpportunityDisplayStatus[] = ['PUBLISHED', 'CLOSING_SOON', 'DRAFT', 'CLOSED', 'EVALUATION', 'AWARDED', 'CANCELLED'];

export default function OpportunitiesList() {
  const opps = useApi(() => api.get<OpportunitySummaryDto[]>('/opportunities'));
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<NeedCategory | ''>('');
  const [province, setProvince] = useState('');
  const [status, setStatus] = useState<OpportunityDisplayStatus | ''>('');
  const [openSource, setOpenSource] = useState(false);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (opps.data ?? []).filter((o) =>
      (!term || [o.title, o.reference, o.departmentName, ...o.requiredCapabilities].some((s) => s.toLowerCase().includes(term))) &&
      (!category || o.category === category) &&
      (!province || o.location.province === province) &&
      (!status || o.displayStatus === status) &&
      (!openSource || o.openSourcePreferred));
  }, [opps.data, q, category, province, status, openSource]);

  const presentStatuses = STATUSES.filter((s) => (opps.data ?? []).some((o) => o.displayStatus === s));
  const filtered = q || category || province || status || openSource;

  return (
    <div>
      <PageHeader
        eyebrow="Innovation Opportunity Marketplace"
        title="Opportunities"
        subtitle="Public problems looking for local solutions. Budgets, capabilities and evaluation weights are published up front."
      />

      <div className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input aria-label="Search opportunities" placeholder="Search title, capability…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value as NeedCategory | '')}>
            <option value="">All categories</option>
            {(Object.keys(CATEGORY_LABEL) as NeedCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </Select>
          <Select aria-label="Province" value={province} onChange={(e) => setProvince(e.target.value)}>
            <option value="">All provinces</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as OpportunityDisplayStatus | '')}>
            <option value="">All statuses</option>
            {(presentStatuses.length ? presentStatuses : STATUSES).map((s) => <option key={s} value={s}>{statusTone(s).label}</option>)}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Checkbox label="Open-source preferred only" checked={openSource} onChange={setOpenSource} />
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{rows.length} of {opps.data?.length ?? 0} opportunities</span>
            {filtered && (
              <button className="font-semibold text-brand-700 hover:underline" onClick={() => { setQ(''); setCategory(''); setProvince(''); setStatus(''); setOpenSource(false); }}>
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {opps.loading && !opps.data ? <Loading label="Loading opportunities…" /> : opps.error ? (
        <ErrorBanner error={opps.error} onRetry={opps.reload} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Megaphone size={32} />} title={filtered ? 'No opportunities match these filters' : 'No opportunities yet'}
          message={filtered ? 'Try a different search or clear the filters.' : 'Approved public needs are published here as innovation opportunities.'} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((o) => <Fragment key={o.id}><OpportunityCard o={o} /></Fragment>)}
        </ul>
      )}
    </div>
  );
}

function OpportunityCard({ o }: { o: OpportunitySummaryDto }) {
  const caps = o.requiredCapabilities.slice(0, 4);
  const more = o.requiredCapabilities.length - caps.length;
  const typesAll = o.eligibleProviderTypes.length === Object.keys(PROVIDER_TYPE_LABEL).length;
  const live = o.displayStatus === 'PUBLISHED' || o.displayStatus === 'CLOSING_SOON';
  return (
    <li className="min-w-0">
      <Link to={`/opportunities/${o.id}`}
        className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:border-brand-400">
        <div className="flex items-start justify-between gap-2">
          <Mono>{o.reference}</Mono>
          <div className="flex flex-wrap justify-end gap-1">
            {o.openSourcePreferred && <Badge tone="info" title="Open-source solutions preferred"><Code2 size={11} /> Open source</Badge>}
            <StatusBadge status={o.displayStatus} />
          </div>
        </div>
        <h2 className="mt-2 break-words text-base font-semibold leading-snug text-slate-900 group-hover:text-brand-700">{o.title}</h2>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><Building2 size={12} /> {o.departmentName}</span>
          <span className="inline-flex items-center gap-1"><MapPin size={12} /> {o.location.municipality}</span>
        </div>
        <div className="mt-1 text-xs text-slate-400">{CATEGORY_LABEL[o.category]}</div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-brand-50/60 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-brand-700">Budget</div>
            <div className="text-lg font-bold text-slate-900">{moneyShort(o.budget)}</div>
          </div>
          <div className={`rounded-xl px-3 py-2 ${o.displayStatus === 'CLOSING_SOON' ? 'bg-gold-50' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500"><CalendarClock size={11} /> Deadline</div>
            <div className="text-sm font-semibold text-slate-900">{date(o.submissionDeadline)}</div>
            <div className={`text-[11px] ${o.displayStatus === 'CLOSING_SOON' ? 'font-semibold text-gold-600' : 'text-slate-500'}`}>{live ? relative(o.submissionDeadline) : statusTone(o.displayStatus).label}</div>
          </div>
        </div>

        {caps.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Required capabilities">
            {caps.map((c) => <li key={c} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">{c}</li>)}
            {more > 0 && <li className="rounded-full px-1 py-0.5 text-[11px] font-medium text-slate-400">+{more} more</li>}
          </ul>
        )}

        <div className="flex-1" aria-hidden />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><FileStack size={12} /> {o.submissionCount} submission{o.submissionCount === 1 ? '' : 's'}</span>
          <span className="inline-flex min-w-0 items-center gap-1" title={o.eligibleProviderTypes.map((t) => PROVIDER_TYPE_LABEL[t]).join(', ')}>
            <Users size={12} className="shrink-0" />
            <span className="truncate">{typesAll ? 'All provider types' : o.eligibleProviderTypes.map((t) => PROVIDER_TYPE_LABEL[t]).join(', ')}</span>
          </span>
        </div>
      </Link>
    </li>
  );
}
