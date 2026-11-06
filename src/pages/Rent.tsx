import { DamageCharges } from './Damage';
import { useState } from 'react';
import { PoundSterling, Landmark, CheckCircle2, Download, HeartHandshake, Copy, CalendarClock, Receipt } from 'lucide-react';
import { useStore, money, rentStatus, type TReq } from '../store';
import { daysFrom, nowStamp, parseDate, type RentRow } from '../data';
import { ActionCard, Btn, Card, Chip, Empty, Field, Kpi, Modal, Note, Text, Area, Select, FilterBar, applyFlt, useFlt, yearsOf, KV } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { COMPANY, DocSheet, downloadPdf, rentRef, myHome, DemoAnswer, lspSays, sendMsg } from './lib';

export function Rent() {
  const s = useStore(); const t = s.me; const p = myHome(s);
  const [m, setM] = useState<'' | 'paid' | 'help' | 'pdf'>(''); const [f, setF] = useFlt();
  const rows = [...s.rent].sort((a, b) => parseDate(b.due).getTime() - parseDate(a.due).getTime());
  const owed = rows.filter(r => r.paid < r.amount && daysFrom(r.due) < 0); const owedSum = owed.reduce((a, r) => a + r.amount - r.paid, 0);
  const next = rows.filter(r => r.paid < r.amount && daysFrom(r.due) >= 0).sort((a, b) => daysFrom(a.due) - daysFrom(b.due))[0];
  const paidYear = rows.filter(r => r.due.endsWith('2026')).reduce((a, r) => a + r.paid, 0);
  const list = applyFlt(rows, f, { text: r => `${r.month} ${rentStatus(r).label}`, type: r => r.paid >= r.amount ? 'Paid' : r.paid > 0 ? 'Part-paid' : daysFrom(r.due) < 0 ? 'Late' : 'Due', date: r => r.due });
  const reported = rows.filter(r => r.reported && r.paid < r.amount);
  const helpAsked = s.requests.find(q => q.kind === 'Payment plan');
  const copy = (v: string) => { try { navigator.clipboard?.writeText(v); } catch { /* ignore */ } s.toast('Copied'); };
  return <>
    <PageHeader crumbs={crumbsFor('rent', s.go)} title="Rent & Payments" action={<div className="flex"><Btn kind="outline" icon={<Download size={18} />} onClick={() => setM('pdf')}>Rent statement</Btn><Btn icon={<CheckCircle2 size={18} />} onClick={() => setM('paid')}>I've paid</Btn></div>} />
    <div className="grid g4">
      <Kpi icon={<PoundSterling size={18} />} tone={owedSum ? 'err' : 'ok'} label="Owed now" value={money(owedSum)} caption={owedSum ? owed.map(r => r.month).join(', ') : 'nothing owed'} />
      <Kpi icon={<CalendarClock size={18} />} tone="info" label="Next rent" value={next ? money(next.amount) : '—'} caption={next ? `due ${next.due}` : ''} />
      <Kpi icon={<Receipt size={18} />} tone="ok" label="Paid this year" value={money(paidYear)} caption={`${rows.filter(r => r.paid >= r.amount).length} months in full`} />
      <Kpi icon={<Landmark size={18} />} tone="brand" label="Monthly rent" value={money(t.rent)} caption={`due on day ${t.rentDay} each month`} />
    </div>
    {owedSum > 0 && <Note tone="err">{money(owedSum)} rent is still owed. Please pay as soon as you can, or talk to LSP. We would rather agree a plan than see you fall behind.</Note>}
    <div className="dgrid">
      <div className="col">
        <Card title="Rent history" sub="What was due and what LSP received. LSP checks the bank and records every payment. Part payments carry forward.">
          <FilterBar f={f} set={setF} placeholder="Search month" types={['Paid', 'Part-paid', 'Late', 'Due']} typeLabel="Any status" years={yearsOf(rows, r => r.due)} shown={list.length} total={rows.length} />
          <div className="tablewrap"><table className="t"><thead><tr><th>Month</th><th>Due</th><th>Rent</th><th>Received</th><th>Owed</th><th>Status</th></tr></thead><tbody>
            {list.map(r => { const st = rentStatus(r); return <tr key={r.id} className="static"><td><b className="strong">{r.month}</b></td><td>{r.due}</td><td>{money(r.amount)}</td><td>{money(r.paid)}{r.history.map(h => <div key={h.date + h.amount} className="caption">{h.date} · {money(h.amount)}</div>)}</td><td>{r.amount > r.paid && daysFrom(r.due) < 0 ? <b style={{ color: 'var(--err)' }}>{money(r.amount - r.paid)}</b> : '—'}</td>
              <td><span className="stack" style={{ gap: 4 }}><Chip tone={st.tone}>{st.label}</Chip>{r.reported && r.paid < r.amount && <span className="caption">You paid {money(r.reported.amount)} on {r.reported.date} · LSP checking</span>}</span></td></tr>; })}
          </tbody></table>{!list.length && <Empty icon={<PoundSterling size={22} />}>No rent here.</Empty>}</div>
        </Card>
        {reported.length > 0 && <DemoAnswer note="In the live product the Office Admin checks the bank and records the payment.">{reported.map(r => <Btn key={r.id} sm kind="outline" onClick={() => {
          s.setRent(rs => rs.map(x => x.id === r.id ? { ...x, paid: Math.min(x.amount, x.paid + r.reported!.amount), history: [...x.history, { date: r.reported!.date, amount: r.reported!.amount, note: 'Bank transfer · checked by LSP' }], reported: undefined } : x));
          lspSays(s, `Payment received: ${r.month}`, `Thanks, we've received ${money(r.reported!.amount)} for ${r.month}.`); s.toast(`LSP recorded ${money(r.reported!.amount)}`);
        }}>LSP finds {money(r.reported!.amount)} in the bank</Btn>)}</DemoAnswer>}
        <DamageCharges />
      </div>
      <div className="col">
        <Card title="How to pay" sub="Pay LSP by bank transfer or standing order. Always use your reference.">
          <div className="feebox">
            <div><span>Pay to</span><b>{COMPANY.name}</b></div>
            <div><span>{COMPANY.bank[0].split(': ')[0]}</span><b className="flex" style={{ gap: 6 }}>{COMPANY.bank[0].split(': ')[1]}<button className="link" aria-label="Copy sort code" onClick={() => copy(COMPANY.bank[0].split(': ')[1])}><Copy size={13} /></button></b></div>
            <div><span>{COMPANY.bank[1].split(': ')[0]}</span><b className="flex" style={{ gap: 6 }}>{COMPANY.bank[1].split(': ')[1]}<button className="link" aria-label="Copy account number" onClick={() => copy(COMPANY.bank[1].split(': ')[1])}><Copy size={13} /></button></b></div>
            <div className="tot"><span>Your reference</span><b className="flex" style={{ gap: 6 }}>{rentRef(s)}<button className="link" aria-label="Copy reference" onClick={() => copy(rentRef(s))}><Copy size={13} /></button></b></div>
          </div>
          <span className="caption">A standing order on day {t.rentDay} means you never miss a payment. Paid already? Press “I've paid” so LSP knows to look.</span>
          <Btn kind="outline" icon={<CheckCircle2 size={16} />} onClick={() => setM('paid')}>I've paid</Btn>
        </Card>
        <ActionCard tone={helpAsked ? 'ok' : 'neutral'} title="Finding it hard to pay?" text={helpAsked ? `You asked LSP for help on ${helpAsked.at}. ${myHomeAdmin(s)} will call you to agree a plan.` : 'Tell LSP early. We can agree a payment plan, and point you to free, independent advice.'}>
          {!helpAsked && <Btn block kind="outline" icon={<HeartHandshake size={16} />} onClick={() => setM('help')}>Ask for help with rent</Btn>}
        </ActionCard>
        <Card title="Your tenancy" className="flat"><KV rows={[['Home', p.address], ['Rent', `${money(t.rent)} a month`], ['Deposit', `${money(t.deposit)} · protected (${t.depositScheme})`]]} /></Card>
      </div>
    </div>
    {m === 'paid' && <PaidModal owed={owed[0] ?? next} onClose={() => setM('')} />}
    {m === 'help' && <HelpModal onClose={() => setM('')} />}
    {m === 'pdf' && <Modal wide title="Rent statement" sub="Every month of your tenancy so far, on LSP's paper." onClose={() => setM('')} footer={<><Btn kind="outline" onClick={() => setM('')}>Close</Btn><Btn icon={<Download size={16} />} onClick={() => { s.log('Downloaded your rent statement', 'Rent', t.name); downloadPdf(s, 'Rent statement'); }}>Download PDF</Btn></>}>
      <DocSheet kind="RENT STATEMENT" to={{ label: 'Tenant', rows: [t.name, p.address, p.area] }} meta={[['Tenancy', `${t.start} to ${t.end}`], ['Rent', `${money(t.rent)} a month`], ['Date', '15 Oct 2026']]}
        rows={[...rows].reverse().filter(r => daysFrom(r.due) <= 0).flatMap(r => [{ label: `Rent ${r.month}`, desc: `Due ${r.due}`, amount: r.amount }, ...r.history.map(h => ({ label: 'Payment', desc: `${h.date} · ${h.note}`, amount: -h.amount }))])} />
    </Modal>}
  </>;
}
const myHomeAdmin = (s: ReturnType<typeof useStore>) => s.staff.find(x => x.id === myHome(s).admin)?.name ?? 'LSP';

function PaidModal({ owed, onClose }: { owed?: RentRow; onClose: () => void }) {
  const s = useStore(); const [amount, setAmount] = useState(owed ? String(owed.amount - owed.paid) : ''); const [row, setRow] = useState(owed?.id ?? s.rent[0].id); const [date, setDate] = useState('2026-10-15');
  const r = s.rent.find(x => x.id === row)!;
  return <Modal title="Tell LSP you've paid" sub="LSP checks the bank, then records it. Your rent shows as paid once they have." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn disabled={!(+amount > 0)} onClick={() => {
      const d = new Date(date); const label = `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]} ${d.getFullYear()}`;
      s.setRent(rs => rs.map(x => x.id === row ? { ...x, reported: { at: nowStamp(), amount: +amount, date: label } } : x));
      sendMsg(s, `Rent paid: ${r.month}`, `I paid ${money(+amount)} on ${label} by bank transfer, reference ${rentRef(s)}.`); onClose();
    }}>Send to LSP</Btn></>}>
    <div className="grid g2"><Field label="For"><Select value={row} onChange={setRow} options={s.rent.filter(x => x.paid < x.amount).map(x => ({ value: x.id, label: `${x.month} · ${money(x.amount - x.paid)} to pay` }))} /></Field>
      <Field label="Amount (£)"><Text value={amount} onChange={setAmount} /></Field></div>
    <Field label="Date you paid"><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
    <Note>Reference to use: {rentRef(s)}</Note>
  </Modal>;
}

function HelpModal({ onClose }: { onClose: () => void }) {
  const s = useStore(); const [what, setWhat] = useState('I can pay part now and the rest later'); const [note, setNote] = useState('');
  return <Modal title="Ask for help with rent" sub="This stays between you and LSP. Someone will call you within 2 working days." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<HeartHandshake size={16} />} onClick={() => {
      const q: TReq = { id: 'TR' + Date.now(), kind: 'Payment plan', title: 'Help with paying rent', about: `${what}.${note ? ' ' + note : ''}`, at: nowStamp(), status: 'Sent' };
      s.setRequests(rs => [q, ...rs]); sendMsg(s, 'Help with paying rent', q.about); onClose();
    }}>Send to LSP</Btn></>}>
    <Field label="What would help"><Select value={what} onChange={setWhat} options={['I can pay part now and the rest later', 'I need a few more days this month', 'My income has changed', 'Something else'].map(x => ({ value: x, label: x }))} /></Field>
    <Field label="Anything else (optional)"><Area value={note} onChange={setNote} placeholder="e.g. I can pay £225 on the 20th and £225 on the 30th" /></Field>
    <Note>Free, independent help is also available from Citizens Advice and Shelter.</Note>
  </Modal>;
}
