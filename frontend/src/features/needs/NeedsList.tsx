import { useMemo, useState } from 'react';
import { ClipboardList, Plus, Search } from 'lucide-react';
import { api } from '../../api/client';
import type { DepartmentDto, LifecycleStage, NeedCategory, NeedSummaryDto } from '../../api/types';
import { useAuth } from '../../app/auth';
import { navigate } from '../../app/router';
import { Button, Card, DataTable, EmptyState, ErrorBanner, Input, Loading, Mono, PageHeader, Select, StatusBadge, type Column } from '../../components/ui';
import { date, money } from '../../lib/format';
import { useApi } from '../../lib/hooks';
import { CATEGORY_LABEL, STAGE_LABEL } from '../../lib/labels';

const STAGES: LifecycleStage[] = ['NEED', 'APPROVAL', 'OPPORTUNITY', 'EVALUATION', 'PROCUREMENT', 'IMPLEMENTATION', 'IMPACT', 'CLOSED', 'REJECTED'];

export default function NeedsList() {
  const { has } = useAuth();
  const needs = useApi(() => api.get<NeedSummaryDto[]>('/needs'));
  const departments = useApi(() => api.get<DepartmentDto[]>('/departments'));
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('');
  const [category, setCategory] = useState<NeedCategory | ''>('');
  const [stage, setStage] = useState<LifecycleStage | ''>('');

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (needs.data ?? []).filter((n) =>
      (!term || n.reference.toLowerCase().includes(term) || n.title.toLowerCase().includes(term)) &&
      (!dept || n.departmentId === dept) &&
      (!category || n.category === category) &&
      (!stage || n.stage === stage));
  }, [needs.data, q, dept, category, stage]);

  const canCreate = has('DEPARTMENT_OFFICER', 'DEPARTMENT_MANAGER');
  const filtered = q || dept || category || stage;

  const columns: Column<NeedSummaryDto>[] = [
    { key: 'ref', header: 'Reference', render: (n) => <Mono>{n.reference}</Mono>, className: 'whitespace-nowrap' },
    { key: 'title', header: 'Public need', render: (n) => <span className="font-medium text-slate-900">{n.title}</span>, className: 'min-w-[200px]' },
    { key: 'dept', header: 'Department', render: (n) => <span className="text-slate-600">{n.departmentName}</span>, className: 'min-w-[140px]' },
    { key: 'cat', header: 'Category', render: (n) => <span className="text-slate-600">{CATEGORY_LABEL[n.category]}</span>, className: 'min-w-[130px]' },
    { key: 'budget', header: 'Est. budget', align: 'right', render: (n) => <span className="whitespace-nowrap font-medium">{money(n.estimatedBudget)}</span> },
    { key: 'stage', header: 'Stage', render: (n) => <StatusBadge status={n.stage} /> },
    { key: 'req', header: 'Request', render: (n) => n.requestStatus ? <StatusBadge status={n.requestStatus} /> : n.status === 'DRAFT' ? <StatusBadge status="DRAFT" /> : <span className="text-slate-400">—</span> },
    { key: 'created', header: 'Created', render: (n) => <span className="whitespace-nowrap text-slate-500">{date(n.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Public needs"
        title="Public needs register"
        subtitle="Every procurement starts with a documented public problem. Follow each need from approval through to measurable impact."
        actions={canCreate && <Button icon={<Plus size={16} />} onClick={() => navigate('/needs/new')}>New public need</Button>}
      />

      <Card padded={false}>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input aria-label="Search needs" placeholder="Search reference or title" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select aria-label="Department" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">All departments</option>
            {(departments.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value as NeedCategory | '')}>
            <option value="">All categories</option>
            {(Object.keys(CATEGORY_LABEL) as NeedCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </Select>
          <Select aria-label="Stage" value={stage} onChange={(e) => setStage(e.target.value as LifecycleStage | '')}>
            <option value="">All stages</option>
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </Select>
        </div>

        {needs.loading && !needs.data ? <Loading label="Loading public needs…" /> : needs.error ? (
          <div className="p-4"><ErrorBanner error={needs.error} onRetry={needs.reload} /></div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 pt-3 text-xs text-slate-500">
              <span>{rows.length} of {needs.data?.length ?? 0} needs</span>
              {filtered && (
                <button className="font-semibold text-brand-700 hover:underline" onClick={() => { setQ(''); setDept(''); setCategory(''); setStage(''); }}>
                  Clear filters
                </button>
              )}
            </div>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(n) => n.id}
              onRowClick={(n) => navigate(`/needs/${n.id}`)}
              empty={
                <div className="p-4">
                  <EmptyState
                    icon={<ClipboardList size={32} />}
                    title={filtered ? 'No needs match these filters' : 'No public needs yet'}
                    message={filtered ? 'Try a different search or clear the filters.' : 'Start by documenting a public problem your department needs solved.'}
                    action={!filtered && canCreate ? <Button icon={<Plus size={16} />} onClick={() => navigate('/needs/new')}>New public need</Button> : undefined}
                  />
                </div>
              }
            />
          </>
        )}
      </Card>
    </div>
  );
}
