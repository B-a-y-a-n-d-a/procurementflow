import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Award, CheckCircle2, ExternalLink, FileText, Gavel, Plus, Scale, XCircle } from 'lucide-react';
import { api } from '../../api/client';
import type {
  CreateQuoteRequest, PurchaseOrderDto, QuoteBoardDto, QuoteDto, SelectQuoteRequest, SupplierDto,
} from '../../api/types';
import { useAuth } from '../../app/auth';
import { Link } from '../../app/router';
import {
  Badge, Button, Callout, Card, Checkbox, type Column, DataTable, EmptyState, ErrorBanner, Field, Input, KeyValues, Loading,
  Modal, Mono, PageHeader, Select, StatusBadge, Textarea,
} from '../../components/ui';
import { useAction, useApi } from '../../lib/hooks';
import { addDays, date, isoDate, money } from '../../lib/format';
import { bbbee, PROVIDER_TYPE_LABEL, SOURCING_LABEL } from '../../lib/labels';

export default function QuoteBoard({ id }: { id: string }) {
  const { has } = useAuth();
  const board = useApi(() => api.get<QuoteBoardDto>(`/requests/${id}/quotes`), [id]);
  const [recording, setRecording] = useState(false);

  if (board.loading && !board.data) return <Loading label="Loading quotation board…" />;
  if (board.error && !board.data) return <ErrorBanner error={board.error} onRetry={board.reload} />;
  const b = board.data;
  if (!b) return null;
  const r = b.request;
  const canAct = has('PROCUREMENT_OFFICER') && r.status === 'APPROVED' && !b.purchaseOrder;

  const columns: Column<QuoteDto>[] = [
    {
      key: 'supplier', header: 'Supplier', render: (q) => (
        <div className="min-w-[10rem]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-slate-900">{q.supplierName}</span>
            {q.isLowestCompliant && <Badge tone="gold"><Award size={11} /> Lowest compliant</Badge>}
          </div>
          <Mono>{q.supplierNumber}</Mono>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (q) => <span className="whitespace-nowrap text-slate-600">{PROVIDER_TYPE_LABEL[q.providerType]}</span> },
    { key: 'bbbee', header: 'B-BBEE', render: (q) => <span className="whitespace-nowrap text-slate-600">{bbbee(q.bbbeeLevel)}</span> },
    { key: 'muni', header: 'Municipality', render: (q) => <span className="text-slate-600">{q.municipality}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (q) => <span className={`font-semibold tabular-nums ${q.isLowestCompliant ? 'text-brand-700' : ''}`}>{money(q.amount)}</span> },
    { key: 'valid', header: 'Valid until', render: (q) => <span className="whitespace-nowrap text-xs text-slate-600">{date(q.validUntil)}</span> },
    {
      key: 'compliant', header: 'Compliance', render: (q) => q.isCompliant
        ? <Badge tone="success"><CheckCircle2 size={11} /> Compliant</Badge>
        : <div className="min-w-[8rem]"><Badge tone="danger"><XCircle size={11} /> Non-compliant</Badge>{q.nonComplianceReason && <div className="mt-1 text-[11px] text-rose-700">{q.nonComplianceReason}</div>}</div>,
    },
    { key: 'recv', header: 'Received', render: (q) => <span className="whitespace-nowrap text-xs text-slate-500">{date(q.receivedAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <Link to="/procurement?tab=quotes" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700">
          <ArrowLeft size={14} /> Procurement
        </Link>
        <PageHeader
          eyebrow={<span className="flex items-center gap-2"><Mono className="text-brand-700">{r.reference}</Mono> · Quotation board</span>}
          title={r.needTitle}
          subtitle={`${r.departmentName} · requested by ${r.requestedByName}`}
          actions={
            <>
              <StatusBadge status={r.status} />
              {canAct && <Button icon={<Plus size={16} />} onClick={() => setRecording(true)}>Record quote</Button>}
            </>
          }
        />
      </div>

      <Card title="Request summary" icon={<FileText size={16} />}>
        <KeyValues cols={3} items={[
          ['Need', <Link key="n" to={`/needs/${r.needId}`} className="font-medium text-brand-700 hover:underline">{r.needReference} · {r.needTitle}</Link>],
          ['Amount', <span key="a" className="font-semibold">{money(r.amount)}</span>],
          ['Status', <StatusBadge key="s" status={r.status} />],
          ['Sourcing', SOURCING_LABEL[r.sourcingMethod]],
          ['Department', r.departmentName],
          ['Quotes received', String(b.quotes.length)],
        ]} />
        {r.justification && <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">{r.justification}</p>}
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <QuoteMinOffers b={b} />
        <Callout tone="gold" icon={<Scale size={16} />} title="The system recommends. A human decides.">
          CIVICFLOW flags the lowest compliant quote. Choosing another quote requires a written justification and flags the PO as a deviation.
        </Callout>
      </div>

      {b.purchaseOrder && <PoCard po={b.purchaseOrder} />}

      <Card padded={false} title="Quote comparison" subtitle="Only quotes from active suppliers. One quote per supplier." icon={<Scale size={16} />}>
        <DataTable rows={b.quotes} rowKey={(q) => q.id} columns={columns}
          empty={<div className="p-5"><EmptyState title="No quotes recorded yet" message={canAct ? 'Record quotes received from active suppliers.' : 'Quotes appear here once procurement records them.'}
            action={canAct ? <Button size="sm" icon={<Plus size={14} />} onClick={() => setRecording(true)}>Record quote</Button> : undefined} /></div>} />
      </Card>

      {canAct && b.quotes.some((q) => q.isCompliant) && <QuoteSelection b={b} onSelected={() => void board.reload()} />}

      {recording && (
        <RecordQuoteModal requestId={r.id} existing={b.quotes} onClose={() => setRecording(false)}
          onSaved={(nb) => { board.setData(nb); setRecording(false); }} />
      )}
    </div>
  );
}

function QuoteMinOffers({ b }: { b: QuoteBoardDto }) {
  const m = b.minOffers;
  if (!m.applies) {
    return (
      <Callout tone="neutral" icon={<Gavel size={16} />} title="Minimum offers rule not applicable">
        {money(b.request.amount)} is within the {money(m.threshold)} quotation threshold.
        {m.minimum > 0 ? ` ${m.count} quote(s) recorded.` : ''}
      </Callout>
    );
  }
  return m.satisfied ? (
    <Callout tone="success" icon={<Gavel size={16} />} title={`Minimum offers met: ${m.count} of ${m.minimum}`}>
      The organisation's rules require at least {m.minimum} compliant offers above {money(m.threshold)}.
    </Callout>
  ) : (
    <Callout tone="danger" icon={<AlertTriangle size={16} />} title={`Minimum offers not met: ${m.count} of ${m.minimum}`}>
      Above {money(m.threshold)}, at least {m.minimum} compliant offers are required before a quote can be selected.
    </Callout>
  );
}

function PoCard({ po }: { po: PurchaseOrderDto }) {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><CheckCircle2 size={22} /></div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Quote selected</div>
            <h2 className="text-lg font-bold text-slate-900">{po.supplierName}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <Mono className="text-slate-700">{po.poNumber}</Mono>
              <span>·</span>
              <span className="font-semibold">{money(po.amount)}</span>
              <StatusBadge status={po.status} />
              {po.isDeviation && <Badge tone="warning" title={po.deviationJustification ?? undefined}><AlertTriangle size={11} /> Deviation</Badge>}
            </div>
            <p className="mt-1 text-xs text-slate-500">Selected by {po.selectedByName ?? '—'} on {date(po.selectedAt)}. Supplier <StatusBadge status={po.supplierStatus} /></p>
          </div>
        </div>
        <Link to="/procurement" className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
          Issue from Procurement <ExternalLink size={14} />
        </Link>
      </div>
    </section>
  );
}

function QuoteSelection({ b, onSelected }: { b: QuoteBoardDto; onSelected: () => void }) {
  const compliant = b.quotes.filter((q) => q.isCompliant);
  const [chosen, setChosen] = useState<string | null>(b.lowestCompliantQuoteId ?? compliant[0]?.id ?? null);
  const [justification, setJustification] = useState('');
  const select = useAction(
    (body: SelectQuoteRequest) => api.post<PurchaseOrderDto>(`/requests/${b.request.id}/select-quote`, body),
    (po) => `${po.supplierName} selected — ${po.poNumber} created`,
  );
  const isDeviation = !!chosen && chosen !== b.lowestCompliantQuoteId;
  const len = justification.trim().length;

  const submit = async () => {
    if (!chosen) return;
    const po = await select.run({ quoteId: chosen, justification: isDeviation ? justification.trim() : undefined });
    if (po) onSelected();
  };

  return (
    <Card title="Select a quote" subtitle="Only compliant quotes can be selected." icon={<Gavel size={16} />}>
      <div className="space-y-4">
        <fieldset>
          <legend className="sr-only">Choose the quote to award</legend>
          <div className="space-y-2">
            {compliant.map((q) => {
              const active = chosen === q.id;
              return (
                <label key={q.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${active ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-200' : 'border-slate-200 hover:border-brand-300'}`}>
                  <input type="radio" name="quote" className="h-4 w-4 accent-brand-600" checked={active} onChange={() => { setChosen(q.id); select.clearError(); }} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{q.supplierName}</span>
                      {q.isLowestCompliant && <Badge tone="gold"><Award size={11} /> Lowest compliant</Badge>}
                    </span>
                    <span className="block text-xs text-slate-500">{bbbee(q.bbbeeLevel)} · {q.municipality}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{money(q.amount)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {isDeviation && (
          <div className="space-y-2">
            <Callout tone="warning" icon={<AlertTriangle size={16} />} title="Not the lowest compliant quote">
              A justification of at least {b.deviationMinChars} characters is required and the PO will be flagged as a deviation.
            </Callout>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">Justification <span className="text-rose-500" aria-hidden>*</span></span>
              <Textarea rows={3} value={justification} onChange={(e) => setJustification(e.target.value)} aria-describedby="qjust-count" />
              <span id="qjust-count" className={`mt-1 block text-right text-[11px] font-medium ${len >= b.deviationMinChars ? 'text-emerald-700' : 'text-rose-600'}`}>
                {len} / {b.deviationMinChars} characters minimum
              </span>
            </label>
          </div>
        )}
        <ErrorBanner error={select.error} />
        {!b.minOffers.satisfied && (
          <p className="flex gap-2 text-xs text-amber-800"><AlertTriangle size={13} className="mt-0.5 shrink-0" />Minimum offers not met: the server will refuse this selection (MIN_OFFERS_NOT_MET).</p>
        )}
        <div className="flex justify-end">
          <Button icon={<Gavel size={16} />} loading={select.loading} disabled={!chosen} onClick={submit}>Select quote &amp; create PO</Button>
        </div>
      </div>
    </Card>
  );
}

function RecordQuoteModal({ requestId, existing, onClose, onSaved }: {
  requestId: string; existing: QuoteDto[]; onClose: () => void; onSaved: (b: QuoteBoardDto) => void;
}) {
  const suppliers = useApi(() => api.get<SupplierDto[]>('/suppliers'));
  const taken = useMemo(() => new Set(existing.map((q) => q.supplierId)), [existing]);
  const active = (suppliers.data ?? []).filter((s) => s.status === 'ACTIVE');
  const available = active.filter((s) => !taken.has(s.id));

  const [supplierId, setSupplierId] = useState('');
  const [amount, setAmount] = useState('');
  const [validUntil, setValidUntil] = useState(isoDate(addDays(30)));
  const [compliant, setCompliant] = useState(true);
  const [reason, setReason] = useState('');
  const effectiveSupplier = supplierId || available[0]?.id || '';

  const save = useAction((body: CreateQuoteRequest) => api.post<QuoteBoardDto>(`/requests/${requestId}/quotes`, body), 'Quote recorded');
  const amountNum = Number(amount);
  const invalid = !effectiveSupplier || !amount || Number.isNaN(amountNum) || amountNum <= 0 || !validUntil || (!compliant && !reason.trim());

  const submit = async () => {
    const r = await save.run({
      supplierId: effectiveSupplier, amount: amountNum, validUntil, isCompliant: compliant,
      nonComplianceReason: compliant ? undefined : reason.trim(),
    });
    if (r) onSaved(r);
  };

  return (
    <Modal open onClose={onClose} title="Record a quote" subtitle="Quotes can be recorded only from active (verified) suppliers."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={<Plus size={16} />} loading={save.loading} disabled={invalid} onClick={submit}>Record quote</Button></>}>
      <div className="space-y-4">
        <ErrorBanner error={save.error ?? suppliers.error} />
        {suppliers.loading && !suppliers.data ? <Loading label="Loading suppliers…" /> : (
          <Field label="Supplier" required hint={available.length < active.length ? 'Suppliers who already quoted are excluded.' : undefined}>
            {available.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">No active suppliers available. Verify a supplier first.</p>
            ) : (
              <Select value={effectiveSupplier} onChange={(e) => setSupplierId(e.target.value)}>
                {available.map((s) => <option key={s.id} value={s.id}>{s.providerName} · {s.supplierNumber} · {bbbee(s.bbbeeLevel)}</option>)}
              </Select>
            )}
          </Field>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Amount (ZAR)" required>
            <Input type="number" min={0} step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 45000" />
          </Field>
          <Field label="Valid until" required>
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </Field>
        </div>
        <Checkbox label="Quote is compliant with the request" checked={compliant} onChange={setCompliant} />
        {!compliant && (
          <Field label="Non-compliance reason" required>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Missing tax clearance, incomplete specification" />
          </Field>
        )}
      </div>
    </Modal>
  );
}
