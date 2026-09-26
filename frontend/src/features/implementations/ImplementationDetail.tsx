import { useEffect, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, CalendarPlus, Check, CheckCircle2, ClipboardList, ExternalLink, Flag, MessageSquarePlus, Save, Settings2,
} from 'lucide-react';
import { api } from '../../api/client';
import type {
  CreateMilestoneRequest, CreateUpdateRequest, ImplementationDetailDto, ImplementationStatus, UpdateImplementationRequest, UpdateType,
} from '../../api/types';
import { useAuth, useUser } from '../../app/auth';
import { Link } from '../../app/router';
import { AiInline } from '../../components/AiPanel';
import {
  Badge, Button, Callout, Card, EmptyState, ErrorBanner, Field, Input, KeyValues, Loading, Modal, Mono, PageHeader, ProgressBar,
  Select, StatusBadge, Tabs, Textarea,
} from '../../components/ui';
import { useAction, useApi } from '../../lib/hooks';
import { addDays, date, dateTime, isoDate, money, relative } from '../../lib/format';
import { CATEGORY_LABEL, statusTone, UPDATE_TYPE_LABEL } from '../../lib/labels';
import type { Tone } from '../../lib/labels';
import { ImpactSection } from './ImpactSection';

const EDITABLE_STATUSES: ImplementationStatus[] = ['PLANNED', 'IN_PROGRESS', 'AT_RISK', 'CANCELLED'];
const UPDATE_TONE: Record<UpdateType, Tone> = { PROGRESS: 'brand', ISSUE: 'danger', EVIDENCE: 'success', NOTE: 'neutral' };

type TabKey = 'delivery' | 'impact';

export default function ImplementationDetail({ id }: { id: string }) {
  const user = useUser();
  const { has } = useAuth();
  const impl = useApi(() => api.get<ImplementationDetailDto>(`/implementations/${id}`), [id]);
  const [tab, setTab] = useState<TabKey>('delivery');

  if (impl.loading && !impl.data) return <Loading label="Loading implementation…" />;
  if (impl.error && !impl.data) return <ErrorBanner error={impl.error} onRetry={impl.reload} />;
  const d = impl.data;
  if (!d) return null;

  const canManage = user.id === d.managerId || has('DEPARTMENT_MANAGER', 'ADMIN');
  const closed = d.status === 'COMPLETED' || d.status === 'CANCELLED';
  const apply = (next: ImplementationDetailDto) => impl.setData(next);

  return (
    <div className="space-y-5">
      <div>
        <Link to="/implementations" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700">
          <ArrowLeft size={14} /> All implementations
        </Link>
        <PageHeader
          eyebrow={<span className="flex items-center gap-2"><Mono className="text-brand-700">{d.poNumber}</Mono> · Implementation</span>}
          title={<Link to={`/needs/${d.needId}`} className="hover:text-brand-700">{d.needTitle}</Link>}
          subtitle={`${d.departmentName} · ${CATEGORY_LABEL[d.needCategory]} · ${d.location.municipality}${d.location.ward ? `, ward ${d.location.ward}` : ''}`}
          actions={<><StatusBadge status={d.status} />{d.isLate && <Badge tone="danger"><AlertTriangle size={11} /> Late</Badge>}</>}
        />
      </div>

      <Card>
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <KeyValues cols={3} items={[
            ['Supplier', d.supplierName],
            ['Purchase order', <span key="po"><Mono className="text-slate-700">{d.poNumber}</Mono> · {money(d.amount)}</span>],
            ['Manager', d.managerName],
            ['Start', date(d.startDate)],
            ['Expected completion', <span key="e" className={d.isLate ? 'font-semibold text-rose-700' : ''}>{date(d.expectedCompletion)}</span>],
            ['Actual completion', date(d.actualCompletion)],
          ]} />
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-end justify-between">
              <span className="text-xs font-semibold text-slate-500">Delivery progress</span>
              <span className="text-2xl font-extrabold tabular-nums text-slate-900">{d.progressPct}%</span>
            </div>
            <ProgressBar className="mt-2" value={d.progressPct} tone={d.status === 'AT_RISK' ? 'danger' : d.status === 'COMPLETED' ? 'success' : 'brand'} label="Delivery progress" />
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              <Badge tone={d.hasEvidence ? 'success' : 'neutral'}>{d.hasEvidence ? 'Delivery evidence on file' : 'No delivery evidence yet'}</Badge>
              <Badge tone="neutral">{d.milestones.filter((m) => m.completedAt).length}/{d.milestones.length} milestones</Badge>
            </div>
          </div>
        </div>
      </Card>

      {canManage && !closed && <ManagePanel d={d} onChange={apply} />}

      <Tabs<TabKey>
        tabs={[
          { key: 'delivery', label: 'Delivery', count: d.milestones.length + d.updates.length },
          { key: 'impact', label: 'Impact', count: d.metrics.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'delivery' && (
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-2"><Milestones d={d} canManage={canManage && !closed} onChange={apply} /></div>
          <div className="lg:col-span-3"><Updates d={d} canManage={canManage && !closed} onChange={apply} /></div>
        </div>
      )}
      {tab === 'impact' && <ImpactSection impl={d} canManage={canManage} onChange={apply} />}

      <Card title="CIVIC AI" subtitle="Summarises delivery and impact from the records. It doesn't change them.">
        <AiInline task="impact-summary" body={{ implementationId: id }} />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ management */

function ManagePanel({ d, onChange }: { d: ImplementationDetailDto; onChange: (d: ImplementationDetailDto) => void }) {
  const [status, setStatus] = useState<ImplementationStatus>(d.status);
  const [progress, setProgress] = useState(String(d.progressPct));
  useEffect(() => { setStatus(d.status); setProgress(String(d.progressPct)); }, [d.status, d.progressPct]);

  const patch = useAction(
    (body: UpdateImplementationRequest) => api.patch<ImplementationDetailDto>(`/implementations/${d.id}`, body),
    (r) => `Implementation updated — ${statusTone(r.status).label.toLowerCase()}, ${r.progressPct}%`,
  );
  const complete = useAction(
    () => api.post<ImplementationDetailDto>(`/implementations/${d.id}/complete`),
    'Implementation completed — PO closed',
  );

  const p = Number(progress);
  const progressErr = progress === '' || Number.isNaN(p) || p < 0 || p > 100 ? 'Enter 0–100' : null;
  const dirty = status !== d.status || p !== d.progressPct;

  const save = async () => {
    const body: UpdateImplementationRequest = {};
    if (status !== d.status) body.status = status;
    if (p !== d.progressPct) body.progressPct = p;
    const r = await patch.run(body);
    if (r) onChange(r);
  };
  const [confirmOpen, setConfirmOpen] = useState(false);
  const openMilestones = d.milestones.filter((m) => !m.completedAt).length;
  const finish = async () => {
    const r = await complete.run();
    if (r) { setConfirmOpen(false); onChange(r); }
  };

  const statusOptions = EDITABLE_STATUSES.includes(d.status) ? EDITABLE_STATUSES : [d.status, ...EDITABLE_STATUSES];

  return (
    <Card title="Manage delivery" subtitle="Server-enforced: only the implementation manager or a department manager can make changes." icon={<Settings2 size={16} />}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as ImplementationStatus)}>
              {statusOptions.map((s) => <option key={s} value={s} disabled={!EDITABLE_STATUSES.includes(s)}>{statusTone(s).label}</option>)}
            </Select>
          </Field>
          <Field label="Progress %" error={progressErr}>
            <Input type="number" min={0} max={100} value={progress} onChange={(e) => setProgress(e.target.value)} />
          </Field>
          <Button variant="secondary" icon={<Save size={16} />} loading={patch.loading} disabled={!dirty || !!progressErr} onClick={save}>Save</Button>
        </div>
        <div className="flex flex-col items-start gap-1 border-t border-slate-100 pt-3 lg:items-end lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <Button icon={<CheckCircle2 size={16} />} loading={complete.loading} disabled={!d.hasEvidence} onClick={() => setConfirmOpen(true)}
            title={d.hasEvidence ? undefined : 'Add a delivery evidence update first'}>
            Mark completed
          </Button>
          {!d.hasEvidence && <span className="text-[11px] text-amber-700">Add a delivery evidence update first</span>}
        </div>
      </div>
      {status === 'AT_RISK' && d.status !== 'AT_RISK' && (
        <div className="mt-3"><Callout tone="warning">Setting <strong>At risk</strong> notifies executives and is recorded in the audit log.</Callout></div>
      )}
      {(patch.error || complete.error) && <div className="mt-3"><ErrorBanner error={patch.error ?? complete.error} /></div>}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Mark implementation completed?"
        subtitle={`${d.poNumber} · ${d.supplierName} · ${d.needTitle}`}
        footer={<>
          <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)} disabled={complete.loading}>Cancel</Button>
          <Button type="button" icon={<CheckCircle2 size={16} />} loading={complete.loading} onClick={finish}>Mark completed</Button>
        </>}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">This closes purchase order {d.poNumber} and locks delivery: no further milestones, updates or status changes. It is recorded in the audit log and can't be undone. Impact measurements can still be recorded afterwards.</p>
          {openMilestones > 0 && (
            <Callout tone="warning">{openMilestones} of {d.milestones.length} milestone{d.milestones.length === 1 ? '' : 's'} not yet marked done.</Callout>
          )}
          {complete.error && <ErrorBanner error={complete.error} />}
        </div>
      </Modal>
    </Card>
  );
}

/* ------------------------------------------------------------------ milestones */

function Milestones({ d, canManage, onChange }: { d: ImplementationDetailDto; canManage: boolean; onChange: (d: ImplementationDetailDto) => void }) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const done = useAction((mid: string) => api.post<ImplementationDetailDto>(`/milestones/${mid}/complete`), 'Milestone completed');
  const finish = async (mid: string) => {
    setBusy(mid);
    const r = await done.run(mid);
    setBusy(null);
    if (r) onChange(r);
  };
  const list = [...d.milestones].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return (
    <Card title="Milestones" icon={<Flag size={16} />}
      actions={canManage ? <Button size="sm" variant="secondary" icon={<CalendarPlus size={14} />} onClick={() => setAdding(true)}>Add milestone</Button> : undefined}>
      {list.length === 0 ? <EmptyState title="No milestones yet" message="Break delivery into dated milestones." /> : (
        <ol className="space-y-2">
          {list.map((m) => (
            <li key={m.id} className="flex items-start gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${m.completedAt ? 'bg-emerald-500 text-white' : m.isLate ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-400'}`} aria-hidden>
                {m.completedAt ? <Check size={12} /> : m.isLate ? <AlertTriangle size={11} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800">{m.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                  <span>Due {date(m.dueDate)}</span>
                  {m.completedAt && <Badge tone="success">Completed {date(m.completedAt)}</Badge>}
                  {m.isLate && <Badge tone="danger">Late</Badge>}
                </div>
              </div>
              {canManage && !m.completedAt && (
                <Button size="sm" variant="ghost" icon={<Check size={14} />} loading={busy === m.id} disabled={!!busy} onClick={() => finish(m.id)}>Complete</Button>
              )}
            </li>
          ))}
        </ol>
      )}
      {adding && <MilestoneModal implId={d.id} onClose={() => setAdding(false)} onSaved={(r) => { onChange(r); setAdding(false); }} />}
    </Card>
  );
}

function MilestoneModal({ implId, onClose, onSaved }: { implId: string; onClose: () => void; onSaved: (d: ImplementationDetailDto) => void }) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(isoDate(addDays(30)));
  const save = useAction((body: CreateMilestoneRequest) => api.post<ImplementationDetailDto>(`/implementations/${implId}/milestones`, body), 'Milestone added');
  const submit = async () => {
    const r = await save.run({ title: title.trim(), dueDate: due });
    if (r) onSaved(r);
  };
  return (
    <Modal open onClose={onClose} title="Add milestone"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={<CalendarPlus size={16} />} loading={save.loading} disabled={!title.trim() || !due} onClick={submit}>Add</Button></>}>
      <div className="space-y-4">
        <ErrorBanner error={save.error} />
        <Field label="Title" required><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cameras installed at 12 hotspots" /></Field>
        <Field label="Due date" required><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ updates */

function Updates({ d, canManage, onChange }: { d: ImplementationDetailDto; canManage: boolean; onChange: (d: ImplementationDetailDto) => void }) {
  const [posting, setPosting] = useState(false);
  const list = [...d.updates].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Card title="Updates" subtitle="Progress, issues and delivery evidence, newest first." icon={<ClipboardList size={16} />}
      actions={canManage ? <Button size="sm" icon={<MessageSquarePlus size={14} />} onClick={() => setPosting(true)}>Post update</Button> : undefined}>
      {list.length === 0 ? <EmptyState title="No updates yet" message="Post progress and delivery evidence as work happens." /> : (
        <ol className="relative space-y-4 border-l border-slate-200 pl-5">
          {list.map((u) => (
            <li key={u.id} className="relative">
              <span className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${u.type === 'EVIDENCE' ? 'bg-emerald-500' : u.type === 'ISSUE' ? 'bg-rose-500' : u.type === 'PROGRESS' ? 'bg-brand-500' : 'bg-slate-400'}`} aria-hidden />
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={UPDATE_TONE[u.type]}>{UPDATE_TYPE_LABEL[u.type]}</Badge>
                {u.progressPct != null && <Badge tone="neutral">{u.progressPct}%</Badge>}
                <span className="text-[11px] text-slate-400" title={dateTime(u.createdAt)}>{u.authorName} · {relative(u.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-700">{u.description}</p>
              {u.evidenceUrl && (
                <a href={u.evidenceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                  View evidence <ExternalLink size={11} />
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
      {posting && <UpdateModal d={d} onClose={() => setPosting(false)} onSaved={(r) => { onChange(r); setPosting(false); }} />}
    </Card>
  );
}

function UpdateModal({ d, onClose, onSaved }: { d: ImplementationDetailDto; onClose: () => void; onSaved: (d: ImplementationDetailDto) => void }) {
  const [type, setType] = useState<UpdateType>(d.hasEvidence ? 'PROGRESS' : 'EVIDENCE');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const save = useAction((body: CreateUpdateRequest) => api.post<ImplementationDetailDto>(`/implementations/${d.id}/updates`, body), 'Update posted');
  const p = Number(progress);
  const progressErr = progress !== '' && (Number.isNaN(p) || p < 0 || p > 100) ? 'Enter 0–100' : null;
  const needsUrl = type === 'EVIDENCE';
  const invalid = !description.trim() || !!progressErr || (needsUrl && !evidenceUrl.trim());
  const submit = async () => {
    const r = await save.run({
      type, description: description.trim(), progressPct: progress === '' ? undefined : p, evidenceUrl: evidenceUrl.trim() || undefined,
    });
    if (r) onSaved(r);
  };
  return (
    <Modal open onClose={onClose} title="Post update" subtitle={d.needTitle}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={<MessageSquarePlus size={16} />} loading={save.loading} disabled={invalid} onClick={submit}>Post</Button></>}>
      <div className="space-y-4">
        <ErrorBanner error={save.error} />
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <Field label="Type" required>
            <Select value={type} onChange={(e) => setType(e.target.value as UpdateType)}>
              {(Object.keys(UPDATE_TYPE_LABEL) as UpdateType[]).map((t) => <option key={t} value={t}>{UPDATE_TYPE_LABEL[t]}</option>)}
            </Select>
          </Field>
          <Field label="Progress %" error={progressErr} hint="Optional">
            <Input type="number" min={0} max={100} value={progress} onChange={(e) => setProgress(e.target.value)} />
          </Field>
        </div>
        <Field label="Description" required><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Field label="Evidence URL" required={needsUrl} hint={needsUrl ? 'Required for delivery evidence (photo set, sign-off, report).' : 'Optional'}>
          <Input type="url" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://example.org/…" />
        </Field>
        {needsUrl && <Callout tone="info">Delivery evidence is what allows this implementation to be marked completed.</Callout>}
      </div>
    </Modal>
  );
}
