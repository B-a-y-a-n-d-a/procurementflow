import { useCallback, useState } from 'react';
import { Send, Undo2 } from 'lucide-react';
import { api } from '../../api/client';
import type {
  AttachmentDto, CreateSubmissionRequest, OpportunityDetailDto, ReasonRequest, SolutionDto, SubmissionDto,
} from '../../api/types';
import { useUser } from '../../app/auth';
import { Button, Callout, Card, Field, Input, KeyValues, Modal, Select, StatusBadge, Textarea } from '../../components/ui';
import { dateTime, money } from '../../lib/format';
import { useAction, useApi } from '../../lib/hooks';
import { DocLinks, FormError, LinksEditor } from '../needs/formBits';
import { ReasonModal } from './parts';

/** Provider's view: their own submission, or the "Submit a solution" call to action. */
export function ProviderPanel({ opp, onChanged }: { opp: OpportunityDetailDto; onChanged: () => void }) {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const mine = opp.mySubmission;

  const withdrawFn = useCallback((id: string, body: ReasonRequest) => api.post<SubmissionDto>(`/submissions/${id}/withdraw`, body), []);
  const withdraw = useAction(withdrawFn, 'Submission withdrawn');

  const beforeDeadline = new Date(opp.submissionDeadline).getTime() > Date.now();
  const open = opp.status === 'PUBLISHED';

  if (mine) {
    const canWithdraw = open && beforeDeadline && mine.status !== 'WITHDRAWN';
    return (
      <Card title="Your submission" subtitle={`Submitted ${dateTime(mine.submittedAt)}`}
        actions={<StatusBadge status={mine.status} />}>
        <div className="space-y-4">
          {mine.statusReason && <Callout tone={mine.status === 'REJECTED' ? 'danger' : 'neutral'} title="Status note">{mine.statusReason}</Callout>}
          <KeyValues items={[
            ['Proposed price', <span key="p" className="font-semibold">{money(mine.proposedPrice)}</span>],
            ['Duration', `${mine.durationWeeks} weeks`],
            ['Local jobs declared', mine.localJobsDeclared],
            ['Linked solution', mine.solutionName ?? '—'],
          ]} />
          {mine.documents.length > 0 && <DocLinks docs={mine.documents} />}
          {canWithdraw && (
            <Button variant="secondary" icon={<Undo2 size={15} />} onClick={() => setWithdrawOpen(true)}>Withdraw</Button>
          )}
        </div>
        <ReasonModal open={withdrawOpen} title="Withdraw submission" subtitle={opp.title} label="Reason for withdrawing"
          hint="Recorded in the audit log. You can't resubmit to this opportunity afterwards."
          confirmLabel="Withdraw submission" danger loading={withdraw.loading} error={withdraw.error}
          onClose={() => setWithdrawOpen(false)}
          onConfirm={async (reason) => { const r = await withdraw.run(mine.id, { reason }); if (r) onChanged(); return !!r; }} />
      </Card>
    );
  }

  if (!open) {
    return (
      <Card title="Submissions">
        <p className="text-sm text-slate-500">This opportunity isn't accepting submissions.</p>
      </Card>
    );
  }

  return (
    <Card title="Have a solution?" subtitle="Propose how you'd solve this public problem.">
      <div className="space-y-3">
        <p className="text-sm text-slate-600">One submission per provider. You can withdraw it before the deadline.</p>
        <Button icon={<Send size={15} />} onClick={() => setSubmitOpen(true)} className="w-full">Submit a solution</Button>
      </div>
      {submitOpen && <SubmitSolutionModal opp={opp} onClose={() => setSubmitOpen(false)} onDone={() => { setSubmitOpen(false); onChanged(); }} />}
    </Card>
  );
}

function SubmitSolutionModal({ opp, onClose, onDone }: { opp: OpportunityDetailDto; onClose: () => void; onDone: () => void }) {
  const user = useUser();
  const solutions = useApi(() => api.get<SolutionDto[]>('/solutions'));
  const mySolutions = (solutions.data ?? []).filter((s) => s.providerId === user.providerId);
  const [solutionId, setSolutionId] = useState('');
  const [price, setPrice] = useState('');
  const [technical, setTechnical] = useState('');
  const [plan, setPlan] = useState('');
  const [weeks, setWeeks] = useState('12');
  const [jobs, setJobs] = useState('0');
  const [docs, setDocs] = useState<AttachmentDto[]>([]);

  const fn = useCallback((body: CreateSubmissionRequest) => api.post<SubmissionDto>(`/opportunities/${opp.id}/submissions`, body), [opp.id]);
  const action = useAction(fn, 'Solution submitted');

  const priceN = Number(price);
  const weeksN = Number(weeks);
  const jobsN = Number(jobs);
  const valid = priceN > 0 && technical.trim() && plan.trim() && Number.isInteger(weeksN) && weeksN >= 1 && Number.isInteger(jobsN) && jobsN >= 0;

  return (
    <Modal open wide onClose={onClose} title="Submit a solution" subtitle={`${opp.reference} · ${opp.title}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={<Send size={15} />} loading={action.loading} disabled={!valid}
            onClick={async () => {
              const r = await action.run({
                solutionId: solutionId || null, proposedPrice: priceN, technicalProposal: technical.trim(), implementationPlan: plan.trim(),
                durationWeeks: weeksN, localJobsDeclared: jobsN, documents: docs,
              });
              if (r) onDone();
            }}>
            Submit solution
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Field label="Link one of your registered solutions" hint={solutions.loading ? 'Loading your solutions…' : mySolutions.length === 0 ? 'You have no solutions in the registry yet (optional).' : 'Optional'}>
          <Select value={solutionId} onChange={(e) => setSolutionId(e.target.value)} disabled={mySolutions.length === 0}>
            <option value="">No linked solution</option>
            {mySolutions.map((s) => <option key={s.id} value={s.id}>{s.name}{s.isOpenSource ? ' (open source)' : ''}</option>)}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Proposed price (ZAR)" required hint={`Published budget: ${money(opp.budget)}`}>
            <Input type="number" min={1} step="0.01" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Duration (weeks)" required>
            <Input type="number" min={1} step={1} value={weeks} onChange={(e) => setWeeks(e.target.value)} />
          </Field>
          <Field label="Local jobs declared" required>
            <Input type="number" min={0} step={1} value={jobs} onChange={(e) => setJobs(e.target.value)} />
          </Field>
        </div>
        <Field label="Technical proposal" required hint="How your solution addresses the problem and required capabilities.">
          <Textarea rows={5} value={technical} onChange={(e) => setTechnical(e.target.value)} />
        </Field>
        <Field label="Implementation plan" required hint="Phases, milestones, team and how you'll measure results.">
          <Textarea rows={4} value={plan} onChange={(e) => setPlan(e.target.value)} />
        </Field>
        <div>
          <div className="mb-2 text-xs font-semibold text-slate-600">Supporting documents</div>
          <LinksEditor value={docs} onChange={setDocs} />
        </div>
        <FormError error={action.error} />
      </div>
    </Modal>
  );
}
