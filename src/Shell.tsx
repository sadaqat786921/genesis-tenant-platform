import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  LayoutDashboard, MessageSquare, Home, FileSignature, Wrench, CalendarDays, PoundSterling, FolderOpen, Settings, ClipboardList,
  PanelLeft, LogOut, Search, Bell, ChevronRight, ArrowRight, ArrowLeft, Eye, EyeOff, ShieldAlert, ShieldCheck, KeyRound, Check, UserCheck,
} from 'lucide-react';
import { useStore, who, rentStatus, type Route, type Role } from './store';
import { daysFrom, LSP_PHONE } from './data';
import { Btn, IBtn, Note, Avatar } from './ui';
import { DONE_JOB, myHome } from './pages/lib';

type Nav = { group: string; items: { id: Route; label: string; icon: typeof Home }[] }[];
export const NAV_T: Nav = [
  { group: 'Overview', items: [{ id: 'home', label: 'Home', icon: LayoutDashboard }, { id: 'messages', label: 'Messages', icon: MessageSquare }] },
  { group: 'My Home', items: [{ id: 'myhome', label: 'My Home', icon: Home }, { id: 'tenancy', label: 'My Tenancy', icon: FileSignature }] },
  { group: 'Repairs & Visits', items: [{ id: 'repairs', label: 'Repairs', icon: Wrench }, { id: 'visits', label: 'Visits & Inspections', icon: CalendarDays }] },
  { group: 'Money', items: [{ id: 'rent', label: 'Rent & Payments', icon: PoundSterling }] },
  { group: 'Records', items: [{ id: 'documents', label: 'Documents', icon: FolderOpen }, { id: 'account', label: 'Account & Settings', icon: Settings }] },
];
export const NAV_A: Nav = [
  { group: 'Overview', items: [{ id: 'application', label: 'My Application', icon: ClipboardList }, { id: 'messages', label: 'Messages', icon: MessageSquare }] },
  { group: 'My New Home', items: [{ id: 'myhome', label: 'The Home', icon: Home }] },
  { group: 'Records', items: [{ id: 'documents', label: 'Documents', icon: FolderOpen }, { id: 'account', label: 'Account & Settings', icon: Settings }] },
];
const all = [...NAV_T, ...NAV_A];
const LABEL = Object.fromEntries(all.flatMap(g => g.items.map(i => [i.id, i.label]))) as Record<Route, string>;
const GROUP = Object.fromEntries(all.flatMap(g => g.items.map(i => [i.id, g.group]))) as Record<Route, string>;

export function useCounts() {
  const s = useStore(); const w = who(s);
  return {
    messages: w.comms.filter(c => c.dir === 'out' && !s.read.includes(c.id)).length,
    repairs: s.jobs.filter(j => !DONE_JOB.includes(j.status)).length,
    visits: s.inspections.filter(i => i.status !== 'Locked' && daysFrom(i.date) >= 0 && !s.visits[i.id]).length,
    rent: s.rent.filter(r => r.paid < r.amount && daysFrom(r.due) < 0).length,
    application: s.app.kyc.filter(k => ['Missing', 'Rejected'].includes(k.status)).length,
  } as Partial<Record<Route, number>>;
}

export function Sidebar({ onLogout }: { onLogout: () => void }) {
  const s = useStore(); const counts = useCounts();
  const [collapsed, setCollapsed] = useState(false);
  const nav = s.role === 'tenant' ? NAV_T : NAV_A; const w = who(s);
  return (
    <aside className="sidebar" style={collapsed ? { width: 76 } : undefined} aria-label="Main menu">
      <div className="sb-logo">{!collapsed && <img src="images/logo.svg" alt="Landlord Service Plans" />}<button onClick={() => setCollapsed(c => !c)} aria-label="Collapse menu"><PanelLeft size={18} strokeWidth={1.8} /></button></div>
      <nav className="sb-nav">
        {nav.map((g, gi) => <div key={g.group} className={gi > 0 ? 'sb-group' : undefined}>
          {g.items.map(it => { const Ic = it.icon; const n = counts[it.id]; return (
            <button key={it.id} className={`nav${s.route === it.id ? ' on' : ''}`} onClick={() => s.go(it.id)} title={it.label} aria-current={s.route === it.id ? 'page' : undefined}>
              <Ic size={20} strokeWidth={1.8} />{!collapsed && <span>{it.label}</span>}{!collapsed && !!n && <span className="count">{n}</span>}
            </button>); })}
        </div>)}
      </nav>
      <div className="sb-user"><Avatar name={w.name} size="md" />{!collapsed && <button className="stack" style={{ border: 0, background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => s.go('account')}><b style={{ fontSize: 13, color: 'var(--text-primary)' }}>{w.name}</b><span className="caption">{s.role === 'tenant' ? `Tenant · ${myHome(s).address.split(',')[0]}` : 'Applicant'}</span></button>}<button onClick={onLogout} aria-label="Log out" title="Log out"><LogOut size={18} strokeWidth={1.8} /></button></div>
    </aside>
  );
}

export function PageHeader({ title, action, crumbs, back }: { title: ReactNode; action?: ReactNode; crumbs?: { label: string; onClick?: () => void }[]; back?: () => void }) {
  const s = useStore(); const w = who(s);
  const [q, setQ] = useState('');
  const [pop, setPop] = useState<'' | 'bell' | 'cal'>('');
  const ref = useRef<HTMLDivElement>(null);
  const tenant = s.role === 'tenant';
  const results = useMemo(() => {
    const t = q.trim().toLowerCase(); if (t.length < 2 || !tenant) return [];
    const r: { label: string; sub: string; go: () => void }[] = [];
    s.jobs.filter(x => (x.title + ' ' + x.category).toLowerCase().includes(t)).forEach(x => r.push({ label: x.title, sub: 'Repair · ' + x.reported.split(',')[0], go: () => s.go('repairs', x.id) }));
    s.inspections.filter(x => x.kind.toLowerCase().includes(t)).forEach(x => r.push({ label: `${x.kind} visit`, sub: x.date, go: () => s.go('visits', x.id) }));
    s.safety.filter(x => x.kind.toLowerCase().includes(t)).forEach(x => r.push({ label: `${x.kind} certificate`, sub: 'Ends ' + x.expires, go: () => s.go('documents') }));
    s.rent.filter(x => x.month.toLowerCase().includes(t)).forEach(x => r.push({ label: `${x.month} rent`, sub: rentStatus(x).label, go: () => s.go('rent') }));
    return r.slice(0, 8);
  }, [q, s, tenant]);
  const notes = tenant ? [
    ...s.rent.filter(r => r.paid < r.amount && daysFrom(r.due) < 0).map(r => ({ t: `${r.month} rent: ${rentStatus(r).label}`, d: 'Pay now or talk to LSP', r: 'rent' as Route, id: null as string | null, tone: 'err' })),
    ...s.inspections.filter(i => i.status !== 'Locked' && daysFrom(i.date) >= 0 && !s.visits[i.id]).map(i => ({ t: `Please confirm: ${i.kind.toLowerCase()} visit`, d: `${i.date}, ${i.time}`, r: 'visits' as Route, id: i.id, tone: 'warn' })),
    ...s.jobs.filter(j => j.visit && !j.visit.confirmed && !j.visit.change).map(j => ({ t: `Repair visit booked: ${j.title}`, d: `${j.visit!.at} · ${j.visit!.window}`, r: 'repairs' as Route, id: j.id, tone: 'brand' })),
    ...s.jobs.filter(j => ['Approved', 'Invoiced'].includes(j.status) && !j.tenantFixed && daysFrom(j.events[j.events.length - 1].at.split(',')[0]) > -45).map(j => ({ t: `Is it fixed? ${j.title}`, d: 'Tell LSP if it is still a problem', r: 'repairs' as Route, id: j.id, tone: 'info' })),
    ...w.comms.filter(c => c.dir === 'out' && !s.read.includes(c.id)).map(c => ({ t: 'New message from LSP', d: c.subject ?? c.text.slice(0, 50), r: 'messages' as Route, id: null, tone: 'info' })),
  ] : [
    ...s.app.kyc.filter(k => ['Missing', 'Rejected'].includes(k.status)).map(k => ({ t: `${k.status === 'Rejected' ? 'Upload again' : 'Upload'}: ${k.name.split(' (')[0]}`, d: k.note ?? 'Needed for your application', r: 'application' as Route, id: null as string | null, tone: k.status === 'Rejected' ? 'err' : 'warn' })),
    ...w.comms.filter(c => c.dir === 'out' && !s.read.includes(c.id)).map(c => ({ t: 'New message from LSP', d: c.subject ?? '', r: 'messages' as Route, id: null, tone: 'info' })),
  ];
  const cal = tenant ? [
    ...s.inspections.filter(i => i.status !== 'Locked' && daysFrom(i.date) >= 0).map(i => ({ d: i.date, t: `${i.kind} visit · ${i.time}`, p: s.visits[i.id]?.status === 'confirmed' ? 'You confirmed' : 'Please confirm', r: 'visits' as Route, id: i.id })),
    ...s.rent.filter(r => r.paid < r.amount && daysFrom(r.due) >= 0).map(r => ({ d: r.due, t: `Rent due · ${r.month}`, p: 'Standing order', r: 'rent' as Route, id: null as string | null })),
    ...s.jobs.filter(j => j.visit).map(j => ({ d: j.visit!.at.split(',')[0], t: `Repair visit · ${j.visit!.window}`, p: j.title, r: 'repairs' as Route, id: j.id })),
  ].sort((a, b) => daysFrom(a.d) - daysFrom(b.d)).slice(0, 6) : (s.app.moveInAt ? [{ d: s.app.moveInAt.split(',')[0], t: `Move-in · ${s.app.moveInAt.split(', ')[1]}`, p: myHome(s).address, r: 'application' as Route, id: null }] : []);
  return (
    <header className="header">
      {back && <IBtn icon={<ArrowLeft size={18} />} onClick={back} label="Back" />}
      <div className="grow">
        {crumbs && <div className="crumbs">{crumbs.map((c, i) => <span key={i} className="flex" style={{ gap: 6 }}>{i > 0 && <ChevronRight size={12} />}{c.onClick ? <button onClick={c.onClick}>{c.label}</button> : <span>{c.label}</span>}</span>)}</div>}
        <h1 className="h1">{title}</h1>
      </div>
      {tenant && <div className="searchwrap">
        <label className="search"><Search size={18} strokeWidth={1.8} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search repairs, visits, rent" aria-label="Search" /><span className="kbd">⌘K</span></label>
        {results.length > 0 && <div className="pop" style={{ left: 0, right: 'auto', width: 300 }}>{results.map((r, i) => <button key={i} className="item click" style={{ padding: '8px 10px' }} onClick={() => { setQ(''); r.go(); }}><div className="stack"><b style={{ fontSize: 12.5 }}>{r.label}</b><span className="caption">{r.sub}</span></div></button>)}</div>}
      </div>}
      <div style={{ position: 'relative' }} ref={ref}>
        <div className="flex" style={{ gap: 12 }}>
          <button className="ibtn" onClick={() => setPop(p => p === 'bell' ? '' : 'bell')} aria-label="Alerts"><Bell size={20} strokeWidth={1.8} />{notes.length > 0 && <span className="dot" />}</button>
          <button className="ibtn" onClick={() => setPop(p => p === 'cal' ? '' : 'cal')} aria-label="Calendar"><CalendarDays size={20} strokeWidth={1.8} /></button>
        </div>
        {pop === 'bell' && <div className="pop"><div className="flex between" style={{ padding: '2px 4px 6px' }}><b className="h2">Alerts</b><span className="caption">{notes.length} new</span></div>
          {notes.map((n, i) => <button key={i} className="item click" style={{ padding: '8px 10px' }} onClick={() => { setPop(''); s.go(n.r, n.id); }}><span className={`tile t-${n.tone}`} style={{ width: 30, height: 30 }}><Bell size={15} /></span><div className="stack grow"><b style={{ fontSize: 12.5 }}>{n.t}</b><span className="caption">{n.d}</span></div><ArrowRight size={14} color="#98A2B3" /></button>)}
          {!notes.length && <div className="empty">You are all caught up.</div>}</div>}
        {pop === 'cal' && <div className="pop"><b className="h2" style={{ padding: '2px 4px 6px' }}>Coming up</b>
          {cal.map((c, i) => { const [dd, mm] = c.d.split(' '); return <button key={i} className="item click" style={{ padding: '8px 10px' }} onClick={() => { setPop(''); s.go(c.r, c.id); }}><span className="datetile t-info" style={{ width: 40, height: 42 }}><b style={{ fontSize: 14 }}>{dd}</b><span>{(mm || '').toUpperCase()}</span></span><div className="stack"><b style={{ fontSize: 12.5 }}>{c.t}</b><span className="caption">{c.p}</span></div></button>; })}
          {!cal.length && <div className="empty">Nothing coming up.</div>}</div>}
      </div>
      {action}
    </header>
  );
}

export const crumbsFor = (r: Route, go: (r: Route) => void, extra?: string) => {
  const c: { label: string; onClick?: () => void }[] = [{ label: GROUP[r] }, { label: LABEL[r], onClick: extra ? () => go(r) : undefined }];
  if (extra) c.push({ label: extra });
  return c;
};

/** Sign in. Demo: choose the tenant or the applicant. First time: set a password from the email LSP sent. */
export function Login({ onDone }: { onDone: (r: Role) => void }) {
  const [role, setRole] = useState<Role>('tenant');
  const [step, setStep] = useState<'in' | 'welcome' | 'code' | 'locked' | 'forgot'>('in');
  const email = role === 'tenant' ? 'd.price@mail.co.uk' : 'aisha.rahman@mail.co.uk';
  const [pw, setPw] = useState('••••••••••'); const [show, setShow] = useState(false);
  const [np, setNp] = useState(''); const [np2, setNp2] = useState(''); const [agree, setAgree] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']); const [wrong, setWrong] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const rules = [['At least 10 characters', np.length >= 10], ['A number', /\d/.test(np)], ['A capital letter', /[A-Z]/.test(np)], ['Both passwords match', !!np && np === np2]] as [string, boolean][];
  const verify = () => {
    if (code.join('') === '123456') return onDone(role);
    const w = wrong + 1; setWrong(w); setCode(['', '', '', '', '', '']); refs.current[0]?.focus();
    if (w >= 5) setStep('locked');
  };
  return (
    <div className="login">
      <aside className="login-art">
        <img src="images/logo-white.svg" alt="Landlord Service Plans" style={{ width: 250 }} />
        <h2 style={{ fontSize: 38, lineHeight: 1.18, fontWeight: 800, letterSpacing: '-.02em', marginTop: 64, maxWidth: 460 }}>Your home, <span style={{ color: '#8FD64A' }}>sorted in one place.</span></h2>
        <p style={{ color: '#C3CDE4', fontSize: 15, lineHeight: 1.6, maxWidth: 440 }}>Pay rent, report a repair with photos, see when someone is visiting, and keep every document for your tenancy.</p>
        <div className="photo" style={{ height: 236, marginTop: 36, backgroundImage: 'url(images/home3.jpg)', boxShadow: '0 24px 48px rgba(0,0,0,.35)' }} />
        <div className="flex" style={{ gap: 24, marginTop: 'auto', color: '#DCE3F2', fontWeight: 600 }}><span className="flex"><PoundSterling size={16} color="#8FD64A" />Rent</span><span className="flex"><Wrench size={16} color="#8FD64A" />Repairs</span><span className="flex"><CalendarDays size={16} color="#8FD64A" />Visits</span></div>
      </aside>
      <main className="login-form"><div>
        {step === 'in' && <form onSubmit={e => { e.preventDefault(); setStep('code'); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>Welcome back</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>Tenant portal. Sign in with the email LSP has for you.</p>
          <div className="col" style={{ gap: 8 }}><span className="caption-strong">Demo: who is signing in?</span>
            {([['tenant', 'Daniel Price', 'Tenant living at Flat 4, 19 Highgate Hill', UserCheck], ['applicant', 'Aisha Rahman', 'Applying for 31 Ash Grove (documents to move-in)', ClipboardList]] as const).map(([r, n, d, Ic]) => <button key={r} type="button" className={`choice${role === r ? ' on' : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} onClick={() => setRole(r)}><span className="tile t-brand" style={{ width: 36, height: 36 }}><Ic size={17} /></span><span className="stack"><b>{n}</b><span className="caption">{d}</span></span></button>)}</div>
          <label className="field"><span>Email</span><input className="input" value={email} readOnly type="email" /></label>
          <label className="field"><span>Password</span><div style={{ position: 'relative' }}><input className="input" value={pw} onChange={e => setPw(e.target.value)} type={show ? 'text' : 'password'} /><button type="button" onClick={() => setShow(v => !v)} aria-label="Show password" style={{ position: 'absolute', right: 10, top: 11, border: 0, background: 'none', color: '#667085' }}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          <Btn type="submit">Sign in <ArrowRight size={18} /></Btn>
          <div className="flex between"><button type="button" className="link small" onClick={() => setStep('welcome')}>First time? Set your password</button><button type="button" className="link small" onClick={() => setStep('forgot')}>Forgot password?</button></div>
          <Note>LSP sends your login by email once you've viewed a home and want to go ahead. You only see your own tenancy.</Note>
        </form>}
        {step === 'welcome' && <form onSubmit={e => { e.preventDefault(); setStep('code'); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="tile lg t-brand"><KeyRound size={22} /></span>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Set your password</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>You opened the link in your email from LSP. Choose a password for <b style={{ color: '#0F1828' }}>{email}</b>.</p>
          <label className="field"><span>New password</span><input className="input" type="password" value={np} onChange={e => setNp(e.target.value)} /></label>
          <label className="field"><span>Type it again</span><input className="input" type="password" value={np2} onChange={e => setNp2(e.target.value)} /></label>
          <div className="col" style={{ gap: 6 }}>{rules.map(([t, ok]) => <span key={t} className="flex small" style={{ gap: 8, color: ok ? 'var(--ok)' : 'var(--text-tertiary)' }}><Check size={14} />{t}</span>)}</div>
          <label className="check" style={{ cursor: 'pointer' }}><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} /> I agree to the portal terms and LSP's privacy notice</label>
          <Btn type="submit" disabled={!rules.every(r => r[1]) || !agree}>Save and continue</Btn>
          <button type="button" className="btn ghost" onClick={() => setStep('in')}>Back to sign in</button>
        </form>}
        {step === 'forgot' && <form onSubmit={e => { e.preventDefault(); setStep('in'); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Reset your password</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>We'll email a reset link to {email}.</p>
          <Btn type="submit">Send reset link</Btn>
          <button type="button" className="btn ghost" onClick={() => setStep('in')}>Back to sign in</button>
        </form>}
        {step === 'code' && <form onSubmit={e => { e.preventDefault(); verify(); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="tile lg t-brand"><ShieldCheck size={22} /></span>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Enter your security code</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>We sent a 6-digit code to your phone. For this demo, use <b style={{ color: '#0F1828' }}>123456</b>.</p>
          <div className="otp">{code.map((c, i) => <input key={i} ref={el => { refs.current[i] = el; }} inputMode="numeric" maxLength={1} value={c} aria-label={`Digit ${i + 1}`} autoFocus={i === 0}
            onChange={e => { const v = e.target.value.replace(/\D/g, ''); const n = [...code]; n[i] = v; setCode(n); if (v && i < 5) refs.current[i + 1]?.focus(); }}
            onKeyDown={e => { if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i - 1]?.focus(); }} />)}</div>
          {wrong > 0 && <Note tone="err">That code is not right. {5 - wrong} {5 - wrong === 1 ? 'try' : 'tries'} left before the account locks.</Note>}
          <Btn type="submit" disabled={code.join('').length < 6}>Verify and continue</Btn>
          <button type="button" className="btn ghost" onClick={() => setStep('in')}>Back to sign in</button>
        </form>}
        {step === 'locked' && <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="tile lg t-err"><ShieldAlert size={22} /></span>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Your account is locked</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>Too many wrong security codes, so the account is locked to keep it safe. Call LSP on {LSP_PHONE} to unlock it.</p>
          <Btn onClick={() => { setStep('in'); setWrong(0); }}>Back to sign in</Btn>
        </div>}
      </div></main>
    </div>
  );
}
