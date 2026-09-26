import { useRef, useState } from 'react';
import {
  ArrowRight, Building2, ClipboardList, Eye, Gavel, Landmark, Lightbulb, LineChart, LogIn, ScrollText, ShieldCheck, Sparkles, Users, Wrench,
} from 'lucide-react';
import { useAuth } from '../../app/auth';
import { Button, ErrorBanner, Field, Input } from '../../components/ui';

const LIFECYCLE = [
  { icon: ClipboardList, title: 'Public need', text: 'Departments document the problem first, with a live budget check and a rule-based approval route.' },
  { icon: Lightbulb, title: 'Local innovation', text: 'Approved needs become open opportunities that local SMEs, co-operatives and open-source projects can answer.' },
  { icon: Gavel, title: 'Transparent procurement', text: 'Published, weighted criteria. The system ranks and recommends; a person decides and justifies any deviation.' },
  { icon: Wrench, title: 'Implementation', text: 'Purchase orders open a delivery record with milestones, updates and evidence.' },
  { icon: LineChart, title: 'Measurable impact', text: 'Outcomes are measured against a baseline and target, so every rand is linked to what changed.' },
];

const AUDIENCES = [
  { icon: Building2, title: 'Departments', text: 'Record needs, track budgets and manage delivery.' },
  { icon: Landmark, title: 'Finance & approvers', text: 'Approve within SLA, routed by configurable thresholds.' },
  { icon: Gavel, title: 'Procurement', text: 'Publish, evaluate, verify suppliers and issue POs.' },
  { icon: Users, title: 'Local providers', text: 'Discover opportunities and submit solutions.' },
  { icon: Eye, title: 'Executives', text: 'See investment against outcomes across the organisation.' },
  { icon: ScrollText, title: 'Auditors', text: 'Follow every decision in a tamper-evident log.' },
];

const PRINCIPLES = [
  { icon: ShieldCheck, title: 'Tamper-evident audit trail', text: 'Every lifecycle event is SHA-256 hash-chained and can be verified at any time.' },
  { icon: Sparkles, title: 'AI assists, humans decide', text: 'CIVIC AI drafts and summarises from platform records. It never approves, scores or selects.' },
  { icon: ClipboardList, title: 'Rules as configuration', text: 'Thresholds, SLAs and evaluation weights are versioned organisational settings, not hard-coded.' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const emailRef = useRef<HTMLInputElement>(null);
  const howRef = useRef<HTMLElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // In-page scrolling uses refs: the app's hash router owns location.hash.
  const goToSignIn = () => {
    emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    emailRef.current?.focus({ preventScroll: true });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setError(err as Error);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      <header className="bg-brand-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 13l5 5L20 7" /></svg>
            </div>
            <span className="text-lg font-extrabold tracking-tight">CIVICFLOW</span>
          </div>
          <button onClick={goToSignIn} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/20 hover:bg-white/20">
            <LogIn size={15} /> Sign in
          </button>
        </div>
      </header>

      <section className="bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-5 lg:pb-20 lg:pt-12">
          <div className="text-white lg:col-span-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gold-400">Public innovation · procurement · impact</p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              From Public Need to <span className="text-gold-400">Measurable Impact.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-100">
              CIVICFLOW connects public-sector problems with local solutions, runs transparent procurement, tracks
              implementation and measures real-world outcomes, all in one accountable lifecycle.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="gold" icon={<LogIn size={16} />} onClick={goToSignIn}>Sign in to CIVICFLOW</Button>
              <button onClick={() => howRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/10">
                How it works <ArrowRight size={15} />
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-2xl" aria-labelledby="signin-title">
              <h2 id="signin-title" className="text-lg font-bold text-slate-900">Sign in</h2>
              <p className="mt-1 text-xs text-slate-500">Use the work email and password issued by your administrator.</p>
              <div className="mt-5 space-y-4">
                {error && <ErrorBanner error={error} />}
                <Field label="Email" required>
                  <Input ref={emailRef} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@organisation.gov.za" />
                </Field>
                <Field label="Password" required>
                  <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
                <Button type="submit" icon={<LogIn size={16} />} loading={busy} disabled={!email.trim() || !password} className="w-full justify-center">
                  Sign in
                </Button>
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
                Staff and registered providers each have their own account. Access is limited to what your role allows.
              </p>
            </form>
          </div>
        </div>
      </section>

      <section ref={howRef} className="mx-auto max-w-6xl scroll-mt-4 px-4 py-14 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-700">How it works</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">One lifecycle, five stages</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {LIFECYCLE.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-800">{i + 1}</span>
                <Icon size={18} className="text-brand-700" aria-hidden />
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Built for everyone in the chain</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIENCES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3 rounded-xl p-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon size={18} aria-hidden /></span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl bg-brand-950 p-6 text-white">
              <Icon size={20} className="text-gold-400" aria-hidden />
              <h3 className="mt-3 text-sm font-bold">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-brand-100">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Ready to follow a need all the way to impact?</h2>
          <Button icon={<LogIn size={16} />} onClick={goToSignIn}>Sign in</Button>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        CIVICFLOW · Public Innovation, Procurement &amp; Impact Management
      </footer>
    </div>
  );
}
