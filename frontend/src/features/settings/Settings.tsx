import React, { useEffect, useState } from 'react';
import { History, Info, Lock, Plus, RotateCcw, Save, Scale, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import type { ApprovalBandDto, CriterionDto, CriterionKey, RuleSetDto, ScoringMethod, UserRole } from '../../api/types';
import { useAuth } from '../../app/auth';
import {
  Badge, Button, Callout, Card, Checkbox, ErrorBanner, Field, Grid, Input, KeyValues, Loading, PageHeader, Select,
} from '../../components/ui';
import { dateTime, money } from '../../lib/format';
import { useAction, useApi } from '../../lib/hooks';
import { CRITERION_LABEL, ROLE_LABEL, SCORING_LABEL } from '../../lib/labels';

const BAND_ROLES: UserRole[] = ['DEPARTMENT_MANAGER', 'FINANCE_DIRECTOR', 'EXECUTIVE'];
const ESCALATION_ROLES = (Object.keys(ROLE_LABEL) as UserRole[]).filter((r) => r !== 'SYSTEM' && r !== 'PROVIDER');
const BBBEE_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '0'];
const CRITERION_KEYS = Object.keys(CRITERION_LABEL) as CriterionKey[];
const SCORING_METHODS = Object.keys(SCORING_LABEL) as ScoringMethod[];

/** Number input bound to a number (blank → null when `nullable`). */
function NumberInput({ value, onChange, nullable, disabled, min, step, label, placeholder, className }: {
  value: number | null | undefined; onChange: (v: number | null) => void; nullable?: boolean; disabled?: boolean;
  min?: number; step?: number; label?: string; placeholder?: string; className?: string;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      aria-label={label}
      value={value === null || value === undefined ? '' : String(value)}
      min={min}
      step={step}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') onChange(nullable ? null : 0);
        else if (!Number.isNaN(Number(raw))) onChange(Number(raw));
      }}
    />
  );
}

export default function Settings() {
  const { has } = useAuth();
  const isAdmin = has('ADMIN');
  const { data, error, loading, reload, setData } = useApi(() => api.get<RuleSetDto>('/rules'));
  const [draft, setDraft] = useState<RuleSetDto | null>(null);

  useEffect(() => {
    if (data) setDraft(structuredClone(data));
  }, [data]);

  const save = useAction((body: RuleSetDto) => api.put<RuleSetDto>('/rules', body), (r) => `Business rules saved as version ${r.version ?? ''}`.trim());

  if (loading && !data) return <Loading label="Loading business rules…" />;
  if (error && !data) return <ErrorBanner error={error} onRetry={reload} />;
  if (!data || !draft) return null;

  const ro = !isAdmin;
  const set = <K extends keyof RuleSetDto>(k: K, v: RuleSetDto[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const setBand = (i: number, patch: Partial<ApprovalBandDto>) =>
    set('approvalBands', draft.approvalBands.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const setCrit = (i: number, patch: Partial<CriterionDto>) =>
    set('defaultCriteria', draft.defaultCriteria.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const totalWeight = draft.defaultCriteria.reduce((s, c) => s + (Number(c.weightPct) || 0), 0);
  const weightOk = Math.abs(totalWeight - 100) < 0.001;
  const dirty = JSON.stringify(draft) !== JSON.stringify(data);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightOk || ro) return;
    const r = await save.run(draft);
    if (r) setData(r);
  };

  const th = 'px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400';
  const td = 'px-2 py-2 align-top';

  return (
    <form onSubmit={onSave} className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Business rules"
        subtitle="Approval routing, SLAs, sourcing thresholds and evaluation scoring, all in one versioned rule set."
        actions={isAdmin && (
          <>
            <Button type="button" variant="secondary" icon={<RotateCcw size={16} />} disabled={!dirty || save.loading} onClick={() => setDraft(structuredClone(data))}>Discard</Button>
            <Button type="submit" icon={<Save size={16} />} loading={save.loading} disabled={!dirty || !weightOk}>Save new version</Button>
          </>
        )}
      />

      <Callout tone="info" icon={<Info size={16} />} title="Organisational rules, not legal statements">
        These are configurable rules set by this organisation. Saving creates a new version; it applies to new transactions only, and existing
        requests keep the version they were submitted under.
      </Callout>
      {ro && (
        <Callout tone="neutral" icon={<Lock size={16} />}>Read-only view. Only an Administrator can change business rules.</Callout>
      )}

      <Card title="Current version" icon={<History size={16} />}>
        <KeyValues cols={3} items={[
          ['Version', data.version !== undefined ? <Badge tone="brand">v{data.version}</Badge> : '—'],
          ['Effective from', dateTime(data.effectiveFrom)],
          ['Updated by', data.updatedByName ?? '—'],
        ]} />
      </Card>

      <fieldset disabled={ro} className="space-y-6">
        <Grid cols={2}>
          <Card title="Approvals & budget" icon={<Scale size={16} />}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Approval SLA (hours)" hint="Time each approver has before a step is overdue">
                <NumberInput value={draft.approvalSlaHours} min={1} onChange={(v) => set('approvalSlaHours', v ?? 0)} />
              </Field>
              <Field label="Escalation role" hint="Notified when an approval breaches its SLA">
                <Select value={draft.escalationRole} onChange={(e) => set('escalationRole', e.target.value as UserRole)}>
                  {ESCALATION_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </Select>
              </Field>
              <Field label="Budget mode" hint="BLOCK stops over-budget requests; WARN allows them with a warning">
                <Select value={draft.budgetMode} onChange={(e) => set('budgetMode', e.target.value as 'BLOCK' | 'WARN')}>
                  <option value="BLOCK">Block over-budget requests</option>
                  <option value="WARN">Warn only</option>
                </Select>
              </Field>
              <Field label="Deviation justification (min. characters)" hint="Required when the selected option is not the recommended one">
                <NumberInput value={draft.deviationMinChars} min={0} onChange={(v) => set('deviationMinChars', v ?? 0)} />
              </Field>
            </div>
          </Card>

          <Card title="Sourcing & monitoring">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Quotation threshold (R)" hint={`Currently ${money(draft.quotationThreshold)}`}>
                <NumberInput value={draft.quotationThreshold} min={0} onChange={(v) => set('quotationThreshold', v ?? 0)} />
              </Field>
              <Field label="Minimum competitive offers" hint="Applies above the quotation threshold">
                <NumberInput value={draft.minCompetitiveOffers} min={0} onChange={(v) => set('minCompetitiveOffers', v ?? 0)} />
              </Field>
              <Field label="'Closing soon' window (days)">
                <NumberInput value={draft.closingSoonDays} min={0} onChange={(v) => set('closingSoonDays', v ?? 0)} />
              </Field>
              <Field label="Impact 'on track' threshold (%)" hint="Share of baseline → target covered">
                <NumberInput value={draft.impactOnTrackPct} min={0} onChange={(v) => set('impactOnTrackPct', v ?? 0)} />
              </Field>
            </div>
          </Card>
        </Grid>

        <Card title="Approval bands" subtitle="Who must approve, by request amount. No roles selected = auto-approved."
          actions={!ro && (
            <Button type="button" size="sm" variant="secondary" icon={<Plus size={14} />}
              onClick={() => set('approvalBands', [...draft.approvalBands, { minAmount: 0, maxAmount: null, approverRoles: [] }])}>Add band</Button>
          )}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="border-b border-slate-100">
                <th className={th}>From (R)</th><th className={th}>Up to (R)</th><th className={th}>Approvers (in order)</th><th className={th}><span className="sr-only">Remove</span></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {draft.approvalBands.map((b, i) => (
                  <tr key={i}>
                    <td className={`${td} w-36`}><NumberInput label={`Band ${i + 1} minimum`} value={b.minAmount} min={0} onChange={(v) => setBand(i, { minAmount: v ?? 0 })} /></td>
                    <td className={`${td} w-36`}><NumberInput label={`Band ${i + 1} maximum`} value={b.maxAmount} nullable min={0} placeholder="No limit" onChange={(v) => setBand(i, { maxAmount: v })} /></td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1.5">
                        {BAND_ROLES.map((r) => (
                          <Checkbox key={r} label={ROLE_LABEL[r]} disabled={ro} checked={b.approverRoles.includes(r)}
                            onChange={(on) => setBand(i, { approverRoles: on ? BAND_ROLES.filter((x) => x === r || b.approverRoles.includes(x)) : b.approverRoles.filter((x) => x !== r) })} />
                        ))}
                        {b.approverRoles.length === 0 && <Badge tone="success">Auto-approve</Badge>}
                      </div>
                    </td>
                    <td className={`${td} w-10 text-right`}>
                      {!ro && (
                        <button type="button" aria-label={`Remove band ${i + 1}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => set('approvalBands', draft.approvalBands.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Grid cols={2}>
          <Card title="B-BBEE scoring table" subtitle="Score (0–100) awarded per B-BBEE level">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {BBBEE_KEYS.map((k) => (
                <Field key={k} label={k === '0' ? 'Non-compliant' : `Level ${k}`} className={k === '0' ? 'col-span-2 sm:col-span-1' : ''}>
                  <NumberInput value={draft.bbbeeScores[k] ?? 0} min={0} onChange={(v) => set('bbbeeScores', { ...draft.bbbeeScores, [k]: v ?? 0 })} />
                </Field>
              ))}
            </div>
          </Card>
          <Card title="Local participation scoring" subtitle="Score (0–100) by provider location relative to the need">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Same municipality"><NumberInput value={draft.localScores.sameMunicipality} min={0} onChange={(v) => set('localScores', { ...draft.localScores, sameMunicipality: v ?? 0 })} /></Field>
              <Field label="Same province"><NumberInput value={draft.localScores.sameProvince} min={0} onChange={(v) => set('localScores', { ...draft.localScores, sameProvince: v ?? 0 })} /></Field>
              <Field label="Elsewhere"><NumberInput value={draft.localScores.elsewhere} min={0} onChange={(v) => set('localScores', { ...draft.localScores, elsewhere: v ?? 0 })} /></Field>
            </div>
          </Card>
        </Grid>

        <Card title="Default evaluation criteria" subtitle="Pre-filled on new opportunities. Weights must total exactly 100%."
          actions={
            <div className="flex items-center gap-2">
              <Badge tone={weightOk ? 'success' : 'danger'}>Total {totalWeight}%</Badge>
              {!ro && (
                <Button type="button" size="sm" variant="secondary" icon={<Plus size={14} />}
                  onClick={() => set('defaultCriteria', [...draft.defaultCriteria, { key: 'TECHNICAL', name: '', scoringMethod: 'MANUAL', weightPct: 0 }])}>Add</Button>
              )}
            </div>
          }>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="border-b border-slate-100">
                <th className={th}>Name</th><th className={th}>Key</th><th className={th}>Scoring method</th><th className={th}>Weight %</th><th className={th}><span className="sr-only">Remove</span></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {draft.defaultCriteria.map((c, i) => (
                  <tr key={i}>
                    <td className={td}><Input aria-label={`Criterion ${i + 1} name`} value={c.name} onChange={(e) => setCrit(i, { name: e.target.value })} /></td>
                    <td className={`${td} w-48`}>
                      <Select aria-label={`Criterion ${i + 1} key`} value={c.key} onChange={(e) => setCrit(i, { key: e.target.value as CriterionKey })}>
                        {CRITERION_KEYS.map((k) => <option key={k} value={k}>{CRITERION_LABEL[k]}</option>)}
                      </Select>
                    </td>
                    <td className={`${td} w-48`}>
                      <Select aria-label={`Criterion ${i + 1} scoring method`} value={c.scoringMethod} onChange={(e) => setCrit(i, { scoringMethod: e.target.value as ScoringMethod })}>
                        {SCORING_METHODS.map((m) => <option key={m} value={m}>{SCORING_LABEL[m]}</option>)}
                      </Select>
                    </td>
                    <td className={`${td} w-24`}><NumberInput label={`Criterion ${i + 1} weight`} value={c.weightPct} min={0} onChange={(v) => setCrit(i, { weightPct: v ?? 0 })} /></td>
                    <td className={`${td} w-10 text-right`}>
                      {!ro && (
                        <button type="button" aria-label={`Remove criterion ${i + 1}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => set('defaultCriteria', draft.defaultCriteria.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!weightOk && <p className="mt-3 text-xs font-medium text-rose-600" role="alert">Weights total {totalWeight}%. Adjust them to exactly 100% before saving.</p>}
        </Card>
      </fieldset>

      {isAdmin && (
        <>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" disabled={!dirty || save.loading} onClick={() => setDraft(structuredClone(data))}>Discard changes</Button>
            <Button type="submit" icon={<Save size={16} />} loading={save.loading} disabled={!dirty || !weightOk}>Save new version</Button>
          </div>
        </>
      )}
    </form>
  );
}
