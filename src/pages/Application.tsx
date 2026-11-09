import { useRef, useState } from 'react';
import { Upload, CheckCircle2, FileSignature, PoundSterling, ClipboardCheck, CalendarDays, MessageSquare, Copy, Home, XCircle, ShieldCheck, BookOpen, UserPlus, UserRound, Users, Pencil, Trash2, Send, Mail, Wallet } from 'lucide-react';
import { useStore, money } from '../store';
import { KYC_DOCS, nowStamp, type DocStatus, type KycDoc, type Applicant, type AppForm, type HousePerson } from '../data';
import { ActionCard, Btn, Card, Chip, HSteps, KV, Modal, Note, Empty, Field, Text, Select, Bar, docTone } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { myHome, myAdmin, homeType, holdingOf, COMPANY, DocSheet, DemoAnswer, lspSays, sendMsg, AskModal } from './lib';

/* Applicant onboarding (tenant portal only).
   LSP talks to the applicant (often by phone) and sends an invite. The applicant signs in and fills in the application here:
   about them, everyone who will live in the home, and who pays the rent and bills.
   - Paying alone: only the applicant goes through the full checks (KYC). Other adults need ID for the right to rent check; children just a name and age.
   - Sharing the rent (husband, wife, partner, friend): every person who pays gets their own invite and goes through the full checks.
   - Affordability: the yearly income of everyone who pays must be at least 30 × the monthly rent. If it isn't, someone else has to share the rent. */

const STEPS = ['Applied', 'Talked to LSP', 'Your application', 'LSP checks', 'Deposit and references', 'Final check', 'Moving in', 'Moved in'];
const docLabel = (st: DocStatus) => ({ Missing: 'Needed', Uploaded: 'LSP checking', Verified: 'Checked', Rejected: 'Upload again', Expired: 'Expired' } as Record<DocStatus, string>)[st];
const short = (n: string) => n.split(' (')[0];
export const AFFORD_X = 30;
const PAYER_DOCS = KYC_DOCS;
const ADULT_DOCS = [KYC_DOCS[0], KYC_DOCS[2]];
const docsFor = (pays: boolean, adult: boolean): KycDoc[] => (pays ? PAYER_DOCS : adult ? ADULT_DOCS : []).map(name => ({ name, status: 'Missing' as DocStatus }));
const open = (k: KycDoc) => k.status === 'Missing' || k.status === 'Rejected';

/** Everyone who pays the rent: the applicant first, then anyone sharing it. */
export function payersOf(a: Applicant) { const f = a.form; return f?.payMode === 'shared' ? f.people.filter(p => p.adult && p.pays) : []; }
export function householdOf(a: Applicant) {
  const f = a.form; if (!f) return a.household;
  const adults = 1 + f.people.filter(p => p.adult).length; const kids = f.people.filter(p => !p.adult).length;
  return `${adults} adult${adults > 1 ? 's' : ''}${kids ? `, ${kids} child${kids > 1 ? 'ren' : ''}` : ''}`;
}
export function affordOf(a: Applicant, rent: number) {
  const need = rent * AFFORD_X; const mine = a.form?.about.income ?? a.income; const others = payersOf(a).reduce((t, p) => t + (p.income ?? 0), 0);
  return { need, mine, total: mine + others, ok: mine + others >= need, short: Math.max(0, need - mine - others), aloneOk: mine >= need };
}
/** Documents still missing for this application (the applicant's and other adults' that the applicant uploads). */
export function appTodo(a: Applicant) {
  const mine = a.kyc.filter(open).map(k => ({ who: 'You', k }));
  const others = (a.form?.people ?? []).filter(p => p.adult && !p.pays).flatMap(p => (p.kyc ?? []).filter(open).map(k => ({ who: p.name, k })));
  return [...mine, ...others];
}

export function Application() {
  const s = useStore(); const a = s.app; const p = myHome(s); const admin = myAdmin(s);
  const [m, setM] = useState<'' | 'sign' | 'holding' | 'ask' | 'person'>(''); const [editing, setEditing] = useState<HousePerson | null>(null);
  const ref = useRef<HTMLInputElement>(null); const [which, setWhich] = useState<{ who: string; name: string } | null>(null);
  const set = (patch: Partial<Applicant>, text?: string) => { s.setApp(x => ({ ...x, ...patch, tn: { ...x.tn, ...patch.tn } })); if (text) s.log(text, 'Application', a.name); };
  const setForm = (fn: (f: AppForm) => AppForm, text?: string) => { s.setApp(x => x.form ? { ...x, form: fn(x.form) } : x); if (text) s.log(text, 'Application', a.name); };
  const holding = holdingOf(p.rent); const balance = p.rent + a.deposit - holding;
  const f = a.form; const submitted = !!f?.submitted;
  const payers = payersOf(a); const aff = affordOf(a, p.rent); const todo = appTodo(a);
  const first = a.name.split(' ')[0]; const names = [first, ...payers.map(x => x.name.split(' ')[0])];
  const stage = a.rejected ? -1 : a.stage;
  const step = stage < 2 ? stage : stage === 2 ? (submitted ? 3 : 2) : stage === 6 ? 8 : stage + 1;

  const upload = (who: string, name: string, file: string) => {
    const doc = (k: KycDoc) => k.name === name ? { ...k, status: 'Uploaded' as DocStatus, file, at: nowStamp(), note: undefined } : k;
    s.setApp(x => who === 'You' ? { ...x, kyc: x.kyc.map(doc) } : { ...x, form: x.form && { ...x.form, people: x.form.people.map(q => q.name === who ? { ...q, kyc: q.kyc?.map(doc) } : q) } });
    s.log(`Uploaded ${short(name)}${who === 'You' ? '' : ` for ${who}`}`, 'Application', a.name); s.toast('Uploaded. LSP will check it.');
  };
  const pick = (who: string, name: string) => { setWhich({ who, name }); ref.current?.click(); };
  const savePerson = (q: HousePerson) => {
    setForm(x => {
      const had = x.people.find(o => o.id === q.id); const kind = (o?: HousePerson) => o ? `${o.adult}${o.pays}` : '';
      const kyc = had && kind(had) === kind(q) && had.kyc ? had.kyc : docsFor(q.pays, q.adult);
      const next = { ...q, kyc: kyc.length ? kyc : undefined, invited: q.pays ? had?.invited : undefined, joined: q.pays ? had?.joined : undefined };
      const people = had ? x.people.map(o => o.id === q.id ? next : o) : [...x.people, next];
      return { ...x, people, payMode: people.some(o => o.adult && o.pays) ? 'shared' : x.payMode };
    }, `${editing?.id && f?.people.some(o => o.id === editing.id) ? 'Updated' : 'Added'} ${q.name} (${q.relation.toLowerCase()})`);
    setM(''); setEditing(null);
  };
  const invite = (q: HousePerson) => { setForm(x => ({ ...x, people: x.people.map(o => o.id === q.id ? { ...o, invited: nowStamp() } : o) }), `Invited ${q.name} to share the rent`); s.toast(`Invite sent to ${q.email}`); };

  // What still stops the application being sent
  const blockers: string[] = [];
  if (f) {
    if (!f.about.income || !f.about.work || !f.about.dob) blockers.push('Fill in About you');
    if (!f.payMode) blockers.push('Choose who pays the rent and bills');
    if (f.payMode === 'shared' && !payers.length) blockers.push('Add the person who shares the rent with you');
    if (payers.some(q => !q.income || !q.email)) blockers.push('Add the income and email of everyone who pays');
    if (f.payMode && !aff.ok) blockers.push(f.payMode === 'alone' ? `Your income is ${money(aff.short)} short. Add the person who shares the rent with you` : `Together you are ${money(aff.short)} short of ${money(aff.need)} a year`);
    if (payers.some(q => !q.invited)) blockers.push(`Send ${payers.filter(q => !q.invited).map(q => q.name.split(' ')[0]).join(' and ')} an invite`);
    if (payers.some(q => q.invited && (q.kyc ?? []).some(open))) blockers.push(`${payers.filter(q => (q.kyc ?? []).some(open)).map(q => q.name.split(' ')[0]).join(' and ')} to upload their documents`);
    if (todo.length) blockers.push(`Upload ${todo.length} document${todo.length > 1 ? 's' : ''}`);
  }
  const submit = () => { setForm(x => ({ ...x, submitted: nowStamp() }), 'Sent the application to LSP'); set({ household: householdOf(a) }); sendMsg(s, 'Application sent', `I've sent my application for ${p.address}. ${payers.length ? `${names.join(' and ')} will share the rent.` : 'I will pay the rent myself.'}`); s.toast('Application sent. LSP checks it within 1 working day.'); };

  const everyone: { who: string; label: string; kyc: KycDoc[]; mine: boolean; pays: boolean; q?: HousePerson }[] = [
    { who: 'You', label: `${a.name} (you)`, kyc: a.kyc, mine: true, pays: true },
    ...(f?.people ?? []).filter(q => q.adult).map(q => ({ who: q.name, label: q.name, kyc: q.kyc ?? [], mine: !q.pays, pays: q.pays, q })),
  ];

  return <>
    <PageHeader crumbs={crumbsFor('application', s.go)} title="My Application" action={<Btn kind="outline" icon={<MessageSquare size={18} />} onClick={() => setM('ask')}>Message LSP</Btn>} />
    <section className="card phero">
      <div className="photo" style={{ backgroundImage: `url(${p.photo})` }} />
      <div className="stack grow" style={{ gap: 12 }}>
        <div className="flex wrap" style={{ gap: 10 }}><h2 className="dtitle">{p.address}</h2><Chip tone={a.rejected ? 'neutral' : a.stage >= 6 ? 'ok' : 'info'}>{a.rejected ? 'Not going ahead' : STEPS[Math.min(step, 7)]}</Chip></div>
        <span className="small">{p.area} · {homeType(p)}</span>
        <div className="dmeta">{[['Rent', `${money(p.rent)} a month`], ['Move-in from', a.moveIn], ['Who will live here', householdOf(a)], ['Who pays', payers.length ? names.join(' and ') : f?.payMode === 'alone' ? `${first} alone` : 'Not chosen yet'], ['Your contact', admin?.name ?? 'LSP']].map(([k, v]) => <div key={k}><span className="caption">{k}</span><b>{v}</b></div>)}</div>
      </div>
    </section>
    {!a.rejected && <Card><HSteps items={STEPS} at={step} /></Card>}
    {a.rejected && <ActionCard tone="neutral" title="Not going ahead" text={`LSP can't offer you this home. ${a.rejected.reason}. (${a.rejected.at})`}><Btn block kind="outline" icon={<MessageSquare size={16} />} onClick={() => setM('ask')}>Ask LSP about it</Btn></ActionCard>}

    {/* Step 3 · Your application */}
    {step === 2 && f && <div className="dgrid">
      <div className="col">
        <Card title="1 · About you" sub="LSP uses this to check the home is right for you. Only LSP sees it.">
          <div className="grid g2" style={{ gap: 12 }}>
            <Field label="Full name"><Text value={a.name} onChange={() => undefined} /></Field>
            <Field label="Date of birth"><Text value={f.about.dob} onChange={v => setForm(x => ({ ...x, about: { ...x.about, dob: v } }))} placeholder="DD MMM YYYY" /></Field>
            <Field label="Where you live now"><Text value={f.about.current} onChange={v => setForm(x => ({ ...x, about: { ...x.about, current: v } }))} /></Field>
            <Field label="How long you've lived there"><Text value={f.about.since} onChange={v => setForm(x => ({ ...x, about: { ...x.about, since: v } }))} /></Field>
            <Field label="Work"><Select value={f.about.work} onChange={v => setForm(x => ({ ...x, about: { ...x.about, work: v } }))} options={['', 'Employed, full-time', 'Employed, part-time', 'Self-employed', 'Student', 'Retired', 'Not working'].map(o => ({ value: o, label: o || 'Choose…' }))} /></Field>
            <Field label="Employer and job"><Text value={f.about.employer} onChange={v => setForm(x => ({ ...x, about: { ...x.about, employer: v } }))} /></Field>
            <Field label="Your yearly income before tax (£)" hint="As on your payslips"><Text value={String(f.about.income || '')} onChange={v => setForm(x => ({ ...x, about: { ...x.about, income: +v.replace(/[^0-9]/g, '') || 0 } }))} /></Field>
            <Field label="Pets"><Text value={f.about.pets} onChange={v => setForm(x => ({ ...x, about: { ...x.about, pets: v } }))} /></Field>
          </div>
        </Card>

        <Card title="2 · Who will live here" sub="Everyone who will live in the home, including children." action={<Btn sm kind="outline" icon={<UserPlus size={14} />} onClick={() => { setEditing(null); setM('person'); }}>Add a person</Btn>}>
          <div className="divlist">
            <div className="item"><span className="tile t-brand" style={{ width: 32, height: 32 }}><UserRound size={15} /></span><div className="stack grow"><b>{a.name} (you)</b><span className="caption">Main applicant · pays the rent</span></div><Chip tone="info">Full checks</Chip></div>
            {f.people.map(q => <div key={q.id} className="item">
              <span className={`tile t-${q.pays ? 'brand' : 'neutral'}`} style={{ width: 32, height: 32 }}>{q.adult ? <UserRound size={15} /> : <Users size={15} />}</span>
              <div className="stack grow"><b>{q.name}</b><span className="caption">{q.relation} · {q.adult ? 'adult' : `child, ${q.age}`}{q.pays ? ' · shares the rent' : ''}</span></div>
              <Chip tone={q.pays ? 'info' : q.adult ? 'neutral' : 'neutral'}>{q.pays ? 'Full checks' : q.adult ? 'ID only' : 'Name only'}</Chip>
              <button className="link" aria-label={`Edit ${q.name}`} onClick={() => { setEditing(q); setM('person'); }}><Pencil size={14} /></button>
              <button className="link" aria-label={`Remove ${q.name}`} onClick={() => setForm(x => { const people = x.people.filter(o => o.id !== q.id); return { ...x, people, payMode: x.payMode === 'shared' && !people.some(o => o.pays) ? undefined : x.payMode }; }, `Removed ${q.name}`)}><Trash2 size={14} /></button>
            </div>)}
          </div>
          <span className="caption">Family members who don't pay are listed for information. Adults (18 and over) still need photo ID and a right to rent check by law.</span>
        </Card>

        <Card title="3 · Who pays the rent and bills" sub={`Rent is ${money(p.rent)} a month. To pass the affordability check, the people who pay need a yearly income of at least ${money(aff.need)} (${AFFORD_X} × the monthly rent).`}>
          <div className="grid g2" style={{ gap: 12 }}>
            <button className={`choice${f.payMode === 'alone' ? ' on' : ''}`} onClick={() => setForm(x => ({ ...x, payMode: 'alone', people: x.people.map(o => o.pays ? { ...o, pays: false, kyc: o.adult ? docsFor(false, true) : undefined, invited: undefined, joined: undefined } : o) }), 'Chose: I pay the rent alone')}>
              <span className="flex" style={{ gap: 8 }}><UserRound size={16} color="var(--text-brand)" /><b>Just me</b></span><span className="caption">You pay the rent and bills yourself. Only you go through the full checks.</span></button>
            <button className={`choice${f.payMode === 'shared' ? ' on' : ''}`} onClick={() => setForm(x => ({ ...x, payMode: 'shared' }), 'Chose: I share the rent')}>
              <span className="flex" style={{ gap: 8 }}><Users size={16} color="var(--text-brand)" /><b>Me and someone else</b></span><span className="caption">You share it with a husband, wife, partner or friend. Each of you goes through the full checks.</span></button>
          </div>
          {f.payMode === 'shared' && <div className="divlist">
            {payers.map(q => <div key={q.id} className="item">
              <span className="tile t-brand" style={{ width: 32, height: 32 }}><UserRound size={15} /></span>
              <div className="stack grow"><b>{q.name}</b><span className="caption">{q.relation} · {q.employer ?? q.work ?? 'Work not added'} · {q.income ? `${money(q.income)} a year` : 'Income not added'}</span></div>
              <Chip tone={q.joined ? 'ok' : q.invited ? 'info' : 'warn'}>{q.joined ? 'Signed in' : q.invited ? 'Invite sent' : 'Not invited'}</Chip>
              {!q.invited && <Btn sm icon={<Mail size={14} />} disabled={!q.email} onClick={() => invite(q)}>Send invite</Btn>}
            </div>)}
            {!payers.length && <Note tone="warn">Add the person who shares the rent with you, or edit someone in Who will live here and tick “Shares the rent”.</Note>}
            <div className="flex wrap">
              {f.people.filter(q => q.adult && !q.pays).map(q => <Btn key={q.id} sm kind="outline" icon={<UserPlus size={14} />} onClick={() => { setEditing({ ...q, pays: true }); setM('person'); }}>{q.name.split(' ')[0]} shares the rent</Btn>)}
              <Btn sm kind="ghost" icon={<UserPlus size={14} />} onClick={() => { setEditing({ id: '', name: '', relation: 'Partner', adult: true, pays: true }); setM('person'); }}>Someone else</Btn>
            </div>
          </div>}
          {f.payMode && <div className="stack" style={{ gap: 8 }}>
            <div className="flex"><b className="grow">Affordability</b><Chip tone={aff.ok ? 'ok' : 'err'}>{aff.ok ? 'Passes' : `${money(aff.short)} short`}</Chip></div>
            <Bar value={Math.min(100, Math.round(aff.total / aff.need * 100))} tone={aff.ok ? 'ok' : 'err'} />
            <KV rows={[[`${first}'s income`, `${money(aff.mine)} a year`], ...payers.map(q => [`${q.name.split(' ')[0]}'s income`, q.income ? `${money(q.income)} a year` : 'Not added'] as [string, string]), ['Together', `${money(aff.total)} a year`], ['Needed', `${money(aff.need)} a year`]]} />
            {!aff.ok && f.payMode === 'alone' && <Note tone="err">Your income on its own isn't enough for this home. Choose “Me and someone else” and add the person who will share the rent with you. They'll need to go through the checks too.</Note>}
            {!aff.ok && f.payMode === 'shared' && payers.length > 0 && <Note tone="err">Together you are still {money(aff.short)} a year short. Add another person who pays, or message LSP to talk about a guarantor.</Note>}
          </div>}
        </Card>

        <Card title="4 · Documents" sub="LSP checks each one. Your files are kept safe and only used for this application.">
          {everyone.map(e => <div key={e.who} className="stack" style={{ gap: 6 }}>
            <div className="flex"><b className="grow">{e.label}</b><span className="caption">{e.pays ? 'Full checks: identity, right to rent, income' : 'ID and right to rent'}</span></div>
            {!e.mine && e.q && <span className="small">{e.q.joined ? `${e.q.name.split(' ')[0]} uploads these from their own login.` : e.q.invited ? `Invite sent ${e.q.invited}. ${e.q.name.split(' ')[0]} uploads these from their own login.` : `Send ${e.q.name.split(' ')[0]} an invite in step 3. They upload these from their own login.`}</span>}
            <div className="divlist">{e.kyc.map(k => <div key={k.name} className="item" style={{ alignItems: 'flex-start' }}>
              <span className={`tile t-${docTone(k.status)}`} style={{ width: 32, height: 32 }}>{k.status === 'Verified' ? <CheckCircle2 size={15} /> : k.status === 'Rejected' ? <XCircle size={15} /> : <Upload size={15} />}</span>
              <div className="stack grow"><b>{k.name}</b><span className="caption">{k.file ? `${k.file}${k.at ? ' · ' + k.at : ''}` : 'Not uploaded yet'}</span>{k.note && <span className="small" style={{ color: 'var(--err)' }}>{k.note}</span>}</div>
              <Chip tone={docTone(k.status)}>{docLabel(k.status)}</Chip>
              {e.mine && open(k) && <Btn sm icon={<Upload size={14} />} onClick={() => pick(e.who, k.name)}>{k.status === 'Rejected' ? 'Upload again' : 'Upload'}</Btn>}
            </div>)}</div>
          </div>)}
          <input ref={ref} type="file" accept=".pdf,image/*" hidden aria-label="Document" onChange={e => { const fl = e.target.files?.[0]; if (fl && which) upload(which.who, which.name, fl.name); e.target.value = ''; }} />
          <Note>Need a right to rent share code? Get one free at GOV.UK. It lasts 90 days.</Note>
        </Card>
      </div>

      <div className="col">
        <ActionCard tone={blockers.length ? 'warn' : 'ok'} title={blockers.length ? 'Before you send it' : 'Ready to send'} text={blockers.length ? <div className="stack" style={{ gap: 4 }}>{blockers.map(b => <span key={b}>• {b}</span>)}</div> : 'Everything is filled in. Send your application and LSP checks it within 1 working day.'}>
          <Btn block icon={<Send size={16} />} disabled={blockers.length > 0} onClick={submit}>Send application to LSP</Btn>
        </ActionCard>
        <Card title="How the checks work">
          <KV rows={[['You', 'Photo ID, address, right to rent, payslips, bank statements'], ['Anyone who shares the rent', 'The same, from their own login'], ['Other adults', 'Photo ID and right to rent'], ['Children', 'Just their name and age'], ['Affordability', `Income of the people who pay ≥ ${AFFORD_X} × rent`]]} />
        </Card>
        {payers.some(q => q.invited && !q.joined) && <DemoAnswer note="In the live product the other person accepts the invite and uploads their documents from their own login.">
          {payers.filter(q => q.invited && !q.joined).map(q => <Btn key={q.id} sm kind="outline" onClick={() => { setForm(x => ({ ...x, people: x.people.map(o => o.id === q.id ? { ...o, joined: nowStamp(), kyc: o.kyc?.map((k, i) => ({ ...k, status: 'Uploaded' as DocStatus, file: `${q.name.split(' ')[0].toLowerCase()}-doc-${i + 1}.pdf`, at: nowStamp() })) } : o) }), `${q.name} signed in and uploaded their documents`); s.toast(`${q.name.split(' ')[0]} uploaded their documents`); }}>{q.name.split(' ')[0]} signs in and uploads documents</Btn>)}
        </DemoAnswer>}
      </div>
    </div>}

    {/* Step 4 · LSP checks */}
    {step === 3 && f && <div className="dgrid">
      <Card title="LSP is checking your application" sub={`Sent ${f.submitted}. LSP checks each person's documents and the affordability.`}>
        {everyone.map(e => <div key={e.who} className="stack" style={{ gap: 6 }}>
          <b>{e.label}</b>
          <div className="divlist">{e.kyc.map(k => <div key={k.name} className="item"><span className="grow small">{k.name}</span><Chip tone={docTone(k.status)}>{docLabel(k.status)}</Chip></div>)}</div>
        </div>)}
        <KV rows={[['Who will live here', householdOf(a)], ['Who pays', names.join(' and ')], ['Income of the people who pay', `${money(aff.total)} a year (needed ${money(aff.need)})`]]} />
      </Card>
      <div className="col">
        <ActionCard title="Nothing for you to do" text="LSP checks everything within 1 working day. If a document needs redoing, it comes back here." />
        <DemoAnswer>
          <Btn sm kind="outline" onClick={() => { const ok = (k: KycDoc) => ({ ...k, status: 'Verified' as DocStatus }); s.setApp(x => ({ ...x, stage: 3, kyc: x.kyc.map(ok), household: householdOf(x), form: x.form && { ...x.form, people: x.form.people.map(q => ({ ...q, kyc: q.kyc?.map(ok) })) }, checks: { ...x.checks, reference: 'Not started' } })); lspSays(s, 'Application checked', `Thanks ${first}, everyone's documents are checked and the affordability passes. Next: the holding deposit, references and the tenancy agreement.`); s.toast('LSP checked your application'); }}>Check everything</Btn>
          <Btn sm kind="ghost" onClick={() => { s.setApp(x => ({ ...x, kyc: x.kyc.map(k => k.name === KYC_DOCS[3] ? { ...k, status: 'Rejected' as DocStatus, note: 'Only 2 payslips were in the file. Please upload the last 3.' } : k), form: x.form && { ...x.form, submitted: undefined } })); lspSays(s, 'One document needs redoing', 'Your payslips file only has 2 payslips. Please upload the last 3, then send your application again.'); s.toast('LSP sent the application back'); }}>A document needs redoing</Btn>
        </DemoAnswer>
      </div>
    </div>}

    {/* Step 5 · Deposit and references */}
    {stage === 3 && <div className="dgrid">
      <div className="col">
        <Card title="1 · Holding deposit" sub={`One week's rent (${money(holding)}). It holds the home for you and comes off your first month's rent.`} action={<Chip tone={a.checks.deposit ? 'ok' : a.tn?.holdingPaid ? 'info' : 'warn'}>{a.checks.deposit ? 'Received' : a.tn?.holdingPaid ? 'LSP checking' : 'To pay'}</Chip>}>
          {!a.checks.deposit && !a.tn?.holdingPaid && <div className="flex wrap"><Btn icon={<PoundSterling size={16} />} onClick={() => setM('holding')}>How to pay</Btn></div>}
          {a.tn?.holdingPaid && !a.checks.deposit && <span className="small">You paid on {a.tn.holdingPaid}. LSP checks the bank.</span>}
        </Card>
        <Card title="2 · References" sub={`Our referencing partner checks the income and past renting of ${payers.length ? `everyone who pays (${names.join(' and ')})` : 'you'}. They email ${payers.length ? 'each of you' : 'you'} a short form.`} action={<Chip tone={a.checks.reference === 'Passed' ? 'ok' : a.checks.reference === 'Waiting' ? 'info' : a.checks.reference === 'Failed' ? 'err' : 'warn'}>{a.checks.reference === 'Not started' ? 'Form to fill in' : a.checks.reference === 'Waiting' ? 'Being checked' : a.checks.reference}</Chip>}>
          {a.checks.reference === 'Not started' && <Btn kind="outline" icon={<ClipboardCheck size={16} />} onClick={() => { set({ checks: { ...a.checks, reference: 'Waiting' }, tn: { refForm: nowStamp() } }, 'Filled in the reference form'); s.toast('Thanks. References usually take 2 to 3 working days.'); }}>I've filled in the form</Btn>}
          {a.checks.reference === 'Waiting' && <span className="small">Sent {a.tn?.refForm}. References usually take 2 to 3 working days.</span>}
        </Card>
        <Card title="3 · Tenancy agreement" sub={payers.length ? `Read it and sign online. ${names.join(' and ')} are both named tenants, so each of you signs.` : 'Read it and sign online.'} action={<Chip tone={a.checks.contract ? 'ok' : 'warn'}>{a.checks.contract ? 'Signed' : 'To sign'}</Chip>}>
          {a.tn?.signedAt ? <span className="small">Signed by {a.tn.signedName} on {a.tn.signedAt}.{a.checks.contract ? ' A copy is in Documents.' : ''}</span> : <Btn icon={<FileSignature size={16} />} disabled={!a.checks.deposit} onClick={() => setM('sign')}>Read and sign</Btn>}
          {payers.map(q => <div key={q.id} className="flex"><span className="small grow">{q.name}</span><Chip tone={a.tn?.coSigned ? 'ok' : 'info'}>{a.tn?.coSigned ? `Signed ${a.tn.coSigned}` : 'Signs from their own login'}</Chip></div>)}
          {!a.tn?.signedAt && !a.checks.deposit && <span className="caption">Ready to sign once LSP has your holding deposit.</span>}
        </Card>
      </div>
      <div className="col">
        <ActionCard title="Your next step" text={!a.checks.deposit ? (a.tn?.holdingPaid ? 'LSP is checking your holding deposit.' : `Pay the ${money(holding)} holding deposit.`) : a.checks.reference !== 'Passed' ? 'Your references are being checked.' : !a.tn?.signedAt ? 'Read and sign your tenancy agreement.' : !a.checks.contract ? `Waiting for ${payers.map(q => q.name.split(' ')[0]).join(' and ')} to sign.` : 'All done. LSP sends your application for the final check.'} />
        <DemoAnswer>
          {a.tn?.holdingPaid && !a.checks.deposit && <Btn sm kind="outline" onClick={() => { set({ checks: { ...a.checks, deposit: true } }); lspSays(s, 'Holding deposit received', `We've received your holding deposit of ${money(holding)}. You can now sign the tenancy agreement.`); s.toast('LSP received the holding deposit'); }}>Holding deposit received</Btn>}
          {a.checks.reference === 'Waiting' && <Btn sm kind="outline" onClick={() => { set({ checks: { ...a.checks, reference: 'Passed' } }); lspSays(s, 'References passed', `Good news: the references for ${names.join(' and ')} have passed.`); s.toast('References passed'); }}>References passed</Btn>}
          {payers.length > 0 && a.checks.deposit && !a.tn?.coSigned && <Btn sm kind="outline" onClick={() => { set({ checks: { ...a.checks, contract: !!a.tn?.signedAt }, tn: { coSigned: nowStamp() } }, `${payers.map(q => q.name).join(' and ')} signed the tenancy agreement`); s.toast(`${payers[0].name.split(' ')[0]} signed`); }}>{payers.map(q => q.name.split(' ')[0]).join(' and ')} signs</Btn>}
          {a.checks.deposit && a.checks.reference === 'Passed' && a.checks.contract && <Btn sm kind="outline" onClick={() => { set({ stage: 4 }); s.toast('Sent for the final check'); }}>Send for the final check</Btn>}
        </DemoAnswer>
      </div>
    </div>}

    {stage === 4 && <div className="dgrid">
      <Card title="Final check" sub="LSP's Supervisor looks at everything together before your move-in is booked."><KV rows={[['Documents', `All checked (${everyone.length} adult${everyone.length > 1 ? 's' : ''})`], ['Who pays', names.join(' and ')], ['Affordability', `${money(aff.total)} a year, needed ${money(aff.need)}`], ['Holding deposit', `${money(holding)} received`], ['References', 'Passed'], ['Tenancy agreement', `Signed ${a.tn?.signedAt ?? ''}`]]} /></Card>
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

    {stage >= 0 && stage < 2 && <Card><Empty icon={<CalendarDays size={22} />}>LSP will call you to talk about the home, then send you an invite to fill in your application here.</Empty></Card>}
    {step !== 2 && <Card title="Your application" className="flat"><KV rows={[['Work', f ? `${f.about.work} · ${f.about.employer}` : a.employment], ['Your yearly income', money(f?.about.income ?? a.income)], ['Who will live here', householdOf(a)], ['Who pays the rent', payers.length ? names.join(' and ') : first], ['Pets', f?.about.pets ?? a.pets], ['Current address', f?.about.current ?? a.current], ['Invite accepted', f?.joined ?? a.applied]]} /><span className="caption"><ShieldCheck size={12} style={{ verticalAlign: -2 }} /> Only LSP sees this. The landlord gets a summary when your application is approved.</span></Card>}

    {m === 'person' && <PersonModal start={editing} rent={p.rent} onClose={() => { setM(''); setEditing(null); }} onSave={savePerson} />}
    {m === 'holding' && <Modal title={`Pay the ${money(holding)} holding deposit`} sub="By law it's no more than one week's rent. It comes off your first month's rent." onClose={() => setM('')}
      footer={<><Btn kind="outline" onClick={() => setM('')}>Close</Btn><Btn icon={<CheckCircle2 size={16} />} onClick={() => { set({ tn: { holdingPaid: nowStamp() } }, `Paid the holding deposit of ${money(holding)}`); sendMsg(s, 'Holding deposit paid', `I have paid the holding deposit of ${money(holding)}, reference HOLD-${a.id}.`); setM(''); }}>I've paid</Btn></>}>
      <div className="feebox"><div><span>Pay to</span><b>{COMPANY.name}</b></div>{COMPANY.bank.map(b => <div key={b}><span>{b.split(': ')[0]}</span><b>{b.split(': ')[1]}</b></div>)}<div className="tot"><span>Reference</span><b className="flex" style={{ gap: 6 }}>HOLD-{a.id}<button className="link" aria-label="Copy reference" onClick={() => { try { navigator.clipboard?.writeText(`HOLD-${a.id}`); } catch { /* ignore */ } s.toast('Copied'); }}><Copy size={13} /></button></b></div></div>
      <Note>If the landlord pulls out, you get it back in full. If you give false information or pull out, it may be kept, and LSP explains why in writing.</Note>
    </Modal>}
    {m === 'sign' && <SignModal onClose={() => setM('')} onSigned={name => { set({ checks: { ...a.checks, contract: !payers.length || !!a.tn?.coSigned }, tn: { signedAt: nowStamp(), signedName: name } }, 'Signed the tenancy agreement'); s.toast(payers.length && !a.tn?.coSigned ? `Signed. Waiting for ${payers[0].name.split(' ')[0]} to sign.` : 'Signed. A copy is in Documents.'); setM(''); }} />}
    {m === 'ask' && <AskModal title="Message LSP" about={`My application for ${p.address}`} onClose={() => setM('')} />}
  </>;
}

function PersonModal({ start, rent, onClose, onSave }: { start: HousePerson | null; rent: number; onClose: () => void; onSave: (q: HousePerson) => void }) {
  const [q, setQ] = useState<HousePerson>(start ?? { id: '', name: '', relation: 'Husband', adult: true, pays: false });
  const up = (patch: Partial<HousePerson>) => setQ(x => ({ ...x, ...patch }));
  const ok = q.name.trim() && (q.adult || q.age !== undefined) && (!q.pays || (q.email && q.income));
  return <Modal title={start?.id ? `Edit ${start.name}` : 'Add a person'} sub="Everyone who will live in the home. Only LSP sees this." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<CheckCircle2 size={16} />} disabled={!ok} onClick={() => onSave({ ...q, id: q.id || `HP${Date.now()}`, name: q.name.trim(), pays: q.adult && q.pays })}>Save</Btn></>}>
    <div className="grid g2" style={{ gap: 12 }}>
      <Field label="Full name"><Text value={q.name} onChange={v => up({ name: v })} /></Field>
      <Field label="Who are they to you"><Select value={q.relation} onChange={v => up({ relation: v })} options={['Husband', 'Wife', 'Partner', 'Friend', 'Son', 'Daughter', 'Parent', 'Brother', 'Sister', 'Other'].map(o => ({ value: o, label: o }))} /></Field>
    </div>
    <div className="grid g2" style={{ gap: 12 }}>
      <button className={`choice${q.adult ? ' on' : ''}`} onClick={() => up({ adult: true, age: undefined })}><b>Adult (18 or over)</b><span className="caption">Needs photo ID and a right to rent check</span></button>
      <button className={`choice${!q.adult ? ' on' : ''}`} onClick={() => up({ adult: false, pays: false })}><b>Child (under 18)</b><span className="caption">Just their name and age</span></button>
    </div>
    {!q.adult && <Field label="Age"><Text value={q.age === undefined ? '' : String(q.age)} onChange={v => up({ age: v === '' ? undefined : Math.min(17, +v.replace(/[^0-9]/g, '') || 0) })} /></Field>}
    {q.adult && <>
      <label className="check" style={{ cursor: 'pointer' }}><input type="checkbox" checked={q.pays} onChange={e => up({ pays: e.target.checked })} /> Shares the rent and bills with me</label>
      {q.pays && <>
        <Note>{q.name.split(' ')[0] || 'They'} will get their own invite and go through the same checks as you: photo ID, address, right to rent, payslips and bank statements. Their income counts towards the {money(rent * AFFORD_X)} a year needed.</Note>
        <div className="grid g2" style={{ gap: 12 }}>
          <Field label="Email (for their invite)"><Text value={q.email ?? ''} onChange={v => up({ email: v })} /></Field>
          <Field label="Mobile"><Text value={q.phone ?? ''} onChange={v => up({ phone: v })} /></Field>
          <Field label="Employer and job"><Text value={q.employer ?? ''} onChange={v => up({ employer: v })} /></Field>
          <Field label="Yearly income before tax (£)"><Text value={q.income ? String(q.income) : ''} onChange={v => up({ income: +v.replace(/[^0-9]/g, '') || undefined })} /></Field>
        </div>
      </>}
      {!q.pays && <span className="caption"><Wallet size={12} style={{ verticalAlign: -2 }} /> Not paying: listed for information. You upload their photo ID and right to rent share code.</span>}
    </>}
  </Modal>;
}

function SignModal({ onClose, onSigned }: { onClose: () => void; onSigned: (name: string) => void }) {
  const s = useStore(); const a = s.app; const p = myHome(s); const payers = payersOf(a);
  const [name, setName] = useState(''); const [ok, setOk] = useState(false);
  return <Modal wide title="Read and sign your tenancy agreement" sub="Read it all. Type your full name and tick the box to sign." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<FileSignature size={16} />} disabled={!ok || name.trim().toLowerCase() !== a.name.toLowerCase()} onClick={() => onSigned(name.trim())}>Sign agreement</Btn></>}>
    <DocSheet kind="ASSURED SHORTHOLD TENANCY" to={{ label: payers.length ? 'Tenants' : 'Tenant', rows: [[a.name, ...payers.map(q => q.name)].join(' and '), a.current] }} site={`${p.address}, ${p.area}`} meta={[['Start', a.moveIn], ['Term', '12 months'], ['Rent', `${money(p.rent)} pcm`], ['Deposit', money(a.deposit)]]} stamp={{ text: 'TO SIGN', tone: 'warn' }}>
      <div className="doc-sec"><span className="doc-lab">Main terms</span><div className="doc-kv two"><span>Landlord's agent</span><b>Landlord Service Plans Limited</b><span>Rent</span><b>{money(p.rent)} a month, due on the 1st{payers.length ? '. The tenants are jointly responsible for all of it' : ''}</b><span>Deposit</span><b>{money(a.deposit)}, protected within 30 days in a government scheme</b><span>Also living here</span><b>{(a.form?.people ?? []).filter(q => !q.pays).map(q => `${q.name}${q.adult ? '' : ` (${q.age})`}`).join(', ') || 'No one else'}</b><span>Repairs</span><b>Report them through the tenant portal. The landlord is responsible for repairs to the structure, heating, water and electrics</b><span>Visits</span><b>At least 24 hours' notice, except in an emergency</b><span>Ending it</span><b>At least 2 months' notice from you, after the fixed term</b></div></div>
    </DocSheet>
    <label className="field"><span>Type your full name to sign ({a.name})</span><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={a.name} /></label>
    <label className="check" style={{ cursor: 'pointer' }}><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} /> I have read the agreement and the How to Rent guide, and I agree to the terms</label>
  </Modal>;
}
