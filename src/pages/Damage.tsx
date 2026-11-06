import { useState } from 'react';
import { Hammer, CheckCircle2, MessageSquareWarning, CreditCard, Landmark, Wallet, Download } from 'lucide-react';
import { useStore, money } from '../store';
import { nowStamp, parseDate } from '../data';
import { Btn, Card, Chip, Empty, KV, Modal, Note, Reason, Timeline, HSteps } from '../ui';
import { DocSheet, DemoAnswer, downloadPdf, lspSays, sendMsg, myHome, COMPANY, rentRef, type S } from './lib';
import { DAMAGE_STEPS, damageStep, damageTotal, damageTone, damageLabel, type Damage } from '../damage';

/* Damage charges for the tenant: LSP sends a quote when the home is damaged (not normal wear and tear).
   The tenant agrees and pays (now, by bank transfer or from the deposit at move-out), or says they disagree. */

export const damageToDo = (s: S) => s.damages.filter(d => ['Quote sent', 'Agreed'].includes(d.status));

function dmEvent(s: S, id: string, text: string, patch: Partial<Damage> = {}, by = s.me.name) {
  s.setDamages(ds => ds.map(x => x.id === id ? { ...x, ...patch, events: [...x.events, { at: nowStamp(), by, text }] } : x));
  s.log(text, 'Rent & Payments', by);
}

export function DamageCharges() {
  const s = useStore(); const [open, setOpen] = useState<string | null>(s.detail && s.damages.some(d => d.id === s.detail) ? s.detail : null);
  const list = [...s.damages].sort((a, b) => parseDate(b.found).getTime() - parseDate(a.found).getTime());
  const owed = list.filter(d => ['Quote sent', 'Agreed', 'Disputed'].includes(d.status)).reduce((a, d) => a + damageTotal(d), 0);
  const cur = s.damages.find(d => d.id === open);
  return <Card title="Damage charges" sub={`If something in the home is damaged (not normal wear and tear), LSP sends you a quote for the repair.${owed ? ` ${money(owed)} waiting for your answer or payment.` : ''}`}>
    {list.length ? <div className="divlist">{list.map(d => <button key={d.id} className="item click" onClick={() => setOpen(d.id)}>
      <span className={`tile t-${damageTone(d.status) === 'neutral' ? 'neutral' : damageTone(d.status)}`} style={{ width: 32, height: 32 }}><Hammer size={15} /></span>
      <div className="stack grow"><b>{d.title}</b><span className="caption">{d.room ? d.room + ' · ' : ''}quote {d.quoteNo} · sent {(d.sent ?? d.found).split(',')[0]}</span></div>
      <b>{money(damageTotal(d))}</b><Chip tone={damageTone(d.status)}>{damageLabel(d.status, true)}</Chip></button>)}</div>
      : <Empty icon={<Hammer size={22} />}>No damage charges. Thank you for looking after your home.</Empty>}
    {cur && <DamageModal d={cur} onClose={() => setOpen(null)} />}
  </Card>;
}

function DamageModal({ d, onClose }: { d: Damage; onClose: () => void }) {
  const s = useStore(); const p = myHome(s); const total = damageTotal(d);
  const [m, setM] = useState<'' | 'agree' | 'dispute' | 'bank'>('');
  const room = s.rooms.find(r => r.property === d.property && r.name === d.room);
  const n2 = (n: number) => n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const payCard = () => { dmEvent(s, d.id, `Paid ${money(total)} by card in the tenant portal`, { status: 'Paid', paidAt: nowStamp(), payHow: 'Card', agreed: d.agreed ?? nowStamp() }); s.toast(`Paid ${money(total)}. Thank you.`); setM(''); };
  const foot = <>
    <Btn kind="outline" icon={<Download size={16} />} onClick={() => downloadPdf(s, `Damage quote ${d.quoteNo}`)}>Download PDF</Btn>
    {d.status === 'Quote sent' && <><Btn kind="outline" icon={<MessageSquareWarning size={16} />} onClick={() => setM('dispute')}>I disagree</Btn><Btn icon={<CheckCircle2 size={16} />} onClick={() => setM('agree')}>Agree</Btn></>}
    {d.status === 'Agreed' && d.payHow !== 'Deposit' && <><Btn kind="outline" icon={<Landmark size={16} />} onClick={() => setM('bank')}>I've paid by bank transfer</Btn><Btn icon={<CreditCard size={16} />} onClick={payCard}>Pay {money(total)} by card</Btn></>}
  </>;
  return <Modal wide title={d.title} sub={`${p.address}${d.room ? ' · ' + d.room : ''} · quote ${d.quoteNo}`} onClose={onClose} footer={foot}>
    <HSteps items={DAMAGE_STEPS} at={damageStep(d)} stopped={d.status === 'Cancelled' ? 'Cancelled' : d.status === 'Disputed' ? 'You disagreed' : undefined} />
    {d.status === 'Quote sent' && <Note tone="warn">Please agree to this quote or tell LSP if you disagree by {d.validUntil}. If you think it was already like this when you moved in, say so: LSP checks the move-in report.</Note>}
    {d.status === 'Agreed' && (d.payHow === 'Deposit' ? <Note tone="ok">You agreed for {money(total)} to come out of your deposit when you move out. Nothing to pay now.</Note> : <Note>You agreed on {d.agreed}. Pay {money(total)} by card here, or by bank transfer to {COMPANY.bank.join(', ')} using {d.quoteNo} as the reference.</Note>)}
    {d.status === 'Disputed' && <Note tone="warn">You told LSP: "{d.disputed}". LSP is checking the move-in report and photos and will reply. You don't need to pay while it is being checked.</Note>}
    {d.status === 'Paid' && <Note tone="ok">Paid {d.paidAt} by {d.payHow?.toLowerCase()}. Thank you.</Note>}
    {d.status === 'From deposit' && <Note tone="ok">{money(total)} was taken from your deposit on {d.paidAt}.</Note>}
    {d.status === 'Cancelled' && <Note tone="ok">LSP cancelled this charge. There is nothing to pay.</Note>}
    <DocSheet kind="DAMAGE QUOTE" to={{ label: 'Quote for', rows: [s.me.name, p.address, p.area] }} site={`${p.address}${d.room ? ' · ' + d.room : ''}`}
      meta={[['Quote', d.quoteNo], ['Date', (d.sent ?? d.found).split(',')[0]], ['Valid until', d.validUntil ?? '—'], ['Status', damageLabel(d.status, true)]]}
      stamp={d.status === 'Paid' ? { text: 'PAID', tone: 'ok' } : d.status === 'From deposit' ? { text: 'FROM DEPOSIT', tone: 'ok' } : d.status === 'Quote sent' ? { text: 'FOR YOUR ANSWER', tone: 'warn' } : undefined}
      rows={d.lines.map(l => ({ label: l.activity, desc: `${l.desc}${l.qty !== 1 ? ` (${l.qty} × £${n2(l.rate)})` : ''}`, amount: Math.round(l.qty * l.rate * 100) / 100 }))}>
      <p className="doc-note">{d.note} This is damage, not normal wear and tear, so under your tenancy agreement the cost of putting it right is yours.</p>
    </DocSheet>
    {d.photos.length > 0 && <div className="photos">{d.photos.map((x, i) => <div key={x + i} className="ph" style={{ backgroundImage: `url(${room?.photos[i % Math.max(1, room.photos.length)] ?? 'images/rooms/kitchen-1.svg'})` }}><span>{x}</span></div>)}</div>}
    <KV rows={[['Found', `${d.found} · ${d.source.toLowerCase()}`], ['Total', money(total)], ['Who pays', 'You (the tenant). Not the landlord.']]} />
    {d.status === 'Disputed' && <DemoAnswer>
      <Btn sm kind="outline" onClick={() => { dmEvent(s, d.id, 'LSP checked the move-in report and kept the quote. Sent again.', { status: 'Quote sent', sent: nowStamp(), disputed: undefined }, 'Emma Thompson'); lspSays(s, `Quote ${d.quoteNo}`, `We checked the move-in report and photos. The ${d.title.toLowerCase()} was not there when you moved in, so the quote stays at ${money(total)}.`); }}>LSP keeps the quote</Btn>
      <Btn sm kind="outline" onClick={() => { const lines = d.lines.map(l => ({ ...l, rate: Math.round(l.rate * .75 * 100) / 100 })); dmEvent(s, d.id, `LSP lowered the quote to ${money(Math.round(lines.reduce((a, l) => a + l.qty * l.rate, 0) * 100) / 100)} and sent it again`, { status: 'Quote sent', sent: nowStamp(), lines, disputed: undefined }, 'Emma Thompson'); lspSays(s, `New quote ${d.quoteNo}`, 'Thank you for explaining. We have lowered the quote. Please check it again.'); }}>LSP lowers the quote</Btn>
      <Btn sm kind="success" onClick={() => { dmEvent(s, d.id, 'LSP cancelled the charge after checking', { status: 'Cancelled' }, 'Emma Thompson'); lspSays(s, `Quote ${d.quoteNo} cancelled`, 'You were right. We have cancelled the charge. There is nothing to pay.'); }}>LSP cancels it</Btn>
    </DemoAnswer>}
    {d.status === 'Agreed' && d.payHow === 'Bank transfer' && <DemoAnswer><Btn sm kind="success" onClick={() => { dmEvent(s, d.id, `LSP received ${money(total)} by bank transfer`, { status: 'Paid', paidAt: nowStamp() }, 'Emma Thompson'); lspSays(s, `Payment received · ${d.quoteNo}`, `Thank you. We received ${money(total)}.`); }}>LSP received the payment</Btn></DemoAnswer>}
    <Card className="flat" title="History"><Timeline items={[...d.events].reverse().map(e => ({ at: e.at, text: e.text, by: e.by === s.me.name ? 'You' : e.by }))} /></Card>
    {m === 'agree' && <Modal title={`Agree to pay ${money(total)}?`} sub="Choose how you want to pay. Your answer is saved with the date and time." onClose={() => setM('')}
      footer={<Btn kind="outline" onClick={() => setM('')}>Cancel</Btn>}>
      <div className="col" style={{ gap: 10 }}>
        <button className="choice" onClick={payCard}><span className="flex" style={{ gap: 8 }}><CreditCard size={16} color="var(--text-brand)" /><b>Agree and pay now by card</b></span><span className="caption">Paid straight away. You get a receipt by email.</span></button>
        <button className="choice" onClick={() => { dmEvent(s, d.id, `Agreed to quote ${d.quoteNo}. Will pay by bank transfer`, { status: 'Agreed', agreed: nowStamp(), payHow: 'Bank transfer' }); sendMsg(s, `Quote ${d.quoteNo}`, `I agree to quote ${d.quoteNo} for ${money(total)}. I will pay by bank transfer.`); setM(''); }}><span className="flex" style={{ gap: 8 }}><Landmark size={16} color="var(--text-brand)" /><b>Agree and pay by bank transfer</b></span><span className="caption">To {COMPANY.bank.join(', ')}, reference {d.quoteNo}.</span></button>
        <button className="choice" onClick={() => { dmEvent(s, d.id, `Agreed to quote ${d.quoteNo}. Asked for it to come out of the deposit at move-out`, { status: 'Agreed', agreed: nowStamp(), payHow: 'Deposit' }); sendMsg(s, `Quote ${d.quoteNo}`, `I agree to quote ${d.quoteNo} for ${money(total)}. Please take it from my deposit when I move out.`); setM(''); }}><span className="flex" style={{ gap: 8 }}><Wallet size={16} color="var(--text-brand)" /><b>Agree, take it from my deposit at move-out</b></span><span className="caption">{money(total)} of your {money(s.me.deposit)} deposit is kept back when you leave.</span></button>
      </div>
    </Modal>}
    {m === 'dispute' && <Reason title="Tell LSP you disagree" sub="LSP checks the move-in report and photos and replies. You don't pay while it is being checked." cta="Send" label="Why do you disagree?" options={['It was already like this when I moved in', 'It is normal wear and tear', 'The price is too high', 'Someone else caused it']} onClose={() => setM('')} onDone={r => { dmEvent(s, d.id, `Disagreed with quote ${d.quoteNo}: ${r}`, { status: 'Disputed', disputed: r }); sendMsg(s, `Quote ${d.quoteNo}`, `I disagree with quote ${d.quoteNo}: ${r}`); setM(''); }} />}
    {m === 'bank' && <Modal title="Tell LSP you've paid" sub="LSP checks the bank and marks it paid." onClose={() => setM('')} footer={<><Btn kind="outline" onClick={() => setM('')}>Cancel</Btn><Btn icon={<CheckCircle2 size={16} />} onClick={() => { dmEvent(s, d.id, `Said they paid ${money(total)} by bank transfer`, { payHow: 'Bank transfer' }); sendMsg(s, `Paid quote ${d.quoteNo}`, `I have paid ${money(total)} by bank transfer, reference ${d.quoteNo}.`); setM(''); }}>Send to LSP</Btn></>}>
      <KV rows={[['Amount', money(total)], ['Paid to', COMPANY.bank.join(' · ')], ['Reference', d.quoteNo], ['Not your rent reference', rentRef(s)]]} /></Modal>}
  </Modal>;
}
