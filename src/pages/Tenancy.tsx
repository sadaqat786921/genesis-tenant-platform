import { useState } from 'react';
import { FileSignature, ShieldCheck, CalendarClock, LogOut, Download, Eye, RefreshCw, KeyRound, Gauge, Landmark, MapPin, CheckCircle2 } from 'lucide-react';
import { useStore, money, type TReq } from '../store';
import { daysFrom, nowStamp, parseDate, fmtDate } from '../data';
import { ActionCard, Btn, Card, Field, HSteps, KV, Kpi, Modal, Note, Text, Area, Select } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { DocSheet, downloadPdf, myHome, homeType, DemoAnswer, lspSays, sendMsg, InspectionModal, myAdmin } from './lib';

const MOVE = ['Notice given', 'Inspection booked', 'Inspection done', 'Deposit returned', 'Moved out'];

export function Tenancy() {
  const s = useStore(); const t = s.me; const p = myHome(s);
  const [m, setM] = useState<'' | 'agreement' | 'notice' | 'renew' | 'moveout' | 'report'>('');
  const left = daysFrom(t.end); const mo = t.moveOut;
  const renewal = s.requests.find(q => q.kind === 'Renewal');
  const moveIn = s.inspections.find(i => i.kind === 'Move-in' && i.status === 'Locked');
  const advance = (step: number, text: string, extra: Partial<NonNullable<typeof mo>> = {}) => { s.setMe(x => ({ ...x, status: step >= 4 ? 'Moved out' : 'Moving out', moveOut: { ...x.moveOut!, step, ...extra } })); lspSays(s, `Moving out: ${MOVE[step]}`, text); s.toast(MOVE[step]); };
  return <>
    <PageHeader crumbs={crumbsFor('tenancy', s.go)} title="My Tenancy" action={<div className="flex"><Btn kind="outline" icon={<Eye size={18} />} onClick={() => setM('agreement')}>Tenancy agreement</Btn>{!mo && <Btn kind="outline" icon={<LogOut size={18} />} onClick={() => setM('notice')}>Give notice</Btn>}</div>} />
    <div className="grid g4">
      <Kpi icon={<FileSignature size={18} />} tone={t.status === 'Live' ? 'ok' : 'warn'} label="Tenancy" value={t.status === 'Live' ? 'Active' : t.status} caption={`${t.start} to ${t.end}`} />
      <Kpi icon={<CalendarClock size={18} />} tone={left < 90 ? 'warn' : 'info'} label="Time left" value={left > 0 ? `${Math.round(left / 30.4)} months` : 'Ended'} caption={`ends ${t.end}`} />
      <Kpi icon={<ShieldCheck size={18} />} tone="ok" label="Deposit" value={money(t.deposit)} caption={`protected with ${t.depositScheme}`} />
      <Kpi icon={<Landmark size={18} />} tone="brand" label="Rent" value={money(t.rent)} caption={`a month · due day ${t.rentDay}`} onClick={() => s.go('rent')} />
    </div>
    {mo && <Card title="Moving out" sub={`You gave notice on ${mo.notice}. Leaving on ${mo.date}.`}>
      <HSteps items={MOVE} at={mo.step} />
      <div className="grid g2">
        <ActionCard tone={mo.step >= 4 ? 'ok' : 'brand'} title={mo.step >= 4 ? 'Moved out' : 'Your checklist'} text={mo.step >= 4 ? 'Thank you. Your tenancy has ended and your deposit has been returned.' : <span className="stack" style={{ gap: 6, fontWeight: 600 }}><span>✓ Notice given</span><span>{mo.reason.includes('Forwarding') ? '✓' : '○'} Forwarding address and bank for the deposit</span><span>○ Leave the home clean, as in the move-in report</span><span>○ Meter readings and keys on the last day</span></span>}>
          {mo.step < 4 && !mo.reason.includes('Forwarding') && <Btn block onClick={() => setM('moveout')}>Add forwarding address and bank</Btn>}
          {moveIn && mo.step < 4 && <Btn block kind="outline" icon={<Eye size={16} />} onClick={() => setM('report')}>See the move-in report</Btn>}
        </ActionCard>
        <Card title="What happens" className="flat"><KV rows={[['Move-out inspection', mo.step >= 1 ? `Booked for ${mo.date}, 10:00` : 'LSP books it for your last day'], ['Deposit', mo.step >= 3 ? `Returned${mo.deduction ? `, less ${money(mo.deduction)} for ${mo.deductionNote}` : ' in full'}` : `Returned within 10 days of agreeing deductions (${t.depositScheme} protects it)`], ['Keys', 'Hand all keys to the inspector']]} /></Card>
      </div>
      {mo.step < 4 && <DemoAnswer>
        {mo.step === 0 && <Btn sm kind="outline" onClick={() => advance(1, `Your move-out inspection is booked for ${mo.date} at 10:00. Please be there with all the keys.`)}>Book the move-out inspection</Btn>}
        {mo.step === 1 && <Btn sm kind="outline" onClick={() => advance(2, 'The move-out inspection is done. The home is in good order, compared with your move-in report.')}>Inspection done</Btn>}
        {mo.step === 2 && <Btn sm kind="outline" onClick={() => advance(3, `Your deposit of ${money(t.deposit)} has been returned in full through ${t.depositScheme}.`)}>Return the deposit</Btn>}
        {mo.step === 3 && <Btn sm kind="outline" onClick={() => advance(4, 'Your tenancy has ended. Thank you for renting with LSP.')}>Mark moved out</Btn>}
      </DemoAnswer>}
    </Card>}
    <div className="dgrid">
      <div className="col">
        <Card title="Your tenancy" action={<Btn sm kind="ghost" icon={<Download size={14} />} onClick={() => setM('agreement')}>Agreement</Btn>}>
          <KV rows={[['Home', `${p.address}, ${p.area} · ${homeType(p)}`], ['Type', 'Assured shorthold tenancy'], ['Start and end', `${t.start} to ${t.end}`], ['Rent', `${money(t.rent)} a month, due on day ${t.rentDay}`], ['Who lives here', `${t.name} (named on the agreement)`], ['Landlord', 'Managed by Landlord Service Plans'], ['Agreement', 'Signed by everyone on 28 Apr 2026']]} />
        </Card>
        <Card title="Your deposit" sub="Your deposit is protected in a government scheme. LSP can't keep any of it without agreeing it with you first.">
          <KV rows={[['Amount', money(t.deposit)], ['Scheme', t.depositScheme === 'DPS' ? 'Deposit Protection Service (DPS)' : t.depositScheme], ['Reference', t.depositRef], ['Protected on', '5 May 2026'], ['At the end', 'Returned after the move-out inspection. Any deductions are agreed with you or decided by the scheme for free.']]} />
        </Card>
        {moveIn && <Card title="Move-in report" sub={`You signed it on ${moveIn.doneAt}. It's used to compare the home when you move out.`} action={<Btn sm kind="ghost" icon={<Eye size={14} />} onClick={() => setM('report')}>View</Btn>}>
          <div className="flex wrap" style={{ gap: 18 }}><span className="flex small" style={{ gap: 6 }}><Gauge size={15} />Gas {moveIn.meters.gas} · Electric {moveIn.meters.electric} · Water {moveIn.meters.water}</span><span className="flex small" style={{ gap: 6 }}><KeyRound size={15} />{moveIn.keys} keys</span></div></Card>}
      </div>
      <div className="col">
        {!mo && <ActionCard tone={left < 120 ? 'warn' : 'brand'} title="Staying on?" text={renewal ? `You told LSP: ${renewal.about} (${renewal.at}).` : left < 120 ? 'Your tenancy ends soon. Let LSP know what you would like to do.' : `Your tenancy ends on ${t.end}. LSP will ask you about 3 months before. You can tell us now.`}>
          {!renewal && <Btn block kind="outline" icon={<RefreshCw size={16} />} onClick={() => setM('renew')}>Tell LSP your plans</Btn>}
        </ActionCard>}
        {!mo && <Card title="Moving out" sub={`Give at least 2 months' notice, ending on or after ${t.end} (or after a break clause). LSP confirms it in writing.`}><Btn kind="outline" icon={<LogOut size={16} />} onClick={() => setM('notice')}>Give notice</Btn></Card>}
        <Card title="Your rights" className="flat"><span className="small">Read the government's How to Rent guide in Documents. If you have a problem with your home, tell {myAdmin(s)?.name ?? 'LSP'} first. If it is not put right, you can complain to The Property Ombudsman.</span></Card>
      </div>
    </div>
    {m === 'agreement' && <Modal wide title="Tenancy agreement" sub="Signed by everyone. Download a copy any time." onClose={() => setM('')} footer={<><Btn kind="outline" onClick={() => setM('')}>Close</Btn><Btn icon={<Download size={16} />} onClick={() => { s.log('Downloaded your tenancy agreement', 'Documents', t.name); downloadPdf(s, 'Tenancy agreement'); }}>Download PDF</Btn></>}>
      <DocSheet kind="ASSURED SHORTHOLD TENANCY" to={{ label: 'Tenant', rows: [t.name, t.email] }} site={`${p.address}, ${p.area}`} meta={[['Start', t.start], ['End', t.end], ['Rent', `${money(t.rent)} pcm`], ['Deposit', money(t.deposit)]]} stamp={{ text: 'SIGNED', tone: 'ok' }}>
        <div className="doc-sec"><span className="doc-lab">Main terms</span><div className="doc-kv two"><span>Landlord's agent</span><b>Landlord Service Plans Limited</b><span>Rent</span><b>{money(t.rent)} a month, due on day {t.rentDay}</b><span>Deposit</span><b>{money(t.deposit)} protected with {t.depositScheme} ({t.depositRef})</b><span>Repairs</span><b>Report them through the tenant portal</b><span>Notice</span><b>At least 2 months from the tenant</b></div></div>
        <div className="doc-sec"><span className="doc-lab">Signed</span><div className="doc-kv"><span>{t.name}</span><b>28 Apr 2026, 19:42</b><span>For the landlord</span><b>28 Apr 2026, 20:05</b></div></div>
      </DocSheet></Modal>}
    {m === 'notice' && <NoticeModal onClose={() => setM('')} />}
    {m === 'renew' && <RenewModal onClose={() => setM('')} />}
    {m === 'moveout' && <MoveOutDetails onClose={() => setM('')} />}
    {m === 'report' && moveIn && <InspectionModal i={moveIn} onClose={() => setM('')} />}
  </>;
}

function NoticeModal({ onClose }: { onClose: () => void }) {
  const s = useStore(); const t = s.me;
  const earliest = (() => { const d = new Date(2026, 9, 15); d.setMonth(d.getMonth() + 2); return d; })();
  const minDate = parseDate(t.end) > earliest ? parseDate(t.end) : earliest;
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [date, setDate] = useState(iso(minDate)); const [why, setWhy] = useState('Moving for work'); const [ok, setOk] = useState(false);
  const early = new Date(date) < minDate;
  return <Modal title="Give notice" sub="Tell LSP when you'd like to move out. LSP confirms it in writing and books your move-out inspection." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn kind="danger" disabled={!ok} onClick={() => {
      const d = fmtDate(new Date(date));
      s.setMe(x => ({ ...x, status: 'Moving out', moveOut: { notice: '15 Oct 2026', date: d, reason: why, step: 0 } }));
      sendMsg(s, 'Notice to end my tenancy', `I am giving notice to move out on ${d}. Reason: ${why}.`); s.log(`Gave notice to move out on ${d}`, 'Tenancy', t.name); onClose();
    }}>Give notice</Btn></>}>
    <div className="grid g2"><Field label="Last day in the home"><input className="input" type="date" value={date} min={iso(new Date(2026, 9, 16))} onChange={e => setDate(e.target.value)} /></Field>
      <Field label="Reason (optional)"><Select value={why} onChange={setWhy} options={['Moving for work', 'Buying a home', 'Need a bigger or smaller home', 'Moving in with someone', 'Something else'].map(x => ({ value: x, label: x }))} /></Field></div>
    {early ? <Note tone="warn">This is before {fmtDate(minDate)}. Your agreement may still need you to pay rent until then. LSP will check and tell you.</Note> : <Note tone="ok">That's at least 2 months' notice, on or after your fixed term.</Note>}
    <label className="check" style={{ cursor: 'pointer' }}><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} /> I understand rent is due until the tenancy ends</label>
  </Modal>;
}

function RenewModal({ onClose }: { onClose: () => void }) {
  const s = useStore(); const [v, setV] = useState('I would like to stay and renew'); const [n, setN] = useState('');
  return <Modal title="Your plans" sub="It helps LSP plan. Nothing is final until you sign a new agreement or give notice." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn onClick={() => { const q: TReq = { id: 'TR' + Date.now(), kind: 'Renewal', title: 'My plans when the tenancy ends', about: v + (n ? `. ${n}` : ''), at: nowStamp(), status: 'Sent' }; s.setRequests(rs => [q, ...rs]); sendMsg(s, 'My plans when the tenancy ends', q.about); onClose(); }}>Send</Btn></>}>
    <Field label="What would you like to do"><Select value={v} onChange={setV} options={['I would like to stay and renew', 'I would like to stay but I am not sure for how long', 'I am planning to move out', 'I am not sure yet'].map(x => ({ value: x, label: x }))} /></Field>
    <Field label="Anything else (optional)"><Area value={n} onChange={setN} placeholder="e.g. I'd like a 12-month renewal" /></Field>
  </Modal>;
}

function MoveOutDetails({ onClose }: { onClose: () => void }) {
  const s = useStore(); const [f, setF] = useState({ addr: '', bank: '', sort: '', acc: '' });
  return <Modal title="Forwarding address and deposit bank" sub="So LSP can send your deposit back and any post." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<CheckCircle2 size={16} />} disabled={!f.addr || f.acc.length < 8 || f.sort.length < 6} onClick={() => {
      s.setMe(x => ({ ...x, moveOut: { ...x.moveOut!, reason: x.moveOut!.reason + ' · Forwarding address and bank given' } }));
      sendMsg(s, 'Moving out: forwarding address and bank', `New address: ${f.addr}. Deposit to ${f.bank}, account ending ${f.acc.slice(-4)}.`); onClose();
    }}>Save</Btn></>}>
    <Field label="Forwarding address"><Text value={f.addr} onChange={v => setF({ ...f, addr: v })} placeholder="House, street, town, postcode" /></Field>
    <div className="grid g3"><Field label="Bank"><Text value={f.bank} onChange={v => setF({ ...f, bank: v })} /></Field><Field label="Sort code"><Text value={f.sort} onChange={v => setF({ ...f, sort: v.replace(/\D/g, '').slice(0, 6) })} placeholder="000000" /></Field><Field label="Account number"><Text value={f.acc} onChange={v => setF({ ...f, acc: v.replace(/\D/g, '').slice(0, 8) })} placeholder="8 digits" /></Field></div>
    <Note><MapPin size={13} style={{ verticalAlign: -2 }} /> Your deposit goes back through {s.me.depositScheme}, to this account.</Note>
  </Modal>;
}
