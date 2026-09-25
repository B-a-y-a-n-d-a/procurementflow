import { Fragment, useCallback, useState } from 'react';
import { AlertTriangle, Building2, Check, Inbox, Info, ShieldAlert, UserRound, Wallet, X } from 'lucide-react';
import { api } from '../../api/client';
import type { DecisionRequest, PurchaseRequestDto } from '../../api/types';
import { useAuth } from '../../app/auth';
import { Link, navigate } from '../../app/router';
import {
  Badge, Button, Callout, Card, DataTable, EmptyState, ErrorBanner, Field, Loading, Modal, Mono, PageHeader, StatusBadge, Tabs, Textarea,
  type Column,
} from '../../components/ui';
import { money, relative } from '../../lib/format';
import { useAction, useApi } from '../../lib/hooks';
import { ROLE_LABEL, SOURCING_LABEL } from '../../lib/labels';
import { FormError } from '../needs/formBits';
import { ApprovalSteps, SlaBadge } from './ApprovalSteps';

type TabKey = 'inbox' | 'all';
type Decision = { kind: 'approve' | 'reject'; request: PurchaseRequestDto; stepId: string };

export default function Approvals() {
  const { has } = useAuth();
  const inboxAllowed = has('DEPARTMENT_MANAGER', 'FINANCE_DIRECTOR', 'EXECUTIVE');
  const [tab, setTab] = useState<TabKey>(inboxAllowed ? 'inbox' : 'all');
  const inbox = useApi(() => (inboxAllowed ? api.get<PurchaseRequestDto[]>('/approvals/inbox') : Promise.resolve([] as PurchaseRequestDto[])), [inboxAllowed]);
  const all = useApi(() => api.get<PurchaseRequestDto[]>('/requests'));
  const [decision, setDecision] = useState<Decision | null>(null);

  const escalateFn = useCallback((stepId: string) => api.post<PurchaseRequestDto>(`/approvals/${stepId}/escalate`), []);
  const escalate = useAction(escalateFn, (r: PurchaseRequestDto) => `${r.reference} escalated`);
  const [escalatingId, setEscalatingId] = useState<string | null>(null);

  const reloadAll = () => { void inbox.reload(); void all.reload(); };

  const actionable = (inbox.data ?? []).filter((r) => r.actionableStepId).length;

  return (
    <div>
      <PageHeader
        eyebrow="Approvals"
        title="Approvals"
        subtitle="Budget requests routed by the organisational rule set. Every decision, comment and escalation is audited."
      />

      <Tabs<TabKey>
        tabs={[
          ...(inboxAllowed ? [{ key: 'inbox' as const, label: 'My approvals', count: inbox.data ? actionable : undefined }] : []),
          { key: 'all', label: 'All requests', count: all.data?.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'inbox' && inboxAllowed ? (
        <div className="space-y-4">
          <Callout tone="info" icon={<Info size={16} />} title="Segregation of duties">
            You can't approve a request you raised yourself, and managers only approve for their own department. The server enforces
            this and will refuse the decision (SEGREGATION_OF_DUTIES).
            {has('EXECUTIVE') && ' As an executive you see escalated requests read-only.'}
          </Callout>
          {inbox.loading && !inbox.data ? <Loading label="Loading your approvals…" /> : inbox.error ? (
            <ErrorBanner error={inbox.error} onRetry={inbox.reload} />
          ) : (inbox.data ?? []).length === 0 ? (
            <EmptyState icon={<Inbox size={32} />} title="Nothing waiting for you" message="New requests appear here when it's your step in the approval route." />
          ) : (
            inbox.data!.map((r) => {
              const step = r.steps.find((s) => s.id === r.actionableStepId) ?? null;
              const pendingStep = step ?? r.steps.find((s) => s.status === 'PENDING') ?? null;
              const overdue = pendingStep?.sla.state === 'OVERDUE';
              return (
                <Fragment key={r.id}><Card className={overdue ? 'border-rose-200' : ''}>
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Mono>{r.reference}</Mono>
                        <StatusBadge status={r.status} />
                        {pendingStep && <SlaBadge sla={pendingStep.sla} />}
                        {pendingStep?.escalatedAt && <Badge tone="warning"><AlertTriangle size={11} /> Escalated</Badge>}
                        {!r.actionableStepId && <Badge tone="neutral">Read-only</Badge>}
                      </div>
                      <Link to={`/needs/${r.needId}`} className="block break-words text-lg font-semibold text-slate-900 hover:text-brand-700">{r.needTitle}</Link>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1.5"><Building2 size={14} /> {r.departmentName}</span>
                        <span className="inline-flex items-center gap-1.5"><UserRound size={14} /> {r.requestedByName}</span>
                        <span>Submitted {relative(r.submittedAt)}</span>
                      </div>
                      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Amount</dt>
                          <dd className="mt-0.5 text-base font-bold text-slate-900">{money(r.amount)}</dd>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Budget at submission</dt>
                          <dd className="mt-0.5 text-base font-bold text-slate-900">{money(r.budgetAvailableSnapshot)}</dd>
                        </div>
                        <div className="col-span-2 rounded-xl bg-slate-50 p-3 sm:col-span-1">
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sourcing</dt>
                          <dd className="mt-0.5 text-sm font-semibold text-slate-800">{SOURCING_LABEL[r.sourcingMethod]}</dd>
                        </div>
                      </dl>
                      {r.justification && <p className="whitespace-pre-line text-sm text-slate-600"><span className="font-semibold text-slate-700">Justification: </span>{r.justification}</p>}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {step && (
                          <>
                            <Button icon={<Check size={16} />} onClick={() => setDecision({ kind: 'approve', request: r, stepId: step.id })}>Approve</Button>
                            <Button variant="secondary" icon={<X size={16} />} onClick={() => setDecision({ kind: 'reject', request: r, stepId: step.id })} className="text-rose-700">Reject</Button>
                          </>
                        )}
                        {pendingStep && overdue && !pendingStep.escalatedAt && (
                          <Button variant="gold" icon={<ShieldAlert size={16} />} loading={escalate.loading && escalatingId === pendingStep.id}
                            onClick={async () => { setEscalatingId(pendingStep.id); if (await escalate.run(pendingStep.id)) reloadAll(); setEscalatingId(null); }}>
                            Escalate
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Approval route · rule set v{r.ruleSetVersion}</div>
                      <ApprovalSteps steps={r.steps} highlightId={r.actionableStepId} />
                    </div>
                  </div>
                </Card></Fragment>
              );
            })
          )}
        </div>
      ) : (
        <AllRequests loading={all.loading && !all.data} error={all.error} rows={all.data ?? []} onRetry={all.reload} />
      )}

      {decision && (
        <DecisionModal decision={decision} onClose={() => setDecision(null)} onDone={() => { setDecision(null); reloadAll(); }} />
      )}
    </div>
  );
}

function AllRequests({ loading, error, rows, onRetry }: {
  loading: boolean; error: Parameters<typeof ErrorBanner>[0]['error']; rows: PurchaseRequestDto[]; onRetry: () => void;
}) {
  if (loading) return <Loading label="Loading requests…" />;
  if (error) return <ErrorBanner error={error} onRetry={onRetry} />;
  const current = (r: PurchaseRequestDto) => r.steps.find((s) => s.status === 'PENDING') ?? null;
  const columns: Column<PurchaseRequestDto>[] = [
    { key: 'ref', header: 'Reference', render: (r) => <Mono>{r.reference}</Mono>, className: 'whitespace-nowrap' },
    { key: 'need', header: 'Need', render: (r) => <span className="font-medium text-slate-900">{r.needTitle}</span>, className: 'min-w-[200px]' },
    { key: 'dept', header: 'Department', render: (r) => <span className="text-slate-600">{r.departmentName}</span>, className: 'min-w-[140px]' },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="whitespace-nowrap font-medium">{money(r.amount)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'step', header: 'Current step', render: (r) => { const s = current(r); return s ? <span className="whitespace-nowrap text-slate-700">{ROLE_LABEL[s.requiredRole]}</span> : <span className="text-slate-400">—</span>; } },
    { key: 'sla', header: 'SLA', render: (r) => { const s = current(r); return s ? <SlaBadge sla={s.sla} /> : <span className="text-slate-400">—</span>; } },
  ];
  return (
    <Card padded={false}>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/needs/${r.needId}`)}
        empty={<div className="p-4"><EmptyState icon={<Wallet size={32} />} title="No purchase requests yet" /></div>} />
    </Card>
  );
}

function DecisionModal({ decision, onClose, onDone }: { decision: Decision; onClose: () => void; onDone: () => void }) {
  const [comment, setComment] = useState('');
  const approve = decision.kind === 'approve';
  const fn = useCallback(
    (body: DecisionRequest) => api.post<PurchaseRequestDto>(`/approvals/${decision.stepId}/${decision.kind}`, body),
    [decision.stepId, decision.kind],
  );
  const action = useAction(fn, (r: PurchaseRequestDto) => `${r.reference} ${approve ? 'approved' : 'rejected'}`);
  const r = decision.request;
  return (
    <Modal open onClose={onClose}
      title={approve ? 'Approve request' : 'Reject request'}
      subtitle={`${r.reference} · ${r.needTitle} · ${money(r.amount)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={approve ? 'primary' : 'danger'} icon={approve ? <Check size={15} /> : <X size={15} />} loading={action.loading}
            disabled={!approve && !comment.trim()}
            onClick={async () => { if (await action.run({ comment: comment.trim() || undefined })) onDone(); }}>
            {approve ? 'Approve' : 'Reject'}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Field label={approve ? 'Comment (optional)' : 'Reason for rejection'} required={!approve}
          hint={approve ? 'Recorded on the approval step and in the audit log.' : 'Required. The requester sees this reason.'}>
          <Textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} autoFocus />
        </Field>
        <FormError error={action.error} />
      </div>
    </Modal>
  );
}
