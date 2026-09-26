import React from 'react';
import { useAuth } from './auth';
import { Layout } from './Layout';
import { match, usePath } from './router';
import { Toaster } from './toast';
import { EmptyState, Loading } from '../components/ui';
import LoginPage from '../features/login/LoginPage';
import Overview from '../features/dashboard/Overview';
import NeedsList from '../features/needs/NeedsList';
import NewNeed from '../features/needs/NewNeed';
import NeedDetail from '../features/needs/NeedDetail';
import Approvals from '../features/approvals/Approvals';
import OpportunitiesList from '../features/opportunities/OpportunitiesList';
import OpportunityDetail from '../features/opportunities/OpportunityDetail';
import EvaluationsList from '../features/evaluations/EvaluationsList';
import EvaluationBoard from '../features/evaluations/EvaluationBoard';
import Procurement from '../features/procurement/Procurement';
import QuoteBoard from '../features/procurement/QuoteBoard';
import ImplementationsList from '../features/implementations/ImplementationsList';
import ImplementationDetail from '../features/implementations/ImplementationDetail';
import ImpactPortfolio from '../features/impact/ImpactPortfolio';
import Solutions from '../features/solutions/Solutions';
import ProvidersList from '../features/providers/ProvidersList';
import ProviderDetail from '../features/providers/ProviderDetail';
import MapPage from '../features/map/MapPage';
import AuditLog from '../features/audit/AuditLog';
import AiPage from '../features/ai/AiPage';
import Settings from '../features/settings/Settings';
import AdminUsersPage from '../features/admin/AdminUsersPage';

type Route = { pattern: string; render: (p: Record<string, string>) => React.ReactNode };

/** Hash routes (deep-linkable). Order matters: static paths before ":id" paths. */
const ROUTES: Route[] = [
  { pattern: '/', render: () => <Overview /> },
  { pattern: '/needs', render: () => <NeedsList /> },
  { pattern: '/needs/new', render: () => <NewNeed /> },
  { pattern: '/needs/:id', render: (p) => <NeedDetail id={p.id} /> },
  { pattern: '/approvals', render: () => <Approvals /> },
  { pattern: '/opportunities', render: () => <OpportunitiesList /> },
  { pattern: '/opportunities/:id', render: (p) => <OpportunityDetail id={p.id} /> },
  { pattern: '/evaluations', render: () => <EvaluationsList /> },
  { pattern: '/evaluations/:id', render: (p) => <EvaluationBoard id={p.id} /> },
  { pattern: '/procurement', render: () => <Procurement /> },
  { pattern: '/procurement/requests/:id', render: (p) => <QuoteBoard id={p.id} /> },
  { pattern: '/implementations', render: () => <ImplementationsList /> },
  { pattern: '/implementations/:id', render: (p) => <ImplementationDetail id={p.id} /> },
  { pattern: '/impact', render: () => <ImpactPortfolio /> },
  { pattern: '/solutions', render: () => <Solutions /> },
  { pattern: '/providers', render: () => <ProvidersList /> },
  { pattern: '/providers/:id', render: (p) => <ProviderDetail id={p.id} /> },
  { pattern: '/map', render: () => <MapPage /> },
  { pattern: '/audit', render: () => <AuditLog /> },
  { pattern: '/admin/users', render: () => <AdminUsersPage /> },
  { pattern: '/ai', render: () => <AiPage /> },
  { pattern: '/settings', render: () => <Settings /> },
];

function Routes() {
  const path = usePath();
  for (const r of ROUTES) {
    const params = match(r.pattern, path);
    if (params) return <React.Fragment key={path}>{r.render(params)}</React.Fragment>;
  }
  return <EmptyState title="Page not found" message={`No screen at ${path}`} />;
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <>
      {loading ? <Loading label="Restoring your session…" /> : user ? <Layout><Routes /></Layout> : <LoginPage />}
      <Toaster />
    </>
  );
}
