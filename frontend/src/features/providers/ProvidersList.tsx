import { useMemo, useState } from 'react';
import { ArrowRight, Award, FileText, Info, Lightbulb, MapPin, Search, Users, X } from 'lucide-react';
import { api } from '../../api/client';
import type { ProviderDto, ProviderType } from '../../api/types';
import { Link } from '../../app/router';
import { Badge, Button, Callout, EmptyState, ErrorBanner, Field, Input, Loading, PageHeader, Select, StatusBadge } from '../../components/ui';
import { useApi } from '../../lib/hooks';
import { bbbee, PROVIDER_TYPE_LABEL, PROVINCES } from '../../lib/labels';

export default function ProvidersList() {
  const providers = useApi(() => api.get<ProviderDto[]>('/providers'));
  const [q, setQ] = useState('');
  const [type, setType] = useState<ProviderType | ''>('');
  const [province, setProvince] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (providers.data ?? []).filter((p) =>
      (!type || p.providerType === type) &&
      (!province || p.location.province === province) &&
      (!needle || [p.name, p.description, p.location.municipality].some((x) => x?.toLowerCase().includes(needle))),
    );
  }, [providers.data, q, type, province]);
  const filtered = !!(q || type || province);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Local innovation" title="Providers" subtitle="Innovators, SMEs, co-operatives, startups and open-source projects offering solutions to public needs." />

      <Callout tone="brand" icon={<Info size={16} />} title="Provider vs Supplier">
        A <strong>provider</strong> is anyone offering a solution and is discoverable here. A <strong>supplier</strong> record is created
        only when a provider is selected in a procurement, and it must be verified before a purchase order is issued.
      </Callout>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
          <Field label="Search">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, description, municipality…" className="pl-8" />
            </div>
          </Field>
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as ProviderType | '')}>
              <option value="">All types</option>
              {(Object.keys(PROVIDER_TYPE_LABEL) as ProviderType[]).map((t) => <option key={t} value={t}>{PROVIDER_TYPE_LABEL[t]}</option>)}
            </Select>
          </Field>
          <Field label="Province">
            <Select value={province} onChange={(e) => setProvince(e.target.value)}>
              <option value="">All provinces</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
          <div className="pb-1">
            {filtered && <Button size="sm" variant="ghost" icon={<X size={12} />} onClick={() => { setQ(''); setType(''); setProvince(''); }}>Clear</Button>}
          </div>
        </div>
      </div>

      <ErrorBanner error={providers.error} onRetry={providers.reload} />
      {providers.loading && !providers.data && <Loading />}
      {providers.data && rows.length === 0 && <EmptyState icon={<Users size={32} />} title="No providers match" message="Try clearing a filter." />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((p) => (
          <Link key={p.id} to={`/providers/${p.id}`}
            className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-brand-300 hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-slate-900 group-hover:text-brand-700">{p.name}</h2>
                <div className="text-xs text-slate-500">{PROVIDER_TYPE_LABEL[p.providerType]}</div>
              </div>
              {p.supplierStatus ? <StatusBadge status={p.supplierStatus} /> : <Badge tone="neutral">Provider only</Badge>}
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">{p.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-slate-400" />{p.location.municipality}, {p.location.province}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone={p.bbbeeLevel ? 'info' : 'neutral'}>B-BBEE {bbbee(p.bbbeeLevel)}</Badge>
              {p.bbbeeExpired && <Badge tone="danger">Certificate expired</Badge>}
              {p.verificationStatus === 'VERIFIED' && <StatusBadge status="VERIFIED" />}
            </div>
            <div className="flex-1" />
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1" title="Solutions"><Lightbulb size={12} />{p.solutionCount} solutions</span>
              <span className="inline-flex items-center gap-1" title="Submissions"><FileText size={12} />{p.submissionCount} submissions</span>
              <span className="inline-flex items-center gap-1" title="Awards"><Award size={12} />{p.awardCount} awards</span>
              <ArrowRight size={14} className="ml-auto text-slate-300 group-hover:text-brand-600" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
