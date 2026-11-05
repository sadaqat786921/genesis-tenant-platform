import { useRef, useState } from 'react';
import { Upload, CheckCircle2, FileSignature, PoundSterling, ClipboardCheck, CalendarDays, MessageSquare, Copy, Home, XCircle, ShieldCheck, BookOpen } from 'lucide-react';
import { useStore, money } from '../store';
import { KYC_DOCS, nowStamp, type DocStatus } from '../data';
import { ActionCard, Btn, Card, Chip, HSteps, KV, Modal, Note, Empty, docTone } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { myHome, myAdmin, homeType, holdingOf, COMPANY, DocSheet, DemoAnswer, lspSays, sendMsg, AskModal } from './lib';

const STAGES = ['Applied', 'Talked to LSP', 'Your documents', 'Deposit and references', 'Final check', 'Moving in', 'Moved in'];
const docLabel = (st: DocStatus) => ({ Missing: 'Needed', Uploaded: 'LSP checking', Verified: 'Checked', Rejected: 'Upload again', Expired: 'Expired' } as Record<DocStatus, string>)[st];

export function Application() {
  const s = useStore(); const a = s.app; const p = myHome(s); const admin = myAdmin(s);
  const [m, setM] = useState<'' | 'sign' | 'holding' | 'ask'>(''); const ref = useRef<HTMLInputElement>(null); const [which, setWhich] = useState('');
  const set = (patch: Partial<typeof a>, text?: string) => { s.setApp(x => ({ ...x, ...patch, tn: { ...x.tn, ...patch.tn } })); if (text) s.log(text, 'Application', a.name); };
  const holding = holdingOf(p.rent); const balance = p.rent + a.deposit - holding;
  const docsOk = a.kyc.every(k => k.status === 'Verified'); const docsTodo = a.kyc.filter(k => ['Missing', 'Rejected'].includes(k.status));
  const upload = (name: string, file: string) => { s.setApp(x => ({ ...x, kyc: x.kyc.map(k => k.name === name ? { ...k, status: 'Uploaded', file, at: nowStamp(), note: undefined } : k) })); s.log(`Uploaded ${name.split(' (')[0]}`, 'Application', a.name); s.toast('Uploaded. LSP will check it.'); };
  const stage = a.rejected ? -1 : a.stage;
  return <>
    <PageHeader crumbs={crumbsFor('application', s.go)} title="My Application" action={<Btn kind="outline" icon={<MessageSquare size={18} />} onClick={() => setM('ask')}>Message LSP</Btn>} />
    <section className="card phero">
      <div className="photo" style={{ backgroundImage: `url(${p.photo})` }} />
      <div className="stack grow" style={{ gap: 12 }}>
        <div className="flex wrap" style={{ gap: 10 }}><h2 className="dtitle">{p.address}</h2><Chip tone={a.rejected ? 'neutral' : a.stage >= 6 ? 'ok' : 'info'}>{a.rejected ? 'Not going ahead' : STAGES[a.stage]}</Chip></div>
        <span className="small">{p.area} · {homeType(p)}</span>
        <div className="dmeta">{[['Rent', `${money(p.rent)} a month`], ['Move-in from', a.moveIn], ['Who will live here', a.household], ['Applied', a.applied.split(',')[0]], ['Your contact', admin?.name ?? 'LSP']].map(([k, v]) => <div key={k}><span className="caption">{k}</span><b>{v}</b></div>)}</div>
      </div>
    </section>
    {!a.rejected && <Card><HSteps items={STAGES} at={a.stage >= 6 ? 7 : a.stage} /></Card>}
    {a.rejected && <ActionCard tone="neutral" title="Not going ahead" text={`LSP can't offer you this home. ${a.rejected.reason}. (${a.rejected.at})`}><Btn block kind="outline" icon={<MessageSquare size={16} />} onClick={() => setM('ask')}>Ask LSP about it</Btn></ActionCard>}

    {stage === 2 && <div className="dgrid">
      <Card title="Your documents" sub="LSP checks each one. Your files are kept safe and only used for this application.">
        <div className="divlist">{a.kyc.map(k => <div key={k.name} className="item" style={{ alignItems: 'flex-start' }}>
          <span className={`tile t-${docTone(k.status)}`} style={{ width: 32, height: 32 }}>{k.status === 'Verified' ? <CheckCircle2 size={15} /> : k.status === 'Rejected' ? <XCircle size={15} /> : <Upload size={15} />}</span>
          <div className="stack grow"><b>{k.name}</b><span className="caption">{k.file ? `${k.file}${k.at ? ' · ' + k.at : ''}` : 'Not uploaded yet'}</span>{k.note && <span className="small" style={{ color: 'var(--err)' }}>{k.note}</span>}</div>
          <Chip tone={docTone(k.status)}>{docLabel(k.status)}</Chip>
          {['Missing', 'Rejected'].includes(k.status) && <Btn sm icon={<Upload size={14} />} onClick={() => { setWhich(k.name); ref.current?.click(); }}>{k.status === 'Rejected' ? 'Upload again' : 'Upload'}</Btn>}
        </div>)}</div>
        <input ref={ref} type="file" accept=".pdf,image/*" hidden aria-label="Document" onChange={e => { const f = e.target.files?.[0]; if (f && which) upload(which, f.name); e.target.value = ''; }} />
        <Note>Need a right to rent share code? Get one free at GOV.UK. It lasts 90 days.</Note>
      </Card>
      <div className="col">
        <ActionCard tone={docsTodo.length ? 'warn' : 'ok'} title={docsTodo.length ? 'Your next step' : 'All sent'} text={docsTodo.length ? `Upload ${docsTodo.length} more document${docsTodo.length > 1 ? 's' : ''}: ${docsTodo.map(k => k.name.split(' (')[0].toLowerCase()).join(', ')}.` : 'Thanks. LSP is checking your documents. You will hear within 1 working day.'}>
          {docsTodo[0] && <Btn block icon={<Upload size={16} />} onClick={() => { setWhich(docsTodo[0].name); ref.current?.click(); }}>Upload {docsTodo[0].name.split(' (')[0].toLowerCase()}</Btn>}
        </ActionCard>
        <DemoAnswer>
          <Btn sm kind="outline" disabled={a.kyc.some(k => k.status === 'Missing' || k.status === 'Rejected')} onClick={() => { set({ kyc: a.kyc.map(k => ({ ...k, status: 'Verified' as DocStatus })), stage: 3, checks: { ...a.checks, reference: 'Not started' } }); lspSays(s, 'Documents checked', 'Thanks Aisha, all your documents are checked. Next: the holding deposit, your references and the tenancy agreement.'); s.toast('LSP checked your documents'); }}>Check documents</Btn>
          <Btn sm kind="ghost" onClick={() => { set({ kyc: [...a.kyc, { name: 'Guarantor details', status: 'Missing', note: 'Please add a guarantor because you are self-employed for under 2 years.' }] }); lspSays(s, 'One more document, please', 'Could you add guarantor details? It is needed for the referencing.'); s.toast('LSP asked for one more document'); }}>Ask for one more document</Btn>
        </DemoAnswer>
        <span className="caption">{KYC_DOCS.length} documents are needed for every applicant, to check identity, right to rent and that the rent is affordable.</span>
      </div>
    </div>}

    {stage === 3 && <div className="dgrid">
      <div className="col">
        <Card title="1 · Holding deposit" sub={`One week's rent (${money(holding)}). It holds the home for you and comes off your first month's rent.`} action={<Chip tone={a.checks.deposit ? 'ok' : a.tn?.holdingPaid ? 'info' : 'warn'}>{a.checks.deposit ? 'Received' : a.tn?.holdingPaid ? 'LSP checking' : 'To pay'}</Chip>}>
          {!a.checks.deposit && !a.tn?.holdingPaid && <div className="flex wrap"><Btn icon={<PoundSterling size={16} />} onClick={() => setM('holding')}>How to pay</Btn></div>}
          {a.tn?.holdingPaid && !a.checks.deposit && <span className="small">You paid on {a.tn.holdingPaid}. LSP checks the bank.</span>}
        </Card>
        <Card title="2 · References" sub="Our referencing partner checks your income and past renting. They email you a short form." action={<Chip tone={a.checks.reference === 'Passed' ? 'ok' : a.checks.reference === 'Waiting' ? 'info' : a.checks.reference === 'Failed' ? 'err' : 'warn'}>{a.checks.reference === 'Not started' ? 'Form to fill in' : a.checks.reference === 'Waiting' ? 'Being checked' : a.checks.reference}</Chip>}>
          {a.checks.reference === 'Not started' && <Btn kind="outline" icon={<ClipboardCheck size={16} />} onClick={() => { set({ checks: { ...a.checks, reference: 'Waiting' }, tn: { refForm: nowStamp() } }, 'Filled in the reference form'); s.toast('Thanks. References usually take 2 to 3 working days.'); }}>I've filled in the form</Btn>}
          {a.checks.reference === 'Waiting' && <span className="small">Sent {a.tn?.refForm}. References usually take 2 to 3 working days.</span>}
        </Card>
        <Card title="3 · Tenancy agreement" sub="Read it and sign online. Every person named must sign." action={<Chip tone={a.checks.contract ? 'ok' : 'warn'}>{a.checks.contract ? 'Signed' : 'To sign'}</Chip>}>
          {a.checks.contract ? <span className="small">Signed by {a.tn?.signedName} on {a.tn?.signedAt}. A copy is in Documents.</span> : <Btn icon={<FileSignature size={16} />} disabled={!a.checks.deposit} onClick={() => setM('sign')}>Read and sign</Btn>}
          {!a.checks.contract && !a.checks.deposit && <span className="caption">Ready to sign once LSP has your holding deposit.</span>}
        </Card>
      </div>
      <div className="col">
        <ActionCard title="Your next step" text={!a.checks.deposit ? (a.tn?.holdingPaid ? 'LSP is checking your holding deposit.' : `Pay the ${money(holding)} holding deposit.`) : a.checks.reference !== 'Passed' ? 'Your references are being checked.' : !a.checks.contract ? 'Read and sign your tenancy agreement.' : 'All done. LSP sends your application for the final check.'} />
        <DemoAnswer>
          {a.tn?.holdingPaid && !a.checks.deposit && <Btn sm kind="outline" onClick={() => { set({ checks: { ...a.checks, deposit: true } }); lspSays(s, 'Holding deposit received', `We've received your holding deposit of ${money(holding)}. You can now sign the tenancy agreement.`); s.toast('LSP received the holding deposit'); }}>Holding deposit received</Btn>}
          {a.checks.reference === 'Waiting' && <Btn sm kind="outline" onClick={() => { set({ checks: { ...a.checks, reference: 'Passed' } }); lspSays(s, 'References passed', 'Good news: your references have passed.'); s.toast('References passed'); }}>References passed</Btn>}
          {a.checks.deposit && a.checks.reference === 'Passed' && a.checks.contract && <Btn sm kind="outline" onClick={() => { set({ stage: 4 }); s.toast('Sent for the final check'); }}>Send for the final check</Btn>}
        </DemoAnswer>
      </div>
    </div>}

    {stage === 4 && <div className="dgrid">
      <Card title="Final check" sub="LSP's Supervisor looks at everything together before your move-in is booked."><KV rows={[['Documents', 'All checked'], ['Holding deposit', `${money(holding)} received`], ['References', 'Passed'], ['Tenancy agreement', `Signed ${a.tn?.signedAt ?? ''}`]]} /></Card>
      <div className="col"><ActionCard title="Nothing for you to do" text="We'll tell you as soon as it's approved, usually within 1 working day, and book your move-in." />
        <DemoAnswer note="In the live product the Supervisor approves the tenant (Lettings stage 5)."><Btn sm kind="outline" onClick={() => { set({ stage: 5, moveInAt: `${a.moveIn}, 10:00` }); lspSays(s, 'Approved: your move-in is booked', `You're approved. Your move-in is booked for ${a.moveIn} at 10:00 at ${p.address}.`); s.toast('Approved. Move-in booked.'); }}>Approve and book move-in</Btn></DemoAnswer></div>
    </div>}

    {stage === 5 && <div className="dgrid">
      <div className="col">
        <Card title="Your move-in" sub={`${myAdmin(s)?.name ?? 'LSP'} meets you at the home with the keys.`}>
          <div className="flex"><span className="datetile t-ok"><b>{a.moveInAt?.split(' ')[0]}</b><span>{a.moveInAt?.split(' ')[1]?.toUpperCase()}</span></span><div className="stack grow"><b>{a.moveInAt}</b><span className="caption">{p.address} · about 1 hour</span></div><Chip tone={a.tn?.attend ? 'ok' : 'info'}>{a.tn?.attend ? 'You confirmed' : 'Please confirm'}</Chip></div>
          {!a.tn?.attend && <Btn icon={<CheckCircle2 size={16} />} onClick={() => set({ tn: { attend: nowStamp() } }, 'Confirmed the move-in time')}>I'll be there</Btn>}
          <KV rows={[['Bring', 'Photo ID and a pen'], ['On the day', 'You check every room, the meter readings and the keys together, then sign the move-in report']]} />
        </Card>
        <Card title="Before you get the keys" sub="Pay the balance and read the How to Rent guide.">
          <div className="feebox">
            <div><span>First month's rent</span><b>{money(p.rent)}</b></div>
            <div><span>Tenancy deposit (protected)</span><b>{money(a.deposit)}</b></div>
            <div className="muted2"><span>Less holding deposit</span><b>−{money(holding)}</b></div>
            <div className="tot"><span>To pay before move-in</span><b>{money(balance)}</b></div>
          </div>
          <div className="flex wrap">{!a.tn?.balancePaid ? <Btn icon={<PoundSterling size={16} />} onClick={() => { set({ tn: { balancePaid: nowStamp() } }, `Paid the move-in balance of ${money(balance)}`); sendMsg(s, 'Move-in balance paid', `I have paid ${money(balance)} by bank transfer, reference MOVEIN-${a.id}.`); }}>I've paid {money(balance)}</Btn> : <Chip tone="ok">Paid {a.tn.balancePaid}</Chip>}
            {!a.tn?.howToRent ? <Btn kind="outline" icon={<BookOpen size={16} />} onClick={() => set({ tn: { howToRent: nowStamp() } }, 'Read the How to Rent guide')}>I've read How to Rent</Btn> : <Chip tone="ok">How to Rent read</Chip>}</div>
          <span className="caption">Pay to {COMPANY.name} · {COMPANY.bank.join(' · ')} · reference MOVEIN-{a.id}</span>
        </Card>
      </div>
      <div className="col">
        <ActionCard tone={a.tn?.attend && a.tn?.balancePaid && a.tn?.howToRent ? 'ok' : 'brand'} title="Your next step" text={!a.tn?.attend ? 'Confirm you can make the move-in time.' : !a.tn?.balancePaid ? `Pay the ${money(balance)} balance.` : !a.tn?.howToRent ? 'Read the How to Rent guide.' : 'All set. See you on move-in day.'} />
        <DemoAnswer><Btn sm kind="outline" disabled={!a.tn?.balancePaid} onClick={() => { set({ stage: 6 }); lspSays(s, 'Welcome home', `Welcome to ${p.address}! Your move-in report is signed and your tenant account is ready.`); s.toast('Moved in. Tenant account created.'); }}>Move-in done, keys handed over</Btn></DemoAnswer>
      </div>
    </div>}

    {stage === 6 && <ActionCard tone="ok" title="Welcome home" text={`You've moved in to ${p.address}. Your tenant account is ready: rent, repairs, visits and documents are all in one place.`}>
      <Btn icon={<Home size={16} />} onClick={() => { s.setRole('tenant'); try { sessionStorage.setItem('genesis-tn-signed-in', 'tenant'); } catch { /* ignore */ } s.go('home'); }}>Open the tenant portal (demo: Daniel Price)</Btn></ActionCard>}

    {stage >= 0 && stage < 2 && <Card><Empty icon={<CalendarDays size={22} />}>LSP will call you to talk about the home, then send your documents list.</Empty></Card>}
    <Card title="Your application" className="flat"><KV rows={[['Employment', a.employment], ['Yearly income', money(a.income)], ['Pets', a.pets], ['Current address', a.current], ['Applied', a.applied]]} /><span className="caption"><ShieldCheck size={12} style={{ verticalAlign: -2 }} /> Only LSP sees this. The landlord gets a summary when your application is approved.</span></Card>

    {m === 'holding' && <Modal title={`Pay the ${money(holding)} holding deposit`} sub="By law it's no more than one week's rent. It comes off your first month's rent." onClose={() => setM('')}
      footer={<><Btn kind="outline" onClick={() => setM('')}>Close</Btn><Btn icon={<CheckCircle2 size={16} />} onClick={() => { set({ tn: { holdingPaid: nowStamp() } }, `Paid the holding deposit of ${money(holding)}`); sendMsg(s, 'Holding deposit paid', `I have paid the holding deposit of ${money(holding)}, reference HOLD-${a.id}.`); setM(''); }}>I've paid</Btn></>}>
      <div className="feebox"><div><span>Pay to</span><b>{COMPANY.name}</b></div>{COMPANY.bank.map(b => <div key={b}><span>{b.split(': ')[0]}</span><b>{b.split(': ')[1]}</b></div>)}<div className="tot"><span>Reference</span><b className="flex" style={{ gap: 6 }}>HOLD-{a.id}<button className="link" aria-label="Copy reference" onClick={() => { try { navigator.clipboard?.writeText(`HOLD-${a.id}`); } catch { /* ignore */ } s.toast('Copied'); }}><Copy size={13} /></button></b></div></div>
      <Note>If the landlord pulls out, you get it back in full. If you give false information or pull out, it may be kept, and LSP explains why in writing.</Note>
    </Modal>}
    {m === 'sign' && <SignModal onClose={() => setM('')} onSigned={name => { set({ checks: { ...a.checks, contract: true }, tn: { signedAt: nowStamp(), signedName: name } }, 'Signed the tenancy agreement'); s.toast('Signed. A copy is in Documents.'); setM(''); }} />}
    {m === 'ask' && <AskModal title="Message LSP" about={`My application for ${p.address}`} onClose={() => setM('')} />}
  </>;
}

function SignModal({ onClose, onSigned }: { onClose: () => void; onSigned: (name: string) => void }) {
  const s = useStore(); const a = s.app; const p = myHome(s);
  const [name, setName] = useState(''); const [ok, setOk] = useState(false);
  return <Modal wide title="Read and sign your tenancy agreement" sub="Read it all. Type your full name and tick the box to sign." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<FileSignature size={16} />} disabled={!ok || name.trim().toLowerCase() !== a.name.toLowerCase()} onClick={() => onSigned(name.trim())}>Sign agreement</Btn></>}>
    <DocSheet kind="ASSURED SHORTHOLD TENANCY" to={{ label: 'Tenant', rows: [a.name, a.current] }} site={`${p.address}, ${p.area}`} meta={[['Start', a.moveIn], ['Term', '12 months'], ['Rent', `${money(p.rent)} pcm`], ['Deposit', money(a.deposit)]]} stamp={{ text: 'TO SIGN', tone: 'warn' }}>
      <div className="doc-sec"><span className="doc-lab">Main terms</span><div className="doc-kv two"><span>Landlord's agent</span><b>Landlord Service Plans Limited</b><span>Rent</span><b>{money(p.rent)} a month, due on the 1st</b><span>Deposit</span><b>{money(a.deposit)}, protected within 30 days in a government scheme</b><span>Repairs</span><b>Report them through the tenant portal. The landlord is responsible for repairs to the structure, heating, water and electrics</b><span>Visits</span><b>At least 24 hours' notice, except in an emergency</b><span>Ending it</span><b>At least 2 months' notice from you, after the fixed term</b></div></div>
    </DocSheet>
    <label className="field"><span>Type your full name to sign ({a.name})</span><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={a.name} /></label>
    <label className="check" style={{ cursor: 'pointer' }}><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} /> I have read the agreement and the How to Rent guide, and I agree to the terms</label>
  </Modal>;
}
