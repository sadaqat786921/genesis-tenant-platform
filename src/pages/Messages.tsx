import { useEffect, useState } from 'react';
import { Send, MessageSquare, Mail, Inbox, Clock, CheckCircle2, Phone } from 'lucide-react';
import { useStore, who } from '../store';
import { LSP_PHONE, parseDate } from '../data';
import { Btn, Card, Chip, Empty, Field, Area, Select, Note, PageTabs, When, Avatar } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { myAdmin, sendMsg } from './lib';

export function Messages() {
  const s = useStore(); const w = who(s); const admin = myAdmin(s); const tenant = s.role === 'tenant';
  const TOPICS = tenant ? ['General', 'Rent', 'A repair', 'A visit', 'My tenancy', 'Moving out', 'Noise or neighbours'] : ['My application', 'My documents', 'Holding deposit', 'Tenancy agreement', 'Moving in', 'General'];
  const [tab, setTab] = useState<'messages' | 'requests'>('messages');
  const [topic, setTopic] = useState(TOPICS[0]); const [text, setText] = useState('');
  const all = [...w.comms].sort((a, b) => parseDate(b.at).getTime() - parseDate(a.at).getTime());
  const unread = all.filter(c => c.dir === 'out' && !s.read.includes(c.id)).map(c => c.id);
  useEffect(() => { if (unread.length) { const t = setTimeout(() => s.markRead(unread), 1500); return () => clearTimeout(t); } }, [unread.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  return <>
    <PageHeader crumbs={crumbsFor('messages', s.go)} title="Messages" />
    {tenant && <PageTabs value={tab} onChange={setTab} items={[{ id: 'messages', label: 'Messages with LSP', count: all.length }, { id: 'requests', label: 'My requests', count: s.requests.length }]} />}
    {tab === 'messages' && <div className="dgrid">
      <Card title="Conversation" sub="Emails, calls and portal messages between you and LSP, newest first.">
        {all.length ? <div className="divlist">{all.map(c => { const mine = c.dir === 'in'; const isNew = unread.includes(c.id); return <div key={c.id} className="item" style={{ alignItems: 'flex-start' }}>
          {mine ? <Avatar name={w.name} /> : <img className="avatar" src={admin?.photo ?? 'images/av3.jpg'} alt="" />}
          <div className="stack grow" style={{ gap: 4 }}>
            <div className="flex wrap" style={{ gap: 8 }}><b>{mine ? 'You' : c.by === 'System' ? 'LSP (automatic)' : c.by}</b><span className="caption">{c.channel === 'Email' ? <><Mail size={11} style={{ verticalAlign: -1 }} /> Email</> : c.channel === 'Call' ? <><Phone size={11} style={{ verticalAlign: -1 }} /> Phone call</> : 'Portal message'}</span>{isNew && <Chip tone="info">New</Chip>}</div>
            {c.subject && <b className="small" style={{ color: 'var(--text-primary)' }}>{c.subject}</b>}
            <span className="small" style={{ lineHeight: 1.55 }}>{c.text}</span>
          </div><When at={c.at} /></div>; })}</div> : <Empty icon={<MessageSquare size={22} />}>No messages yet.</Empty>}
      </Card>
      <div className="col">
        <Card title="Send a message" sub={`Goes to ${admin?.name ?? 'LSP'}. Replies come here and by email.`}>
          <Field label="About"><Select value={topic} onChange={setTopic} options={TOPICS.map(t => ({ value: t, label: t }))} /></Field>
          <Field label="Message"><Area value={text} onChange={setText} placeholder="Type your message" /></Field>
          <Btn icon={<Send size={16} />} disabled={!text.trim()} onClick={() => { sendMsg(s, topic, text.trim()); setText(''); }}>Send</Btn>
        </Card>
        <Note>Something urgent, like a leak or no heating? Call LSP on {LSP_PHONE}. Smell gas? Call 0800 111 999.</Note>
      </div>
    </div>}
    {tab === 'requests' && <Card title="My requests" sub="Things you asked LSP for, like help with rent or your plans for the tenancy.">
      {s.requests.length ? <div className="divlist">{s.requests.map(q => <div key={q.id} className="item" style={{ alignItems: 'flex-start' }}>
        <span className={`tile ${q.status === 'Done' ? 't-ok' : 't-info'}`} style={{ width: 32, height: 32 }}>{q.status === 'Done' ? <CheckCircle2 size={15} /> : <Clock size={15} />}</span>
        <div className="stack grow" style={{ gap: 4 }}><b>{q.title}</b><span className="caption">{q.kind} · sent {q.at}</span><span className="small">{q.about}</span>{q.reply && <span className="small" style={{ color: 'var(--text-primary)' }}>LSP: {q.reply}</span>}</div>
        <Chip tone={q.status === 'Done' ? 'ok' : 'info'}>{q.status === 'Sent' ? 'With LSP' : 'Answered'}</Chip></div>)}</div> : <Empty icon={<Inbox size={22} />}>No requests yet. Ask for help with rent from Rent & Payments, or tell LSP your plans from My Tenancy.</Empty>}
    </Card>}
  </>;
}
