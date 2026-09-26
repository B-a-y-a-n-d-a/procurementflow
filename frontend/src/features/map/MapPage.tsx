import 'leaflet/dist/leaflet.css';
import { useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from 'react-leaflet';
import { api } from '../../api/client';
import type { ImplementationStatus, LifecycleStage, MapDto } from '../../api/types';
import { useAuth } from '../../app/auth';
import { Card, ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { pct } from '../../lib/format';
import { useApi } from '../../lib/hooks';
import { CATEGORY_LABEL, PROVIDER_TYPE_LABEL, STAGE_LABEL, statusTone } from '../../lib/labels';

const STAGE_COLOR: Record<LifecycleStage, string> = {
  NEED: '#64748b',
  APPROVAL: '#d97706',
  OPPORTUNITY: '#0f766e',
  EVALUATION: '#0284c7',
  PROCUREMENT: '#6366f1',
  IMPLEMENTATION: '#0d9488',
  IMPACT: '#16a34a',
  CLOSED: '#94a3b8',
  REJECTED: '#e11d48',
};

const IMPL_COLOR: Record<ImplementationStatus, string> = {
  NOT_STARTED: '#94a3b8',
  PLANNED: '#0ea5e9',
  IN_PROGRESS: '#0f766e',
  AT_RISK: '#e11d48',
  COMPLETED: '#16a34a',
  CANCELLED: '#64748b',
};

const PROVIDER_COLOR = '#e19b15';

type Layer = 'needs' | 'providers' | 'implementations';

function Swatch({ color, ring, square }: { color: string; ring?: boolean; square?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-3 w-3 shrink-0 ${square ? 'rounded-sm' : 'rounded-full'}`}
      style={ring ? { border: `3px solid ${color}`, background: '#fff' } : { background: color }}
    />
  );
}

export default function MapPage() {
  const { isStaff } = useAuth();
  const { data, error, loading, reload } = useApi(() => api.get<MapDto>('/map'));
  const [show, setShow] = useState<Record<Layer, boolean>>({ needs: true, providers: true, implementations: true });

  const toggle = (k: Layer) => setShow((s) => ({ ...s, [k]: !s[k] }));

  const needStages: LifecycleStage[] = data ? Array.from(new Set<LifecycleStage>(data.needs.map((n) => n.stage))) : [];
  const implStatuses: ImplementationStatus[] = data ? Array.from(new Set<ImplementationStatus>(data.implementations.map((i) => i.status))) : [];

  const layers: { key: Layer; label: string; count: number; color: string; ring?: boolean; square?: boolean }[] = [
    { key: 'needs', label: 'Public needs', count: data?.needs.length ?? 0, color: '#0f766e' },
    { key: 'providers', label: 'Local providers', count: data?.providers.length ?? 0, color: PROVIDER_COLOR, square: true },
    { key: 'implementations', label: 'Implementations', count: data?.implementations.length ?? 0, color: '#16a34a', ring: true },
  ];

  const linkCls = 'mt-1 inline-block text-xs font-semibold text-brand-700 underline';

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Civic map · Mzansi Metro"
        title="Needs, providers and delivery on the map"
        subtitle="Where public needs are, where local providers are, and where delivery is happening."
      />
      {error && <ErrorBanner error={error} onRetry={reload} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <div className="relative z-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {loading && !data ? <div className="h-[70vh]"><Loading label="Loading map…" /></div> : (
            <MapContainer center={[-25.73, 28.2]} zoom={10} scrollWheelZoom className="h-[70vh] w-full" aria-label="Map of public needs, providers and implementations">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {show.providers && data?.providers.map((p) => (
                <CircleMarker key={'p' + p.id} center={[p.location.latitude, p.location.longitude]} radius={6}
                  pathOptions={{ color: '#92400e', weight: 1.5, fillColor: PROVIDER_COLOR, fillOpacity: 0.9 }}>
                  <Tooltip>{p.name}</Tooltip>
                  <Popup>
                    <div className="text-xs">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-gold-600">Provider</div>
                      <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                      <div className="text-slate-500">{PROVIDER_TYPE_LABEL[p.providerType]} · {p.location.municipality}{p.location.ward ? ` · Ward ${p.location.ward}` : ''}</div>
                      <a href={`#/providers/${p.id}`} className={linkCls}>View provider profile</a>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
              {show.needs && data?.needs.map((n) => {
                const href = isStaff ? `#/needs/${n.id}` : n.opportunityId ? `#/opportunities/${n.opportunityId}` : null;
                return (
                  <CircleMarker key={'n' + n.id} center={[n.location.latitude, n.location.longitude]} radius={9}
                    pathOptions={{ color: '#ffffff', weight: 2, fillColor: STAGE_COLOR[n.stage], fillOpacity: 0.9 }}>
                    <Tooltip>{n.title}</Tooltip>
                    <Popup>
                      <div className="text-xs">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-brand-700">Public need · {n.reference}</div>
                        <div className="text-sm font-semibold text-slate-900">{n.title}</div>
                        <div className="text-slate-500">{CATEGORY_LABEL[n.category]} · Stage: {STAGE_LABEL[n.stage]}</div>
                        <div className="text-slate-500">{n.location.municipality}{n.location.ward ? ` · Ward ${n.location.ward}` : ''}</div>
                        {href ? <a href={href} className={linkCls}>{isStaff ? 'Open need' : 'View opportunity'}</a>
                          : <div className="mt-1 text-slate-400">Not yet published as an opportunity</div>}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
              {show.implementations && data?.implementations.map((i) => (
                <CircleMarker key={'i' + i.id} center={[i.location.latitude, i.location.longitude]} radius={14}
                  pathOptions={{ color: IMPL_COLOR[i.status], weight: 4, fillColor: '#ffffff', fillOpacity: 0.15 }}>
                  <Tooltip>{i.needTitle}</Tooltip>
                  <Popup>
                    <div className="text-xs">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Implementation</div>
                      <div className="text-sm font-semibold text-slate-900">{i.needTitle}</div>
                      <div className="text-slate-500">{statusTone(i.status).label} · {pct(i.progressPct, 0)} complete</div>
                      {isStaff && <a href={`#/implementations/${i.id}`} className={linkCls}>Open implementation</a>}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Layers">
            <fieldset className="space-y-2.5">
              <legend className="sr-only">Map layers</legend>
              {layers.map((l) => (
                <label key={l.key} className="flex cursor-pointer items-center justify-between gap-2 text-sm text-slate-700">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={show[l.key]} onChange={() => toggle(l.key)} className="h-4 w-4 rounded border-slate-300 accent-brand-600" />
                    <Swatch color={l.color} ring={l.ring} square={l.square} />
                    {l.label}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-600">{l.count}</span>
                </label>
              ))}
            </fieldset>
          </Card>
          <Card title="Legend">
            <div className="space-y-4 text-xs text-slate-600">
              <div>
                <div className="mb-1.5 font-semibold text-slate-800">Needs by lifecycle stage (filled dot)</div>
                <ul className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
                  {(needStages.length ? needStages : (Object.keys(STAGE_COLOR) as LifecycleStage[])).map((s) => (
                    <li key={s} className="flex items-center gap-2"><Swatch color={STAGE_COLOR[s]} />{STAGE_LABEL[s]}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-1.5 font-semibold text-slate-800">Implementations by status (ring)</div>
                <ul className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
                  {(implStatuses.length ? implStatuses : (Object.keys(IMPL_COLOR) as ImplementationStatus[])).map((s) => (
                    <li key={s} className="flex items-center gap-2"><Swatch color={IMPL_COLOR[s]} ring />{statusTone(s).label}</li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-2"><Swatch color={PROVIDER_COLOR} square />Registered local provider</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
