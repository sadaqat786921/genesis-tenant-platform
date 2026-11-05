import { useState } from 'react';
import { CalendarDays, CheckCircle2, Clock, ClipboardCheck, KeyRound, ShieldCheck, Wrench, Eye } from 'lucide-react';
import { useStore } from '../store';
import { daysFrom, nowStamp, type Inspection } from '../data';
import { Btn, Card, Chip, DetailHead, Empty, KV, Kpi, Note, ActionCard } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { contractorName, InspectionModal, myAdmin, lspSays } from './lib';
import { ChangeTime } from './Repairs';

const WHAT: Record<string, string> = {
  Routine: 'LSP checks the home is in good condition and notes anything that needs fixing. It takes about 30 minutes. You don\'t need to tidy up.',
  'Gas safety': 'A Gas Safe engineer checks the boiler and any gas appliances. It is a legal check every year and takes about 45 minutes.',
  Electrical: 'An electrician tests the wiring, fuse box and sockets. The power may be off for a short time.',
  'Move-in': 'LSP records the condition of every room, the meter readings and the keys before you move in.',
  'Move-out': 'LSP compares the home with the move-in report, takes meter readings and collects the keys.',
  'Fire safety': 'The fire alarms and fire doors are checked.',
};

export function Visits() {
  const s = useStore(); const [open, setOpen] = useState<string | null>(null);
  const i = s.detail ? s.inspections.find(x => x.id === s.detail) : undefined;
  if (i) return <VisitPage i={i} />;
  const upcoming = s.inspections.filter(x => x.status !== 'Locked' && daysFrom(x.date) >= 0).sort((a, b) => daysFrom(a.date) - daysFrom(b.date));
  const past = s.inspections.filter(x => x.status === 'Locked');
  const repairs = s.jobs.filter(j => j.visit && !['Approved', 'Invoiced', 'Declined'].includes(j.status));
  return <>
    <PageHeader crumbs={crumbsFor('visits', s.go)} title="Visits & Inspections" />
    <div className="grid g3">
      <Kpi icon={<CalendarDays size={18} />} tone="info" label="Coming up" value={upcoming.length + repairs.length} caption="inspections, safety checks and repairs" />
      <Kpi icon={<Clock size={18} />} tone={upcoming.some(x => !s.visits[x.id]) ? 'warn' : 'ok'} label="To confirm" value={upcoming.filter(x => !s.visits[x.id]).length} caption="tell LSP you're OK with the time" />
      <Kpi icon={<ClipboardCheck size={18} />} tone="ok" label="Reports" value={past.length} caption="checked and locked" />
    </div>
    <Note>By law LSP gives you at least 24 hours' notice before a visit, unless it's an emergency. Confirm the time or ask for another.</Note>
    <Card title="Coming up" sub="Click a visit to confirm it, ask for another time, or say whether LSP can use the spare key.">
      {upcoming.length || repairs.length ? <div className="divlist">
        {upcoming.map(x => { const a = s.visits[x.id]; return <button key={x.id} className="item click" onClick={() => s.go('visits', x.id)}><span className="datetile t-info"><b>{x.date.split(' ')[0]}</b><span>{x.date.split(' ')[1]?.toUpperCase()}</span></span><div className="stack grow"><b>{x.kind === 'Routine' ? 'Routine inspection' : `${x.kind} check`} · {x.time}</b><span className="caption">{contractorName(s, x.inspector) ?? 'LSP'} · about {x.kind === 'Gas safety' ? '45' : '30'} minutes</span></div><Chip tone={a ? (a.status === 'confirmed' ? 'ok' : 'warn') : 'info'}>{a ? (a.status === 'confirmed' ? 'You confirmed' : 'New time asked') : 'Please confirm'}</Chip></button>; })}
        {repairs.map(j => <button key={j.id} className="item click" onClick={() => s.go('repairs', j.id)}><span className="datetile t-brand"><b>{j.visit!.at.split(' ')[1]}</b><span>{j.visit!.at.split(' ')[2]?.toUpperCase().replace(',', '')}</span></span><div className="stack grow"><b>Repair · {j.title}</b><span className="caption">{contractorName(s, j.contractor)} · {j.visit!.window}</span></div><Chip tone={j.visit!.confirmed ? 'ok' : 'info'}>{j.visit!.confirmed ? 'You confirmed' : 'Please confirm'}</Chip></button>)}
      </div> : <Empty icon={<CalendarDays size={22} />}>No visits booked.</Empty>}
    </Card>
    <Card title="Past inspection reports" sub="You signed the move-in report. Keep it: it's used to compare when you move out.">
      {past.length ? <div className="divlist">{past.map(x => <div key={x.id} className="item"><span className="tile t-ok" style={{ width: 32, height: 32 }}><ClipboardCheck size={15} /></span><div className="stack grow"><b>{x.kind} inspection</b><span className="caption">{x.doneAt} · {x.summary}</span></div><Btn sm kind="ghost" icon={<Eye size={14} />} onClick={() => setOpen(x.id)}>View report</Btn></div>)}</div> : <Empty icon={<ClipboardCheck size={22} />}>No reports yet.</Empty>}
    </Card>
    {open && <InspectionModal i={s.inspections.find(x => x.id === open)!} onClose={() => setOpen(null)} />}
  </>;
}

function VisitPage({ i }: { i: Inspection }) {
  const s = useStore(); const a = s.visits[i.id]; const [change, setChange] = useState(false); const [key, setKey] = useState(true); const [rep, setRep] = useState(false);
  const title = i.kind === 'Routine' ? 'Routine inspection' : `${i.kind} ${i.status === 'Locked' ? 'inspection' : 'check'}`;
  const confirm = () => { s.answerVisit(i.id, { status: 'confirmed', at: nowStamp(), key }); s.log(`Confirmed the ${title.toLowerCase()} on ${i.date} at ${i.time}${key ? ' (spare key OK if out)' : ''}`, 'Visits', s.me.name); s.toast('Visit confirmed. Thank you.'); };
  return <>
    <PageHeader crumbs={crumbsFor('visits', s.go, title)} back={() => s.go('visits')} title={title} />
    <DetailHead media={<span className="datetile t-info" style={{ width: 64, height: 64 }}><b style={{ fontSize: 20 }}>{i.date.split(' ')[0]}</b><span>{i.date.split(' ')[1]?.toUpperCase()}</span></span>} title={`${title} · ${i.date}, ${i.time}`}
      chips={i.status === 'Locked' ? <Chip tone="ok">Done · report locked</Chip> : <Chip tone={a ? (a.status === 'confirmed' ? 'ok' : 'warn') : 'info'}>{a ? (a.status === 'confirmed' ? 'You confirmed' : 'New time asked') : 'Please confirm'}</Chip>}
      meta={[['Who', contractorName(s, i.inspector) ?? 'LSP'], ['What', i.scope], ['Booked by', myAdmin(s)?.name ?? 'LSP'], ['How long', i.kind === 'Gas safety' ? 'About 45 minutes' : 'About 30 minutes']]} />
    <div className="dgrid">
      <div className="col">
        <Card title="What happens"><p style={{ margin: 0, lineHeight: 1.6 }}>{WHAT[i.kind] ?? 'LSP will explain on the day.'}</p>{i.notes && <KV rows={[['Note from LSP', i.notes]]} />}</Card>
        <Card title="On the day" className="flat"><div className="col" style={{ gap: 8 }}>
          <span className="flex small" style={{ gap: 8 }}><ShieldCheck size={16} color="var(--ok)" />They show photo ID at the door. If in doubt, call LSP first.</span>
          <span className="flex small" style={{ gap: 8 }}><KeyRound size={16} color="var(--text-brand)" />If you're out, LSP can use the spare key, but only if you say yes.</span>
          <span className="flex small" style={{ gap: 8 }}><Wrench size={16} color="var(--text-brand)" />Tell them about anything else that needs fixing.</span></div></Card>
      </div>
      <div className="col">
        {i.status === 'Locked' ? <ActionCard tone="ok" title="Done" text={`Done ${i.doneAt}. ${i.summary ?? ''}`}><Btn block icon={<Eye size={16} />} onClick={() => setRep(true)}>View report</Btn></ActionCard>
          : a ? <ActionCard tone={a.status === 'confirmed' ? 'ok' : 'warn'} title={a.status === 'confirmed' ? 'You confirmed' : 'New time asked'} text={a.status === 'confirmed' ? `Confirmed on ${a.at}. ${a.key ? 'LSP may use the spare key if you are out.' : 'Someone will be home.'}` : `You asked for: ${a.note}. LSP will offer a new time.`}>
              {a.status === 'change' && <Btn block kind="outline" onClick={() => { lspSays(s, `New time: ${title}`, `We have moved your ${title.toLowerCase()} to the time you asked for. We will confirm the exact time by email.`); s.answerVisit(i.id, { status: 'confirmed', at: nowStamp(), key: true }); s.toast('LSP moved the visit'); }}>Prototype: LSP moves the visit</Btn>}
              {a.status === 'confirmed' && <Btn block kind="ghost" icon={<Clock size={16} />} onClick={() => setChange(true)}>Ask for another time</Btn>}</ActionCard>
          : <ActionCard title="Can you do this time?" text={`${i.date} at ${i.time}.`}>
              <label className="check" style={{ cursor: 'pointer' }}><input type="checkbox" checked={key} onChange={e => setKey(e.target.checked)} /> If I'm out, LSP may use the spare key</label>
              <Btn block icon={<CheckCircle2 size={16} />} onClick={confirm}>Confirm visit</Btn>
              <Btn block kind="outline" icon={<Clock size={16} />} onClick={() => setChange(true)}>Ask for another time</Btn></ActionCard>}
        <Card title="Booked" className="flat"><KV rows={[['Date', i.date], ['Time', i.time], ['Booked', 'By LSP, with 24 hours\' notice or more']]} /></Card>
      </div>
    </div>
    {change && <ChangeTime onClose={() => setChange(false)} onDone={t => { s.answerVisit(i.id, { status: 'change', at: nowStamp(), note: t }); s.log(`Asked for another time for the ${title.toLowerCase()}: ${t}`, 'Visits', s.me.name); s.toast('Sent. LSP will offer a new time.'); setChange(false); }} />}
    {rep && <InspectionModal i={i} onClose={() => setRep(false)} />}
  </>;
}
