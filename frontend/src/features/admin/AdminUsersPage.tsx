import React, { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Search, Shield, Trash2, UserCog, UserMinus, UserPlus, X } from 'lucide-react';
import { api } from '../../api/client';
import { Button, Card, DataTable, EmptyState, ErrorBanner, Field, Input, Modal, PageHeader, Select, StatusBadge } from '../../components/ui';
import { useAction, useApi } from '../../lib/hooks';
import { ROLE_LABEL } from '../../lib/labels';
import type { UserDto, UserRole } from '../../api/types';
import { useAuth } from '../../app/auth';
import { dateTime } from '../../lib/format';

const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as UserRole[]).filter((r) => r !== 'SYSTEM');

type UserForm = {
  fullName: string;
  email: string;
  title: string;
  role: UserRole;
  active: boolean;
  password?: string;
};

const emptyForm = (): UserForm => ({ fullName: '', email: '', title: '', role: 'DEPARTMENT_OFFICER', active: true, password: '' });

export default function AdminUsersPage() {
  const { has, user } = useAuth();
  const canManage = has('ADMIN');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [error, setError] = useState<string | null>(null);

  const { data, loading, error: loadError, reload } = useApi(() => api.get<UserDto[]>('/admin/users'), []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((u) => {
      const matchesSearch = !term || [u.fullName, u.email].some((v) => v.toLowerCase().includes(term));
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? u.active : !u.active);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [data, roleFilter, search, statusFilter]);

  const saveUser = useAction(async (body: unknown) => {
    if (editing) {
      return api.put<UserDto>(`/admin/users/${editing.id}`, body as any);
    }
    return api.post<UserDto>('/admin/users', body as any);
  }, (res) => editing ? `User updated successfully` : `User created successfully`);

  const toggleStatus = useAction(async (target: UserDto, active: boolean) =>
    api.patch<UserDto>(`/admin/users/${target.id}/status`, { active }),
    (result) => (result?.active ? 'User activated successfully' : 'User deactivated successfully'));

  const updateRole = useAction(async (target: UserDto, role: UserRole) =>
    api.patch<UserDto>(`/admin/users/${target.id}/role`, { role }), 'User role updated successfully');

  const deleteUser = useAction(async (target: UserDto) =>
    api.delete<void>(`/admin/users/${target.id}`), 'User deleted successfully');

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
    setError(null);
  };

  const openEdit = (u: UserDto) => {
    setEditing(u);
    setForm({
      fullName: u.fullName,
      email: u.email,
      title: u.title ?? '',
      role: u.role,
      active: u.active,
      password: '',
    });
    setOpen(true);
    setError(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.fullName.trim() || !form.email.trim()) {
      setError('Full name and email are required.');
      return;
    }
    const body = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      title: form.title.trim() || 'User',
      role: form.role,
      active: form.active,
      departmentId: null,
      providerId: null,
      password: form.password && form.password.trim() ? form.password.trim() : undefined,
    };
    const res = await saveUser.run(editing ? { ...body, fullName: body.fullName, email: body.email, title: body.title, role: form.role, active: form.active } : body);
    if (res) {
      setOpen(false);
      void reload();
    }
  };

  if (!canManage) return <EmptyState title="Access denied" message="Only administrators can access user management." />;
  if (loading && !data) return <div className="py-12 text-sm text-slate-500">Loading users…</div>;
  if (loadError && !data) return <ErrorBanner error={loadError} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="User Management"
        subtitle="Manage users, roles and account access."
        actions={(
          <Button icon={<Plus size={15} />} onClick={openCreate}>Add User</Button>
        )}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9" />
          </div>
          <div className="flex gap-3">
            <Select value={roleFilter} onChange={(e) => setRoleFilter((e.target.value as UserRole | 'ALL'))} className="min-w-[150px]">
              <option value="ALL">All roles</option>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')} className="min-w-[130px]">
              <option value="ALL">All status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </div>
        </div>
      </div>

      <Card>
        <DataTable
          columns={[
            { key: 'name', header: 'Name', render: (u: UserDto) => <div><div className="font-medium text-slate-800">{u.fullName}</div></div> },
            { key: 'email', header: 'Email', render: (u: UserDto) => <a href={`mailto:${u.email}`} className="text-brand-700 hover:underline">{u.email}</a> },
            { key: 'role', header: 'Role', render: (u: UserDto) => <span className="text-sm text-slate-700">{ROLE_LABEL[u.role]}</span> },
            { key: 'status', header: 'Status', render: (u: UserDto) => <StatusBadge status={u.active ? 'ACTIVE' : 'SUSPENDED'} /> },
            { key: 'created', header: 'Created', render: (u: UserDto) => <span className="text-xs text-slate-500">{u.createdAt ? dateTime(u.createdAt) : '—'}</span> },
            { key: 'actions', header: 'Actions', render: (u: UserDto) => (
              <div className="flex gap-2">
                <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Edit" onClick={() => openEdit(u)}><Pencil size={15} /></button>
                <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title={u.active ? 'Deactivate' : 'Activate'} onClick={() => void toggleStatus.run(u, !u.active)}>
                  {u.active ? <UserMinus size={15} /> : <UserPlus size={15} />}
                </button>
                <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Change role" onClick={() => {
                  const nextRole = u.role === 'ADMIN' ? 'DEPARTMENT_OFFICER' : 'ADMIN';
                  void updateRole.run(u, nextRole);
                }}><UserCog size={15} /></button>
                {u.id !== user?.id && (
                  <button className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50" title="Delete" onClick={() => void deleteUser.run(u)}><Trash2 size={15} /></button>
                )}
              </div>
            ) },
          ]}
          rows={filtered}
          rowKey={(u) => u.id}
          empty={<EmptyState title="No users found." message="Try a different search or role filter." />}
        />
      </Card>

      <Modal open={open} title={editing ? 'Edit user' : 'Add user'} onClose={() => setOpen(false)} wide>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name" required>
              <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="Title">
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </Field>
            <Field label="Role" required>
              <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}>
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </Select>
            </Field>
          </div>
          {!editing && (
            <Field label="Password" required>
              <Input type="password" value={form.password ?? ''} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </Field>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 accent-brand-600" />
            <span className="text-sm text-slate-700">Active</span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saveUser.loading} icon={<Check size={15} />}>{editing ? 'Save changes' : 'Create user'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
