import { useCallback, useState } from 'react';
import { ArrowLeft, Building2, FileText, Lightbulb, MapPin, Save, Send, Tags, Wallet } from 'lucide-react';
import { api } from '../../api/client';
import type { AttachmentDto, CreateNeedRequest, NeedCategory, NeedDetailDto, Priority, SourcingMethod } from '../../api/types';
import { useUser } from '../../app/auth';
import { Link, navigate } from '../../app/router';
import { Button, Callout, Card, Field, Input, PageHeader, Select, Textarea } from '../../components/ui';
import { useAction } from '../../lib/hooks';
import { CATEGORY_LABEL, PRIORITY_LABEL, PROVINCES } from '../../lib/labels';
import { ChipsInput, FormError, LinksEditor } from './formBits';
import { LocationPicker } from './LocationPicker';
import { RoutingPreviewPanel, useRoutingPreview } from './RoutingPreview';

const SOURCING_OPTIONS: { value: SourcingMethod; title: string; body: string }[] = [
  { value: 'OPEN_OPPORTUNITY', title: 'Publish to local innovators', body: 'An open innovation opportunity on the marketplace. Local SMEs, startups and co-operatives can propose solutions.' },
  { value: 'QUOTATION', title: 'Routine purchase from existing suppliers', body: 'Procurement collects quotations from active, verified suppliers.' },
];

export default function NewNeed() {
  const user = useUser();
  const [title, setTitle] = useState('');
  const [problemStatement, setProblem] = useState('');
  const [desiredOutcome, setOutcome] = useState('');
  const [category, setCategory] = useState<NeedCategory>('WASTE_ENVIRONMENT');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [province, setProvince] = useState('Gauteng');
  const [municipality, setMunicipality] = useState('City of Tshwane');
  const [ward, setWard] = useState('');
  const [lat, setLat] = useState('-25.7479');
  const [lng, setLng] = useState('28.2293');
  const [documents, setDocuments] = useState<AttachmentDto[]>([]);
  const [budget, setBudget] = useState('');
  const [justification, setJustification] = useState('');
  const [sourcingMethod, setSourcing] = useState<SourcingMethod>('OPEN_OPPORTUNITY');
  const [mode, setMode] = useState<'draft' | 'submit' | null>(null);

  const amount = Number(budget);
  const preview = useRoutingPreview(user.departmentId, amount);

  const create = useCallback((body: CreateNeedRequest) => api.post<NeedDetailDto>('/needs', body), []);
  const action = useAction(create, (n: NeedDetailDto) => (n.status === 'DRAFT' ? `Draft ${n.reference} saved` : `${n.reference} submitted for approval`));

  const latN = Number(lat);
  const lngN = Number(lng);
  const basicsOk = title.trim() && problemStatement.trim() && desiredOutcome.trim() && amount > 0 && Number.isFinite(latN) && Number.isFinite(lngN) && municipality.trim();

  const save = async (submit: boolean) => {
    if (!user.departmentId) return;
    setMode(submit ? 'submit' : 'draft');
    const res = await action.run({
      title: title.trim(),
      problemStatement: problemStatement.trim(),
      desiredOutcome: desiredOutcome.trim(),
      departmentId: user.departmentId,
      category,
      priority,
      estimatedBudget: amount,
      requiredCapabilities: capabilities,
      location: { province, municipality: municipality.trim(), ward: ward.trim() || null, latitude: latN, longitude: lngN },
      documents,
      justification: justification.trim(),
      sourcingMethod,
      submit,
    });
    setMode(null);
    if (res) navigate(`/needs/${res.id}`);
  };

  if (!user.departmentId) {
    return (
      <div>
        <PageHeader title="New public need" />
        <Callout tone="warning" title="No department linked">Your persona isn't linked to a department, so you can't record a need. Switch to a department officer or manager.</Callout>
      </div>
    );
  }

  return (
    <div>
      <Link to="/needs" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-700"><ArrowLeft size={14} /> Public needs</Link>
      <PageHeader
        eyebrow="Step 1 · Public need"
        title="Document a public need"
        subtitle="Describe the problem first, not the product. The need is the 'why' behind every rand spent, and it's what the impact will be measured against."
      />

      <form className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" onSubmit={(e) => { e.preventDefault(); void save(true); }}>
        <div className="min-w-0 space-y-6">
          <Card title="The problem" icon={<Lightbulb size={16} />} subtitle="What's wrong, for whom, and what 'better' looks like.">
            <div className="space-y-4">
              <Field label="Department">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <Building2 size={14} className="text-slate-400" /> {user.departmentName ?? user.departmentId}
                </div>
              </Field>
              <Field label="Title" required hint="A short, plain-language name for the problem.">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Illegal dumping hotspots in Soshanguve" required />
              </Field>
              <Field label="Problem statement" required hint="Who is affected, where, how often, and what it costs today.">
                <Textarea rows={5} value={problemStatement} onChange={(e) => setProblem(e.target.value)} required />
              </Field>
              <Field label="Desired outcome" required hint="The measurable change you want to see.">
                <Textarea rows={3} value={desiredOutcome} onChange={(e) => setOutcome(e.target.value)} placeholder="e.g. Fewer active dumping hotspots across 12 wards within 6 months" required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category" required>
                  <Select value={category} onChange={(e) => setCategory(e.target.value as NeedCategory)}>
                    {(Object.keys(CATEGORY_LABEL) as NeedCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                  </Select>
                </Field>
                <Field label="Priority" required>
                  <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                    {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                  </Select>
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Capabilities needed" icon={<Tags size={16} />} subtitle="What a solution must be able to do. Providers search by these.">
            <Field label="Required capabilities" hint="Type a capability and press Enter or a comma.">
              <ChipsInput value={capabilities} onChange={setCapabilities} placeholder="e.g. Computer vision, IoT sensors, Ward-level reporting" />
            </Field>
          </Card>

          <Card title="Location" icon={<MapPin size={16} />} subtitle="Where the problem is. Click the map to place the marker.">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Province" required>
                  <Select value={province} onChange={(e) => setProvince(e.target.value)}>
                    {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </Field>
                <Field label="Municipality" required>
                  <Input value={municipality} onChange={(e) => setMunicipality(e.target.value)} required />
                </Field>
                <Field label="Ward">
                  <Input value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g. Ward 38" />
                </Field>
              </div>
              <LocationPicker lat={latN} lng={lngN} onPick={(a, b) => { setLat(String(a)); setLng(String(b)); }} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Latitude" required>
                  <Input type="number" step="any" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} required />
                </Field>
                <Field label="Longitude" required>
                  <Input type="number" step="any" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} required />
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Supporting documents" icon={<FileText size={16} />} subtitle="Reports, photos, complaints logs. Links only in the MVP.">
            <LinksEditor value={documents} onChange={setDocuments} />
          </Card>

          <Card title="Funding & sourcing" icon={<Wallet size={16} />} subtitle="The budget you're requesting and how it should be sourced.">
            <div className="space-y-4">
              <Field label="Estimated budget (ZAR)" required hint="The live panel checks it against your department's available budget.">
                <Input type="number" min={1} step="0.01" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 500000" required />
              </Field>
              <Field label="Justification" hint="Why this spend is needed now. Needed when you submit for approval.">
                <Textarea rows={3} value={justification} onChange={(e) => setJustification(e.target.value)} />
              </Field>
              <fieldset>
                <legend className="mb-2 text-xs font-semibold text-slate-600">Sourcing method <span className="text-rose-500" aria-hidden>*</span></legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SOURCING_OPTIONS.map((o) => (
                    <label key={o.value} className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${sourcingMethod === o.value ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name="sourcing" value={o.value} checked={sourcingMethod === o.value} onChange={() => setSourcing(o.value)} className="mt-1 h-4 w-4 accent-brand-600" />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">{o.title}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{o.body}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </Card>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <Card title="Budget check & approval route" subtitle="Live from the organisational rule set" icon={<Wallet size={16} />}>
            <RoutingPreviewPanel preview={preview.data} error={preview.error} loading={preview.loading} amount={amount} />
          </Card>
          <div className="mt-4 space-y-3">
            <FormError error={action.error} />
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <Button type="submit" icon={<Send size={16} />} loading={action.loading && mode === 'submit'} disabled={!basicsOk || !justification.trim() || action.loading} className="flex-1">
                Submit for approval
              </Button>
              <Button type="button" variant="secondary" icon={<Save size={16} />} loading={action.loading && mode === 'draft'} disabled={!basicsOk || action.loading} onClick={() => void save(false)} className="flex-1">
                Save as draft
              </Button>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              A draft skips the budget check and creates no purchase request. Submitting validates the budget on the server, snapshots it for the audit trail and starts the approval route shown above.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
