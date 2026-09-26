import { useState } from 'react';
import { Ban, Bot, Check, FileText, Lightbulb, Megaphone, Sparkles, X } from 'lucide-react';
import { api } from '../../api/client';
import type { AiRequest, AiResultDto, AiTask, NeedSummaryDto, OpportunityDetailDto, OpportunitySummaryDto } from '../../api/types';
import { useAuth } from '../../app/auth';
import { AI_TASK_LABEL, AiResult, runAi } from '../../components/AiPanel';
import { Button, Callout, Card, EmptyState, ErrorBanner, Field, Grid, Loading, PageHeader, Select } from '../../components/ui';
import { money } from '../../lib/format';
import { useApi } from '../../lib/hooks';

const CAN = ['Summarise records and proposals', 'Draft opportunity text for review', 'Organise information into briefings', 'Search the solutions registry'];
const CANNOT = ['Approve or reject requests', 'Select suppliers or award work', 'Score submissions', 'Change any procurement record', 'Invent suppliers, prices or impact figures'];

export default function AiPage() {
  const { isStaff } = useAuth();
  const [result, setResult] = useState<AiResultDto | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [needId, setNeedId] = useState('');
  const [oppId, setOppId] = useState('');
  const [submissionId, setSubmissionId] = useState('');

  const needs = useApi(() => (isStaff ? api.get<NeedSummaryDto[]>('/needs') : Promise.resolve([] as NeedSummaryDto[])), [isStaff]);
  const opps = useApi(() => (isStaff ? api.get<OpportunitySummaryDto[]>('/opportunities') : Promise.resolve([] as OpportunitySummaryDto[])), [isStaff]);
  const opp = useApi(
    () => (oppId ? api.get<OpportunityDetailDto>(`/opportunities/${encodeURIComponent(oppId)}`) : Promise.resolve(null)),
    [oppId],
  );

  const go = async (task: AiTask, body: AiRequest = {}) => {
    setRunning(task);
    const r = await runAi(task, body);
    if (r) setResult(r);
    setRunning(null);
  };

  if (!isStaff) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="CIVIC AI" title="CIVIC AI" />
        <EmptyState icon={<Bot size={32} />} title="CIVIC AI is available to municipal staff" message="Providers can browse opportunities and the solutions registry directly." />
      </div>
    );
  }

  const submissions = opp.data?.submissions ?? [];
  const busy = running !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CIVIC AI"
        title="AI assists, humans decide"
        subtitle="Draft briefings, analyses and summaries grounded in CIVICFLOW records. Every output is a draft for human review and cites the records it used."
      />

      <Card title="Guardrails" icon={<Bot size={16} className="text-gold-500" />}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">CIVIC AI can</h3>
            <ul className="space-y-1.5">
              {CAN.map((c) => <li key={c} className="flex items-start gap-2 text-sm text-slate-700"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />{c}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700">CIVIC AI cannot</h3>
            <ul className="space-y-1.5">
              {CANNOT.map((c) => <li key={c} className="flex items-start gap-2 text-sm text-slate-700"><Ban size={16} className="mt-0.5 shrink-0 text-rose-600" aria-hidden />{c}</li>)}
            </ul>
          </div>
        </div>
        <div className="mt-4">
          <Callout tone="gold">If a fact is not in the platform records, CIVIC AI says so. Without an API key it runs in deterministic mode over the same records.</Callout>
        </div>
      </Card>

      <Grid cols={3}>
        <Card title="Portfolio" subtitle="Across all departments" icon={<Sparkles size={16} className="text-gold-500" />}>
          <div className="flex flex-col gap-2">
            <Button onClick={() => go('executive-briefing')} loading={running === 'executive-briefing'} disabled={busy}>{AI_TASK_LABEL['executive-briefing']}</Button>
            <Button variant="secondary" onClick={() => go('impact-summary')} loading={running === 'impact-summary'} disabled={busy}>{AI_TASK_LABEL['impact-summary']}</Button>
          </div>
        </Card>

        <Card title="A public need" subtitle="Analyse, draft an opportunity or discover solutions" icon={<Lightbulb size={16} />}>
          {needs.error ? <ErrorBanner error={needs.error} onRetry={needs.reload} /> : (
            <div className="space-y-3">
              <Field label="Public need">
                <Select value={needId} onChange={(e) => setNeedId(e.target.value)} disabled={needs.loading}>
                  <option value="">{needs.loading ? 'Loading…' : 'Choose a need'}</option>
                  {(needs.data ?? []).map((n) => <option key={n.id} value={n.id}>{n.reference} · {n.title}</option>)}
                </Select>
              </Field>
              <div className="flex flex-wrap gap-2">
                {(['need-analysis', 'opportunity-draft', 'solution-discovery'] as AiTask[]).map((t) => (
                  <Button key={t} size="sm" variant="secondary" disabled={!needId || busy} loading={running === t} onClick={() => go(t, { needId })}>
                    {AI_TASK_LABEL[t]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="A submission" subtitle="Summarise a provider's proposal" icon={<Megaphone size={16} />}>
          {opps.error ? <ErrorBanner error={opps.error} onRetry={opps.reload} /> : (
            <div className="space-y-3">
              <Field label="Opportunity">
                <Select value={oppId} onChange={(e) => { setOppId(e.target.value); setSubmissionId(''); }} disabled={opps.loading}>
                  <option value="">{opps.loading ? 'Loading…' : 'Choose an opportunity'}</option>
                  {(opps.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.reference} · {o.title} ({o.submissionCount})</option>)}
                </Select>
              </Field>
              <Field label="Submission">
                <Select value={submissionId} onChange={(e) => setSubmissionId(e.target.value)} disabled={!oppId || opp.loading || submissions.length === 0}>
                  <option value="">{!oppId ? 'Choose an opportunity first' : opp.loading ? 'Loading…' : submissions.length === 0 ? 'No submissions' : 'Choose a submission'}</option>
                  {submissions.map((s) => <option key={s.id} value={s.id}>{s.providerName} · {money(s.proposedPrice)}</option>)}
                </Select>
              </Field>
              <Button size="sm" variant="secondary" disabled={!submissionId || busy} loading={running === 'submission-summary'} onClick={() => go('submission-summary', { submissionId })}>
                {AI_TASK_LABEL['submission-summary']}
              </Button>
            </div>
          )}
        </Card>
      </Grid>

      <Card title={result ? result.title : 'Result'} icon={<FileText size={16} />}
        actions={result && <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => setResult(null)}>Clear</Button>}>
        <div aria-live="polite">
          {running ? <Loading label={`CIVIC AI is working on: ${AI_TASK_LABEL[running as AiTask]}…`} />
            : result ? <AiResult result={result} />
              : <EmptyState icon={<Sparkles size={32} />} title="No draft yet" message="Choose a task above. Results appear here, with the records used and a human-review notice." />}
        </div>
      </Card>
    </div>
  );
}
