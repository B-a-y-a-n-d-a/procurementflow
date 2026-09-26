import { useState } from 'react';
import { ExternalLink, Link2, Plus, Trash2, X } from 'lucide-react';
import type { ApiRequestError } from '../../api/client';
import type { AttachmentDto } from '../../api/types';
import { Button, ErrorBanner, Input } from '../../components/ui';

/** Free-text chips: type and press Enter or comma to add. */
export function ChipsInput({ value, onChange, placeholder, id }: {
  value: string[]; onChange: (v: string[]) => void; placeholder?: string; id?: string;
}) {
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...value];
    for (const p of parts) if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p);
    onChange(next);
    setDraft('');
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Added items">
          {value.map((c) => (
            <li key={c} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 ring-1 ring-inset ring-brand-200">
              {c}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== c))} className="rounded-full text-brand-600 hover:text-brand-900" aria-label={`Remove ${c}`}>
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(',')) add(v);
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(draft); }
          else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => add(draft)}
        placeholder={placeholder}
        className="w-full border-0 bg-transparent px-1 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  );
}

/** Editable list of document links ({ fileName, url }). Links only in the MVP; no uploads. */
export function LinksEditor({ value, onChange }: { value: AttachmentDto[]; onChange: (v: AttachmentDto[]) => void }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const valid = name.trim() !== '' && /^https?:\/\/\S+$/i.test(url.trim());
  const add = () => {
    if (!valid) return;
    onChange([...value, { fileName: name.trim(), url: url.trim() }]);
    setName('');
    setUrl('');
  };
  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {value.map((d, i) => (
            <li key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
              <Link2 size={14} className="shrink-0 text-slate-400" />
              <a href={d.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-brand-700 hover:underline">{d.fileName}</a>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${d.fileName}`}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
        <Input aria-label="Document name" placeholder="Document name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input aria-label="Document URL" placeholder="https://example.org/…" value={url} onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <Button type="button" variant="secondary" icon={<Plus size={14} />} onClick={add} disabled={!valid}>Add link</Button>
      </div>
      <p className="text-[11px] text-slate-400">Links only in the MVP: paste a URL to the document (file upload is a future feature).</p>
    </div>
  );
}

/** Read-only document links. */
export function DocLinks({ docs }: { docs: AttachmentDto[] }) {
  if (docs.length === 0) return <p className="text-sm text-slate-400">No supporting documents.</p>;
  return (
    <ul className="space-y-1.5">
      {docs.map((d, i) => (
        <li key={d.id ?? i}>
          <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
            <ExternalLink size={13} className="shrink-0" /> <span className="truncate">{d.fileName}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function Chips({ items, tone = 'brand' }: { items: string[]; tone?: 'brand' | 'neutral' }) {
  if (items.length === 0) return <span className="text-sm text-slate-400">—</span>;
  const cls = tone === 'brand' ? 'bg-brand-50 text-brand-800 ring-brand-200' : 'bg-slate-100 text-slate-700 ring-slate-200';
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((c) => (
        <li key={c} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>{c}</li>
      ))}
    </ul>
  );
}

/** Inline server error for forms: the business-rule code + message, plus field messages for VALIDATION_FAILED. */
export function FormError({ error }: { error: ApiRequestError | null }) {
  if (!error) return null;
  const fields = error.code === 'VALIDATION_FAILED' && error.details ? Object.entries(error.details) : [];
  return (
    <div className="space-y-2">
      <ErrorBanner error={error} />
      {fields.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-9 text-xs text-rose-700">
          {fields.map(([k, v]) => <li key={k}><span className="font-mono">{k}</span>: {String(v)}</li>)}
        </ul>
      )}
    </div>
  );
}
