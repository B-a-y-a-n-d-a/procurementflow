import { useUser } from '../../app/auth';
import { EmptyState } from '../../components/ui';
import ExecutiveDashboard from './ExecutiveDashboard';
import DepartmentDashboard from './DepartmentDashboard';
import ProcurementDashboard from './ProcurementDashboard';
import ProviderDashboard from './ProviderDashboard';

/** Home screen: one dashboard per role. */
export default function Overview() {
  const user = useUser();
  switch (user.role) {
    case 'EXECUTIVE':
    case 'ADMIN':
    case 'AUDITOR':
    case 'FINANCE_DIRECTOR':
      return <ExecutiveDashboard />;
    case 'DEPARTMENT_OFFICER':
    case 'DEPARTMENT_MANAGER':
      return user.departmentId
        ? <DepartmentDashboard departmentId={user.departmentId} />
        : <EmptyState title="No department linked" message="Your profile is not linked to a department yet." />;
    case 'PROCUREMENT_OFFICER':
    case 'EVALUATOR':
      return <ProcurementDashboard />;
    case 'PROVIDER':
      return <ProviderDashboard />;
    default:
      return <ExecutiveDashboard />;
  }
}
