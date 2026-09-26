import { useEffect, useState } from 'react';
import { Lightbulb, Plus, Search, X } from 'lucide-react';
import { api, qs } from '../../api/client';
import type { NeedCategory, SaveSolutionRequest, SolutionDto, SolutionMaturity } from '../../api/types';
import { useAuth } from '../../app/auth';
import {
  Button, Callout, Checkbox, EmptyState, ErrorBanner, Field, Input, Loading, Modal, PageHeader, Select, Textarea,
} from '../../components/ui';
import { useAction, useApi } from '../../lib/hooks';
import { CATEGORY_LABEL, MATURITY_LABEL, PROVINCES } from '../../lib/labels';
import { SolutionCard } from './SolutionCard';

export default function Solutions() {
  const { user } = useAuth();
  const isProvider = user?.role === 'PROVIDER';
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [category, setCategory] = useState<NeedCategory | ''>('');
  const [province, setProvince] = useState('');
  const [openSource, setOpenSource] = useState(false);
  const [editing, setEditing] = useState<SolutionDto | 'new' | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const solutions = useApi(
    () => api.get<SolutionDto[]>('/solutions' + qs({ q: debouncedQ, category, province, openSource: openSource ? true : undefined })),
    [debouncedQ, category, province, openSource],
  );
  const filtered = !!(debouncedQ || category || province || openSource);
  const clear = () => { setQ(''); setCategory(''); setProvince(''); setOpenSource(false); };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Local innovation"
        title="Solution registry"
        subtitle="Local and open-source solutions, discoverable before anyone becomes a supplier. Platform deployments are counted from real implementations."
        actions={isProvider ? <Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>Register a solution</Button> : undefined}
      />

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
          <Field label="Search">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, technology, provider…" className="pl-8" type="search" />
            </div>
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value as NeedCategory | '')}>
              <option value="">All categories</option>
              {(Object.keys(CATEGORY_LABEL) as NeedCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </Select>
          </Field>
          <Field label="Province">
            <Select value={province} onChange={(e) => setProvince(e.target.value)}>
              <option value="">All provinces</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
          <div className="flex items-center gap-3 pb-2">
            <Checkbox label="Open source only" checked={openSource} onChange={setOpenSource} />
            {filtered && <Button size="sm" variant="ghost" icon={<X size={12} />} onClick={clear}>Clear</Button>}
          </div>
        </div>
      </div>

      <ErrorBanner error={solutions.error} onRetry={solutions.reload} />
      {solutions.loading && !solutions.data && <Loading />}
      {solutions.data && (
        <>
          <div className="text-xs text-slate-500" aria-live="polite">{solutions.data.length} solution{solutions.data.length === 1 ? '' : 's'}{solutions.loading ? ' · updating…' : ''}</div>
          {solutions.data.length === 0 ? (
            <EmptyState icon={<Lightbulb size={32} />} title="No solutions match" message="Try clearing a filter." action={filtered ? <Button size="sm" variant="secondary" onClick={clear}>Clear filters</Button> : undefined} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {solutions.data.map((s) => (
                <SolutionCard key={s.id} s={s} onEdit={isProvider && user?.providerId === s.providerId ? () => setEditing(s) : undefined} />
              ))}
            </div>
          )}
        </>
      )}

      {editing && (
        <SolutionModal solution={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void solutions.reload(); }} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ register / edit */

export function SolutionModal({ solution, onClose, onSaved }: { solution: SolutionDto | null; onClose: () => void; onSaved: (s: SolutionDto) => void }) {
  const [f, setF] = useState<SaveSolutionRequest>(() => ({
    name: solution?.name ?? '',
    description: solution?.description ?? '',
    category: solution?.category ?? 'WASTE_ENVIRONMENT',
    technologies: solution?.technologies ?? [],
    isOpenSource: solution?.isOpenSource ?? false,
    repositoryUrl: solution?.repositoryUrl ?? '',
    license: solution?.license ?? '',
    demoUrl: solution?.demoUrl ?? '',
    coverageProvinces: solution?.coverageProvinces ?? [],
    maturity: solution?.maturity ?? 'PROTOTYPE',
    externalDeployments: solution?.externalDeployments ?? 0,
  }));
  const [tech, setTech] = useState('');
  const set = <K extends keyof SaveSolutionRequest>(k: K, v: SaveSolutionRequest[K]) => setF((p) => ({ ...p, [k]: v }));

  const save = useAction(
    (body: SaveSolutionRequest) => solution ? api.put<SolutionDto>(`/solutions/${solution.id}`, body) : api.post<SolutionDto>('/solutions', body),
    (s) => `${s.name} ${solution ? 'updated' : 'registered'}`,
  );

  const addTech = () => {
    const parts = tech.split(',').map((t) => t.trim()).filter(Boolean);
    if (parts.length) set('technologies', [...new Set([...f.technologies, ...parts])]);
    setTech('');
  };
  const toggleProvince = (p: string) =>
    set('coverageProvinces', f.coverageProvinces.includes(p) ? f.coverageProvinces.filter((x) => x !== p) : [...f.coverageProvinces, p]);

  const licenceMissing = f.isOpenSource && !f.license?.trim();
  const invalid = !f.name.trim() || !f.description.trim() || licenceMissing || f.externalDeployments < 0;

  const submit = async () => {
    const body: SaveSolutionRequest = {
      ...f,
      name: f.name.trim(),
      description: f.description.trim(),
      repositoryUrl: f.repositoryUrl?.trim() || undefined,
      license: f.license?.trim() || undefined,
      demoUrl: f.demoUrl?.trim() || undefined,
    };
    const r = await save.run(body);
    if (r) onSaved(r);
  };

  return (
    <Modal open wide onClose={onClose} title={solution ? `Edit ${solution.name}` : 'Register a solution'} subtitle="Visible to every department looking for local innovation."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={save.loading} disabled={invalid} onClick={submit}>{solution ? 'Save changes' : 'Register solution'}</Button></>}>
      <div className="space-y-4">
        <ErrorBanner error={save.error} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" required><Input value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Category" required>
            <Select value={f.category} onChange={(e) => set('category', e.target.value as NeedCategory)}>
              {(Object.keys(CATEGORY_LABEL) as NeedCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Description" required><Textarea rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Maturity" required>
            <Select value={f.maturity} onChange={(e) => set('maturity', e.target.value as SolutionMaturity)}>
              {(Object.keys(MATURITY_LABEL) as SolutionMaturity[]).map((m) => <option key={m} value={m}>{MATURITY_LABEL[m]}</option>)}
            </Select>
          </Field>
          <Field label="External deployments" hint="Deployments outside CIVICFLOW. Platform deployments are counted automatically.">
            <Input type="number" min={0} value={String(f.externalDeployments)} onChange={(e) => set('externalDeployments', Math.max(0, Number(e.target.value) || 0))} />
          </Field>
        </div>

        <div>
          <Field label="Technologies" hint="Press Enter or comma to add.">
            <div className="flex gap-2">
              <Input value={tech} onChange={(e) => setTech(e.target.value)} placeholder="e.g. Computer vision"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTech(); } }} />
              <Button type="button" variant="secondary" onClick={addTech} disabled={!tech.trim()}>Add</Button>
            </div>
          </Field>
          {f.technologies.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {f.technologies.map((t) => (
                <li key={t} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2 pr-1 text-xs font-medium text-slate-700">
                  {t}
                  <button type="button" onClick={() => set('technologies', f.technologies.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-slate-200" aria-label={`Remove ${t}`}><X size={11} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <fieldset>
          <legend className="mb-1 block text-xs font-semibold text-slate-600">Coverage provinces</legend>
          <div className="grid grid-cols-1 gap-1.5 min-[400px]:grid-cols-2 sm:grid-cols-3">
            {PROVINCES.map((p) => <Checkbox key={p} label={p} checked={f.coverageProvinces.includes(p)} onChange={() => toggleProvince(p)} />)}
          </div>
        </fieldset>

        <div className="rounded-xl border border-slate-200 p-4">
          <Checkbox label="This is an open-source solution" checked={f.isOpenSource} onChange={(v) => set('isOpenSource', v)} />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Licence" required={f.isOpenSource} error={licenceMissing ? 'A licence is required for open-source solutions' : null} hint="e.g. MIT, Apache-2.0, GPL-3.0">
              <Input value={f.license ?? ''} onChange={(e) => set('license', e.target.value)} />
            </Field>
            <Field label="Repository URL"><Input type="url" value={f.repositoryUrl ?? ''} onChange={(e) => set('repositoryUrl', e.target.value)} placeholder="https://example.org/…" /></Field>
          </div>
        </div>
        <Field label="Demo URL"><Input type="url" value={f.demoUrl ?? ''} onChange={(e) => set('demoUrl', e.target.value)} placeholder="https://example.org/…" /></Field>
        <Callout tone="neutral">Listing a solution doesn't make you a supplier. A supplier record is created only if you're selected in a procurement.</Callout>
      </div>
    </Modal>
  );
}
