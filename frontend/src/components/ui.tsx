import React, { useEffect } from 'react';
import { AlertTriangle, Inbox, Loader2, X } from 'lucide-react';
import { statusTone, type Tone } from '../lib/labels';
import type { ApiRequestError } from '../api/client';

/* ------------------------------------------------------------------ layout */

export function PageHeader({ title, subtitle, actions, eyebrow }: {
  title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-700">{eyebrow}</div>}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, subtitle, actions, children, className = '', padded = true, icon }: {
  title?: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode;
  className?: string; padded?: boolean; icon?: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-start gap-2.5">
            {icon && <div className="mt-0.5 text-brand-600">{icon}</div>}
            <div className="min-w-0">
              {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export function Grid({ children, cols = 3, className = '' }: { children: React.ReactNode; cols?: 2 | 3 | 4; className?: string }) {
  const c = cols === 2 ? 'lg:grid-cols-2' : cols === 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2 xl:grid-cols-3';
  return <div className={`grid grid-cols-1 gap-4 ${c} ${className}`}>{children}</div>;
}

/* ------------------------------------------------------------------ data display */

const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-rose-50 text-rose-800 ring-rose-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  gold: 'bg-gold-50 text-gold-600 ring-gold-100',
};

export function Badge({ tone = 'neutral', children, className = '', title }: { tone?: Tone; children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

/** Any lifecycle/status enum → labelled, coloured badge. */
export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  if (!status) return <Badge>—</Badge>;
  const { label, tone } = statusTone(status);
  return <Badge tone={tone} className={className}>{label}</Badge>;
}

export function Stat({ label, value, hint, icon, tone = 'neutral', onClick }: {
  label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode; tone?: Tone; onClick?: () => void;
}) {
  const accent: Record<Tone, string> = {
    neutral: 'bg-slate-100 text-slate-600', brand: 'bg-brand-50 text-brand-700', success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700', danger: 'bg-rose-50 text-rose-700', info: 'bg-sky-50 text-sky-700', gold: 'bg-gold-50 text-gold-600',
  };
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick} className={`rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${onClick ? 'transition hover:border-brand-300 hover:shadow-md' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {icon && <span className={`rounded-lg p-1.5 ${accent[tone]}`}>{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Comp>
  );
}

export function ProgressBar({ value, tone = 'brand', className = '', label }: { value: number; tone?: Tone; className?: string; label?: string }) {
  const color: Record<Tone, string> = {
    neutral: 'bg-slate-400', brand: 'bg-brand-500', success: 'bg-emerald-500', warning: 'bg-amber-500',
    danger: 'bg-rose-500', info: 'bg-sky-500', gold: 'bg-gold-500',
  };
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-100 ${className}`} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`h-full rounded-full ${color[tone]} transition-all duration-500`} style={{ width: `${v}%` }} />
    </div>
  );
}

export function KeyValues({ items, cols = 2 }: { items: [React.ReactNode, React.ReactNode][]; cols?: 1 | 2 | 3 }) {
  const c = cols === 1 ? '' : cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  return (
    <dl className={`grid grid-cols-1 gap-x-6 gap-y-3 ${c}`}>
      {items.map(([k, v], i) => (
        <div key={i} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
          <dd className="mt-0.5 break-words text-sm text-slate-800">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, empty, dense }: {
  columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; onRowClick?: (row: T) => void; empty?: React.ReactNode; dense?: boolean;
}) {
  if (rows.length === 0) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  const pad = dense ? 'px-3 py-2' : 'px-4 py-3';
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {columns.map((c) => (
              <th key={c.key} className={`${pad} ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''} ${c.className ?? ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(r); } : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={onRowClick ? 'cursor-pointer transition hover:bg-brand-50/40 focus:bg-brand-50/60 focus:outline-none' : ''}
            >
              {columns.map((c) => (
                <td key={c.key} className={`${pad} align-top ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''} ${c.className ?? ''}`}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Tabs<K extends string>({ tabs, active, onChange }: { tabs: { key: K; label: React.ReactNode; count?: number }[]; active: K; onChange: (k: K) => void }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${
            active === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.label}
          {t.count !== undefined && <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ feedback */

export function EmptyState({ title, message, icon, action }: { title: string; message?: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center">
      <div className="mb-2 text-slate-300">{icon ?? <Inbox size={32} />}</div>
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      {message && <div className="mt-1 max-w-md text-xs text-slate-500">{message}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Loader2 size={18} className="animate-spin text-brand-600" /> {label}
    </div>
  );
}

export function ErrorBanner({ error, onRetry }: { error: ApiRequestError | Error | null; onRetry?: () => void }) {
  if (!error) return null;
  const code = 'code' in error ? (error as ApiRequestError).code : undefined;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        {code && <div className="font-mono text-[11px] font-semibold opacity-70">{code}</div>}
        {error.message}
      </div>
      {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function Callout({ tone = 'info', title, children, icon }: { tone?: Tone; title?: React.ReactNode; children?: React.ReactNode; icon?: React.ReactNode }) {
  const styles: Record<Tone, string> = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-700', brand: 'border-brand-200 bg-brand-50 text-brand-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900', warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-rose-200 bg-rose-50 text-rose-900', info: 'border-sky-200 bg-sky-50 text-sky-900', gold: 'border-gold-100 bg-gold-50 text-gold-600',
  };
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${styles[tone]}`}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ forms */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';

export function Button({ variant = 'primary', size = 'md', icon, loading, children, className = '', ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md'; icon?: React.ReactNode; loading?: boolean }) {
  const v: Record<ButtonVariant, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
    secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
    gold: 'bg-gold-500 text-slate-900 hover:bg-gold-400 shadow-sm',
  };
  const s = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm';
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${v[variant]} ${s} ${className}`}
    >
      {loading ? <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, required, className = '' }: {
  label: React.ReactNode; hint?: React.ReactNode; error?: string | null; children: React.ReactNode; required?: boolean; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold text-slate-600">
        {label} {required && <span className="text-rose-500" aria-hidden>*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] font-medium text-rose-600">{error}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className = '', ...rest }, ref) {
  return <input ref={ref} {...rest} className={`${inputCls} ${className}`} />;
});

export function Textarea({ className = '', ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${inputCls} ${className}`} />;
}

export function Select({ className = '', children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={`${inputCls} ${className}`}>
      {children}
    </select>
  );
}

export function Checkbox({ label, checked, onChange, disabled }: { label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-brand-600" />
      {label}
    </label>
  );
}

/* ------------------------------------------------------------------ overlays */

export function Modal({ open, title, subtitle, onClose, children, footer, wide }: {
  open: boolean; title: React.ReactNode; subtitle?: React.ReactNode; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className={`animate-slide-up flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ misc */

export function Avatar({ name, className = '' }: { name: string; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return (
    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800 ${className}`}>
      {initials}
    </span>
  );
}

export function Mono({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono text-[12px] text-slate-500 ${className}`}>{children}</span>;
}

/** Minimal, safe Markdown renderer for CIVIC AI output (headings, bullets, bold, italics). */
export function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = (key: number) => {
    if (list.length) {
      blocks.push(<ul key={'ul' + key}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
      list = [];
    }
  };
  text.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd();
    if (/^\s*[-*] /.test(line)) {
      list.push(line.replace(/^\s*[-*] /, ''));
      return;
    }
    flush(i);
    if (!line.trim()) return;
    if (line.startsWith('#')) blocks.push(<h3 key={i}>{inline(line.replace(/^#+\s*/, ''))}</h3>);
    else blocks.push(<p key={i}>{inline(line)}</p>);
  });
  flush(-1);
  return <div className="prose-civic text-sm leading-relaxed text-slate-700">{blocks}</div>;
}

function inline(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('_') && p.endsWith('_') && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}
