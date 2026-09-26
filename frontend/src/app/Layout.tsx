import React, { useEffect, useRef, useState } from 'react';
import { Bell, ChevronsUpDown, Menu, Sparkles, X } from 'lucide-react';
import { api } from '../api/client';
import type { NotificationListDto } from '../api/types';
import { useAuth, useUser } from './auth';
import { allowed, GROUP_ORDER, NAV } from './nav';
import { Link, navigate, usePath } from './router';
import { Avatar, Badge } from '../components/ui';
import { AiDrawer } from '../components/AiPanel';
import { ROLE_LABEL } from '../lib/labels';
import { relative } from '../lib/format';

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 13l5 5L20 7" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-extrabold tracking-tight text-slate-900">CIVICFLOW</div>
        <div className="text-[10px] font-medium text-slate-500">From Public Need to Measurable Impact</div>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useUser();
  const path = usePath();
  const items = NAV.filter((n) => allowed(n, user.role));
  const isActive = (p: string) => (p === '/' ? path === '/' : path === p || path.startsWith(p + '/'));
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5"><Brand /></div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4" aria-label="Main">
        {GROUP_ORDER.map((g) => {
          const group = items.filter((i) => i.group === g);
          if (group.length === 0) return null;
          return (
            <div key={g}>
              {g !== 'Overview' && <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{g}</div>}
              {group.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <a
                    key={item.path}
                    href={'#' + item.path}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={17} className={active ? 'text-brand-600' : 'text-slate-400'} />
                    {item.label}
                  </a>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="m-3 rounded-xl bg-gradient-to-br from-brand-700 to-brand-900 p-4 text-white">
        <div className="text-[10px] font-bold uppercase tracking-widest text-brand-200">One lifecycle</div>
        <div className="mt-1.5 text-xs leading-relaxed text-brand-50">
          Need → Local innovation → Transparent procurement → Implementation → <span className="font-semibold text-gold-400">Measurable impact</span>
        </div>
      </div>
    </div>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationListDto | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const load = () => api.get<NotificationListDto>('/notifications').then(setData).catch(() => undefined);
  useEffect(() => {
    void load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const unread = data?.unread ?? 0;
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); void load(); }}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        aria-label={`Notifications (${unread} unread)`}
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="animate-fade-in absolute right-0 z-40 mt-2 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button className="text-xs font-semibold text-brand-700 hover:underline"
                onClick={() => api.post<NotificationListDto>('/notifications/read-all').then(setData)}>
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {(data?.items ?? []).length === 0 && <div className="px-4 py-8 text-center text-sm text-slate-400">You're all caught up.</div>}
            {(data?.items ?? []).map((n) => (
              <button
                key={n.id}
                onClick={async () => {
                  if (!n.isRead) setData(await api.post<NotificationListDto>(`/notifications/${n.id}/read`));
                  setOpen(false);
                  if (n.link) navigate(n.link);
                }}
                className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${n.isRead ? '' : 'bg-brand-50/40'}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-brand-500'}`} aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-800">{n.title}</span>
                  <span className="block text-xs text-slate-500">{n.message}</span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">{relative(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const user = useUser();
  const { logout } = useAuth();
  return (
    <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
      <Avatar name={user.fullName} />
      <div className="hidden min-w-0 text-left leading-tight md:block">
        <div className="truncate text-sm font-semibold text-slate-800">{user.fullName}</div>
        <div className="truncate text-[11px] text-slate-500">
          {ROLE_LABEL[user.role]}{user.departmentName ? ` · ${user.departmentName}` : user.providerName ? ` · ${user.providerName}` : ''}
        </div>
      </div>
      <button onClick={logout} title="Switch persona" className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
        <ChevronsUpDown size={14} /> <span className="hidden sm:inline">Switch</span>
      </button>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState(false);
  const [ai, setAi] = useState(false);
  const { isStaff } = useAuth();
  return (
    <div className="flex min-h-full">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <Sidebar />
      </aside>
      {menu && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setMenu(false)}>
          <aside className="animate-slide-up h-full w-72 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button className="absolute right-3 top-4 rounded-lg p-1 text-slate-500" onClick={() => setMenu(false)} aria-label="Close menu"><X size={18} /></button>
            <Sidebar onNavigate={() => setMenu(false)} />
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu"><Menu size={20} /></button>
            <div className="lg:hidden"><Link to="/"><span className="text-sm font-extrabold tracking-tight">CIVICFLOW</span></Link></div>
            <Badge tone="gold" className="hidden sm:inline-flex">Demo · Mzansi Metro (fictional)</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            {isStaff && (
              <button onClick={() => setAi(true)} className="flex items-center gap-1.5 rounded-lg bg-gold-50 px-3 py-1.5 text-xs font-semibold text-gold-600 ring-1 ring-gold-100 hover:bg-gold-100">
                <Sparkles size={14} /> <span className="hidden sm:inline">Ask CIVIC AI</span>
              </button>
            )}
            <Notifications />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
        <footer className="border-t border-slate-200 px-6 py-4 text-center text-[11px] text-slate-400">
          CIVICFLOW · open-source hackathon MVP · business rules are configurable organisational rules, not legal advice.
        </footer>
      </div>
      <AiDrawer open={ai} onClose={() => setAi(false)} />
    </div>
  );
}
