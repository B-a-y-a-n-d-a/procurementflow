import { Check, X } from 'lucide-react';
import type { StageDto } from '../api/types';
import { STAGE_LABEL } from '../lib/labels';

/** The lifecycle spine: Need → Approval → Opportunity → Evaluation → Procurement → Implementation → Impact. */
export function StageTracker({ stages }: { stages: StageDto[] }) {
  return (
    <ol className="flex w-full items-start overflow-x-auto pb-1" aria-label="Lifecycle stage">
      {stages.map((s, i) => {
        const done = s.state === 'DONE';
        const current = s.state === 'CURRENT';
        const failed = s.state === 'FAILED';
        const skipped = s.state === 'SKIPPED';
        return (
          <li key={s.stage} className="flex min-w-[92px] flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <div className={`h-0.5 flex-1 ${i === 0 ? 'bg-transparent' : done || current || failed ? 'bg-brand-400' : 'bg-slate-200'}`} />
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  failed ? 'border-rose-500 bg-rose-500 text-white'
                    : done ? 'border-brand-600 bg-brand-600 text-white'
                    : current ? 'border-brand-600 bg-white text-brand-700 ring-4 ring-brand-100'
                    : skipped ? 'border-dashed border-slate-300 bg-slate-50 text-slate-300'
                    : 'border-slate-200 bg-white text-slate-400'
                }`}
                aria-current={current ? 'step' : undefined}
              >
                {failed ? <X size={14} /> : done ? <Check size={14} /> : i + 1}
              </div>
              <div className={`h-0.5 flex-1 ${i === stages.length - 1 ? 'bg-transparent' : done ? 'bg-brand-400' : 'bg-slate-200'}`} />
            </div>
            <span className={`mt-1.5 text-[11px] font-semibold ${current ? 'text-brand-700' : failed ? 'text-rose-600' : skipped ? 'text-slate-300 line-through' : done ? 'text-slate-700' : 'text-slate-400'}`}>
              {STAGE_LABEL[s.stage]}
            </span>
            <span className="text-[10px] text-slate-400">{failed ? 'rejected' : skipped ? 'skipped' : current ? 'current' : done ? 'done' : ''}</span>
          </li>
        );
      })}
    </ol>
  );
}
