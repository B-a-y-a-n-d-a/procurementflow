import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BadgeCheck, FileText, Info, Send, ShieldCheck } from 'lucide-react';
import { api, type ApiRequestError } from '../../api/client';
import type {
  IssuePoRequest, PurchaseOrderDto, PurchaseRequestDto, SupplierDto, UserDto, VerifySupplierRequest,
} from '../../api/types';
import { useAuth } from '../../app/auth';
import { Link, currentQuery, navigate } from '../../app/router';
import {
  Badge, Button, Callout, Card, type Column, DataTable, EmptyState, ErrorBanner, Field, Input, Loading, Modal, Mono,
  PageHeader, Select, StatusBadge, Tabs, Checkbox,
} from '../../components/ui';
import { useAction, useApi } from '../../lib/hooks';
import { addDays, date, isoDate, money } from '../../lib/format';
import { bbbee, PROVIDER_TYPE_LABEL, ROLE_LABEL } from '../../lib/labels';

type TabKey = 'orders' | 'suppliers' | 'quotes';

export default function Procurement() {
  const initial = currentQuery().get('tab');
  const [tab, setTab] = useState<TabKey>(initial === 'suppliers' || initial === 'quotes' ? initial : 'orders');
  const orders = useApi(() => api.get<PurchaseOrderDto[]>('/purchase-orders'));
  const suppliers = useApi(() => api.get<SupplierDto[]>('/suppliers'));
  const requests = useApi(() => api.get<PurchaseRequestDto[]>('/requests'));

  const quoteRequests = useMemo(() => (requests.data ?? []).filter((r) => r.sourcingMethod === 'QUOTATION'), [requests.data]);
  const pendingSuppliers = (suppliers.data ?? []).filter((s) => s.status === 'PENDING_VERIFICATION').length;
  const draftOrders = (orders.data ?? []).filter((o) => o.status === 'DRAFT').length;

  return (
    <div>
      <PageHeader
        eyebrow="Transparent procurement"
        title="Procurement"
        subtitle="Purchase orders, supplier verification and quotation requests. Every step is audited."
      />
      <div className="mb-5">
        <Callout tone="brand" icon={<Info size={16} />} title="Provider vs Supplier">
          Providers (innovators, SMEs, co-ops, open-source projects) are discoverable on CIVICFLOW before they are formal suppliers. A
          supplier record is created only when a provider is selected, and it must be verified (CSD number, tax compliance) before a
          purchase order can be issued.
        </Callout>
      </div>

      <Tabs<TabKey>
        tabs={[
          { key: 'orders', label: draftOrders > 0 ? <>Purchase orders <Badge tone="neutral">{draftOrders} draft</Badge></> : 'Purchase orders', count: orders.data ? orders.data.length : undefined },
          { key: 'suppliers', label: pendingSuppliers > 0 ? <>Suppliers <Badge tone="warning">{pendingSuppliers} to verify</Badge></> : 'Suppliers', count: suppliers.data ? suppliers.data.length : undefined },
          { key: 'quotes', label: 'Quotation requests', count: requests.data ? quoteRequests.length : undefined },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'orders' && (
        <OrdersTab orders={orders.data} loading={orders.loading} error={orders.error} reload={orders.reload}
          onGoSuppliers={() => setTab('suppliers')} />
      )}
      {tab === 'suppliers' && (
        <SuppliersTab suppliers={suppliers.data} loading={suppliers.loading} error={suppliers.error} reload={suppliers.reload}
          onVerified={() => { void suppliers.reload(); void orders.reload(); }} />
      )}
      {tab === 'quotes' && (
        <Card padded={false} title="Quotation requests" subtitle="Low-value requests sourced by comparing quotes from active suppliers." icon={<FileText size={16} />}>
          <ErrorBanner error={requests.error} onRetry={requests.reload} />
          {requests.loading && !requests.data ? <Loading /> : (
            <DataTable<PurchaseRequestDto>
              rows={quoteRequests}
              rowKey={(r) => r.id}
              onRowClick={(r) => navigate(`/procurement/requests/${r.id}`)}
              empty={<div className="p-5"><EmptyState title="No quotation requests" message="Requests with the Quotation sourcing method appear here." /></div>}
              columns={[
                { key: 'ref', header: 'Reference', render: (r) => <Mono>{r.reference}</Mono> },
                { key: 'need', header: 'Need', render: (r) => <div className="min-w-[10rem]"><div className="font-medium text-slate-900">{r.needTitle}</div><Mono>{r.needReference}</Mono></div> },
                { key: 'dept', header: 'Department', render: (r) => <span className="text-slate-600">{r.departmentName}</span> },
                { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="font-semibold">{money(r.amount)}</span> },
                { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                { key: 'quotes', header: 'Quotes', align: 'center', render: (r) => <Badge tone={r.quoteCount > 0 ? 'brand' : 'neutral'}>{r.quoteCount}</Badge> },
                { key: 'go', header: <span className="sr-only">Open</span>, align: 'right', render: () => <ArrowRight size={16} className="inline text-slate-300" /> },
              ]}
            />
          )}
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ purchase orders */

function OrdersTab({ orders, loading, error, reload, onGoSuppliers }: {
  orders: PurchaseOrderDto[] | null; loading: boolean; error: ApiRequestError | null;
  reload: () => Promise<unknown>; onGoSuppliers: () => void;
}) {
  const { has } = useAuth();
  const [issuing, setIssuing] = useState<PurchaseOrderDto | null>(null);
  const isPO = has('PROCUREMENT_OFFICER');

  const columns: Column<PurchaseOrderDto>[] = [
    { key: 'po', header: 'PO', render: (o) => <div><Mono className="font-semibold text-slate-800">{o.poNumber}</Mono><div className="text-[11px] text-slate-400">{o.requestReference}</div></div> },
    { key: 'need', header: 'Need', render: (o) => <div className="min-w-[10rem]"><Link to={`/needs/${o.needId}`} className="font-medium text-slate-900 hover:text-brand-700">{o.needTitle}</Link><div className="text-[11px] text-slate-500">{o.departmentName}</div></div> },
    { key: 'supplier', header: 'Supplier', render: (o) => <div className="min-w-[9rem]"><div className="font-medium text-slate-800">{o.supplierName}</div><StatusBadge status={o.supplierStatus} className="mt-1" /></div> },
    { key: 'amount', header: 'Amount', align: 'right', render: (o) => <span className="font-semibold tabular-nums">{money(o.amount)}</span> },
    {
      key: 'status', header: 'Status', render: (o) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={o.status} />
          {o.isDeviation && <Badge tone="warning" title={o.deviationJustification ? `Justification: ${o.deviationJustification}` : 'Deviation from recommendation'}><AlertTriangle size={11} /> Deviation</Badge>}
        </div>
      ),
    },
    { key: 'selected', header: 'Selected', render: (o) => <div className="whitespace-nowrap text-xs text-slate-600">{date(o.selectedAt)}<div className="text-slate-400">{o.selectedByName ?? ''}</div></div> },
    { key: 'issued', header: 'Issued', render: (o) => <div className="whitespace-nowrap text-xs text-slate-600">{date(o.issuedAt)}<div className="text-slate-400">{o.issuedByName ?? ''}</div></div> },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', render: (o) => (
        <div className="flex flex-col items-end gap-1">
          {o.status === 'DRAFT' && isPO && (
            o.supplierStatus === 'ACTIVE' ? (
              <Button size="sm" icon={<Send size={14} />} onClick={() => setIssuing(o)}>Issue PO</Button>
            ) : (
              <>
                <Button size="sm" disabled title="Verify the supplier first" icon={<Send size={14} />}>Issue PO</Button>
                <span className="text-[11px] text-amber-700">Verify the supplier first</span>
                <Button size="sm" variant="ghost" onClick={onGoSuppliers} icon={<ShieldCheck size={14} />}>Go to suppliers</Button>
              </>
            )
          )}
          {o.implementationId && (
            <Link to={`/implementations/${o.implementationId}`} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-brand-700 hover:underline">
              Implementation <ArrowRight size={12} />
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <Card padded={false} title="Purchase orders" subtitle="A draft PO is the award decision. Issuing it commits budget and starts implementation." icon={<FileText size={16} />}>
      <ErrorBanner error={error} onRetry={() => void reload()} />
      {loading && !orders ? <Loading /> : (
        <DataTable rows={orders ?? []} rowKey={(o) => o.id} columns={columns}
          empty={<div className="p-5"><EmptyState title="No purchase orders yet" message="POs are created when a submission or quote is selected." /></div>} />
      )}
      {issuing && <IssueModal po={issuing} onClose={() => setIssuing(null)} onIssued={() => { setIssuing(null); void reload(); }} />}
    </Card>
  );
}

function IssueModal({ po, onClose, onIssued }: { po: PurchaseOrderDto; onClose: () => void; onIssued: () => void }) {
  const users = useApi(() => api.get<UserDto[]>('/users'));
  const sorted = useMemo(() => {
    const list = (users.data ?? []).filter((u) => u.role !== 'PROVIDER' && u.role !== 'SYSTEM');
    return [...list].sort((a, b) => {
      const ra = a.role === 'DEPARTMENT_MANAGER' ? 0 : 1;
      const rb = b.role === 'DEPARTMENT_MANAGER' ? 0 : 1;
      if (ra !== rb) return ra - rb;
      const da = a.departmentName === po.departmentName ? 0 : 1;
      const db = b.departmentName === po.departmentName ? 0 : 1;
      return da - db || a.fullName.localeCompare(b.fullName);
    });
  }, [users.data, po.departmentName]);
  const managers = sorted.filter((u) => u.role === 'DEPARTMENT_MANAGER');
  const others = sorted.filter((u) => u.role !== 'DEPARTMENT_MANAGER');

  const [managerId, setManagerId] = useState('');
  const [startDate, setStartDate] = useState(isoDate());
  const [expected, setExpected] = useState(isoDate(addDays(90)));
  const effectiveManager = managerId || sorted[0]?.id || '';

  const issue = useAction(
    (body: IssuePoRequest) => api.post<PurchaseOrderDto>(`/purchase-orders/${po.id}/issue`, body),
    (r) => `${r.poNumber} issued — implementation created`,
  );

  const submit = async () => {
    const r = await issue.run({ managerId: effectiveManager, startDate, expectedCompletion: expected });
    if (r) onIssued();
  };

  return (
    <Modal open onClose={onClose} title={`Issue ${po.poNumber}`} subtitle={`${po.supplierName} · ${money(po.amount)} · ${po.needTitle}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={<Send size={16} />} loading={issue.loading} disabled={!effectiveManager} onClick={submit}>Issue PO</Button></>}>
      <div className="space-y-4">
        <Callout tone="info">
          Issuing commits {money(po.amount)} against the {po.departmentName} budget, marks the request as ordered, and creates an
          implementation record owned by the manager you choose.
        </Callout>
        <ErrorBanner error={issue.error ?? users.error} />
        <Field label="Implementation manager" required hint="Department managers are listed first.">
          {users.loading && !users.data ? <Loading label="Loading users…" /> : (
            <Select value={effectiveManager} onChange={(e) => setManagerId(e.target.value)}>
              {managers.length > 0 && (
                <optgroup label="Department managers">
                  {managers.map((u) => <option key={u.id} value={u.id}>{u.fullName}{u.departmentName ? ` · ${u.departmentName}` : ''}</option>)}
                </optgroup>
              )}
              {others.length > 0 && (
                <optgroup label="Other staff">
                  {others.map((u) => <option key={u.id} value={u.id}>{u.fullName} · {ROLE_LABEL[u.role]}</option>)}
                </optgroup>
              )}
            </Select>
          )}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Start date" required><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label="Expected completion" required><Input type="date" value={expected} min={startDate} onChange={(e) => setExpected(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ suppliers */

function SuppliersTab({ suppliers, loading, error, reload, onVerified }: {
  suppliers: SupplierDto[] | null; loading: boolean; error: ApiRequestError | null;
  reload: () => Promise<unknown>; onVerified: () => void;
}) {
  const { has } = useAuth();
  const [verifying, setVerifying] = useState<SupplierDto | null>(null);
  const rows = useMemo(
    () => [...(suppliers ?? [])].sort((a, b) => (a.status === 'PENDING_VERIFICATION' ? 0 : 1) - (b.status === 'PENDING_VERIFICATION' ? 0 : 1)),
    [suppliers],
  );

  const columns: Column<SupplierDto>[] = [
    { key: 'name', header: 'Provider', render: (s) => <div className="min-w-[9rem]"><Link to={`/providers/${s.providerId}`} className="font-medium text-slate-900 hover:text-brand-700">{s.providerName}</Link><div className="text-[11px] text-slate-500">{PROVIDER_TYPE_LABEL[s.providerType]}</div></div> },
    { key: 'num', header: 'Supplier no.', render: (s) => <Mono>{s.supplierNumber}</Mono> },
    { key: 'bbbee', header: 'B-BBEE', render: (s) => <span className="whitespace-nowrap text-slate-600">{bbbee(s.bbbeeLevel)}</span> },
    { key: 'csd', header: 'CSD number', render: (s) => s.csdNumber ? <Mono>{s.csdNumber}</Mono> : <span className="text-slate-400">—</span> },
    { key: 'tax', header: 'Tax compliant', render: (s) => <Badge tone={s.taxCompliant ? 'success' : 'neutral'}>{s.taxCompliant ? 'Yes' : 'Not confirmed'}</Badge> },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    { key: 'ver', header: 'Verified', render: (s) => <div className="whitespace-nowrap text-xs text-slate-600">{date(s.verifiedAt)}<div className="text-slate-400">{s.verifiedByName ?? ''}</div></div> },
    {
      key: 'act', header: <span className="sr-only">Actions</span>, align: 'right', render: (s) =>
        s.status === 'PENDING_VERIFICATION' && has('PROCUREMENT_OFFICER')
          ? <Button size="sm" icon={<BadgeCheck size={14} />} onClick={() => setVerifying(s)}>Verify</Button>
          : null,
    },
  ];

  return (
    <Card padded={false} title="Suppliers" subtitle="Providers registered in a formal procurement context. Pending verification first." icon={<ShieldCheck size={16} />}>
      <ErrorBanner error={error} onRetry={() => void reload()} />
      {loading && !suppliers ? <Loading /> : (
        <DataTable rows={rows} rowKey={(s) => s.id} columns={columns}
          empty={<div className="p-5"><EmptyState title="No suppliers yet" message="A supplier is created when a provider is selected." /></div>} />
      )}
      {verifying && <VerifyModal supplier={verifying} onClose={() => setVerifying(null)} onDone={() => { setVerifying(null); onVerified(); }} />}
    </Card>
  );
}

function VerifyModal({ supplier, onClose, onDone }: { supplier: SupplierDto; onClose: () => void; onDone: () => void }) {
  const [csd, setCsd] = useState(supplier.csdNumber ?? '');
  const [tax, setTax] = useState(supplier.taxCompliant);
  const verify = useAction(
    (body: VerifySupplierRequest) => api.post<SupplierDto>(`/suppliers/${supplier.id}/verify`, body),
    (s) => `${s.providerName} verified — supplier is ${s.status === 'ACTIVE' ? 'active' : s.status.toLowerCase()}`,
  );
  const submit = async () => {
    const r = await verify.run({ csdNumber: csd.trim(), taxCompliant: tax });
    if (r) onDone();
  };
  return (
    <Modal open onClose={onClose} title={`Verify ${supplier.providerName}`} subtitle={`Supplier ${supplier.supplierNumber}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={<BadgeCheck size={16} />} loading={verify.loading} onClick={submit}>Verify supplier</Button></>}>
      <div className="space-y-4">
        <Callout tone="info">
          Record the Central Supplier Database (CSD) number and confirm tax compliance. Both are required to activate the supplier.
        </Callout>
        <ErrorBanner error={verify.error} />
        <Field label="CSD number" required hint="e.g. MAAA0123456">
          <Input value={csd} onChange={(e) => setCsd(e.target.value)} placeholder="MAAA…" autoComplete="off" />
        </Field>
        <Checkbox label="Tax compliant (confirmed)" checked={tax} onChange={setTax} />
      </div>
    </Modal>
  );
}
