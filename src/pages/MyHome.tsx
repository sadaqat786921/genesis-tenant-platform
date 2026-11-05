import { useState } from 'react';
import { Home, ShieldCheck, Download, MessageSquare, Wrench, BookOpen, Bell, KeyRound, PoundSterling, CalendarDays } from 'lucide-react';
import { useStore, money } from '../store';
import { HOME_GUIDE, LSP_PHONE } from '../data';
import { Btn, Card, Chip, KV, Note, Stat } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { myHome, myAdmin, homeType, certTone, certLabel, AskModal, holdingOf } from './lib';

/** The home: details, how things work, safety certificates and who to contact. Applicants see the home they are moving into. */
export function MyHome() {
  const s = useStore(); const p = myHome(s); const admin = myAdmin(s); const tenant = s.role === 'tenant';
  const [ask, setAsk] = useState(false);
  const guide = HOME_GUIDE.find(g => g.property === p.id)?.items ?? [];
  const certs = tenant ? s.safety : [];
  return <>
    <PageHeader crumbs={crumbsFor('myhome', s.go)} title={tenant ? 'My Home' : 'The Home'} action={<div className="flex"><Btn kind="ghost" icon={<MessageSquare size={16} />} onClick={() => setAsk(true)}>Ask LSP</Btn>{tenant && <Btn icon={<Wrench size={16} />} onClick={() => s.go('repairs', 'new')}>Report a repair</Btn>}</div>} />
    <section className="card phero">
      <div className="photo" style={{ backgroundImage: `url(${p.photo})` }} />
      <div className="stack grow" style={{ gap: 12 }}>
        <div className="flex wrap" style={{ gap: 10 }}><h2 className="dtitle">{p.address}</h2><Chip tone={tenant ? 'ok' : 'info'}>{tenant ? 'Your home' : 'Your new home'}</Chip></div>
        <span className="small">{p.area}</span>
        <div className="dmeta">{(tenant
          ? [['Type', `${homeType(p)} · ${p.baths} bath`], ['Rent', `${money(s.me.rent)} a month`], ['Moved in', s.me.start], ['Managed by', 'Landlord Service Plans'], ['Your contact', admin?.name ?? 'LSP']]
          : [['Type', `${homeType(p)} · ${p.baths} bath`], ['Rent', `${money(p.rent)} a month`], ['Move-in from', s.app.moveIn], ['Managed by', 'Landlord Service Plans'], ['Your contact', admin?.name ?? 'LSP']]).map(([k, v]) => <div key={k}><span className="caption">{k}</span><b>{v}</b></div>)}</div>
        <div className="grid g4" style={{ gap: 12 }}>
          {tenant ? <><Stat label="Safety certificates" value={`${certs.filter(c => ['Valid', 'Booked'].includes(c.status)).length} of ${certs.length} in date`} tone="ok" /><Stat label="Repairs open" value={s.jobs.filter(j => !['Approved', 'Invoiced', 'Declined'].includes(j.status)).length} tone="info" /><Stat label="Next visit" value={s.inspections.filter(i => i.status !== 'Locked').map(i => i.date.replace(' 2026', ''))[0] ?? 'None'} /><Stat label="Keys" value="3" sub="given at move-in" /></>
            : <><Stat label="Rent" value={money(p.rent)} sub="a month" /><Stat label="Holding deposit" value={money(holdingOf(p.rent))} sub="1 week's rent" /><Stat label="Deposit" value={money(s.app.deposit)} sub="5 weeks' rent, protected" /><Stat label="Move-in" value={s.app.moveInAt?.split(',')[0] ?? s.app.moveIn} tone="info" /></>}
        </div>
      </div>
    </section>
    <div className="grid g2">
      <Card title="How your home works" sub="Where things are and what to check. From the move-in visit." action={<BookOpen size={18} color="#667085" />}>
        {guide.length ? <KV rows={guide} /> : <Note>LSP will add this after the move-in visit.</Note>}
      </Card>
      {tenant ? <Card title="Safety certificates" sub="LSP keeps these in date and gives you a copy. Download them any time.">
        <div className="divlist">{certs.map(c => <div key={c.id} className="item"><span className={`tile t-${certTone(c.status)}`} style={{ width: 32, height: 32 }}><ShieldCheck size={15} /></span><div className="stack grow"><b>{c.kind}</b><span className="caption">Ends {c.expires}</span></div><Chip tone={certTone(c.status)}>{certLabel(c)}</Chip>{c.file && <Btn sm kind="ghost" icon={<Download size={14} />} onClick={() => { s.log(`Downloaded the ${c.kind.toLowerCase()} certificate`, 'Documents', s.me.name); s.toast('Download started'); }}>PDF</Btn>}</div>)}</div>
      </Card> : <Card title="What you'll pay before moving in" sub="Shown before you sign anything. No other fees are allowed.">
        <KV rows={[['Holding deposit', `${money(holdingOf(p.rent))} · goes towards your first month's rent`], ['First month\'s rent', money(p.rent)], ['Tenancy deposit', `${money(s.app.deposit)} · protected in a government scheme`], ['Due before move-in', money(p.rent + s.app.deposit - holdingOf(p.rent))]]} />
      </Card>}
      <Card title="Who to contact"><div className="divlist">
        {admin && <div className="item"><img className="avatar" src={admin.photo ?? 'images/av3.jpg'} alt="" /><div className="stack grow"><b>{admin.name}</b><span className="caption">Your contact at LSP · {admin.email}</span></div><Btn sm kind="ghost" onClick={() => s.go('messages')}>Message</Btn></div>}
        <div className="item"><span className="tile t-err" style={{ width: 32, height: 32 }}><Bell size={15} /></span><div className="stack grow"><b>Emergencies</b><span className="caption">LSP {LSP_PHONE} · Gas 0800 111 999 · Fire 999</span></div></div>
        <div className="item"><span className="tile t-info" style={{ width: 32, height: 32 }}><Home size={15} /></span><div className="stack grow"><b>Your landlord</b><span className="caption">Managed by LSP. Contact LSP for everything about your home.</span></div></div>
      </div></Card>
      {tenant ? <Card title="Notices" sub="From LSP about your home."><div className="divlist">{s.notices.map(n => <div key={n.id} className="item" style={{ alignItems: 'flex-start' }}><span className={`tile t-${n.tone}`} style={{ width: 32, height: 32 }}><Bell size={15} /></span><div className="stack grow"><b>{n.title}</b><span className="small">{n.text}</span></div></div>)}</div></Card>
        : <Card title="Moving in" sub="LSP books your move-in visit with the keys."><div className="col" style={{ gap: 8 }}>
          <span className="flex small" style={{ gap: 8 }}><CalendarDays size={16} color="var(--text-brand)" />Move-in date and time are confirmed in My Application.</span>
          <span className="flex small" style={{ gap: 8 }}><KeyRound size={16} color="var(--text-brand)" />You check the rooms, meter readings and keys with LSP, then sign the report.</span>
          <span className="flex small" style={{ gap: 8 }}><PoundSterling size={16} color="var(--text-brand)" />Rent is then due on the same day each month.</span></div></Card>}
    </div>
    {ask && <AskModal title="Ask LSP about the home" about={`Question about ${p.address}`} onClose={() => setAsk(false)} />}
  </>;
}
