import { useState, type ReactNode } from 'react';
import { Download, Send, FlaskConical, Image as ImageIcon } from 'lucide-react';
import { useStore, who } from '../store';
import { nowStamp, parseDate, type Job, type Inspection, type SafetyCert, type CertStatus, type Tone, type Property, type Comm } from '../data';
import { Btn, Modal, Field, Area } from '../ui';

/* Shared pieces for the tenant portal: what each status means to a tenant, the LSP paper template and small pop-ups. */

export type S = ReturnType<typeof useStore>;
export const DONE_JOB = ['Approved', 'Invoiced', 'Declined'];
export const myAdmin = (s: S) => s.staff.find(x => x.id === (s.role === 'tenant' ? s.properties.find(p => p.id === s.me.property)?.admin : s.app.admin));
export const myHome = (s: S) => s.properties.find(p => p.id === (s.role === 'tenant' ? s.me.property : s.app.property))!;
export const homeType = (p: Property) => p.type === 'HMO' ? `Shared house · ${p.rooms} rooms` : `${p.beds} bed ${p.type.toLowerCase()}`;
export const contractorName = (s: S, id?: string) => s.contractors.find(c => c.id === id)?.name;
/** Holding deposit: one week's rent (rent × 12 ÷ 52). */
export const holdingOf = (rent: number) => Math.floor(rent * 12 / 52);
/** The reference to use on rent payments. */
export const rentRef = (s: S) => `RENT-${s.me.id}-${s.me.name.split(' ').pop()!.toUpperCase()}`;

/* ---------------- repairs, as the tenant sees them ---------------- */
export function jobView(j: Job): { label: string; tone: Tone } {
  if (j.status === 'Invoiced' || j.status === 'Approved') return j.tenantFixed && !j.tenantFixed.ok ? { label: 'You said it is not fixed', tone: 'warn' } : { label: 'Fixed', tone: 'ok' };
  return ({
    New: { label: 'LSP is checking it', tone: 'info' }, 'Waiting approval': { label: 'Waiting for approval', tone: 'info' }, 'Landlord approval': { label: 'Waiting for approval', tone: 'info' },
    'Ready to assign': { label: 'Booking a visit', tone: 'brand' }, Assigned: { label: j.visit ? 'Visit booked' : 'Booking a visit', tone: 'brand' }, 'In progress': { label: 'Work in progress', tone: 'brand' },
    'Sent back': { label: 'Being put right', tone: 'warn' }, 'Proof uploaded': { label: 'Work done · LSP checking', tone: 'brand' }, Declined: { label: 'Not going ahead', tone: 'neutral' },
  } as Record<string, { label: string; tone: Tone }>)[j.status] ?? { label: j.status, tone: 'neutral' };
}
export const STEPS = ['Reported', 'Checked by LSP', 'Approved', 'Visit booked', 'Work done', 'Fixed'];
export function stepAt(j: Job) {
  return ({ New: 1, 'Waiting approval': 2, 'Landlord approval': 2, 'Ready to assign': 3, Assigned: j.visit ? 4 : 3, 'In progress': 4, 'Sent back': 4, 'Proof uploaded': 5, Approved: 6, Invoiced: 6, Declined: 1 } as Record<string, number>)[j.status] ?? 1;
}

/* ---------------- safety ---------------- */
export const certTone = (st: CertStatus) => ({ Valid: 'ok', 'Due soon': 'warn', Overdue: 'err', Booked: 'info', 'Proof to check': 'brand', Missing: 'err' } as const)[st];
export const certLabel = (c: SafetyCert) => c.status === 'Booked' ? 'Check booked' : c.status === 'Due soon' ? 'Check due soon' : c.status === 'Proof to check' ? 'LSP checking' : c.status;

/* ---------------- company details and the LSP paper ---------------- */
export const COMPANY = {
  name: 'Landlord Service Plans Limited', address: ['1 Upper Street', 'London N1 0PQ'], email: 'accounts@lsp.co.uk',
  reg: 'Company Registration No. 13940065', bank: ['Sort Code: 04-03-70', 'Account No.: 45338201'],
};
export function downloadPdf(s: S, name: string) {
  s.toast(`${name} ready. Choose "Save as PDF" to download.`);
  document.body.classList.add('printdoc');
  setTimeout(() => { try { window.print(); } catch { /* preview frames may block printing */ } document.body.classList.remove('printdoc'); }, 60);
}
export function DocSheet({ kind, to, meta, site, stamp, children, rows }: { kind: string; to: { label: string; rows: string[] }; meta: [string, string][]; site?: string; stamp?: { text: string; tone: 'ok' | 'info' | 'warn' }; children?: ReactNode; rows?: { label: string; desc: string; amount: number }[] }) {
  const n2 = (n: number) => n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <div className="docwrap"><div className="paper">
    <div className="doc-h">
      <div className="stack" style={{ gap: 2 }}><b className="doc-co">{COMPANY.name}</b>{COMPANY.address.map(a => <span key={a}>{a}</span>)}<span>{COMPANY.email}</span><span className="doc-reg">{COMPANY.reg}</span></div>
      <img src="images/logo.svg" alt="Landlord Service Plans" className="doc-logo" />
    </div>
    <div className="doc-title">{kind}{stamp && <span className={`doc-stamp s-${stamp.tone}`}>{stamp.text}</span>}</div>
    <div className="doc-top">
      <div className="stack" style={{ gap: 2 }}><span className="doc-lab">{to.label}</span>{to.rows.filter(Boolean).map((r, i) => <span key={i} className={i === 0 ? 'strong' : ''}>{r}</span>)}
        {site && <><span className="doc-lab" style={{ marginTop: 14 }}>Property</span><span>{site}</span></>}</div>
      <div className="doc-meta">{meta.map(([k, v]) => <div key={k}><span className="doc-lab">{k}</span><span>{v}</span></div>)}</div>
    </div>
    {rows && <><table className="doc-t"><thead><tr><th>Item</th><th>Details</th><th className="r">Amount</th></tr></thead><tbody>{rows.map((r, i) => <tr key={i}><td>{r.label}</td><td>{r.desc}</td><td className="r">{n2(r.amount)}</td></tr>)}</tbody></table>
      <div className="doc-tot"><div className="big"><span>Balance</span><b>£{n2(rows.reduce((a, r) => a + r.amount, 0))}</b></div></div></>}
    {children}
    <div className="doc-f"><div className="stack" style={{ gap: 2 }}><span>{COMPANY.name}</span>{COMPANY.bank.map(b => <span key={b}>{b}</span>)}</div><span>Page 1 of 1</span></div>
  </div></div>;
}

/** Move-in, routine or move-out report the tenant is allowed to see. */
export function InspectionModal({ i, onClose }: { i: Inspection; onClose: () => void }) {
  const s = useStore(); const p = s.properties.find(x => x.id === i.property);
  return <Modal wide title={`${i.kind} inspection report`} sub={`${p?.address} · done ${i.doneAt}. Checked and locked by LSP.`} onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Close</Btn><Btn icon={<Download size={16} />} onClick={() => { s.log(`Downloaded the ${i.kind.toLowerCase()} inspection report`, 'Documents'); downloadPdf(s, `Inspection report ${i.id}`); }}>Download PDF</Btn></>}>
    <DocSheet kind="INSPECTION REPORT" to={{ label: 'Tenant', rows: [who(s).name] }} site={p ? `${p.address}, ${p.area}` : ''} meta={[['Inspection', i.id], ['Type', i.kind], ['Done', i.doneAt ?? ''], ['Inspector', contractorName(s, i.inspector) ?? '—']]}>
      <div className="doc-sec"><span className="doc-lab">Summary</span><span>{i.summary ?? 'No summary.'}</span></div>
      <div className="doc-sec"><span className="doc-lab">Rooms</span><table className="doc-t sm"><thead><tr><th>Room</th><th>Condition</th><th>Photos</th><th>Notes</th></tr></thead><tbody>{i.rooms.map(r => <tr key={r.name}><td>{r.name}</td><td>{r.condition}</td><td>{r.photos}</td><td>{r.note}</td></tr>)}</tbody></table></div>
      <div className="doc-sec"><span className="doc-lab">Meters and keys</span><div className="doc-kv"><span>Gas</span><b>{i.meters.gas ?? '—'}</b><span>Electric</span><b>{i.meters.electric ?? '—'}</b><span>Water</span><b>{i.meters.water ?? '—'}</b><span>Keys</span><b>{i.keys}</b></div></div>
    </DocSheet>
  </Modal>;
}

/** Repair report for the tenant: what happened and when, with the photos. No prices. */
export function RepairReport({ j, onClose }: { j: Job; onClose: () => void }) {
  const s = useStore(); const p = s.properties.find(x => x.id === j.property);
  return <Modal wide title={`Repair report · ${j.title}`} sub="Every step with the date and time." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Close</Btn><Btn icon={<Download size={16} />} onClick={() => { s.log(`Downloaded the repair report for ${j.title}`, 'Repairs'); downloadPdf(s, `Repair report ${j.id}`); }}>Download PDF</Btn></>}>
    <DocSheet kind="REPAIR REPORT" to={{ label: 'Tenant', rows: [who(s).name] }} site={p ? `${p.address}, ${p.area}` : ''} meta={[['Repair', j.id], ['Status', jobView(j).label], ['Reported', j.reported]]}>
      <div className="doc-sec"><span className="doc-lab">The repair</span><b>{j.title}</b><span>{j.note ?? 'No details given.'}</span></div>
      <div className="doc-sec"><span className="doc-lab">What happened</span>{j.events.filter(e => !/£|priced|invoice/i.test(e.text)).map((e, i) => <div key={i} className="doc-ev"><span>{e.at}</span><span>{tenantText(e.text)}<em> · {e.by}</em></span></div>)}</div>
      <div className="doc-sec"><span className="doc-lab">Photo proof</span>{j.proof?.length ? <div className="doc-ph">{j.proof.map((x, i) => <div key={i} style={{ backgroundImage: `url(images/home${(i % 3) + 1}.jpg)` }}><span>{x}</span></div>)}</div> : <span className="caption"><ImageIcon size={12} style={{ verticalAlign: -2 }} /> Added when the work is finished.</span>}</div>
    </DocSheet>
  </Modal>;
}
/** Staff wording turned into what a tenant should read (no prices, no internal steps). */
export function tenantText(t: string) {
  if (/Approved by Supervisor|Approved by the Office Admin/.test(t)) return /sent to the (landlord|owner)/.test(t) ? 'Approved by LSP. The landlord is asked to approve the work' : 'Approved by LSP';
  if (/approves the invoice|to approve before work starts/i.test(t)) return 'Waiting for the landlord to approve the work';
  return t.replace(/\s*\(£[^)]*\)/g, '').replace(/ £[\d,.]+/g, '');
}
/** Repair history for the tenant: prices and internal approval steps are hidden. */
export const tenantEvents = (j: Job) => j.events.filter(e => !/^Priced|invoice/i.test(e.text) || /approve before work/i.test(e.text)).map(e => ({ at: e.at, text: tenantText(e.text), by: e.by === 'Sarah Khan' ? 'LSP' : e.by }));

/** Send a message to LSP from anywhere. Saved in Messages with the date and time. */
export function AskModal({ title, about, onClose, onSent, hint }: { title: string; about: string; onClose: () => void; onSent?: (text: string) => void; hint?: string }) {
  const s = useStore(); const [t, setT] = useState('');
  return <Modal title={title} sub={`Goes to ${myAdmin(s)?.name ?? 'LSP'} at LSP. You'll see the reply in Messages and by email.`} onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Send size={16} />} disabled={!t.trim()} onClick={() => { sendMsg(s, about, t.trim()); onSent?.(t.trim()); onClose(); }}>Send</Btn></>}>
    <Field label="About"><input className="input" readOnly value={about} /></Field>
    <Field label="Your message"><Area value={t} onChange={setT} placeholder={hint ?? 'Type your message'} /></Field>
  </Modal>;
}
export function sendMsg(s: S, subject: string, text: string) {
  const m: Comm = { id: 'cm' + Date.now(), at: nowStamp(), by: who(s).name, channel: 'Portal', dir: 'in', subject, text };
  if (s.role === 'tenant') s.setMe(t => ({ ...t, comms: [...t.comms, m] })); else s.setApp(a => ({ ...a, comms: [...a.comms, m] }));
  s.log(`Sent a message: ${subject}`, 'Messages', who(s).name); s.toast(`Sent to ${myAdmin(s)?.name ?? 'LSP'}`);
}
/** A reply from LSP, used by the prototype answer boxes. */
export function lspSays(s: S, subject: string, text: string) {
  const m: Comm = { id: 'cm' + Date.now() + Math.random(), at: nowStamp(), by: myAdmin(s)?.name ?? 'LSP', channel: 'Email', dir: 'out', subject, text };
  if (s.role === 'tenant') s.setMe(t => ({ ...t, comms: [...t.comms, m] })); else s.setApp(a => ({ ...a, comms: [...a.comms, m] }));
}

/** Dashed box: in the live product LSP does this from the staff portals. Lets the next step be shown here. */
export function DemoAnswer({ children, note = 'In the live product LSP does this from the Office Admin or Supervisor portal. Use these to show what happens next.' }: { children: ReactNode; note?: string }) {
  return <div className="demo"><span className="flex" style={{ gap: 6 }}><FlaskConical size={14} /><b>Prototype: LSP's answer</b></span><span className="caption">{note}</span><div className="flex wrap" style={{ gap: 8 }}>{children}</div></div>;
}
export const sortNewest = <T extends { at: string }>(a: T[]) => [...a].sort((x, y) => parseDate(y.at).getTime() - parseDate(x.at).getTime());
