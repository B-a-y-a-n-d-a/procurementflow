import { useMemo, useState } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { api } from '../../api/client';
import type { UserDto, UserRole } from '../../api/types';
import { useAuth } from '../../app/auth';
import { useApi } from '../../lib/hooks';
import { ROLE_LABEL } from '../../lib/labels';
import { Avatar, Badge, ErrorBanner, Loading } from '../../components/ui';

/** The judge-demo cast, in lifecycle order (see docs/product/05-judge-demo.md). */
const CAST: { id: string; step: string }[] = [
  { id: 'u-thandi', step: '1 · Records the public need' },
  { id: 'u-sipho', step: '2 · Approves (Department Manager)' },
  { id: 'u-lerato', step: '3 · Approves high-value spend' },
  { id: 'u-johan', step: '4 · Publishes, evaluates, issues PO' },
  { id: 'u-nomsa', step: '5 · Local SME submits a solution' },
  { id: 'u-ayesha', step: '6 · Sees investment → impact' },
  { id: 'u-grace', step: '7 · Verifies the audit trail' },
  { id: 'u-lindiwe', step: 'Admin · rules & demo reset' },
];

const ROLE_GROUPS: UserRole[] = ['DEPARTMENT_OFFICER', 'DEPARTMENT_MANAGER', 'FINANCE_DIRECTOR', 'PROCUREMENT_OFFICER', 'PROVIDER', 'EXECUTIVE', 'AUDITOR', 'ADMIN'];

export default function LoginPage() {
  const { login } = useAuth();
  const personas = useApi(() => api.get<UserDto[]>('/auth/personas'));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const byId = useMemo(() => new Map((personas.data ?? []).map((u) => [u.id, u])), [personas.data]);
  const others = (personas.data ?? []).filter((u) => !CAST.some((c) => c.id === u.id));

  const pick = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await login(id);
    } catch (e) {
      setError(e as Error);
      setBusy(null);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-5 lg:py-16">
        <div className="text-white lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 13l5 5L20 7" /></svg>
            </div>
            <span className="text-xl font-extrabold tracking-tight">CIVICFLOW</span>
          </div>
          <h1 className="mt-8 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            From Public Need to <span className="text-gold-400">Measurable Impact.</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-brand-100">
            A public innovation, procurement and impact management platform. It connects public-sector problems with local
            solutions, runs transparent procurement, tracks implementation and measures real-world outcomes.
          </p>
          <ol className="mt-8 space-y-2 text-sm text-brand-50">
            {['Public need', 'Local innovation', 'Transparent procurement', 'Implementation', 'Measurable impact'].map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold ring-1 ring-white/20">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <div className="mt-10 flex items-start gap-2 rounded-xl bg-white/5 p-4 text-xs text-brand-100 ring-1 ring-white/10">
            <Info size={16} className="mt-0.5 shrink-0 text-gold-400" />
            <span>
              <strong className="text-white">Demo sign-in.</strong> Pick a persona. There are no passwords, and every request carries the
              persona in an <code className="font-mono">X-Demo-User</code> header. All organisations and people are fictional
              (Mzansi Metro).
            </span>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Choose a persona</h2>
              <Badge tone="gold">Judge demo cast</Badge>
            </div>
            {personas.loading && <Loading label="Connecting to the CIVICFLOW API…" />}
            <ErrorBanner error={personas.error ?? error} onRetry={personas.error ? personas.reload : undefined} />
            {personas.data && (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CAST.map((c) => {
                    const u = byId.get(c.id);
                    if (!u) return null;
                    return (
                      <button key={c.id} onClick={() => pick(c.id)} disabled={!!busy}
                        className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-brand-400 hover:bg-brand-50/50 disabled:opacity-60">
                        <Avatar name={u.fullName} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">{u.fullName}</span>
                          <span className="block truncate text-[11px] text-slate-500">{ROLE_LABEL[u.role]}{u.departmentName ? ` · ${u.departmentName}` : u.providerName ? ` · ${u.providerName}` : ''}</span>
                          <span className="mt-0.5 block text-[11px] font-medium text-brand-700">{c.step}</span>
                        </span>
                        <ArrowRight size={16} className="text-slate-300 group-hover:text-brand-600" />
                      </button>
                    );
                  })}
                </div>
                <details className="mt-5">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800">More personas ({others.length})</summary>
                  <div className="mt-3 space-y-3">
                    {ROLE_GROUPS.map((role) => {
                      const group = others.filter((u) => u.role === role);
                      if (group.length === 0) return null;
                      return (
                        <div key={role}>
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{ROLE_LABEL[role]}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {group.map((u) => (
                              <button key={u.id} onClick={() => pick(u.id)} disabled={!!busy}
                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:border-brand-400 hover:bg-brand-50">
                                {u.fullName} <span className="text-slate-400">· {u.departmentName ?? u.providerName ?? ''}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
