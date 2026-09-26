import { Fragment, useCallback, useEffect, useState } from 'react';
import { Plus, Rocket, Save, Sparkles, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import type {
  AiResultDto, CreateOpportunityRequest, CriterionDto, CriterionKey, OpportunityDetailDto, ProviderType, RuleSetDto, ScoringMethod,
} from '../../api/types';
import { navigate } from '../../app/router';
import { AiResult, runAi } from '../../components/AiPanel';
import { Badge, Button, Checkbox, Field, Input, Loading, Modal, Select, Textarea } from '../../components/ui';
import { addDays, isoDate } from '../../lib/format';
import { useAction, useApi } from '../../lib/hooks';
import { CRITERION_LABEL, PROVIDER_TYPE_LABEL, SCORING_LABEL } from '../../lib/labels';
import { FormError } from './formBits';

const ALL_TYPES = Object.keys(PROVIDER_TYPE_LABEL) as ProviderType[];
const KEYS = Object.keys(CRITERION_LABEL) as CriterionKey[];
const METHODS = Object.keys(SCORING_LABEL) as ScoringMethod[];

type Row = CriterionDto & { rowId: number };
let rowSeq = 1;
const toRows = (c: CriterionDto[]): Row[] => c.map(({ id: _id, ...rest }) => ({ ...rest, rowId: rowSeq++ }));

function defaultDeadline(): string {
  return `${isoDate(addDays(14))}T17:00`;
}

export default function CreateOpportunityModal({ needId, needTitle, defaultDescription, open, onClose }: {
  needId: string; needTitle: string; defaultDescription?: string; open: boolean; onClose: () => void;
}) {
  const rules = useApi(() => api.get<RuleSetDto>('/rules'));
  const [title, setTitle] = useState(needTitle);
  const [description, setDescription] = useState(defaultDescription ?? '');
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [types, setTypes] = useState<ProviderType[]>(ALL_TYPES);
  const [openSource, setOpenSource] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [ai, setAi] = useState<AiResultDto | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [mode, setMode] = useState<'draft' | 'publish' | null>(null);

  useEffect(() => {
    if (rules.data && rows.length === 0) setRows(toRows(rules.data.defaultCriteria));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules.data]);

  const create = useCallback((body: CreateOpportunityRequest) => api.post<OpportunityDetailDto>(`/needs/${needId}/opportunity`, body), [needId]);
  const action = useAction(create, (o: OpportunityDetailDto) => (o.status === 'PUBLISHED' ? `${o.reference} published to the marketplace` : `Draft ${o.reference} saved`));

  const total = rows.reduce((s, r) => s + (Number.isFinite(r.weightPct) ? r.weightPct : 0), 0);
  const totalOk = Math.abs(total - 100) < 0.001;
  const deadlineDate = new Date(deadline);
  const deadlineOk = !Number.isNaN(deadlineDate.getTime());
  const valid = title.trim() && description.trim() && deadlineOk && types.length > 0 && rows.length > 0 && totalOk && rows.every((r) => r.name.trim());

  const update = (rowId: number, patch: Partial<CriterionDto>) => setRows((rs) => rs.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));

  const draftWithAi = async () => {
    setAiLoading(true);
    const r = await runAi('opportunity-draft', { needId });
    setAiLoading(false);
    if (!r) return;
    setAi(r);
    const s = r.structured ?? {};
    if (typeof s.title === 'string' && s.title) setTitle(s.title);
    if (typeof s.description === 'string' && s.description) setDescription(s.description);
  };

  const save = async (publish: boolean) => {
    setMode(publish ? 'publish' : 'draft');
    const res = await action.run({
      title: title.trim(),
      description: description.trim(),
      submissionDeadline: deadlineDate.toISOString(),
      eligibleProviderTypes: types,
      openSourcePreferred: openSource,
      criteria: rows.map(({ rowId: _r, ...c }) => ({ ...c, name: c.name.trim() })),
      publish,
    });
    setMode(null);
    if (res) {
      onClose();
      navigate(`/opportunities/${res.id}`);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Convert to an innovation opportunity"
      subtitle="The opportunity inherits the need's problem, budget, capabilities and location."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" icon={<Save size={15} />} loading={action.loading && mode === 'draft'} disabled={!valid || action.loading} onClick={() => void save(false)}>Save draft</Button>
          <Button icon={<Rocket size={15} />} loading={action.loading && mode === 'publish'} disabled={!valid || action.loading} onClick={() => void save(true)}>Publish now</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold-100 bg-gold-50/50 px-4 py-3">
          <p className="text-xs text-slate-600">Let CIVIC AI draft the title and description from the need's records. You review and edit before saving.</p>
          <Button size="sm" variant="secondary" icon={<Sparkles size={14} className="text-gold-500" />} loading={aiLoading} onClick={() => void draftWithAi()}>
            Draft with CIVIC AI
          </Button>
        </div>
        {ai && (
          <details className="rounded-xl border border-gold-100 bg-white p-3" open>
            <summary className="cursor-pointer text-xs font-semibold text-slate-600">CIVIC AI draft applied to the fields below: review it before saving</summary>
            <div className="mt-3"><AiResult result={ai} /></div>
          </details>
        )}

        <Field label="Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Description" required hint="What you're inviting providers to propose, and any constraints.">
          <Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Submission deadline" required hint="Local time. Defaults to 14 days from today at 17:00.">
          <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>

        <fieldset>
          <legend className="mb-2 flex w-full items-center justify-between text-xs font-semibold text-slate-600">
            <span>Eligible provider types <span className="text-rose-500" aria-hidden>*</span></span>
            <button type="button" className="text-[11px] font-semibold text-brand-700 hover:underline" onClick={() => setTypes(types.length === ALL_TYPES.length ? [] : ALL_TYPES)}>
              {types.length === ALL_TYPES.length ? 'Clear all' : 'Select all'}
            </button>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ALL_TYPES.map((t) => (
              <Fragment key={t}>
                <Checkbox label={PROVIDER_TYPE_LABEL[t]} checked={types.includes(t)}
                  onChange={(v) => setTypes((cur) => (v ? [...cur, t] : cur.filter((x) => x !== t)))} />
              </Fragment>
            ))}
          </div>
          {types.length === 0 && <p className="mt-1 text-[11px] font-medium text-rose-600">Choose at least one provider type.</p>}
        </fieldset>

        <Checkbox label="Open-source solutions preferred" checked={openSource} onChange={setOpenSource} />

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-slate-600">Evaluation criteria</div>
              <div className="text-[11px] text-slate-400">Pre-filled from the rule set's defaults. Published up front with the opportunity.</div>
            </div>
            <Badge tone={totalOk ? 'success' : 'danger'}>Total {Number(total.toFixed(2))}%</Badge>
          </div>
          {rules.loading && !rules.data ? <Loading label="Loading default criteria…" /> : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.rowId} className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-2 sm:grid-cols-[1.4fr_1fr_1.1fr_80px_auto] sm:items-center">
                  <Input aria-label="Criterion name" className="col-span-2 sm:col-span-1" value={r.name} onChange={(e) => update(r.rowId, { name: e.target.value })} placeholder="Name" />
                  <Select aria-label="Criterion key" value={r.key} onChange={(e) => update(r.rowId, { key: e.target.value as CriterionKey })}>
                    {KEYS.map((k) => <option key={k} value={k}>{CRITERION_LABEL[k]}</option>)}
                  </Select>
                  <Select aria-label="Scoring method" value={r.scoringMethod} onChange={(e) => update(r.rowId, { scoringMethod: e.target.value as ScoringMethod })}>
                    {METHODS.map((m) => <option key={m} value={m}>{SCORING_LABEL[m]}</option>)}
                  </Select>
                  <Input aria-label="Weight %" type="number" min={0} max={100} step="0.5" value={Number.isFinite(r.weightPct) ? r.weightPct : ''}
                    onChange={(e) => update(r.rowId, { weightPct: e.target.value === '' ? NaN : Number(e.target.value) })} />
                  <Button type="button" size="sm" variant="ghost" aria-label={`Remove ${r.name || 'criterion'}`} onClick={() => setRows((rs) => rs.filter((x) => x.rowId !== r.rowId))}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              <Button type="button" size="sm" variant="secondary" icon={<Plus size={14} />}
                onClick={() => setRows((rs) => [...rs, { rowId: rowSeq++, key: 'TECHNICAL', name: '', scoringMethod: 'MANUAL', weightPct: 0 }])}>
                Add criterion
              </Button>
              {!totalOk && <p className="text-[11px] font-medium text-rose-600" role="alert">Weights must add up to 100% (currently {Number(total.toFixed(2))}%).</p>}
            </div>
          )}
        </div>

        <FormError error={action.error ?? rules.error} />
      </div>
    </Modal>
  );
}
