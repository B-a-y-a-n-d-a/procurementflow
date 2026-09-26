import {
  Activity, BarChart3, ClipboardCheck, FileSearch, Gauge, Landmark, Lightbulb, Map, Scale, ScrollText, Settings,
  ShoppingCart, Sparkles, Users, Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '../api/types';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Lifecycle stage group for the sidebar */
  group: 'Overview' | 'Need' | 'Innovation' | 'Procurement' | 'Delivery & impact' | 'Oversight';
  roles: UserRole[] | 'ALL' | 'STAFF';
}

/** Role-based navigation (FR-002). The backend enforces the same permissions (SEC-01). */
export const NAV: NavItem[] = [
  { path: '/', label: 'Overview', icon: Gauge, group: 'Overview', roles: 'ALL' },
  { path: '/needs', label: 'Public Needs', icon: Landmark, group: 'Need', roles: 'STAFF' },
  { path: '/approvals', label: 'Approvals', icon: ClipboardCheck, group: 'Need', roles: ['DEPARTMENT_MANAGER', 'FINANCE_DIRECTOR', 'EXECUTIVE', 'ADMIN'] },
  { path: '/opportunities', label: 'Opportunities', icon: FileSearch, group: 'Innovation', roles: 'ALL' },
  { path: '/solutions', label: 'Solutions', icon: Lightbulb, group: 'Innovation', roles: 'ALL' },
  { path: '/providers', label: 'Providers', icon: Users, group: 'Innovation', roles: 'ALL' },
  { path: '/evaluations', label: 'Evaluations', icon: Scale, group: 'Procurement', roles: ['PROCUREMENT_OFFICER', 'EVALUATOR', 'EXECUTIVE', 'AUDITOR', 'ADMIN'] },
  { path: '/procurement', label: 'Procurement', icon: ShoppingCart, group: 'Procurement', roles: ['PROCUREMENT_OFFICER', 'FINANCE_DIRECTOR', 'EXECUTIVE', 'AUDITOR', 'ADMIN'] },
  { path: '/implementations', label: 'Implementations', icon: Wrench, group: 'Delivery & impact', roles: 'STAFF' },
  { path: '/impact', label: 'Impact', icon: Activity, group: 'Delivery & impact', roles: 'STAFF' },
  { path: '/map', label: 'Map', icon: Map, group: 'Delivery & impact', roles: 'ALL' },
  { path: '/ai', label: 'CIVIC AI', icon: Sparkles, group: 'Oversight', roles: 'STAFF' },
  { path: '/audit', label: 'Audit Log', icon: ScrollText, group: 'Oversight', roles: 'STAFF' },
  { path: '/admin/users', label: 'Users', icon: Users, group: 'Oversight', roles: ['ADMIN'] },
  { path: '/settings', label: 'Business Rules', icon: Settings, group: 'Oversight', roles: 'STAFF' },
];

export const GROUP_ORDER: NavItem['group'][] = ['Overview', 'Need', 'Innovation', 'Procurement', 'Delivery & impact', 'Oversight'];

export function allowed(item: NavItem, role: UserRole): boolean {
  if (item.roles === 'ALL') return true;
  if (item.roles === 'STAFF') return role !== 'PROVIDER';
  return item.roles.includes(role);
}

export const BarIcon = BarChart3;
