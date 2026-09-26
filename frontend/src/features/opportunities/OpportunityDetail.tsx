import { useCallback, useState, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, Ban, Building2, CalendarClock, ClipboardList, Code2, Gavel, Lightbulb, MapPin, Rocket, Scale, Sparkles, Star,
  Target, Users, Wallet, X,
} from 'lucide-react';
import { api } from '../../api/client';
import type { AiResultDto, OpportunityDetailDto, ReasonRequest, SubmissionDto } from '../../api/types';
import { useAuth } from '../../app/auth';
import { Link, navigate } from '../../app/router';
import { AiResult, runAi } from '../../components/AiPanel';
import {
  Badge, Button, Callout, Card, DataTable, EmptyState, ErrorBanner, Loading, Modal, Mono, StatusBadge, type Column,
} from '../../components/ui';
import { dateTime, money, relative } from '../../lib/format';
import { useAction, useApi } from '../../lib/hooks';
import { bbbee, CATEGORY_LABEL, PROVIDER_TYPE_LABEL, SCORING_LABEL } from '../../lib/labels';
import { Chips } from '../needs/formBits';
import { LocationPicker } from '../needs/LocationPicker';
import { Countdown, ReasonModal } from './parts';
import { ProviderPanel } from './ProviderPanel';

export default function OpportunityDetail({ id }: { id: string }) {
  const { has, isStaff } = useAuth();
  const opp = useApi(() => api.get<OpportunityDetailDto>(`/opportunities/${id}`), [id]);

  if (opp.loading && !opp.data) return <Loading label="Loading opportunity…" />;
  if (opp.error || !opp.data) return <ErrorBanner error={opp.error ?? new Error('Opportunity not found')} onRetry={opp.reload} />;

  const o = opp.data;
  const isPO = has('PROCUREMENT_OFFICER');
  const isProvider = has('PROVIDER');
  const live = o.status === 'PUBLISHED';

  return (
    <div>
      <Link to="/opportunities" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-700"><ArrowLeft size={14} /> Opportunities</Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Mono className="text-brand-700">{o.reference}</Mono>
            <StatusBadge status={o.displayStatus} />
            {o.openSourcePreferred && <Badge tone="info"><Code2 size={11} /> Open source preferred</Badge>}
            <Badge tone="neutral">{CATEGORY_LABEL[o.category]}</Badge>
          </div>
          <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900">{o.title}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Building2 size={14} /> {o.departmentName}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {o.location.municipality}{o.location.ward ? `, ${o.location.ward}` : ''} · {o.location.province}</span>
            {isStaff && <Link to={`/needs/${o.needId}`} className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">From need {o.needReference} <ArrowRight size={12} /></Link>}
          </div>
        </div>
        {isPO && <StaffActions opp={o} onChanged={opp.reload} />}
        {!isPO && isStaff && ['EVALUATION', 'AWARDED', 'CLOSED'].includes(o.status) && has('EVALUATOR', 'EXECUTIVE', 'AUDITOR') && (
          <Button variant="secondary" icon={<Scale size={16} />} onClick={() => navigate(`/evaluations/${o.id}`)}>Open evaluation board</Button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Fact icon={<Wallet size={16} />} label="Published budget" value={money(o.budget)} />
        <Fact icon={<CalendarClock size={16} />} label="Submission deadline" value={dateTime(o.submissionDeadline)}
          hint={live ? <Countdown to={o.submissionDeadline} /> : relative(o.submissionDeadline)} highlight={o.displayStatus === 'CLOSING_SOON'} />
        <Fact icon={<ClipboardList size={16} />} label="Submissions" value={String(o.submissionCount)} hint={o.publishedAt ? `Published ${dateTime(o.publishedAt)}` : 'Not yet published'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Card title="The problem" icon={<Lightbulb size={16} />}>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{o.problemStatement}</p>
          </Card>
          <Card title="Desired outcome" icon={<Target size={16} />}>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{o.desiredOutcome}</p>
          </Card>
          <Card title="What we're inviting">
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{o.description}</p>
          </Card>
          <Card title="Evaluation criteria" icon={<Scale size={16} />} subtitle="Criteria and weights are published up front, before anyone submits.">
            <CriteriaTable opp={o} />
          </Card>
          {isStaff && o.submissions && (
            <SubmissionsCard opp={o} canAct={isPO} onChanged={opp.reload} />
          )}
        </div>

        <div className="min-w-0 space-y-6">
          {isProvider && <ProviderPanel opp={o} onChanged={opp.reload} />}
          <Card title="Required capabilities">
            <Chips items={o.requiredCapabilities} />
          </Card>
          <Card title="Who can submit" icon={<Users size={16} />}>
            <Chips tone="neutral" items={o.eligibleProviderTypes.map((t) => PROVIDER_TYPE_LABEL[t])} />
            {o.openSourcePreferred && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><Code2 size={13} className="mt-0.5 shrink-0 text-sky-600" /> Open-source solutions are preferred for this opportunity.</p>
            )}
          </Card>
          <Card title="Location" icon={<MapPin size={16} />} subtitle={`${o.location.municipality} · ${o.location.province}`}>
            <LocationPicker lat={o.location.latitude} lng={o.location.longitude} readOnly />
          </Card>
          <Callout tone="neutral" title="Honest participation">
            Publishing here improves visibility and participation where organisational rules permit. It doesn't guarantee that any provider qualifies for award.
          </Callout>
        </div>
      </div>
    </div>
  );
}

function Fact({ icon, label, value, hint, highlight }: { icon: ReactNode; label: string; value: ReactNode; hint?: ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${highlight ? 'border-gold-100 bg-gold-50/70' : 'border-slate-200/80 bg-white'}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><span className={highlight ? 'text-gold-600' : 'text-brand-600'}>{icon}</span>{label}</div>
      <div className="mt-1.5 text-lg font-bold tracking-tight text-slate-900">{value}</div>
      {hint && <div className={`mt-0.5 text-sm ${highlight ? 'text-gold-600' : 'text-slate-500'}`}>{hint}</div>}
    </div>
  );
}

function CriteriaTable({ opp }: { opp: OpportunityDetailDto }) {
  const cols: Column<OpportunityDetailDto['criteria'][number]>[] = [
    { key: 'name', header: 'Criterion', render: (c) => <span className="font-medium text-slate-900">{c.name}</span> },
    { key: 'method', header: 'How it is scored', render: (c) => <Badge tone={c.scoringMethod === 'MANUAL' ? 'neutral' : 'brand'}>{SCORING_LABEL[c.scoringMethod]}</Badge> },
    { key: 'w', header: 'Weight', align: 'right', render: (c) => <span className="font-semibold tabular-nums">{c.weightPct}%</span> },
  ];
  return (
    <div className="-mx-5 -mb-5">
      <DataTable dense columns={cols} rows={opp.criteria} rowKey={(c) => c.id ?? c.key + c.name} empty={<p className="px-5 pb-5 text-sm text-slate-400">No criteria defined.</p>} />
      <div className="flex justify-between border-t border-slate-100 px-5 py-2 text-xs text-slate-500">
        <span>Auto criteria are calculated by the rule engine; evaluators score the rest with a written rationale.</span>
      </div>
    </div>
  );
}

function StaffActions({ opp, onChanged }: { opp: OpportunityDetailDto; onChanged: () => void }) {
  const [confirmEval, setConfirmEval] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const publishFn = useCallback(() => api.post<OpportunityDetailDto>(`/opportunities/${opp.id}/publish`), [opp.id]);
  const publish = useAction(publishFn, (o: OpportunityDetailDto) => `${o.reference} published`);
  const startFn = useCallback(() => api.post<OpportunityDetailDto>(`/opportunities/${opp.id}/start-evaluation`), [opp.id]);
  const start = useAction(startFn, 'Submissions closed, evaluation started');
  const cancelFn = useCallback((body: ReasonRequest) => api.post<OpportunityDetailDto>(`/opportunities/${opp.id}/cancel`, body), [opp.id]);
  const cancel = useAction(cancelFn, 'Opportunity cancelled');

  const canCancel = ['DRAFT', 'PUBLISHED'].includes(opp.status);
  return (
    <div className="flex flex-wrap gap-2">
      {opp.status === 'DRAFT' && (
        <Button icon={<Rocket size={16} />} loading={publish.loading} onClick={async () => { if (await publish.run()) onChanged(); }}>Publish</Button>
      )}
      {opp.status === 'PUBLISHED' && (
        <Button icon={<Gavel size={16} />} onClick={() => setConfirmEval(true)}>Close &amp; start evaluation</Button>
      )}
      {['EVALUATION', 'AWARDED', 'CLOSED'].includes(opp.status) && (
        <Button icon={<Scale size={16} />} onClick={() => navigate(`/evaluations/${opp.id}`)}>Open evaluation board</Button>
      )}
      {canCancel && (
        <Button variant="secondary" icon={<Ban size={16} />} onClick={() => setCancelOpen(true)} className="text-rose-700">Cancel</Button>
      )}

      <Modal open={confirmEval} onClose={() => setConfirmEval(false)} title="Close submissions and start evaluation?"
        subtitle={`${opp.reference} · ${opp.submissionCount} submission${opp.submissionCount === 1 ? '' : 's'}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmEval(false)}>Not yet</Button>
            <Button icon={<Gavel size={15} />} loading={start.loading}
              onClick={async () => { if (await start.run()) { setConfirmEval(false); navigate(`/evaluations/${opp.id}`); } }}>
              Close &amp; start evaluation
            </Button>
          </>
        }>
        <div className="space-y-3 text-sm text-slate-600">
          <p>No further submissions will be accepted. Every non-withdrawn submission moves to <strong>Under review</strong>, and the published criteria are applied.</p>
          {new Date(opp.submissionDeadline).getTime() > Date.now() && (
            <Callout tone="warning" title="The deadline hasn't passed yet">It closes {relative(opp.submissionDeadline)}. Closing early is recorded in the audit log.</Callout>
          )}
          {start.error && <ErrorBanner error={start.error} />}
        </div>
      </Modal>

      <ReasonModal open={cancelOpen} title="Cancel opportunity" subtitle={opp.title} label="Reason for cancelling"
        hint="Providers who submitted will see this reason. Recorded in the audit log." confirmLabel="Cancel opportunity" danger
        loading={cancel.loading} error={cancel.error} onClose={() => setCancelOpen(false)}
        onConfirm={async (reason) => { const r = await cancel.run({ reason }); if (r) onChanged(); return !!r; }} />
    </div>
  );
}

function SubmissionsCard({ opp, canAct, onChanged }: { opp: OpportunityDetailDto; canAct: boolean; onChanged: () => void }) {
  const [rejecting, setRejecting] = useState<SubmissionDto | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [aiFor, setAiFor] = useState<SubmissionDto | null>(null);
  const [ai, setAi] = useState<AiResultDto | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  const shortlistFn = useCallback((sid: string) => api.post<SubmissionDto>(`/submissions/${sid}/shortlist`), []);
  const shortlist = useAction(shortlistFn, (s: SubmissionDto) => `${s.providerName} shortlisted`);
  const rejectFn = useCallback((sid: string, body: ReasonRequest) => api.post<SubmissionDto>(`/submissions/${sid}/reject`, body), []);
  const reject = useAction(rejectFn, (s: SubmissionDto) => `${s.providerName}'s submission rejected`);

  const summarise = async (s: SubmissionDto) => {
    setAiBusy(s.id);
    const r = await runAi('submission-summary', { submissionId: s.id });
    setAiBusy(null);
    if (r) { setAi(r); setAiFor(s); }
  };

  const subs = opp.submissions ?? [];
  const columns: Column<SubmissionDto>[] = [
    {
      key: 'provider', header: 'Provider', className: 'min-w-[180px]', render: (s) => (
        <div>
          <Link to={`/providers/${s.providerId}`} className="font-semibold text-slate-900 hover:text-brand-700">{s.providerName}</Link>
          {s.solutionName && <div className="text-[11px] text-slate-500">{s.solutionName}</div>}
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (s) => <span className="whitespace-nowrap text-slate-600">{PROVIDER_TYPE_LABEL[s.providerType]}</span> },
    { key: 'bbbee', header: 'B-BBEE', render: (s) => <span className="whitespace-nowrap text-slate-600">{bbbee(s.providerBbbeeLevel)}</span> },
    { key: 'muni', header: 'Municipality', render: (s) => <span className="text-slate-600">{s.providerMunicipality}</span>, className: 'min-w-[120px]' },
    { key: 'price', header: 'Price', align: 'right', render: (s) => <span className="whitespace-nowrap font-semibold">{money(s.proposedPrice)}</span> },
    { key: 'at', header: 'Submitted', render: (s) => <span className="whitespace-nowrap text-slate-500" title={dateTime(s.submittedAt)}>{relative(s.submittedAt)}</span> },
    {
      key: 'status', header: 'Status', render: (s) => (
        <div>
          <StatusBadge status={s.status} />
          {s.statusReason && <div className="mt-1 max-w-[180px] text-[11px] text-slate-500">{s.statusReason}</div>}
        </div>
      ),
    },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', render: (s) => {
        const actionable = canAct && (s.status === 'SUBMITTED' || s.status === 'UNDER_REVIEW');
        return (
          <div className="flex flex-wrap justify-end gap-1.5">
            {actionable && (
              <>
                <Button size="sm" variant="secondary" icon={<Star size={13} />} loading={shortlist.loading && busyId === s.id}
                  onClick={async () => { setBusyId(s.id); if (await shortlist.run(s.id)) onChanged(); setBusyId(null); }}>
                  Shortlist
                </Button>
                <Button size="sm" variant="ghost" icon={<X size={13} />} className="text-rose-700" onClick={() => setRejecting(s)}>Reject</Button>
              </>
            )}
            <Button size="sm" variant="ghost" icon={<Sparkles size={13} className="text-gold-500" />} loading={aiBusy === s.id} onClick={() => void summarise(s)}>
              CIVIC AI summary
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <Card title="Submissions" icon={<ClipboardList size={16} />} padded={false}
      subtitle="Visible to staff only. Providers see only their own submission."
      actions={<Badge tone="brand">{subs.length}</Badge>}>
      <DataTable columns={columns} rows={subs} rowKey={(s) => s.id}
        empty={<div className="p-5"><EmptyState title="No submissions yet" message={opp.status === 'DRAFT' ? 'Publish the opportunity to start receiving proposals.' : 'Proposals from providers will appear here.'} /></div>} />

      <ReasonModal open={!!rejecting} title="Reject submission" subtitle={rejecting ? `${rejecting.providerName} · ${money(rejecting.proposedPrice)}` : undefined}
        label="Reason" hint="The provider sees this reason. Recorded in the audit log." confirmLabel="Reject submission" danger
        loading={reject.loading} error={reject.error} onClose={() => setRejecting(null)}
        onConfirm={async (reason) => { if (!rejecting) return false; const r = await reject.run(rejecting.id, { reason }); if (r) onChanged(); return !!r; }} />

      <Modal open={!!ai && !!aiFor} wide onClose={() => { setAi(null); setAiFor(null); }}
        title="CIVIC AI submission summary" subtitle={aiFor ? `${aiFor.providerName} · ${money(aiFor.proposedPrice)}` : undefined}
        footer={<Button variant="secondary" onClick={() => { setAi(null); setAiFor(null); }}>Close</Button>}>
        {ai && <AiResult result={ai} />}
      </Modal>
    </Card>
  );
}
