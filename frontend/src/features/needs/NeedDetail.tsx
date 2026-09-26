import { useCallback, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Building2, ClipboardCheck, Construction, FileText, Lightbulb, MapPin, Megaphone, Receipt, Rocket, Send,
  Sparkles, Target, UserRound, Wallet,
} from 'lucide-react';
import { api } from '../../api/client';
import type { NeedDetailDto, SourcingMethod, SubmitNeedRequest } from '../../api/types';
import { useAuth, useUser } from '../../app/auth';
import { Link, navigate } from '../../app/router';
import { AiInline } from '../../components/AiPanel';
import { StageTracker } from '../../components/StageTracker';
import {
  Badge, Button, Callout, Card, ErrorBanner, Field, Input, KeyValues, Loading, Modal, Mono, ProgressBar, Select, StatusBadge, Tabs, Textarea,
} from '../../components/ui';
import { date, dateTime, money, relative } from '../../lib/format';
import { useAction, useApi } from '../../lib/hooks';
import { CATEGORY_LABEL, PRIORITY_LABEL, SOURCING_LABEL } from '../../lib/labels';
import { ApprovalSteps } from '../approvals/ApprovalSteps';
import CreateOpportunityModal from './CreateOpportunityModal';
import { Chips, DocLinks, FormError } from './formBits';
import { LocationPicker } from './LocationPicker';
import { NeedJourney } from './NeedJourney';
import { RoutingPreviewPanel, useRoutingPreview } from './RoutingPreview';

type TabKey = 'overview' | 'journey';

export default function NeedDetail({ id }: { id: string }) {
  const user = useUser();
  const { has, isStaff } = useAuth();
  const need = useApi(() => api.get<NeedDetailDto>(`/needs/${id}`), [id]);
  const [tab, setTab] = useState<TabKey>('overview');
  const [oppOpen, setOppOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);

  if (need.loading && !need.data) return <Loading label="Loading public need…" />;
  if (need.error || !need.data) return <ErrorBanner error={need.error ?? new Error('Need not found')} onRetry={need.reload} />;

  const n = need.data;
  const req = n.request;
  const canConvert = has('PROCUREMENT_OFFICER') && req?.status === 'APPROVED' && req.sourcingMethod === 'OPEN_OPPORTUNITY' && !n.opportunity;
  const canQuote = req?.status === 'APPROVED' && req.sourcingMethod === 'QUOTATION' && !n.purchaseOrder;
  const canSubmit = n.status === 'DRAFT' && n.createdByName === user.fullName;

  return (
    <div>
      <Link to="/needs" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-700"><ArrowLeft size={14} /> Public needs</Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Mono className="text-brand-700">{n.reference}</Mono>
            <StatusBadge status={n.stage} />
            <StatusBadge status={n.status} />
            <Badge tone={n.priority === 'CRITICAL' ? 'danger' : n.priority === 'HIGH' ? 'warning' : 'neutral'}>{PRIORITY_LABEL[n.priority]} priority</Badge>
          </div>
          <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900">{n.title}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Building2 size={14} /> {n.departmentName}</span>
            <span className="inline-flex items-center gap-1.5"><Wallet size={14} /> {money(n.estimatedBudget)}</span>
            <span className="inline-flex items-center gap-1.5"><UserRound size={14} /> {n.createdByName} · {date(n.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canConvert && <Button icon={<Megaphone size={16} />} onClick={() => setOppOpen(true)}>Convert to opportunity</Button>}
          {canQuote && req && <Button icon={<Receipt size={16} />} onClick={() => navigate(`/procurement/requests/${req.id}`)}>Manage quotations</Button>}
          {canSubmit && <Button icon={<Send size={16} />} onClick={() => setSubmitOpen(true)}>Submit for approval</Button>}
        </div>
      </div>

      <Card className="mb-6">
        <StageTracker stages={n.stages} />
      </Card>

      <Tabs<TabKey>
        tabs={[{ key: 'overview', label: 'Overview' }, { key: 'journey', label: 'Journey' }]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'journey' ? <NeedJourney needId={n.id} /> : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-6">
            <Card title="The problem" icon={<Lightbulb size={16} />} subtitle={CATEGORY_LABEL[n.category]}>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{n.problemStatement}</p>
            </Card>
            <Card title="Desired outcome" icon={<Target size={16} />}>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{n.desiredOutcome}</p>
            </Card>
            <Card title="Required capabilities">
              <Chips items={n.requiredCapabilities} />
            </Card>
            <Card title="Location" icon={<MapPin size={16} />}>
              <div className="space-y-4">
                <KeyValues cols={3} items={[
                  ['Province', n.location.province],
                  ['Municipality', n.location.municipality],
                  ['Ward', n.location.ward || '—'],
                ]} />
                <LocationPicker lat={n.location.latitude} lng={n.location.longitude} readOnly />
              </div>
            </Card>
            <Card title="Supporting documents" icon={<FileText size={16} />}>
              <DocLinks docs={n.documents} />
            </Card>
          </div>

          <div className="min-w-0 space-y-6">
            <RequestCard need={n} />
            {n.opportunity && (
              <Card title="Innovation opportunity" icon={<Megaphone size={16} />}
                actions={<Link to={`/opportunities/${n.opportunity.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">Open <ArrowRight size={12} /></Link>}>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Mono>{n.opportunity.reference}</Mono>
                    <StatusBadge status={n.opportunity.displayStatus} />
                  </div>
                  <Link to={`/opportunities/${n.opportunity.id}`} className="block font-semibold text-slate-900 hover:text-brand-700">{n.opportunity.title}</Link>
                  <KeyValues items={[
                    ['Submissions', n.opportunity.submissionCount],
                    ['Deadline', <span key="d">{dateTime(n.opportunity.submissionDeadline)} <span className="text-slate-400">({relative(n.opportunity.submissionDeadline)})</span></span>],
                  ]} />
                  {['EVALUATION', 'AWARDED', 'CLOSED'].includes(n.opportunity.status) && isStaff && (
                    <Link to={`/evaluations/${n.opportunity.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">Evaluation board <ArrowRight size={12} /></Link>
                  )}
                </div>
              </Card>
            )}
            {n.purchaseOrder && (
              <Card title="Purchase order" icon={<ClipboardCheck size={16} />}>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Mono className="text-slate-700">{n.purchaseOrder.poNumber}</Mono>
                    <StatusBadge status={n.purchaseOrder.status} />
                    {n.purchaseOrder.isDeviation
                      ? <Badge tone="warning" title={n.purchaseOrder.deviationJustification ?? undefined}>Deviation from recommendation</Badge>
                      : <Badge tone="success">Recommended option</Badge>}
                  </div>
                  <KeyValues items={[
                    ['Supplier', <span key="s">{n.purchaseOrder.supplierName} <StatusBadge status={n.purchaseOrder.supplierStatus} /></span>],
                    ['Amount', money(n.purchaseOrder.amount)],
                    ['Selected by', n.purchaseOrder.selectedByName ?? '—'],
                    ['Issued', n.purchaseOrder.issuedAt ? dateTime(n.purchaseOrder.issuedAt) : '—'],
                  ]} />
                  {n.purchaseOrder.isDeviation && n.purchaseOrder.deviationJustification && (
                    <Callout tone="warning" title="Deviation justification">{n.purchaseOrder.deviationJustification}</Callout>
                  )}
                </div>
              </Card>
            )}
            {n.implementation && (
              <Card title="Implementation" icon={<Construction size={16} />}
                actions={<Link to={`/implementations/${n.implementation.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">Open <ArrowRight size={12} /></Link>}>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={n.implementation.status} />
                    {n.implementation.isLate && <Badge tone="danger">Late</Badge>}
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Progress</span><span className="font-semibold text-slate-700">{n.implementation.progressPct}%</span></div>
                    <ProgressBar value={n.implementation.progressPct} tone={n.implementation.status === 'AT_RISK' ? 'danger' : n.implementation.status === 'COMPLETED' ? 'success' : 'brand'} label="Implementation progress" />
                  </div>
                  <KeyValues items={[
                    ['Supplier', n.implementation.supplierName],
                    ['Manager', n.implementation.managerName],
                    ['Expected completion', date(n.implementation.expectedCompletion)],
                    ['Impact metrics', n.implementation.metricCount],
                  ]} />
                </div>
              </Card>
            )}
            {isStaff && (
              <Card title="CIVIC AI" icon={<Sparkles size={16} className="text-gold-500" />} subtitle="Drafts for human review, grounded in platform records. AI never decides.">
                <div className="space-y-3">
                  <AiInline task="need-analysis" body={{ needId: n.id }} />
                  <AiInline task="solution-discovery" body={{ needId: n.id }} />
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {canConvert && oppOpen && (
        <CreateOpportunityModal needId={n.id} needTitle={n.title} defaultDescription={n.problemStatement} open={oppOpen} onClose={() => setOppOpen(false)} />
      )}
      {canSubmit && submitOpen && (
        <SubmitNeedModal need={n} onClose={() => setSubmitOpen(false)} onDone={() => { setSubmitOpen(false); void need.reload(); }} />
      )}
    </div>
  );
}

function RequestCard({ need }: { need: NeedDetailDto }) {
  const r = need.request;
  if (!r) {
    return (
      <Card title="Purchase request" icon={<Wallet size={16} />}>
        <p className="text-sm text-slate-500">
          {need.status === 'DRAFT' ? 'This need is a draft. No budget has been requested yet.' : 'No purchase request is linked to this need.'}
        </p>
      </Card>
    );
  }
  return (
    <Card title="Purchase request" icon={<Wallet size={16} />} subtitle={r.reference}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={r.status} />
          <Badge tone="neutral">Rule set v{r.ruleSetVersion}</Badge>
        </div>
        <KeyValues items={[
          ['Amount', <span key="a" className="font-semibold">{money(r.amount)}</span>],
          ['Sourcing', SOURCING_LABEL[r.sourcingMethod]],
          ['Budget available at submission', money(r.budgetAvailableSnapshot)],
          ['Submitted', r.submittedAt ? dateTime(r.submittedAt) : '—'],
          ['Requested by', r.requestedByName],
          ['Decided', r.decidedAt ? dateTime(r.decidedAt) : '—'],
        ]} />
        {r.justification && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Justification</div>
            <p className="mt-0.5 whitespace-pre-line text-sm text-slate-700">{r.justification}</p>
          </div>
        )}
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Approval route</div>
          <ApprovalSteps steps={r.steps} />
        </div>
        {r.sourcingMethod === 'QUOTATION' && r.quoteCount > 0 && (
          <p className="text-xs text-slate-500">{r.quoteCount} quotation{r.quoteCount === 1 ? '' : 's'} recorded.</p>
        )}
      </div>
    </Card>
  );
}

function SubmitNeedModal({ need, onClose, onDone }: { need: NeedDetailDto; onClose: () => void; onDone: () => void }) {
  const [justification, setJustification] = useState('');
  const [sourcingMethod, setSourcing] = useState<SourcingMethod>('OPEN_OPPORTUNITY');
  const [amount, setAmount] = useState(String(need.estimatedBudget));
  const amt = Number(amount);
  const preview = useRoutingPreview(need.departmentId, amt);
  const submit = useCallback((body: SubmitNeedRequest) => api.post<NeedDetailDto>(`/needs/${need.id}/submit`, body), [need.id]);
  const action = useAction(submit, (n: NeedDetailDto) => `${n.reference} submitted for approval`);

  return (
    <Modal open onClose={onClose} title="Submit for approval" subtitle={`${need.reference} · ${need.title}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={<Rocket size={15} />} loading={action.loading} disabled={!justification.trim() || !(amt > 0)}
            onClick={async () => { if (await action.run({ justification: justification.trim(), sourcingMethod, amount: amt })) onDone(); }}>
            Submit for approval
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Field label="Amount (ZAR)" required>
          <Input type="number" min={1} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Sourcing method" required>
          <Select value={sourcingMethod} onChange={(e) => setSourcing(e.target.value as SourcingMethod)}>
            <option value="OPEN_OPPORTUNITY">Publish to local innovators</option>
            <option value="QUOTATION">Routine purchase from existing suppliers</option>
          </Select>
        </Field>
        <Field label="Justification" required>
          <Textarea rows={3} value={justification} onChange={(e) => setJustification(e.target.value)} />
        </Field>
        <div className="rounded-xl border border-slate-200 p-4">
          <RoutingPreviewPanel preview={preview.data} error={preview.error} loading={preview.loading} amount={amt} />
        </div>
        <FormError error={action.error} />
      </div>
    </Modal>
  );
}
