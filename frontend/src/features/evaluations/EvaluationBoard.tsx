import { useEffect, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, Award, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, ExternalLink, Gavel, ListChecks,
  MapPin, PenLine, Scale, Sparkles, UserCheck,
} from 'lucide-react';
import { api } from '../../api/client';
import type {
  AiResultDto, EvaluationBoardDto, EvaluationRowDto, PurchaseOrderDto, ScoreBreakdownDto, SelectRequest,
} from '../../api/types';
import { useAuth } from '../../app/auth';
import { Link } from '../../app/router';
import { AiResult, runAi } from '../../components/AiPanel';
import {
  Badge, Button, Callout, Card, EmptyState, ErrorBanner, Loading, Modal, Mono, PageHeader, StatusBadge, Textarea,
} from '../../components/ui';
import { useAction, useApi } from '../../lib/hooks';
import { date, money } from '../../lib/format';
import { bbbee, PROVIDER_TYPE_LABEL, SCORING_LABEL } from '../../lib/labels';
import { ScoreModal as ScoreModalHost } from './ScoreModal';

/** Score formatting: keep the server's precision, show at most 2 decimals. */
const score = (v: number | null | undefined, digits = 2) => (v === null || v === undefined ? '—' : Number(v).toFixed(digits));
const shortScore = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : Number.isInteger(v) ? String(v) : Number(v).toFixed(1);

/** Distinct (non-semantic) colours for the per-criterion contribution bar. Legend + table carry the meaning. */
const SEGMENT = ['bg-brand-600', 'bg-sky-500', 'bg-gold-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-400', 'bg-slate-500'];

export default function EvaluationBoard({ id }: { id: string }) {
  const { has } = useAuth();
  const board = useApi(() => api.get<EvaluationBoardDto>(`/opportunities/${id}/evaluation`), [id]);
  const [scoring, setScoring] = useState<EvaluationRowDto | null>(null);
  const [aiFor, setAiFor] = useState<EvaluationRowDto | null>(null);

  if (board.loading && !board.data) return <Loading label="Loading evaluation board…" />;
  if (board.error && !board.data) return <ErrorBanner error={board.error} onRetry={board.reload} />;
  const b = board.data;
  if (!b) return null;

  const opp = b.opportunity;
  const inEvaluation = opp.status === 'EVALUATION';
  const canScore = has('PROCUREMENT_OFFICER', 'EVALUATOR');
  const canSelect = has('PROCUREMENT_OFFICER') && inEvaluation && !b.purchaseOrder;
  const criteriaIndex = new Map<string, number>(b.criteria.map((c, i) => [c.key, i] as [string, number]));
  const eligibleCount = b.rows.filter((r) => r.eligible).length;
  const evaluatedCount = b.rows.filter((r) => r.eligible && r.evaluationStatus === 'COMPLETED').length;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/evaluations" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700">
          <ArrowLeft size={14} /> All evaluations
        </Link>
        <PageHeader
          eyebrow={<span className="flex items-center gap-2"><Mono className="text-brand-700">{opp.reference}</Mono> · Evaluation board</span>}
          title={opp.title}
          subtitle={`${opp.departmentName} · budget ${money(opp.budget)} · ${opp.submissionCount} submissions · closed ${date(opp.submissionDeadline)}`}
          actions={
            <>
              <StatusBadge status={opp.status} />
              <Link to={`/opportunities/${opp.id}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">
                Opportunity <ExternalLink size={12} />
              </Link>
              <Link to={`/needs/${opp.needId}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">
                Need {opp.needReference} <ExternalLink size={12} />
              </Link>
            </>
          }
        />
      </div>

      <Callout tone="gold" icon={<Scale size={16} />} title="The system recommends. A human decides.">
        The rule engine ranks submissions by the published, weighted criteria and flags a recommendation. It never selects. The
        Procurement Officer decides, and any deviation from the recommendation must be justified and is flagged on the PO.
      </Callout>

      <div className="grid gap-3 md:grid-cols-2">
        <MinOffersCallout b={b} />
        {b.allEvaluated ? (
          <Callout tone="success" icon={<CheckCircle2 size={16} />} title="All eligible submissions evaluated">
            {evaluatedCount} of {eligibleCount} eligible submissions have completed evaluations. The ranking is final for selection.
          </Callout>
        ) : (
          <Callout tone="warning" icon={<ClipboardCheck size={16} />} title="Evaluation in progress">
            {evaluatedCount} of {eligibleCount} eligible submissions completed. Selection is blocked until every eligible submission is
            evaluated.
          </Callout>
        )}
      </div>

      {b.purchaseOrder && <AwardCard po={b.purchaseOrder} />}

      <Card title="Published criteria" subtitle="Weights were published with the opportunity and can't change during evaluation." icon={<ListChecks size={16} />}>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {b.criteria.map((c, i) => (
            <li key={c.id ?? c.key} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
              <span className={`h-3 w-3 shrink-0 rounded-sm ${SEGMENT[i % SEGMENT.length]}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800">{c.name}</span>
                <span className="block text-[11px] text-slate-500">{SCORING_LABEL[c.scoringMethod]}</span>
              </span>
              <span className="text-sm font-bold text-slate-900">{c.weightPct}%</span>
            </li>
          ))}
        </ul>
      </Card>

      <section aria-labelledby="ranking-h">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="ranking-h" className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Award size={16} className="text-brand-600" /> Ranking</h2>
          <span className="text-xs text-slate-500">Sorted by the rule engine</span>
        </div>
        {b.rows.length === 0 ? (
          <EmptyState title="No submissions" message="No provider submitted a proposal for this opportunity." />
        ) : (
          <div className="space-y-3">
            {b.rows.map((row) => (
              <RankRow
                key={row.submission.id}
                row={row}
                criteriaIndex={criteriaIndex}
                canScore={canScore && inEvaluation && row.eligible && row.evaluationStatus !== 'COMPLETED'}
                onScore={() => setScoring(row)}
                onAi={() => setAiFor(row)}
              />
            ))}
          </div>
        )}
      </section>

      {canSelect && <SelectionPanel b={b} onSelected={() => void board.reload()} />}

      {scoring && (
        <ScoreModalHost row={scoring} onClose={() => setScoring(null)} onSaved={(nb) => { board.setData(nb); setScoring(null); }} />
      )}
      {aiFor && <AiSummaryModal row={aiFor} onClose={() => setAiFor(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ callouts & award */

function MinOffersCallout({ b }: { b: EvaluationBoardDto }) {
  const m = b.minOffers;
  if (!m.applies) {
    return (
      <Callout tone="neutral" icon={<Gavel size={16} />} title="Minimum offers rule not applicable">
        Budget is at or below the {money(m.threshold)} quotation threshold, so the minimum of {m.minimum} competitive offers doesn't apply.
      </Callout>
    );
  }
  return m.satisfied ? (
    <Callout tone="success" icon={<Gavel size={16} />} title={`Minimum offers met: ${m.count} of ${m.minimum}`}>
      Above {money(m.threshold)}, the organisation's rules require at least {m.minimum} eligible offers. This opportunity has {m.count}.
    </Callout>
  ) : (
    <Callout tone="danger" icon={<AlertTriangle size={16} />} title={`Minimum offers not met: ${m.count} of ${m.minimum}`}>
      Above {money(m.threshold)}, at least {m.minimum} eligible offers are required. Selection is blocked (MIN_OFFERS_NOT_MET).
    </Callout>
  );
}

function AwardCard({ po }: { po: PurchaseOrderDto }) {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><CheckCircle2 size={22} /></div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Awarded</div>
            <h2 className="text-lg font-bold text-slate-900">Awarded to {po.supplierName}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <Mono className="text-slate-700">{po.poNumber}</Mono>
              <span>·</span>
              <span className="font-semibold">{money(po.amount)}</span>
              <StatusBadge status={po.status} />
              {po.isDeviation && <Badge tone="warning" title={po.deviationJustification ?? undefined}><AlertTriangle size={11} /> Deviation</Badge>}
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Selected by {po.selectedByName ?? '—'} on {date(po.selectedAt)}. The provider was onboarded as a Supplier
              {po.supplierStatus === 'PENDING_VERIFICATION' ? ' pending verification' : ''} (<StatusBadge status={po.supplierStatus} />). The PO
              can be issued once the supplier is verified.
            </p>
            {po.isDeviation && po.deviationJustification && (
              <blockquote className="mt-2 border-l-2 border-amber-300 pl-3 text-xs italic text-slate-600">“{po.deviationJustification}”</blockquote>
            )}
          </div>
        </div>
        <Link to="/procurement" className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
          Go to procurement <ExternalLink size={14} />
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ ranking row */

function RankRow({ row, criteriaIndex, canScore, onScore, onAi }: {
  row: EvaluationRowDto; criteriaIndex: Map<string, number>; canScore: boolean; onScore: () => void; onAi: () => void;
}) {
  const [open, setOpen] = useState(row.isRecommended);
  const s = row.submission;
  const panelId = `bd-${s.id}`;
  return (
    <article className={`overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${row.isRecommended ? 'border-gold-400 ring-1 ring-gold-100' : 'border-slate-200/80'} ${row.eligible ? '' : 'opacity-75'}`}>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${row.rank === 1 ? 'bg-gold-500 text-slate-900' : 'bg-slate-100 text-slate-700'}`}
            aria-label={row.rank ? `Rank ${row.rank}` : 'Unranked'}>
            {row.rank ? `#${row.rank}` : '—'}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/providers/${s.providerId}`} className="truncate text-base font-semibold text-slate-900 hover:text-brand-700">{s.providerName}</Link>
              {row.isRecommended && <Badge tone="gold"><Award size={11} /> Recommended by rule engine</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>{PROVIDER_TYPE_LABEL[s.providerType]}</span>
              <span aria-hidden>·</span>
              <span>B-BBEE {bbbee(s.providerBbbeeLevel)}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-0.5"><MapPin size={11} />{s.providerMunicipality}, {s.providerProvince}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={s.status} />
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">Evaluation <StatusBadge status={row.evaluationStatus} /></span>
              {!row.eligible && <Badge tone="danger" title={s.statusReason ?? undefined}>Not eligible</Badge>}
              {row.evaluatorName && <span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><UserCheck size={11} />{row.evaluatorName}</span>}
            </div>
            {!row.eligible && s.statusReason && <p className="mt-1 text-xs text-rose-700">{s.statusReason}</p>}
          </div>
        </div>
        <div className="flex items-end justify-between gap-6 sm:justify-end">
          <div className="text-left sm:text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Price</div>
            <div className="text-sm font-semibold text-slate-800">{money(s.proposedPrice)}</div>
            {s.solutionName && <div className="max-w-[12rem] truncate text-[11px] text-slate-500">{s.solutionName}</div>}
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total score</div>
            <div className={`text-3xl font-extrabold tabular-nums tracking-tight ${row.isRecommended ? 'text-brand-700' : 'text-slate-900'}`}>
              {score(row.totalScore)}
            </div>
            <div className="text-[11px] text-slate-400">out of 100</div>
          </div>
        </div>
      </div>

      <ContributionBar breakdown={row.breakdown} criteriaIndex={criteriaIndex} />

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 sm:px-5">
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={panelId}
          icon={open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}>
          {open ? 'Hide' : 'Show'} score breakdown
        </Button>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={<Sparkles size={14} className="text-gold-500" />} onClick={onAi}>CIVIC AI summary</Button>
          {canScore && <Button size="sm" icon={<PenLine size={14} />} onClick={onScore}>Score</Button>}
        </div>
      </div>

      {open && (
        <div id={panelId} className="border-t border-slate-100">
          <BreakdownTable breakdown={row.breakdown} criteriaIndex={criteriaIndex} total={row.totalScore} />
          {row.overallComment && (
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-600"><span className="font-semibold text-slate-700">Evaluator comment:</span> {row.overallComment}</p>
          )}
        </div>
      )}
    </article>
  );
}

function ContributionBar({ breakdown, criteriaIndex }: { breakdown: ScoreBreakdownDto[]; criteriaIndex: Map<string, number> }) {
  return (
    <div className="px-4 pb-4 sm:px-5">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>
        {breakdown.map((c) => (
          <div key={c.criterionId} className={`${SEGMENT[(criteriaIndex.get(c.key) ?? 0) % SEGMENT.length]} h-full border-r border-white/70 last:border-r-0`}
            style={{ width: `${Math.max(0, c.points ?? 0)}%` }} title={`${c.name}: ${score(c.points)} pts`} />
        ))}
      </div>
    </div>
  );
}

function BreakdownTable({ breakdown, criteriaIndex, total }: { breakdown: ScoreBreakdownDto[]; criteriaIndex: Map<string, number>; total?: number | null }) {
  const dot = (c: ScoreBreakdownDto) => <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-sm ${SEGMENT[(criteriaIndex.get(c.key) ?? 0) % SEGMENT.length]}`} aria-hidden />;
  return (
    <>
      {/* Desktop / tablet: full transparency table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Score breakdown per criterion</caption>
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-5 py-2">Criterion</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2 text-right">Weight</th>
              <th className="px-3 py-2 text-right">Score</th>
              <th className="px-3 py-2 text-right">Points</th>
              <th className="px-3 py-2">Basis</th>
              <th className="px-5 py-2">Rationale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {breakdown.map((c) => (
              <tr key={c.criterionId} className="align-top">
                <td className="px-5 py-2.5 font-medium text-slate-800"><span className="flex items-center gap-2">{dot(c)}{c.name}</span></td>
                <td className="px-3 py-2.5"><Badge tone={c.scoringMethod === 'MANUAL' ? 'info' : 'neutral'}>{SCORING_LABEL[c.scoringMethod]}</Badge></td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{c.weightPct}%</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{c.score == null ? <span className="text-slate-400">not scored</span> : shortScore(c.score)}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-brand-700">{score(c.points)}</td>
                <td className="px-3 py-2.5 text-xs text-slate-600">{c.basis}</td>
                <td className="px-5 py-2.5 text-xs text-slate-600">{c.rationale ?? <span className="text-slate-400">—</span>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50/60">
              <td className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500" colSpan={4}>Weighted total</td>
              <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-900">{score(total)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      {/* Mobile: stacked list */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {breakdown.map((c) => (
          <li key={c.criterionId} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-800">{dot(c)}{c.name}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">{SCORING_LABEL[c.scoringMethod]} · weight {c.weightPct}%</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-bold tabular-nums text-slate-900">{c.score == null ? '—' : shortScore(c.score)}<span className="text-xs font-normal text-slate-400">/100</span></div>
                <div className="text-[11px] font-semibold tabular-nums text-brand-700">{score(c.points)} pts</div>
              </div>
            </div>
            <div className="mt-1.5 text-xs text-slate-600">{c.basis}</div>
            {c.rationale && <div className="mt-1 text-xs italic text-slate-500">“{c.rationale}”</div>}
          </li>
        ))}
        <li className="flex justify-between px-4 py-2.5 text-sm font-semibold"><span className="text-slate-500">Weighted total</span><span className="tabular-nums">{score(total)}</span></li>
      </ul>
    </>
  );
}

/* ------------------------------------------------------------------ selection */

function SelectionPanel({ b, onSelected }: { b: EvaluationBoardDto; onSelected: () => void }) {
  const eligible = b.rows.filter((r) => r.eligible);
  const [chosen, setChosen] = useState<string | null>(b.recommendedSubmissionId ?? null);
  const [justification, setJustification] = useState('');
  useEffect(() => {
    // Pre-select the recommendation once the rule engine produces one (e.g. after the last evaluation completes).
    if (b.recommendedSubmissionId) setChosen((c) => c ?? b.recommendedSubmissionId ?? null);
  }, [b.recommendedSubmissionId]);
  const select = useAction(
    (body: SelectRequest) => api.post<PurchaseOrderDto>(`/opportunities/${b.opportunity.id}/select`, body),
    (po) => `${po.supplierName} selected — ${po.poNumber} created as a draft PO`,
  );

  const isDeviation = !!chosen && chosen !== b.recommendedSubmissionId;
  const len = justification.trim().length;
  const blockers: string[] = [];
  if (!b.allEvaluated) blockers.push('Every eligible submission must have a completed evaluation.');
  if (!b.minOffers.satisfied) blockers.push(`At least ${b.minOffers.minimum} eligible offers are required (currently ${b.minOffers.count}).`);
  if (!chosen) blockers.push('Choose a submission.');

  const submit = async () => {
    if (!chosen) return;
    const po = await select.run({ submissionId: chosen, justification: isDeviation ? justification.trim() : undefined });
    if (po) onSelected();
  };

  return (
    <Card title="Selection decision" subtitle="Made by the Procurement Officer. The rule engine's recommendation is pre-selected." icon={<Gavel size={16} />}>
      <div className="space-y-4">
        <fieldset>
          <legend className="sr-only">Choose the submission to award</legend>
          <div className="space-y-2">
            {eligible.map((r) => {
              const active = chosen === r.submission.id;
              return (
                <label key={r.submission.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${active ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-200' : 'border-slate-200 hover:border-brand-300'}`}>
                  <input type="radio" name="selection" className="h-4 w-4 accent-brand-600" checked={active}
                    onChange={() => { setChosen(r.submission.id); select.clearError(); }} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{r.rank ? `#${r.rank} ` : ''}{r.submission.providerName}</span>
                      {r.isRecommended && <Badge tone="gold"><Award size={11} /> Recommended</Badge>}
                    </span>
                    <span className="block text-xs text-slate-500">{money(r.submission.proposedPrice)} · score {score(r.totalScore)}</span>
                  </span>
                  <StatusBadge status={r.evaluationStatus} />
                </label>
              );
            })}
          </div>
        </fieldset>

        {isDeviation && (
          <div className="space-y-2">
            <Callout tone="warning" icon={<AlertTriangle size={16} />} title="Deviation from the recommendation">
              A justification of at least {b.deviationMinChars} characters is required and the PO will be flagged.
            </Callout>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">Justification <span className="text-rose-500" aria-hidden>*</span></span>
              <Textarea rows={3} value={justification} onChange={(e) => setJustification(e.target.value)}
                placeholder="Why is this submission preferred over the recommended one?" aria-describedby="just-count" />
              <span id="just-count" className={`mt-1 block text-right text-[11px] font-medium ${len >= b.deviationMinChars ? 'text-emerald-700' : 'text-rose-600'}`}>
                {len} / {b.deviationMinChars} characters minimum
              </span>
            </label>
          </div>
        )}

        <ErrorBanner error={select.error} />

        {blockers.length > 0 && chosen && (
          <ul className="space-y-1 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
            {blockers.map((x) => <li key={x} className="flex gap-2"><AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-600" />{x}</li>)}
          </ul>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">Creates a draft PO and onboards the provider as a supplier (pending verification). Audited.</p>
          <Button onClick={submit} loading={select.loading} disabled={blockers.length > 0} icon={<Gavel size={16} />}>
            Select &amp; create PO
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ AI */

function AiSummaryModal({ row, onClose }: { row: EvaluationRowDto; onClose: () => void }) {
  const [result, setResult] = useState<AiResultDto | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    void runAi('submission-summary', { submissionId: row.submission.id }).then((r) => {
      if (alive) { setResult(r); setLoading(false); }
    });
    return () => { alive = false; };
  }, [row.submission.id]);
  return (
    <Modal open wide onClose={onClose} title={`CIVIC AI · ${row.submission.providerName}`} subtitle="Summarises the proposal. It does not score or select."
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      {loading && <Loading label="CIVIC AI is reading the submission…" />}
      {!loading && result && <AiResult result={result} />}
      {!loading && !result && <EmptyState title="No summary available" message="CIVIC AI couldn't produce a summary. See the error message." />}
    </Modal>
  );
}
