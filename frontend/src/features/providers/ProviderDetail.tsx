import { ArrowLeft, Award, Building2, ExternalLink, FileText, Globe, Info, Lightbulb, Mail, MapPin, Users } from 'lucide-react';
import { api } from '../../api/client';
import type { ProviderDetailDto } from '../../api/types';
import { Link } from '../../app/router';
import { Badge, Callout, Card, EmptyState, ErrorBanner, KeyValues, Loading, Mono, PageHeader, Stat, StatusBadge } from '../../components/ui';
import { useApi } from '../../lib/hooks';
import { date, num } from '../../lib/format';
import { bbbee, PROVIDER_TYPE_LABEL } from '../../lib/labels';
import { SolutionCard } from '../solutions/SolutionCard';

export default function ProviderDetail({ id }: { id: string }) {
  const p = useApi(() => api.get<ProviderDetailDto>(`/providers/${id}`), [id]);

  if (p.loading && !p.data) return <Loading label="Loading provider…" />;
  if (p.error && !p.data) return <ErrorBanner error={p.error} onRetry={p.reload} />;
  const d = p.data;
  if (!d) return null;
  const loc = d.location;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/providers" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700">
          <ArrowLeft size={14} /> All providers
        </Link>
        <PageHeader
          eyebrow={PROVIDER_TYPE_LABEL[d.providerType]}
          title={d.name}
          subtitle={<span className="inline-flex items-center gap-1"><MapPin size={13} />{loc.municipality}{loc.ward ? `, ward ${loc.ward}` : ''}, {loc.province}</span>}
          actions={
            <>
              <StatusBadge status={d.verificationStatus} />
              {d.supplierStatus ? <span className="inline-flex items-center gap-1 text-xs text-slate-500">Supplier <StatusBadge status={d.supplierStatus} /></span> : <Badge tone="neutral">Provider only</Badge>}
            </>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Solutions" value={d.solutionCount} icon={<Lightbulb size={16} />} tone="brand" />
        <Stat label="Submissions" value={d.submissionCount} icon={<FileText size={16} />} tone="info" />
        <Stat label="Awards" value={d.awardCount} icon={<Award size={16} />} tone="gold" />
        <Stat label="Employees" value={num(d.employees)} icon={<Users size={16} />} tone="neutral" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Profile" icon={<Building2 size={16} />} className="lg:col-span-2">
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{d.description}</p>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <KeyValues items={[
              ['Contact', <a key="m" href={`mailto:${d.contactEmail}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline"><Mail size={12} />{d.contactEmail}</a>],
              ['Website', d.website ? <a key="w" href={d.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-brand-700 hover:underline"><Globe size={12} />{d.website.replace(/^https?:\/\//, '')}<ExternalLink size={10} /></a> : '—'],
              ['Registration number', d.registrationNumber ? <Mono key="r" className="text-slate-700">{d.registrationNumber}</Mono> : '—'],
              ['Location', `${loc.municipality}, ${loc.province}`],
            ]} />
          </div>
        </Card>
        <Card title="Compliance" icon={<Award size={16} />}>
          <KeyValues cols={1} items={[
            ['B-BBEE', <span key="b" className="flex flex-wrap items-center gap-1.5">{bbbee(d.bbbeeLevel)}{d.bbbeeExpired && <Badge tone="danger">Expired</Badge>}</span>],
            ['B-BBEE certificate expiry', <span key="e" className={d.bbbeeExpired ? 'font-semibold text-rose-700' : ''}>{date(d.bbbeeExpiry)}</span>],
            ['Verification', <StatusBadge key="v" status={d.verificationStatus} />],
            ['Supplier status', d.supplierStatus ? <StatusBadge key="s" status={d.supplierStatus} /> : <Badge key="s" tone="neutral">Provider only</Badge>],
          ]} />
          <div className="mt-4">
            <Callout tone="neutral" icon={<Info size={14} />}>
              {d.supplierStatus
                ? 'This provider has a supplier record because it was selected in a procurement.'
                : 'Not yet a supplier. A supplier record is created only if this provider is selected.'}
            </Callout>
          </div>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><Lightbulb size={16} className="text-brand-600" /> Solutions ({d.solutions.length})</h2>
        {d.solutions.length === 0 ? (
          <EmptyState title="No solutions listed" message="This provider hasn't registered a solution yet." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {d.solutions.map((s) => <SolutionCard key={s.id} s={s} showProvider={false} />)}
          </div>
        )}
      </section>
    </div>
  );
}
