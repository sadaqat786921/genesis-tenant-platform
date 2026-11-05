import { Wrench, MessageSquare, PoundSterling, CalendarDays, ShieldCheck, Home as HomeIcon, Bell, ArrowRight, CircleCheck, Phone, FileSignature } from 'lucide-react';
import { useStore, money } from '../store';
import { daysFrom, parseDate, LSP_PHONE } from '../data';
import { Btn, Card, Chip, Kpi, Note, Empty } from '../ui';
import { PageHeader } from '../Shell';
import { DONE_JOB, jobView, myHome, myAdmin, homeType } from './lib';

export default function HomePage() {
  const s = useStore(); const p = myHome(s); const t = s.me; const admin = myAdmin(s);
  const owed = s.rent.filter(r => r.paid < r.amount && daysFrom(r.due) < 0);
  const owedSum = owed.reduce((a, r) => a + r.amount - r.paid, 0);
  const next = s.rent.filter(r => r.paid < r.amount && daysFrom(r.due) >= 0).sort((a, b) => daysFrom(a.due) - daysFrom(b.due))[0];
  const open = s.jobs.filter(j => !DONE_JOB.includes(j.status));
  const visits = s.inspections.filter(i => i.status !== 'Locked' && daysFrom(i.date) >= 0).sort((a, b) => daysFrom(a.date) - daysFrom(b.date));
  const toConfirm = visits.filter(i => !s.visits[i.id]);
  const fixedAsk = s.jobs.filter(j => ['Approved', 'Invoiced'].includes(j.status) && !j.tenantFixed && daysFrom(j.events[j.events.length - 1].at.split(',')[0]) > -45);
  const unread = t.comms.filter(c => c.dir === 'out' && !s.read.includes(c.id)).length;
  const total = parseDate(t.end).getTime() - parseDate(t.start).getTime(); const done = Math.min(1, Math.max(0, (new Date(2026, 9, 15).getTime() - parseDate(t.start).getTime()) / total));
  const monthsLeft = Math.max(0, Math.round(daysFrom(t.end) / 30.4));
  const todo = [
    ...(owedSum ? [{ k: 'rent', icon: <PoundSterling size={18} />, t: `Pay ${money(owedSum)} rent`, d: `${owed.map(r => r.month).join(', ')} · still owed`, go: () => s.go('rent'), cta: 'Pay' }] : []),
    ...toConfirm.map(i => ({ k: i.id, icon: <CalendarDays size={18} />, t: `Confirm ${i.kind.toLowerCase()} visit`, d: `${i.date}, ${i.time}`, go: () => s.go('visits', i.id), cta: 'Confirm' })),
    ...fixedAsk.map(j => ({ k: j.id, icon: <Wrench size={18} />, t: `Is it fixed? ${j.title}`, d: 'Let LSP know', go: () => s.go('repairs', j.id), cta: 'Answer' })),
    ...(unread ? [{ k: 'msg', icon: <MessageSquare size={18} />, t: `${unread} new message${unread > 1 ? 's' : ''} from LSP`, d: 'Read and reply', go: () => s.go('messages'), cta: 'Open' }] : []),
  ];
  const coming = [
    ...visits.map(i => ({ d: i.date, t: `${i.kind} visit · ${i.time}`, p: s.visits[i.id]?.status === 'confirmed' ? 'You confirmed' : s.visits[i.id]?.status === 'change' ? 'New time asked' : 'Please confirm', go: () => s.go('visits', i.id), c: 't-info' })),
    ...(next ? [{ d: next.due, t: `Rent due · ${money(next.amount)}`, p: 'Standing order', go: () => s.go('rent'), c: 't-ok' }] : []),
    ...s.jobs.filter(j => j.visit).map(j => ({ d: j.visit!.at.split(',')[0], t: `Repair visit · ${j.visit!.window}`, p: j.title, go: () => s.go('repairs', j.id), c: 't-brand' })),
    { d: t.end, t: 'Tenancy ends', p: 'LSP will ask about renewing', go: () => s.go('tenancy'), c: 't-warn' },
  ].sort((a, b) => daysFrom(a.d) - daysFrom(b.d)).slice(0, 5);
  return <>
    <PageHeader title={`Hello, ${t.name.split(' ')[0]}`} action={<div className="flex"><Btn kind="outline" icon={<MessageSquare size={18} />} onClick={() => s.go('messages')}>Message LSP</Btn><Btn icon={<Wrench size={18} />} onClick={() => s.go('repairs', 'new')}>Report a repair</Btn></div>} />
    <div className="row">
      <div className="hero grow">
        <div className="col grow" style={{ gap: 14 }}>
          <span className="chip-dark" style={{ alignSelf: 'flex-start' }}>{owedSum ? 'Rent owed now' : next ? `Next rent · due ${next.due.replace(' 2026', '')}` : 'Rent'}</span>
          <div className="flex" style={{ alignItems: 'flex-end', gap: 10 }}><span className="big">{money(owedSum || next?.amount || 0)}</span><span className="chip accent nodot" style={{ marginBottom: 12 }}>{owedSum ? owed.map(r => r.month.split(' ')[0]).join(', ') : 'Standing order set up'}</span></div>
          <p style={{ margin: 0, color: '#C3CDE4', fontSize: 13, fontWeight: 500, maxWidth: 440 }}>{owedSum ? `Please pay as soon as you can. ` : ''}{next ? `${next.month} rent of ${money(next.amount)} is due on ${next.due}.` : ''} Struggling to pay? Talk to LSP early. We can agree a plan.</p>
          <div className="flex" style={{ gap: 12 }}>{[[String(monthsLeft), 'Months left'], [String(open.length), 'Repairs open'], [visits[0] ? visits[0].date.replace(' 2026', '') : 'None', 'Next visit']].map(([v, l]) => <div className="mtile" key={l}><b>{v}</b><span>{l}</span></div>)}</div>
        </div>
        <div className="gring"><svg viewBox="0 0 176 176"><circle cx="88" cy="88" r="80" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="14" /><circle cx="88" cy="88" r="80" fill="none" stroke="#5BAF00" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 80 * done} 999`} transform="rotate(-90 88 88)" /></svg>
          <div className="stack" style={{ alignItems: 'center' }}><FileSignature size={22} color="#5BAF00" /><b style={{ fontSize: 13 }}>{Math.round(done * 100)}% through</b><span style={{ fontSize: 10.5, color: '#AEBBDA' }}>tenancy to {t.end.replace(' 2027', '')}</span></div></div>
      </div>
      <Card title="To do" sub="Things that need you." action={<Chip tone={todo.length ? 'warn' : 'ok'}>{todo.length}</Chip>} style={{ width: 400, flex: 'none' }}>
        {todo.map(x => <div className="lrow" key={x.k}>
          <span className="tile t-white" style={{ width: 36, height: 36 }}>{x.icon}</span>
          <button className="stack grow" style={{ border: 0, background: 'none', textAlign: 'left', padding: 0, minWidth: 0 }} onClick={x.go}><b className="ellip">{x.t}</b><span className="caption ellip">{x.d}</span></button>
          <Btn sm onClick={x.go}>{x.cta}</Btn>
        </div>)}
        {!todo.length && <Note tone="ok">Nothing to do. You're all set.</Note>}
      </Card>
    </div>
    <div className="grid g4">
      <Kpi icon={<PoundSterling size={18} />} tone={owedSum ? 'err' : 'ok'} label="Rent" value={owedSum ? money(owedSum) : 'Up to date'} caption={owedSum ? 'still owed' : next ? `next ${money(next.amount)} on ${next.due.replace(' 2026', '')}` : ''} onClick={() => s.go('rent')} />
      <Kpi icon={<Wrench size={18} />} tone="info" label="Repairs" value={open.length} caption={open.length ? `${open.filter(j => j.status === 'New').length} being checked` : 'nothing open'} onClick={() => s.go('repairs')} />
      <Kpi icon={<CalendarDays size={18} />} tone={toConfirm.length ? 'warn' : 'ok'} label="Visits" value={visits.length} caption={toConfirm.length ? `${toConfirm.length} to confirm` : 'all confirmed'} onClick={() => s.go('visits')} />
      <Kpi icon={<ShieldCheck size={18} />} tone="ok" label="Deposit" value={money(t.deposit)} caption={`protected · ${t.depositScheme}`} onClick={() => s.go('tenancy')} />
    </div>
    <div className="row">
      <Card title="Your repairs" className="grow" action={<Btn sm kind="ghost" onClick={() => s.go('repairs')}>All repairs</Btn>}>
        {s.jobs.length ? <div className="divlist">{[...open, ...s.jobs.filter(j => DONE_JOB.includes(j.status))].slice(0, 4).map(j => { const v = jobView(j); return <button key={j.id} className="item click" onClick={() => s.go('repairs', j.id)}><span className="tile t-info" style={{ width: 32, height: 32 }}><Wrench size={15} /></span><div className="stack grow"><b>{j.title}</b><span className="caption">{j.area ?? j.category} · reported {j.reported.split(',')[0]}</span></div><Chip tone={v.tone}>{v.label}</Chip></button>; })}</div> : <Empty icon={<Wrench size={22} />}>No repairs.</Empty>}
        <Btn kind="outline" icon={<Wrench size={16} />} onClick={() => s.go('repairs', 'new')}>Report a repair</Btn>
      </Card>
      <Card title="Coming up" action={<CalendarDays size={18} color="#667085" />} style={{ width: 340, flex: 'none' }}>
        {coming.map(c => { const [d, m] = c.d.split(' '); return <button key={c.t + c.d} className="item click" style={{ padding: 0 }} onClick={c.go}><span className={`datetile ${c.c}`}><b>{d}</b><span>{m.toUpperCase()}</span></span><div className="stack"><b>{c.t}</b><span className="caption">{c.p}</span></div></button>; })}
      </Card>
    </div>
    <div className="row">
      <Card title="Notices" sub="From LSP about your home." className="grow">
        <div className="divlist">{s.notices.map(n => <div key={n.id} className="item" style={{ alignItems: 'flex-start' }}><span className={`tile t-${n.tone}`} style={{ width: 32, height: 32 }}><Bell size={15} /></span><div className="stack grow"><b>{n.title}</b><span className="small">{n.text}</span></div><span className="caption">{n.at.split(',')[0]}</span></div>)}</div>
      </Card>
      <Card title="Your home" style={{ width: 340, flex: 'none' }}>
        <button className="item click" style={{ padding: 0 }} onClick={() => s.go('myhome')}><span className="photo" style={{ width: 72, height: 54, borderRadius: 10, flex: 'none', backgroundImage: `url(${p.photo})` }} /><div className="stack grow"><b>{p.address}</b><span className="caption">{homeType(p)} · {p.area}</span></div><ArrowRight size={16} color="#98A2B3" /></button>
        {admin && <div className="flex"><img className="avatar" src={admin.photo ?? 'images/av3.jpg'} alt="" /><div className="stack grow"><b className="small" style={{ color: 'var(--text-primary)' }}>{admin.name}</b><span className="caption">Your contact at LSP</span></div><HomeIcon size={16} color="#98A2B3" /></div>}
        <Note tone="err">Smell gas? Leave, then call 0800 111 999. No heating, no water or a leak? Call LSP on {LSP_PHONE}.</Note>
        <button className="btn ghost sm" onClick={() => s.go('repairs', 'new')}><Phone size={14} /> Report it here too <CircleCheck size={14} /></button>
      </Card>
    </div>
  </>;
}
