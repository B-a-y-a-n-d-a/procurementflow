import { useEffect, useMemo, useState } from 'react';
import { Link2, Lock, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { api, qs } from '../../api/client';
import type { AuditEntryDto, AuditVerifyDto } from '../../api/types';
import { Link } from '../../app/router';
import {
  Badge, Button, Callout, Card, DataTable, EmptyState, ErrorBanner, Field, Input, Loading, Mono, PageHeader, Select, type Column,
} from '../../components/ui';
import { dateTime, num } from '../../lib/format';
import { useAction, useApi } from '../../lib/hooks';
import { ROLE_LABEL, type Tone } from '../../lib/labels';

function actionTone(action: string): Tone {
  if (/REJECT|BREACH|OVERDUE|CANCEL|RISK|SUSPEND/.test(action)) return 'danger';
  if (/APPROV|SELECT|AWARD|COMPLETE|VERIF|ACHIEV/.test(action)) return 'success';
  if (/ESCALAT|DEVIATION|WARN/.test(action)) return 'warning';
  if (/AI_/.test(action)) return 'gold';
  if (/CREATE|SUBMIT|PUBLISH|ISSUE/.test(action)) return 'brand';
  return 'info';
}

export default function AuditLog() {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [q, setQ] = useState('');
  const [verify, setVerify] = useState<AuditVerifyDto | null>(null);

  const { data, error, loading, reload } = useApi(
    () => api.get<AuditEntryDto[]>('/audit' + qs({ limit: 300, action, entityType })),
    [action, entityType],
  );
  // Filter options come from the unfiltered load, so they stay stable while a filter is applied.
  const [seen, setSeen] = useState<AuditEntryDto[]>([]);
  useEffect(() => {
    if (data && !action && !entityType) setSeen(data);
  }, [data, action, entityType]);
  const verifyAction = useAction(() => api.get<AuditVerifyDto>('/audit/verify'));

  const actions = useMemo(() => Array.from(new Set(seen.map((e) => e.action))).sort(), [seen]);
  const entityTypes = useMemo(() => Array.from(new Set(seen.map((e) => e.entityType))).sort(), [seen]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = data ?? [];
    if (!needle) return list;
    return list.filter((e) =>
      [e.summary, e.actorName, e.action, e.entityType, e.entityId, String(e.sequence)].some((v) => v?.toLowerCase().includes(needle)),
    );
  }, [data, q]);

  const runVerify = async () => {
    const r = await verifyAction.run();
    if (r) setVerify(r);
  };

  const cols: Column<AuditEntryDto>[] = [
    { key: 'seq', header: '#', render: (e) => <Mono className="font-semibold text-slate-700">{e.sequence}</Mono> },
    { key: 'time', header: 'Time', render: (e) => <span className="whitespace-nowrap text-xs text-slate-600">{dateTime(e.occurredAt)}</span> },
    {
      key: 'actor', header: 'Actor', render: (e) => (
        <div className="min-w-[120px]">
          <div className="text-sm font-medium text-slate-900">{e.actorName}</div>
          {e.actorRole && <div className="text-[11px] text-slate-500">{ROLE_LABEL[e.actorRole]}</div>}
        </div>
      ),
    },
    { key: 'action', header: 'Action', render: (e) => <Badge tone={actionTone(e.action)}>{e.action}</Badge> },
    {
      key: 'summary', header: 'Summary', render: (e) => (
        <div className="min-w-[220px]">
          <div className="text-sm text-slate-700">{e.summary}</div>
          <div className="mt-0.5 text-[11px] text-slate-400"><span className="font-medium">{e.entityType}</span> · <Mono className="text-[11px]" >{e.hash.slice(0, 12)}…</Mono></div>
        </div>
      ),
    },
    {
      key: 'journey', header: '', align: 'right', render: (e) => e.needId ? (
        <Link to={`/needs/${e.needId}`} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-brand-700 hover:underline">
          <Link2 size={12} aria-hidden /> Journey
        </Link>
      ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Accountability"
        title="Audit log"
        subtitle="Every lifecycle event, from NEED_CREATED to IMPACT_UPDATED, with who did it and when."
        actions={<Button icon={<ShieldCheck size={16} />} loading={verifyAction.loading} onClick={runVerify}>Verify chain</Button>}
      />

      {verify && (verify.valid ? (
        <Callout tone="success" icon={<ShieldCheck size={18} />} title="Chain intact">
          {num(verify.checked)} entries verified, head hash <Mono className="text-emerald-800">{(verify.headHash ?? '').slice(0, 16)}…</Mono>
        </Callout>
      ) : (
        <Callout tone="danger" icon={<ShieldAlert size={18} />} title="Chain broken">
          Broken at sequence {verify.brokenAtSequence ?? '?'} ({num(verify.checked)} entries checked). An entry was altered or removed outside the application.
        </Callout>
      ))}

      <Callout tone="neutral" icon={<Lock size={16} />}>
        The log is <strong>append-only at application level</strong>: there is no edit or delete API. Each entry stores the SHA-256 hash of the
        previous one, so any tampering breaks the chain and is detected by <em>Verify chain</em>.
      </Callout>

      <Card padded={false}>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
          <Field label="Action">
            <Select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All actions</option>
              {actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>
          <Field label="Entity type">
            <Select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="">All entities</option>
              {entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Search">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Summary, actor, reference…" className="pl-8" type="search" />
            </div>
          </Field>
        </div>
        {error && <div className="p-4"><ErrorBanner error={error} onRetry={reload} /></div>}
        {loading && !data ? <Loading label="Loading audit entries…" /> : (
          <>
            <div className="px-4 pt-3 text-xs text-slate-500" aria-live="polite">Showing {num(rows.length)} of {num(data?.length ?? 0)} entries (newest first)</div>
            <DataTable dense columns={cols} rows={rows} rowKey={(e) => e.id} empty={<div className="p-5"><EmptyState title="No matching audit entries" /></div>} />
          </>
        )}
      </Card>
    </div>
  );
}
