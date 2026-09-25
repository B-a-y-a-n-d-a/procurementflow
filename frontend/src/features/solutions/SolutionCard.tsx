import { Building2, Code2, ExternalLink, GitBranch, MapPin, Pencil, Rocket } from 'lucide-react';
import type { SolutionDto, SolutionMaturity } from '../../api/types';
import { Link } from '../../app/router';
import { Badge, Button } from '../../components/ui';
import type { Tone } from '../../lib/labels';
import { CATEGORY_LABEL, MATURITY_LABEL, PROVIDER_TYPE_LABEL } from '../../lib/labels';

const MATURITY_TONE: Record<SolutionMaturity, Tone> = { IDEA: 'neutral', PROTOTYPE: 'info', PILOT: 'gold', PRODUCTION: 'success' };

/** One solution in the registry. Shared by the Solutions catalogue and Provider detail. */
export function SolutionCard({ s, onEdit, showProvider = true }: { s: SolutionDto; onEdit?: () => void; showProvider?: boolean }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={MATURITY_TONE[s.maturity]}><Rocket size={11} /> {MATURITY_LABEL[s.maturity]}</Badge>
        {s.isOpenSource && <Badge tone="brand"><Code2 size={11} /> Open source{s.license ? ` · ${s.license}` : ''}</Badge>}
        {s.status !== 'PUBLISHED' && <Badge tone="neutral">{s.status === 'DRAFT' ? 'Draft' : 'Archived'}</Badge>}
      </div>
      <h3 className="mt-2 text-base font-semibold text-slate-900">{s.name}</h3>
      {showProvider && (
        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          <Building2 size={12} />
          <Link to={`/providers/${s.providerId}`} className="font-medium text-brand-700 hover:underline">{s.providerName}</Link>
          <span>· {PROVIDER_TYPE_LABEL[s.providerType]}</span>
        </div>
      )}
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{CATEGORY_LABEL[s.category]}</div>
      <p className="mt-2 line-clamp-3 text-sm text-slate-600">{s.description}</p>

      {s.technologies.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1" aria-label="Technologies">
          {s.technologies.map((t) => <li key={t} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{t}</li>)}
        </ul>
      )}
      {s.coverageProvinces.length > 0 && (
        <div className="mt-2 flex items-start gap-1 text-xs text-slate-500">
          <MapPin size={12} className="mt-0.5 shrink-0" /><span>{s.coverageProvinces.join(', ')}</span>
        </div>
      )}

      <div className="mt-auto pt-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-center">
          <div>
            <div className="text-lg font-bold tabular-nums text-slate-900">{s.externalDeployments}</div>
            <div className="text-[11px] text-slate-500">External deployments</div>
          </div>
          <div title="Counted from real implementations on CIVICFLOW">
            <div className="text-lg font-bold tabular-nums text-brand-700">{s.platformDeployments}</div>
            <div className="text-[11px] text-slate-500">Platform deployments<span className="block text-[10px] text-slate-400">counted from real implementations</span></div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          {s.repositoryUrl && (
            <a href={s.repositoryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
              <GitBranch size={12} /> Repository <ExternalLink size={10} />
            </a>
          )}
          {s.demoUrl && (
            <a href={s.demoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
              Demo <ExternalLink size={10} />
            </a>
          )}
          {onEdit && <Button size="sm" variant="secondary" className="ml-auto" icon={<Pencil size={12} />} onClick={onEdit}>Edit</Button>}
        </div>
      </div>
    </article>
  );
}
