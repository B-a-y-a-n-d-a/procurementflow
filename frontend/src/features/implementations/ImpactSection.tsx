import { useState } from 'react';
import { ArrowRight, ExternalLink, LineChart, Plus, Ruler, Target, TrendingDown, TrendingUp, Wand2 } from 'lucide-react';
import { api } from '../../api/client';
import type {
  CreateMeasurementRequest, CreateMetricRequest, Direction, ImpactMetricDto, ImplementationDetailDto, MetricTemplateDto, NeedCategory,
} from '../../api/types';
import {
  Badge, Button, Callout, EmptyState, ErrorBanner, Field, Input, Loading, Modal, ProgressBar, Select, StatusBadge, Textarea,
} from '../../components/ui';
import { useAction, useApi } from '../../lib/hooks';
import { dateTime, date, num, pct } from '../../lib/format';
import { CATEGORY_LABEL, DIRECTION_LABEL, statusTone } from '../../lib/labels';

/** Impact metrics for one implementation: baseline → current → target, as derived by the server. */
export function ImpactSection({ impl, canManage, onChange }: {
  impl: ImplementationDetailDto; canManage: boolean; onChange: (d: ImplementationDetailDto) => void;
}) {
  const [measuring, setMeasuring] = useState<ImpactMetricDto | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">Did the investment produce measurable results? Change and progress are calculated by the server from the latest measurement.</p>
        {canManage && <Button icon={<Plus size={16} />} onClick={() => setAdding(true)} className="shrink-0">Add impact metric</Button>}
      </div>
      {impl.metrics.length === 0 ? (
        <EmptyState icon={<Target size={32} />} title="No impact metrics yet"
          message={`Add metrics from the ${CATEGORY_LABEL[impl.needCategory]} templates to track outcomes against a baseline.`}
          action={canManage ? <Button size="sm" icon={<Plus size={14} />} onClick={() => setAdding(true)}>Add impact metric</Button> : undefined} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {impl.metrics.map((m) => <MetricCard key={m.id} m={m} canManage={canManage} onMeasure={() => setMeasuring(m)} />)}
        </div>
      )}
      {measuring && <MeasurementModal metric={measuring} startDate={impl.startDate} onClose={() => setMeasuring(null)} onSaved={(d) => { onChange(d); setMeasuring(null); }} />}
      {adding && <AddMetricModal impl={impl} onClose={() => setAdding(false)} onSaved={(d) => { onChange(d); setAdding(false); }} />}
    </div>
  );
}

export function MetricCard({ m, canManage, onMeasure }: { m: ImpactMetricDto; canManage?: boolean; onMeasure?: () => void }) {
  const tone = statusTone(m.status).tone;
  const changeColor = m.changePct == null ? 'text-slate-400'
    : m.status === 'ACHIEVED' || m.status === 'ON_TRACK' ? 'text-emerald-700' : m.status === 'AT_RISK' ? 'text-rose-700' : 'text-slate-800';
  const history = [...m.measurements].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{m.name}</h3>
          {m.description && <p className="mt-0.5 text-xs text-slate-500">{m.description}</p>}
        </div>
        <StatusBadge status={m.status} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone="neutral"><Ruler size={11} /> {m.unit}</Badge>
        <Badge tone="neutral">{m.direction === 'DECREASE' ? <TrendingDown size={11} /> : <TrendingUp size={11} />} {DIRECTION_LABEL[m.direction]}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 items-end gap-2 text-center">
        <div><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Baseline</div><div className="text-lg font-bold tabular-nums text-slate-600">{num(m.baseline, 2)}</div></div>
        <div className="relative">
          <ArrowRight size={14} className="absolute -left-2 top-7 hidden text-slate-300 sm:block" aria-hidden />
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Current</div>
          <div className="text-2xl font-extrabold tabular-nums text-slate-900">{num(m.current, 2)}</div>
        </div>
        <div><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Target</div><div className="text-lg font-bold tabular-nums text-brand-700">{num(m.target, 2)}</div></div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-500">Change vs baseline</span>
        <span className={`text-sm font-bold tabular-nums ${changeColor}`}>{pct(m.changePct, 1, true)}</span>
      </div>
      <div className="mt-2">
        <div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">Progress to target</span><span className="font-semibold tabular-nums text-slate-800">{pct(m.progressPct, 1)}</span></div>
        <ProgressBar value={m.progressPct ?? 0} tone={tone === 'neutral' ? 'neutral' : tone} label={`${m.name} progress to target`} />
      </div>
      <div className="mt-2 text-[11px] text-slate-400">Last measured {m.lastMeasuredAt ? dateTime(m.lastMeasuredAt) : 'never'}</div>

      {history.length > 0 && (
        <details className="mt-3 rounded-xl bg-slate-50 px-3 py-2" open={history.length <= 3}>
          <summary className="cursor-pointer text-xs font-semibold text-slate-600">Measurement history ({history.length})</summary>
          <ul className="mt-2 divide-y divide-slate-200/70">
            {history.map((h) => (
              <li key={h.id} className="py-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold tabular-nums text-slate-800">{num(h.value, 2)} {m.unit}</span>
                  <span className="text-slate-500">{date(h.measuredAt)}{h.ward ? ` · Ward ${h.ward}` : ''}</span>
                </div>
                {h.note && <div className="mt-0.5 text-slate-600">{h.note}</div>}
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-slate-400">
                  <span>by {h.recordedByName}</span>
                  {h.evidenceUrl && <a href={h.evidenceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-brand-700 hover:underline">Evidence <ExternalLink size={10} /></a>}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {canManage && onMeasure && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <Button size="sm" variant="secondary" icon={<LineChart size={14} />} onClick={onMeasure}>Record measurement</Button>
        </div>
      )}
    </article>
  );
}

function nowLocal(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function MeasurementModal({ metric, startDate, onClose, onSaved }: {
  metric: ImpactMetricDto; startDate?: string | null; onClose: () => void; onSaved: (d: ImplementationDetailDto) => void;
}) {
  const [value, setValue] = useState('');
  const [maxAt] = useState(nowLocal);
  const [measuredAt, setMeasuredAt] = useState(maxAt);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [note, setNote] = useState('');
  const [ward, setWard] = useState('');
  const save = useAction(
    (body: CreateMeasurementRequest) => api.post<ImplementationDetailDto>(`/metrics/${metric.id}/measurements`, body),
    'Measurement recorded — impact recalculated',
  );
  const v = Number(value);
  // Mirrors the server rule (T119): not in the future, not before delivery started. Same-format strings compare correctly.
  const minAt = startDate ? `${startDate}T00:00` : undefined;
  const dateError = !measuredAt ? null
    : measuredAt > nowLocal() ? "Can't be in the future"
    : minAt && measuredAt < minAt ? `Can't be before the implementation started (${date(startDate)})`
    : null;
  const invalid = value === '' || Number.isNaN(v) || !measuredAt || !!dateError;
  const submit = async () => {
    const r = await save.run({
      value: v, measuredAt: new Date(measuredAt).toISOString(),
      evidenceUrl: evidenceUrl.trim() || undefined, note: note.trim() || undefined, ward: ward.trim() || undefined,
    });
    if (r) onSaved(r);
  };
  return (
    <Modal open onClose={onClose} title={`Record measurement · ${metric.name}`} subtitle={`Baseline ${num(metric.baseline, 2)} → target ${num(metric.target, 2)} ${metric.unit} (${DIRECTION_LABEL[metric.direction].toLowerCase()})`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={<LineChart size={16} />} loading={save.loading} disabled={invalid} onClick={submit}>Record</Button></>}>
      <div className="space-y-4">
        <ErrorBanner error={save.error} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`Value (${metric.unit})`} required>
            <Input type="number" step="any" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
          <Field label="Measured at" required error={dateError}>
            <Input type="datetime-local" value={measuredAt} min={minAt} max={maxAt} onChange={(e) => setMeasuredAt(e.target.value)} />
          </Field>
        </div>
        <Field label="Evidence URL" hint="Link to a report, photo set or dataset (fictional demo links use example.org).">
          <Input type="url" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://example.org/…" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <Field label="Note"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <Field label="Ward"><Input value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g. 12" /></Field>
        </div>
      </div>
    </Modal>
  );
}

function AddMetricModal({ impl, onClose, onSaved }: { impl: ImplementationDetailDto; onClose: () => void; onSaved: (d: ImplementationDetailDto) => void }) {
  const category: NeedCategory = impl.needCategory;
  const templates = useApi(() => api.get<MetricTemplateDto[]>(`/impact/templates?category=${encodeURIComponent(category)}`), [category]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [direction, setDirection] = useState<Direction>('INCREASE');
  const [baseline, setBaseline] = useState('');
  const [target, setTarget] = useState('');
  const existing = new Set(impl.metrics.map((m) => m.name.toLowerCase()));

  const save = useAction(
    (body: CreateMetricRequest) => api.post<ImplementationDetailDto>(`/implementations/${impl.id}/metrics`, body),
    (d) => `Impact metric added (${d.metrics.length} tracked)`,
  );
  const pick = (t: MetricTemplateDto) => { setName(t.name); setDescription(t.description); setUnit(t.unit); setDirection(t.direction); };
  const b = Number(baseline);
  const t = Number(target);
  const invalid = !name.trim() || !unit.trim() || baseline === '' || target === '' || Number.isNaN(b) || Number.isNaN(t);
  const submit = async () => {
    const r = await save.run({ name: name.trim(), description: description.trim(), unit: unit.trim(), direction, baseline: b, target: t });
    if (r) onSaved(r);
  };

  return (
    <Modal open wide onClose={onClose} title="Add impact metric" subtitle={`Suggested templates for ${CATEGORY_LABEL[category]}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={<Plus size={16} />} loading={save.loading} disabled={invalid} onClick={submit}>Add metric</Button></>}>
      <div className="space-y-4">
        <ErrorBanner error={save.error ?? templates.error} />
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><Wand2 size={13} className="text-gold-500" /> Templates (click to prefill)</div>
          {templates.loading && !templates.data ? <Loading label="Loading templates…" /> : (templates.data ?? []).length === 0 ? (
            <p className="text-xs text-slate-500">No templates for this category. Define the metric below.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {(templates.data ?? []).map((tpl) => {
                const selected = name === tpl.name;
                const used = existing.has(tpl.name.toLowerCase());
                return (
                  <button key={tpl.name} type="button" onClick={() => pick(tpl)} aria-pressed={selected}
                    className={`rounded-xl border px-3 py-2 text-left transition ${selected ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-200' : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'}`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">{tpl.name}</span>
                      {used && <Badge tone="neutral">Already tracked</Badge>}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">{tpl.unit} · {DIRECTION_LABEL[tpl.direction]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" required><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Unit" required><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. hotspots" /></Field>
        </div>
        <Field label="Description"><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Direction" required>
            <Select value={direction} onChange={(e) => setDirection(e.target.value as Direction)}>
              <option value="INCREASE">{DIRECTION_LABEL.INCREASE}</option>
              <option value="DECREASE">{DIRECTION_LABEL.DECREASE}</option>
            </Select>
          </Field>
          <Field label="Baseline" required><Input type="number" step="any" value={baseline} onChange={(e) => setBaseline(e.target.value)} /></Field>
          <Field label="Target" required><Input type="number" step="any" value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
        </div>
        <Callout tone="neutral">The server derives change %, progress and status (Not measured → At risk / On track / Achieved) from each measurement.</Callout>
      </div>
    </Modal>
  );
}
