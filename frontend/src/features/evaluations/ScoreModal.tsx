import { useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { api } from '../../api/client';
import type { EvaluationBoardDto, EvaluationRowDto, SaveEvaluationRequest } from '../../api/types';
import { Badge, Button, Callout, ErrorBanner, Field, Input, Modal, Textarea } from '../../components/ui';
import { useAction } from '../../lib/hooks';
import { toast } from '../../app/toast';
import { money } from '../../lib/format';
import { SCORING_LABEL } from '../../lib/labels';

type Draft = Record<string, { score: string; rationale: string }>;

/** Evaluator scoring form for the MANUAL criteria of one submission. The server computes points, totals and rank. */
export function ScoreModal({ row, onClose, onSaved }: {
  row: EvaluationRowDto; onClose: () => void; onSaved: (board: EvaluationBoardDto) => void;
}) {
  const manual = row.breakdown.filter((b) => b.scoringMethod === 'MANUAL');
  const auto = row.breakdown.filter((b) => b.scoringMethod !== 'MANUAL');
  const [draft, setDraft] = useState<Draft>(() =>
    Object.fromEntries(manual.map((b) => [b.criterionId, { score: b.score != null ? String(b.score) : '', rationale: b.rationale ?? '' }])),
  );
  const [comment, setComment] = useState(row.overallComment ?? '');
  const [pending, setPending] = useState<'draft' | 'complete' | null>(null);

  const save = useAction(
    (body: SaveEvaluationRequest) => api.put<EvaluationBoardDto>(`/submissions/${row.submission.id}/evaluation`, body),
  );

  const set = (id: string, patch: Partial<{ score: string; rationale: string }>) =>
    setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const rangeError = (v: string) => {
    if (v === '') return null;
    const n = Number(v);
    return Number.isNaN(n) || n < 0 || n > 100 ? 'Enter a score from 0 to 100' : null;
  };
  const hasRangeErrors = manual.some((b) => rangeError(draft[b.criterionId]?.score ?? '') !== null);

  const submit = async (complete: boolean) => {
    setPending(complete ? 'complete' : 'draft');
    const scores = manual
      .filter((b) => draft[b.criterionId]?.score !== '')
      .map((b) => ({ criterionId: b.criterionId, score: Number(draft[b.criterionId].score), rationale: draft[b.criterionId].rationale.trim() }));
    const res = await save.run({ scores, overallComment: comment.trim() || undefined, complete });
    setPending(null);
    if (res) {
      toast.success(complete ? 'Evaluation completed — ranking updated' : 'Draft scores saved');
      onSaved(res);
    }
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={`Score ${row.submission.providerName}`}
      subtitle={`${row.submission.opportunityReference} · proposed ${money(row.submission.proposedPrice)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" icon={<Save size={16} />} loading={save.loading && pending === 'draft'} disabled={save.loading || hasRangeErrors} onClick={() => submit(false)}>
            Save draft
          </Button>
          <Button icon={<CheckCircle2 size={16} />} loading={save.loading && pending === 'complete'} disabled={save.loading || hasRangeErrors} onClick={() => submit(true)}>
            Complete evaluation
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Callout tone="info">
          Score each evaluator criterion from 0 to 100 and explain why. Automatic criteria ({auto.map((a) => a.name).join(', ') || 'none'}) are
          calculated by the rule engine and can't be edited. Completing requires every criterion below to be scored.
        </Callout>
        <ErrorBanner error={save.error} />
        {manual.length === 0 && <p className="text-sm text-slate-500">This opportunity has no evaluator-scored criteria.</p>}
        {manual.map((b) => {
          const d = draft[b.criterionId];
          const err = rangeError(d.score);
          return (
            <fieldset key={b.criterionId} className="rounded-xl border border-slate-200 p-4">
              <legend className="px-1 text-sm font-semibold text-slate-900">{b.name}</legend>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <Badge tone="neutral">{SCORING_LABEL[b.scoringMethod]}</Badge>
                <Badge tone="brand">Weight {b.weightPct}%</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                <Field label="Score (0–100)" required error={err}>
                  <Input type="number" min={0} max={100} step={1} inputMode="numeric" value={d.score}
                    onChange={(e) => set(b.criterionId, { score: e.target.value })} aria-invalid={!!err} />
                </Field>
                <Field label="Rationale" required hint="Recorded with the score and visible on the board and audit trail.">
                  <Textarea rows={2} value={d.rationale} onChange={(e) => set(b.criterionId, { rationale: e.target.value })}
                    placeholder="What in the proposal supports this score?" />
                </Field>
              </div>
            </fieldset>
          );
        })}
        <Field label="Overall comment" hint="Optional summary for the evaluation record.">
          <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
