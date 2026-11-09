import { useState } from 'react';
import { householdOf } from './Application';
import { Pencil, KeyRound, LogOut, ShieldCheck, Users, Download } from 'lucide-react';
import { useStore, who } from '../store';
import { nowStamp, LSP_PHONE } from '../data';
import { Btn, Card, Chip, Field, KV, Modal, Text, Avatar, Note } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { myAdmin, sendMsg, myHome } from './lib';

export function Account() {
  const s = useStore(); const w = who(s); const tenant = s.role === 'tenant';
  const [m, setM] = useState<'' | 'details' | 'password'>('');
  const [prefs, setPrefs] = useState({ visits: true, rent: true, repairs: true, sms: true, news: false });
  const toggle = (k: keyof typeof prefs, label: string) => { setPrefs(p => ({ ...p, [k]: !p[k] })); s.log(`${prefs[k] ? 'Turned off' : 'Turned on'}: ${label}`, 'Account'); s.toast('Saved'); };
  const Pref = ({ k, label, sub, locked }: { k: keyof typeof prefs; label: string; sub: string; locked?: boolean }) => <label className="item" style={{ cursor: locked ? 'default' : 'pointer' }}><div className="stack grow"><b>{label}</b><span className="caption">{sub}</span></div>{locked ? <Chip tone="neutral" dot={false}>Always on</Chip> : <input type="checkbox" checked={prefs[k]} onChange={() => toggle(k, label)} aria-label={label} />}</label>;
  return <>
    <PageHeader crumbs={crumbsFor('account', s.go)} title="Account & Settings" />
    <div className="grid g2">
      <Card title="Your details" action={<Btn sm kind="ghost" icon={<Pencil size={14} />} onClick={() => setM('details')}>Edit</Btn>}>
        <div className="flex"><Avatar name={w.name} size="lg" /><div className="stack"><b style={{ fontSize: 15 }}>{w.name}</b><span className="caption">{tenant ? `Tenant at ${myHome(s).address} since ${s.me.start}` : `Applying for ${myHome(s).address}`}</span></div></div>
        <KV rows={[['Email', w.email], ['Phone', w.phone], ...(tenant ? [['Emergency contact', s.me.emergency] as [string, string]] : [['Current address', s.app.current] as [string, string]]), ['Your contact at LSP', myAdmin(s)?.name ?? 'LSP']]} />
      </Card>
      <Card title="Who lives here" sub="Everyone over 18 must be named on the tenancy.">
        <div className="lrow"><Users size={18} color="var(--text-brand)" /><div className="stack grow"><b>{tenant ? `${s.me.name} (tenant)` : householdOf(s.app)}</b><span className="caption">{tenant ? 'Named on the agreement' : 'From your application'}</span></div></div>
        <Btn sm kind="ghost" onClick={() => sendMsg(s, 'Someone moving in or out', 'I would like to tell LSP about a change in who lives in the home.')}>Tell LSP about a change</Btn>
      </Card>
      <Card title="Notifications" sub="How LSP tells you about things.">
        <div className="divlist">
          <Pref k="visits" label="Visits and appointments" sub="At least 24 hours before anyone visits" locked />
          <Pref k="rent" label="Rent reminders" sub="A few days before rent is due" />
          <Pref k="repairs" label="Repair updates" sub="When a repair moves on" />
          <Pref k="sms" label="Text messages" sub={`Urgent things only, to ${w.phone}`} />
          <Pref k="news" label="News from LSP" sub="Tips for your home, a few times a year" />
        </div>
      </Card>
      <Card title="Sign-in and security">
        <KV rows={[['Sign-in email', w.email], ['Security code', `Texted to the phone ending ${w.phone.slice(-4)}`]]} />
        <div className="flex wrap"><Btn sm kind="outline" icon={<KeyRound size={14} />} onClick={() => setM('password')}>Change password</Btn><Btn sm kind="ghost" icon={<LogOut size={14} />} onClick={() => { s.log('Signed out of all other devices', 'Account'); s.toast('Signed out of other devices'); }}>Sign out other devices</Btn></div>
        <span className="caption"><ShieldCheck size={12} style={{ verticalAlign: -2 }} /> Five wrong codes lock the account. Call {LSP_PHONE} to unlock it.</span>
      </Card>
      <Card title="Your data"><span className="small">LSP keeps your information safe and only for as long as the law needs. You can ask for a copy at any time.</span><Btn sm kind="ghost" icon={<Download size={14} />} onClick={() => { s.log('Asked for a copy of my data', 'Account'); s.toast('Request sent. LSP will email your data.'); }}>Ask for a copy of my data</Btn></Card>
    </div>
    {m === 'details' && <EditDetails onClose={() => setM('')} />}
    {m === 'password' && <Modal title="Change password" sub="At least 10 characters, with a number and a capital letter." onClose={() => setM('')} footer={<><Btn kind="outline" onClick={() => setM('')}>Cancel</Btn><Btn onClick={() => { s.log('Changed your password', 'Account'); s.toast('Password changed'); setM(''); }}>Save</Btn></>}>
      <Field label="Current password"><input className="input" type="password" defaultValue="••••••••••" /></Field><Field label="New password"><input className="input" type="password" /></Field><Field label="Type it again"><input className="input" type="password" /></Field></Modal>}
  </>;
}

function EditDetails({ onClose }: { onClose: () => void }) {
  const s = useStore(); const w = who(s); const tenant = s.role === 'tenant';
  const [f, setF] = useState({ phone: w.phone, email: w.email, emergency: tenant ? s.me.emergency : '' });
  return <Modal title="Edit your details" sub="Phone and emergency contact change straight away. A new email is checked by LSP first." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn onClick={() => {
      if (tenant) s.setMe(t => ({ ...t, phone: f.phone, emergency: f.emergency })); else s.setApp(a => ({ ...a, phone: f.phone }));
      if (f.email !== w.email) { s.setRequests(rs => [{ id: 'TR' + Date.now(), kind: 'Contact details', title: 'Change my email address', about: `New email: ${f.email}`, at: nowStamp(), status: 'Sent' }, ...rs]); sendMsg(s, 'Change my email address', `Please change my email to ${f.email}.`); }
      else s.toast('Saved');
      s.log('Updated your details', 'Account'); onClose();
    }}>Save</Btn></>}>
    <Field label="Email"><Text value={f.email} onChange={v => setF({ ...f, email: v })} /></Field>
    <Field label="Phone"><Text value={f.phone} onChange={v => setF({ ...f, phone: v })} /></Field>
    {tenant && <Field label="Emergency contact"><Text value={f.emergency} onChange={v => setF({ ...f, emergency: v })} /></Field>}
    <Note>Your name can only be changed by LSP, with proof.</Note>
  </Modal>;
}
