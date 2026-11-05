import { useRef, useState } from 'react';
import { Plus, Wrench, Clock, CheckCircle2, AlertTriangle, MessageSquare, FileText, Upload, ArrowRight, ThumbsUp, ThumbsDown, CalendarDays, Flame, Phone } from 'lucide-react';
import { useStore } from '../store';
import { LSP_PHONE, nowStamp, type Job } from '../data';
import { ActionCard, Btn, Card, Chip, DetailHead, Empty, Field, HSteps, KV, Kpi, Note, Select, Tabs, Text, Area, Timeline, FilterBar, applyFlt, useFlt, yearsOf, When, Modal, Reason } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { DONE_JOB, jobView, STEPS, stepAt, myHome, myAdmin, contractorName, RepairReport, AskModal, tenantEvents, DemoAnswer, lspSays } from './lib';

export function Repairs() {
  const s = useStore();
  if (s.detail === 'new') return <ReportRepair />;
  if (s.detail && s.jobs.some(j => j.id === s.detail)) return <RepairPage id={s.detail} />;
  return <RepairList />;
}

function RepairList() {
  const s = useStore(); const [tab, setTab] = useState<'open' | 'done' | 'all'>('open'); const [f, setF] = useFlt();
  const J = s.jobs;
  const base = J.filter(j => tab === 'all' ? true : tab === 'done' ? DONE_JOB.includes(j.status) : !DONE_JOB.includes(j.status));
  const list = applyFlt(base, f, { text: j => `${j.title} ${j.category} ${j.area ?? ''} ${jobView(j).label}`, type: j => j.category, date: j => j.reported });
  return <>
    <PageHeader crumbs={crumbsFor('repairs', s.go)} title="Repairs" action={<Btn icon={<Plus size={18} />} onClick={() => s.go('repairs', 'new')}>Report a repair</Btn>} />
    <div className="grid g4">
      <Kpi icon={<Wrench size={18} />} tone="info" label="Open" value={J.filter(j => !DONE_JOB.includes(j.status)).length} caption="LSP is on it" active={tab === 'open'} onClick={() => setTab('open')} />
      <Kpi icon={<CalendarDays size={18} />} tone="brand" label="Visits booked" value={J.filter(j => j.visit && !DONE_JOB.includes(j.status)).length} caption="for repairs" />
      <Kpi icon={<CheckCircle2 size={18} />} tone="ok" label="Fixed" value={J.filter(j => ['Approved', 'Invoiced'].includes(j.status)).length} caption="with photo proof" active={tab === 'done'} onClick={() => setTab('done')} />
      <Kpi icon={<Flame size={18} />} tone="err" label="Emergency?" value={LSP_PHONE} caption="call LSP, then report here" />
    </div>
    <Card title="Your repairs" sub="Everything you reported, and where it is. You never pay for repairs that are the landlord's job." action={<Tabs value={tab} onChange={setTab} items={[{ id: 'open', label: 'Open' }, { id: 'done', label: 'Finished' }, { id: 'all', label: 'All', count: J.length }]} />}>
      {base.length > 2 && <FilterBar f={f} set={setF} placeholder="Search repairs" types={[...new Set(base.map(j => j.category))]} typeLabel="All types" years={yearsOf(base, j => j.reported)} shown={list.length} total={base.length} />}
      <div className="tablewrap"><table className="t"><thead><tr><th>Repair</th><th>Reported</th><th>Visit</th><th>Status</th><th /></tr></thead><tbody>
        {list.map(j => { const v = jobView(j); return <tr key={j.id} onClick={() => s.go('repairs', j.id)}>
          <td><span className="cell"><span className={`tile ${j.urgent && !DONE_JOB.includes(j.status) ? 't-err' : 't-info'}`} style={{ width: 32, height: 32 }}><Wrench size={15} /></span><span className="stack"><b className="strong">{j.title}</b><span className="caption">{j.category}{j.area ? ' · ' + j.area : ''}</span></span></span></td>
          <td><When at={j.reported} /></td><td>{j.visit ? <span className="stack"><b className="small">{j.visit.at.split(',')[0]}</b><span className="caption">{j.visit.window}</span></span> : <span className="muted">—</span>}</td>
          <td><Chip tone={v.tone}>{v.label}</Chip></td><td style={{ textAlign: 'right' }}><ArrowRight size={16} color="#98A2B3" /></td></tr>; })}
      </tbody></table>{!list.length && <Empty icon={<Wrench size={22} />}>No repairs here.</Empty>}</div>
    </Card>
  </>;
}

/* ---------------- report a repair ---------------- */
const ROOMS = ['Kitchen', 'Bathroom', 'Living room', 'Bedroom 1', 'Bedroom 2', 'Hallway', 'Outside', 'Whole home'];
function ReportRepair() {
  const s = useStore(); const p = myHome(s);
  const [f, setF] = useState({ title: '', area: 'Kitchen', category: 'General' as Job['category'], note: '', urgency: 'Routine', days: [] as string[], times: 'Any time', key: true, pets: 'No pets' });
  const [photos, setPhotos] = useState<string[]>([]); const ref = useRef<HTMLInputElement>(null);
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const submit = () => {
    const id = 'J' + (Date.now() % 100000); const at = nowStamp();
    const availability = `${f.days.length ? f.days.join(', ') : 'Any weekday'} · ${f.times}`;
    s.setJobs(js => [{ id, title: f.title, property: p.id, managed: true, cost: 0, price: 0, status: 'New', urgent: f.urgency === 'Emergency', reported: at, by: `Tenant · ${s.me.name}`, tenant: s.me.id, admin: p.admin, category: f.category, note: f.note.trim() || undefined, area: f.area, photos, availability, access: `${f.key ? 'LSP may use the spare key if I am out' : 'Only when I am home'} · ${f.pets}`, comms: [],
      events: [{ at, by: s.me.name, text: `Reported from the tenant portal${f.urgency !== 'Routine' ? ` as ${f.urgency.toLowerCase()}` : ''}${photos.length ? ` with ${photos.length} photo${photos.length > 1 ? 's' : ''}` : ''}` }] }, ...js]);
    s.log(`Reported a repair: ${f.title}`, 'Repairs', s.me.name); s.toast(`Sent to ${myAdmin(s)?.name ?? 'LSP'}`); s.go('repairs', id);
  };
  return <>
    <PageHeader crumbs={crumbsFor('repairs', s.go, 'Report a repair')} back={() => s.go('repairs')} title="Report a repair" />
    <div className="dgrid">
      <Card title="What needs fixing" sub="Add photos if you can. It helps LSP send the right person first time.">
        <Field label="What is wrong"><Text value={f.title} onChange={v => setF({ ...f, title: v })} placeholder="e.g. Kitchen tap is dripping" /></Field>
        <div className="grid g3">
          <Field label="Where"><Select value={f.area} onChange={v => setF({ ...f, area: v })} options={ROOMS.map(r => ({ value: r, label: r }))} /></Field>
          <Field label="Type"><Select value={f.category} onChange={v => setF({ ...f, category: v as Job['category'] })} options={(['Plumbing', 'Heating', 'Electrical', 'Roofing', 'Locks & doors', 'Damp', 'General'] as const).map(x => ({ value: x, label: x }))} /></Field>
          <Field label="How urgent"><Select value={f.urgency} onChange={v => setF({ ...f, urgency: v })} options={[{ value: 'Routine', label: 'Routine' }, { value: 'Urgent', label: 'Urgent · within 7 days' }, { value: 'Emergency', label: 'Emergency · today' }]} /></Field>
        </div>
        {f.urgency === 'Emergency' && <Note tone="err">Please also call LSP now on {LSP_PHONE}. If you smell gas, leave the home and call 0800 111 999.</Note>}
        <Field label="Details"><Area value={f.note} onChange={v => setF({ ...f, note: v })} placeholder="What happens, when it started, anything you've tried" /></Field>
        <div className="field"><span>Photos or video</span><div className="flex wrap">{photos.map(x => <Chip key={x} tone="neutral" dot={false}>{x}</Chip>)}<Btn sm kind="outline" icon={<Upload size={14} />} onClick={() => ref.current?.click()}>Add photos</Btn></div></div>
        <input ref={ref} type="file" accept="image/*,video/*" multiple hidden aria-label="Photos" onChange={e => { const fs = Array.from(e.target.files ?? []); if (fs.length) setPhotos(ps => [...ps, ...fs.map(x => x.name.replace(/\.[^.]+$/, ''))]); }} />
        <div className="field"><span>When are you usually in?</span><div className="flex wrap">{DAYS.map(d => <button key={d} type="button" className={`chip${f.days.includes(d) ? ' brand' : ' neutral'} nodot`} style={{ cursor: 'pointer', border: 0 }} onClick={() => setF({ ...f, days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d] })}>{d}</button>)}</div></div>
        <div className="grid g3">
          <Field label="Times"><Select value={f.times} onChange={v => setF({ ...f, times: v })} options={['Any time', 'Mornings (8am to 12pm)', 'Afternoons (12pm to 5pm)', 'After 5pm'].map(x => ({ value: x, label: x }))} /></Field>
          <Field label="Pets at home"><Select value={f.pets} onChange={v => setF({ ...f, pets: v })} options={['No pets', 'A dog', 'A cat', 'Other pets'].map(x => ({ value: x, label: x }))} /></Field>
          <Field label="If you're out"><Select value={f.key ? 'yes' : 'no'} onChange={v => setF({ ...f, key: v === 'yes' })} options={[{ value: 'yes', label: 'LSP may use the spare key' }, { value: 'no', label: 'Only when I am home' }]} /></Field>
        </div>
        <div className="flex" style={{ justifyContent: 'flex-end' }}><Btn kind="outline" onClick={() => s.go('repairs')}>Cancel</Btn><Btn icon={<Wrench size={16} />} disabled={!f.title.trim()} onClick={submit}>Send to LSP</Btn></div>
      </Card>
      <div className="col">
        <Card title="Emergency?" className="flat"><div className="col" style={{ gap: 8 }}>
          <span className="flex small" style={{ gap: 8 }}><Flame size={16} color="var(--err)" /><span><b>Smell gas:</b> leave, don't use switches, call 0800 111 999.</span></span>
          <span className="flex small" style={{ gap: 8 }}><AlertTriangle size={16} color="var(--warn)" /><span><b>Leak, no heating or water, unsafe:</b> call LSP on {LSP_PHONE}.</span></span>
          <span className="flex small" style={{ gap: 8 }}><Phone size={16} color="var(--err)" /><span><b>Fire or danger to life:</b> call 999.</span></span></div></Card>
        <ActionCard title="What happens next" text={<span className="stack" style={{ gap: 8, fontWeight: 600 }}><span>1. {myAdmin(s)?.name ?? 'LSP'} checks it, usually the same working day.</span><span>2. LSP gets it approved and books a contractor.</span><span>3. You confirm the visit time here.</span><span>4. The contractor fixes it and adds photos.</span><span>5. You tell LSP if it's fixed.</span></span>} />
      </div>
    </div>
  </>;
}

/* ---------------- one repair ---------------- */
function RepairPage({ id }: { id: string }) {
  const s = useStore(); const j = s.jobs.find(x => x.id === id)!; const v = jobView(j); const done = ['Approved', 'Invoiced'].includes(j.status);
  const [m, setM] = useState<'' | 'report' | 'ask' | 'change' | 'notfixed'>('');
  const upd = (patch: Partial<Job>, text: string, by = s.me.name) => s.setJobs(js => js.map(x => x.id === id ? { ...x, ...patch, events: [...x.events, { at: nowStamp(), by, text }] } : x));
  const next = (() => {
    switch (j.status) {
      case 'New': return `${myAdmin(s)?.name ?? 'LSP'} is checking it and will arrange the right person.`;
      case 'Waiting approval': case 'Landlord approval': return 'LSP has checked it. It is waiting for approval before a contractor is booked. You don\'t need to do anything.';
      case 'Ready to assign': return 'Approved. LSP is booking a contractor and will offer you a time.';
      case 'Assigned': return j.visit ? (j.visit.confirmed ? `Visit confirmed: ${j.visit.at} · ${j.visit.window} with ${contractorName(s, j.contractor) ?? 'the contractor'}.` : j.visit.change ? `You asked for a different time: ${j.visit.change}. LSP will offer a new one.` : `${contractorName(s, j.contractor) ?? 'A contractor'} can come on ${j.visit.at} · ${j.visit.window}. Please confirm.`) : 'LSP is booking a contractor and will offer you a time.';
      case 'In progress': return `${contractorName(s, j.contractor) ?? 'The contractor'} is doing the work.`;
      case 'Sent back': return 'LSP asked the contractor to put something right.';
      case 'Proof uploaded': return 'The work is done. LSP is checking the photos.';
      case 'Approved': case 'Invoiced': return j.tenantFixed ? (j.tenantFixed.ok ? `You confirmed it's fixed on ${j.tenantFixed.at}. Thank you.` : `You told LSP it's still a problem on ${j.tenantFixed.at}. LSP will be in touch.`) : 'The work is finished and checked. Is it fixed?';
      default: return j.declined ? `Not going ahead. ${j.declined.replace(/^Landlord said no: /, '')}` : 'Not going ahead.';
    }
  })();
  return <>
    <PageHeader crumbs={crumbsFor('repairs', s.go, j.title)} back={() => s.go('repairs')} title={j.title}
      action={<div className="flex"><Btn kind="ghost" icon={<MessageSquare size={16} />} onClick={() => setM('ask')}>Message LSP</Btn>{(done || j.proof?.length) && <Btn kind="outline" icon={<FileText size={16} />} onClick={() => setM('report')}>Repair report</Btn>}</div>} />
    <DetailHead media={<span className={`tile ${j.urgent && !done ? 't-err' : 't-info'}`} style={{ width: 64, height: 64, borderRadius: 18 }}><Wrench size={28} /></span>} title={j.title}
      chips={<><Chip tone={v.tone}>{v.label}</Chip>{j.urgent && <Chip tone="err">Emergency</Chip>}<Chip tone="neutral" dot={false}>{j.category}</Chip></>}
      meta={[['Where', j.area ?? '—'], ['Reported', j.reported], ['By', j.by.replace('Tenant · ', '')], ['Your contact', myAdmin(s)?.name ?? 'LSP']]} />
    <Card><HSteps items={STEPS} at={stepAt(j)} stopped={j.status === 'Declined' ? 'Not going ahead' : undefined} /></Card>
    <div className="dgrid">
      <div className="col">
        {j.visit && !done && <Card title="Visit" sub={`${contractorName(s, j.contractor) ?? 'The contractor'} · checked by LSP, ID shown at the door`}>
          <div className="flex"><span className="datetile t-brand"><b>{j.visit.at.split(' ')[1]}</b><span>{j.visit.at.split(' ')[2]?.replace(',', '').toUpperCase()}</span></span><div className="stack grow"><b>{j.visit.at.split(',')[0]}</b><span className="caption">{j.visit.window}</span></div><Chip tone={j.visit.confirmed ? 'ok' : j.visit.change ? 'warn' : 'info'}>{j.visit.confirmed ? 'You confirmed' : j.visit.change ? 'New time asked' : 'Please confirm'}</Chip></div>
          {!j.visit.confirmed && !j.visit.change && <div className="flex wrap"><Btn icon={<CheckCircle2 size={16} />} onClick={() => { upd({ visit: { ...j.visit!, confirmed: true } }, `Confirmed the visit on ${j.visit!.at.split(',')[0]} (${j.visit!.window})`); s.toast('Visit confirmed'); }}>Confirm visit</Btn><Btn kind="outline" icon={<Clock size={16} />} onClick={() => setM('change')}>Ask for another time</Btn></div>}
        </Card>}
        {(j.proof?.length || j.status === 'Proof uploaded') ? <Card title="Photo proof" sub="Taken by the contractor when the work was finished."><div className="photos">{(j.proof ?? []).map((x, i) => <div key={x + i} className="ph" style={{ backgroundImage: `url(images/home${(i % 3) + 1}.jpg)` }}><span>{x}</span></div>)}</div></Card> : null}
        <Card title="What you reported"><p style={{ margin: 0, lineHeight: 1.6 }}>{j.note ?? 'No details given.'}</p>
          {j.photos?.length ? <div className="photos">{j.photos.map((x, i) => <div key={x} className="ph" style={{ backgroundImage: `url(images/home${((i + 1) % 3) + 1}.jpg)` }}><span>{x}</span></div>)}</div> : null}
          <KV rows={[['Where', j.area ?? '—'], ['Type', j.category], ['Reported', j.reported], ...(j.availability ? [['When you are in', j.availability] as [string, string]] : []), ...(j.access ? [['Access', j.access] as [string, string]] : [])]} /></Card>
        <Card title="History" sub="Every step, with the date and time."><Timeline items={[...tenantEvents(j)].reverse()} /></Card>
      </div>
      <div className="col">
        <ActionCard tone={done ? (j.tenantFixed && !j.tenantFixed.ok ? 'warn' : 'ok') : j.status === 'Declined' ? 'neutral' : 'brand'} title={done && !j.tenantFixed ? 'Is it fixed?' : 'What happens next'} text={next}>
          {done && !j.tenantFixed && <><Btn block icon={<ThumbsUp size={16} />} onClick={() => { upd({ tenantFixed: { ok: true, at: nowStamp() } }, 'Confirmed it is fixed'); s.toast('Thanks for letting us know'); }}>Yes, it's fixed</Btn><Btn block kind="outline" icon={<ThumbsDown size={16} />} onClick={() => setM('notfixed')}>No, still a problem</Btn></>}
          <Btn block kind="ghost" icon={<MessageSquare size={16} />} onClick={() => setM('ask')}>Message LSP about it</Btn>
        </ActionCard>
        <Card title="Who pays" className="flat"><span className="small">Repairs to the home are the landlord's job, arranged by LSP. You only pay if you or a visitor caused the damage, and LSP would always tell you first.</span></Card>
        {!done && j.status !== 'Declined' && <DemoAnswer>
          {['New', 'Waiting approval', 'Landlord approval', 'Ready to assign'].includes(j.status) && <Btn sm kind="outline" onClick={() => { const c = j.contractor ?? 'C5'; upd({ status: 'Assigned', contractor: c, visit: { at: 'Thu 22 Oct 2026, 10:00', window: '10am to 12pm' } }, `Approved. ${contractorName(s, c)} can visit on Thu 22 Oct, 10am to 12pm`, myAdmin(s)?.name ?? 'LSP'); lspSays(s, `Visit booked: ${j.title}`, `${contractorName(s, c)} can come on Thu 22 Oct between 10am and 12pm. Please confirm in the portal.`); s.toast('LSP booked a visit'); }}>Approve and book a visit</Btn>}
          {['Assigned', 'In progress', 'Sent back'].includes(j.status) && <Btn sm kind="outline" onClick={() => { upd({ status: 'Proof uploaded', proof: ['Before', 'After'] }, 'Work finished. Photos uploaded', contractorName(s, j.contractor) ?? 'Contractor'); s.toast('Contractor finished'); }}>Contractor finished</Btn>}
          {j.status === 'Proof uploaded' && <Btn sm kind="outline" onClick={() => { upd({ status: 'Approved' }, 'Work checked and signed off', myAdmin(s)?.name ?? 'LSP'); s.toast('LSP signed it off'); }}>LSP checks the photos</Btn>}
        </DemoAnswer>}
      </div>
    </div>
    {m === 'report' && <RepairReport j={j} onClose={() => setM('')} />}
    {m === 'ask' && <AskModal title="Message LSP about this repair" about={`Repair: ${j.title}`} onClose={() => setM('')} onSent={t => upd({}, `Sent a message: ${t}`)} />}
    {m === 'change' && <ChangeTime onClose={() => setM('')} onDone={t => { upd({ visit: { ...j.visit!, change: t } }, `Asked for another time: ${t}`); s.toast('Sent. LSP will offer a new time.'); setM(''); }} />}
    {m === 'notfixed' && <Reason title="Still a problem?" sub="LSP looks at it again. Add a photo in Messages if it helps." cta="Tell LSP" label="What's wrong now?" options={['Same problem is back', 'It was only partly fixed', 'Something else broke during the work', 'Mess left behind']} onClose={() => setM('')} onDone={r => { upd({ tenantFixed: { ok: false, at: nowStamp(), note: r } }, `Said it is not fixed: ${r}`); s.toast('Sent. LSP will be in touch.'); setM(''); }} />}
  </>;
}

export function ChangeTime({ onClose, onDone }: { onClose: () => void; onDone: (text: string) => void }) {
  const [d, setD] = useState('Any weekday'); const [t, setT] = useState('Mornings'); const [why, setWhy] = useState('');
  return <Modal title="Ask for another time" sub="LSP will offer a new time and tell you here and by email." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn onClick={() => onDone(`${d}, ${t.toLowerCase()}${why ? ` (${why})` : ''}`)}>Send</Btn></>}>
    <div className="grid g2"><Field label="Days that suit you"><Select value={d} onChange={setD} options={['Any weekday', 'Mon or Tue', 'Wed or Thu', 'Fri', 'Saturday'].map(x => ({ value: x, label: x }))} /></Field>
      <Field label="Times"><Select value={t} onChange={setT} options={['Mornings', 'Afternoons', 'After 5pm'].map(x => ({ value: x, label: x }))} /></Field></div>
    <Field label="Reason (optional)"><Text value={why} onChange={setWhy} placeholder="e.g. I'm at work that day" /></Field>
  </Modal>;
}
