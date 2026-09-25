import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

type Toast = { id: number; kind: 'success' | 'error'; message: string; code?: string };
type Listener = (t: Toast[]) => void;

let items: Toast[] = [];
let seq = 1;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l(items));
}

function push(kind: Toast['kind'], message: string, code?: string) {
  const t = { id: seq++, kind, message, code };
  items = [...items, t];
  emit();
  setTimeout(() => dismiss(t.id), kind === 'error' ? 7000 : 3500);
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string, code?: string) => push('error', message, code),
};

export function Toaster() {
  const [list, setList] = useState<Toast[]>(items);
  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      {list.map((t) => (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          className={`animate-slide-up flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${
            t.kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          {t.kind === 'error' ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
          <div className="min-w-0 flex-1">
            {t.code && t.kind === 'error' && <div className="font-mono text-[11px] font-semibold opacity-70">{t.code}</div>}
            <div>{t.message}</div>
          </div>
          <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
