import { ClipboardCheck, FileSignature, Inbox, Megaphone, ReceiptText, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client';
import type { OpportunitySummaryDto, ProcurementDashboardDto, PurchaseOrderDto, PurchaseRequestDto, SupplierDto } from '../../api/types';
import { useUser } from '../../app/auth';
import { Link, navigate } from '../../app/router';
import {
  Badge, Card, DataTable, EmptyState, ErrorBanner, Grid, Loading, Mono, PageHeader, Stat, StatusBadge, type Column,
} from '../../components/ui';
import { date, money, num } from '../../lib/format';
import { bbbee, PROVIDER_TYPE_LABEL } from '../../lib/labels';

import { useApi } from '../../lib/hooks';

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function ProcurementDashboard() {
  const user = useUser();
  const { data, error, loading, reload } = useApi(() => api.get<ProcurementDashboardDto>('/dashboard/procurement'));

  if (loading && !data) return <Loading label="Loading procurement workbench…" />;
  if (error && !data) return <ErrorBanner error={error} onRetry={reload} />;
  if (!data) return null;

  const needCols: Column<PurchaseRequestDto>[] = [
    { key: 'ref', header: 'Need', render: (r) => <div><Link to={`/needs/${r.needId}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{r.needTitle}</Link><div><Mono>{r.needReference} · {r.reference}</Mono></div></div> },
    { key: 'dept', header: 'Department', render: (r) => <span className="text-xs text-slate-600">{r.departmentName}</span> },
    { key: 'amount', header: 'Approved amount', align: 'right', render: (r) => <span className="whitespace-nowrap">{money(r.amount)}</span> },
    { key: 'decided', header: 'Approved', render: (r) => <span className="whitespace-nowrap text-xs">{date(r.decidedAt)}</span> },
    { key: 'go', header: '', align: 'right', render: (r) => <Link to={`/needs/${r.needId}`} className="whitespace-nowrap text-xs font-semibold text-brand-700 hover:underline">Convert to opportunity →</Link> },
  ];

  const evalCols: Column<OpportunitySummaryDto>[] = [
    { key: 'title', header: 'Opportunity', render: (o) => <div><Link to={`/evaluations/${o.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{o.title}</Link><div><Mono>{o.reference}</Mono></div></div> },
    { key: 'subs', header: 'Submissions', align: 'right', render: (o) => num(o.submissionCount) },
    { key: 'closed', header: 'Closed', render: (o) => <span className="whitespace-nowrap text-xs">{date(o.submissionDeadline)}</span> },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.displayStatus} /> },
  ];

  const oppCols: Column<OpportunitySummaryDto>[] = [
    { key: 'title', header: 'Opportunity', render: (o) => <div><Link to={`/opportunities/${o.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{o.title}</Link><div><Mono>{o.reference} · {o.departmentName}</Mono></div></div> },
    { key: 'budget', header: 'Budget', align: 'right', render: (o) => <span className="whitespace-nowrap">{money(o.budget)}</span> },
    { key: 'deadline', header: 'Deadline', render: (o) => <span className="whitespace-nowrap text-xs">{date(o.submissionDeadline)}{o.status === 'PUBLISHED' && o.daysToDeadline >= 0 ? ` · ${o.daysToDeadline} d` : ''}</span> },
    { key: 'subs', header: 'Submissions', align: 'right', render: (o) => <span className="font-semibold">{num(o.submissionCount)}</span> },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.displayStatus} /> },
  ];

  const quoteCols: Column<PurchaseRequestDto>[] = [
    { key: 'ref', header: 'Request', render: (r) => <div><Link to={`/procurement/requests/${r.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{r.needTitle}</Link><div><Mono>{r.reference}</Mono></div></div> },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="whitespace-nowrap">{money(r.amount)}</span> },
    { key: 'quotes', header: 'Quotes', align: 'right', render: (r) => num(r.quoteCount) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const poCols: Column<PurchaseOrderDto>[] = [
    { key: 'po', header: 'PO', render: (p) => <div><Link to={`/needs/${p.needId}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{p.needTitle}</Link><div><Mono>{p.poNumber}</Mono></div></div> },
    { key: 'supplier', header: 'Supplier', render: (p) => <div className="text-xs"><div>{p.supplierName}</div><StatusBadge status={p.supplierStatus} /></div> },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => <span className="whitespace-nowrap">{money(p.amount)}</span> },
    { key: 'flags', header: 'Status', render: (p) => <div className="flex flex-wrap gap-1"><StatusBadge status={p.status} />{p.isDeviation && <Badge tone="warning" title="Selected option differs from the recommendation">Deviation</Badge>}</div> },
  ];

  const supCols: Column<SupplierDto>[] = [
    { key: 'name', header: 'Provider', render: (s) => <div><Link to={`/providers/${s.providerId}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{s.providerName}</Link><div><Mono>{s.supplierNumber}</Mono></div></div> },
    { key: 'type', header: 'Type', render: (s) => <span className="text-xs">{PROVIDER_TYPE_LABEL[s.providerType]}</span> },
    { key: 'bbbee', header: 'B-BBEE', render: (s) => <span className="text-xs">{bbbee(s.bbbeeLevel)}</span> },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
  ];

  const emptyRow = (title: string, message?: string) => <div className="p-5"><EmptyState title={title} message={message} /></div>;
  const procLink = <Link to="/procurement" className="text-xs font-semibold text-brand-700 hover:underline">Open procurement</Link>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Procurement workbench"
        title={`Good day, ${user.fullName.split(' ')[0]}`}
        subtitle="Everything waiting on procurement right now: sourcing, evaluation, quotations, purchase orders and supplier verification."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Awaiting sourcing" value={num(data.awaitingSourcing.length)} icon={<Inbox size={16} />} tone={data.awaitingSourcing.length ? 'warning' : 'neutral'} onClick={() => scrollTo('sec-awaiting')} />
        <Stat label="Evaluation queue" value={num(data.evaluationQueue.length)} icon={<ClipboardCheck size={16} />} tone="info" onClick={() => scrollTo('sec-eval')} />
        <Stat label="Opportunities" value={num(data.activeOpportunities.length)} icon={<Megaphone size={16} />} tone="brand" onClick={() => scrollTo('sec-opps')} />
        <Stat label="Quotation requests" value={num(data.quoteRequests.length)} icon={<ReceiptText size={16} />} tone="brand" onClick={() => scrollTo('sec-quotes')} />
        <Stat label="Draft POs" value={num(data.pendingPurchaseOrders.length)} icon={<FileSignature size={16} />} tone="gold" onClick={() => navigate('/procurement')} />
        <Stat label="Suppliers to verify" value={num(data.suppliersPendingVerification.length)} icon={<ShieldCheck size={16} />} tone={data.suppliersPendingVerification.length ? 'warning' : 'neutral'} onClick={() => navigate('/procurement')} />
      </div>

      <div id="sec-awaiting" className="scroll-mt-20">
        <Card title="Approved needs awaiting an opportunity" subtitle="Approved open-innovation requests. Open the need to convert it into a published opportunity." padded={false}>
          <DataTable columns={needCols} rows={data.awaitingSourcing} rowKey={(r) => r.id} empty={emptyRow('Nothing awaiting sourcing')} />
        </Card>
      </div>

      <Grid cols={2}>
        <div id="sec-eval" className="scroll-mt-20">
          <Card title="Evaluation queue" subtitle="Closed opportunities ready for scoring" padded={false}
            actions={<Link to="/evaluations" className="text-xs font-semibold text-brand-700 hover:underline">All evaluations</Link>}>
            <DataTable dense columns={evalCols} rows={data.evaluationQueue} rowKey={(o) => o.id} empty={emptyRow('No evaluations pending')} />
          </Card>
        </div>
        <div id="sec-quotes" className="scroll-mt-20">
          <Card title="Quotation requests" subtitle="Approved low-value requests collecting quotes" padded={false} actions={procLink}>
            <DataTable dense columns={quoteCols} rows={data.quoteRequests} rowKey={(r) => r.id} empty={emptyRow('No quotation requests')} />
          </Card>
        </div>
      </Grid>

      <div id="sec-opps" className="scroll-mt-20">
        <Card title="Active and draft opportunities" padded={false}
          actions={<Link to="/opportunities" className="text-xs font-semibold text-brand-700 hover:underline">Marketplace</Link>}>
          <DataTable columns={oppCols} rows={data.activeOpportunities} rowKey={(o) => o.id} empty={emptyRow('No active opportunities')} />
        </Card>
      </div>

      <Grid cols={2}>
        <Card title="Draft purchase orders awaiting issue" padded={false} actions={procLink}>
          <DataTable dense columns={poCols} rows={data.pendingPurchaseOrders} rowKey={(p) => p.id} empty={emptyRow('No draft POs')} />
        </Card>
        <Card title="Suppliers pending verification" subtitle="Selected providers who need CSD and tax verification" padded={false} actions={procLink}>
          <DataTable dense columns={supCols} rows={data.suppliersPendingVerification} rowKey={(s) => s.id} empty={emptyRow('No suppliers to verify')} />
        </Card>
      </Grid>
    </div>
  );
}
