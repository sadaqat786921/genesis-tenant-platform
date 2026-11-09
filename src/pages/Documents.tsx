import { damageLabel } from '../damage';
import { useState } from 'react';
import { FileText, Download, Eye, FolderOpen } from 'lucide-react';
import { useStore } from '../store';
import { parseDate } from '../data';
import { Btn, Card, Chip, Empty, Kpi, FilterBar, applyFlt, useFlt, yearsOf } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { InspectionModal, RepairReport, type S } from './lib';

type Kind = 'Tenancy' | 'Safety certificate' | 'Inspection report' | 'Repair report' | 'Guide' | 'My documents' | 'Rent' | 'Damage quote';
interface Doc { id: string; name: string; kind: Kind; date: string; note: string; view?: { type: 'insp' | 'job' | 'tenancy' | 'rent' | 'damage'; id: string } }

/** Documents the person signed in is allowed to see. Nothing about the landlord's money or other tenants. */
function docsOf(s: S): Doc[] {
  if (s.role === 'applicant') {
    const a = s.app;
    return [
      ...[...a.kyc.map(k => ({ k, who: '' })), ...(a.form?.people ?? []).filter(q => !q.pays).flatMap(q => (q.kyc ?? []).map(k => ({ k, who: q.name })))].filter(({ k }) => k.file).map(({ k, who }) => ({ id: 'K' + who + k.name, name: k.name.split(' (')[0] + (who ? ` · ${who}` : ''), kind: 'My documents' as Kind, date: (k.at ?? a.applied).split(',')[0], note: `${k.file} · ${k.status === 'Verified' ? 'checked by LSP' : k.status === 'Rejected' ? 'please upload again' : 'LSP checking'}` })),
      { id: 'G1', name: 'How to Rent guide (GOV.UK)', kind: 'Guide', date: a.since, note: 'Your rights and responsibilities as a tenant' },
      { id: 'G2', name: 'Energy Performance Certificate', kind: 'Safety certificate', date: a.since, note: 'For the home you are applying for' },
      ...(a.checks.contract ? [{ id: 'AG', name: 'Tenancy agreement (signed)', kind: 'Tenancy' as Kind, date: '15 Oct 2026', note: 'Signed by you' }] : []),
    ];
  }
  const t = s.me;
  return [
    { id: 'TA', name: 'Tenancy agreement', kind: 'Tenancy', date: '28 Apr 2026', note: 'Assured shorthold tenancy · signed by everyone', view: { type: 'tenancy', id: '' } },
    { id: 'DP', name: 'Deposit protection certificate', kind: 'Tenancy', date: '5 May 2026', note: `${t.depositScheme} · ${t.depositRef}` },
    { id: 'PI', name: 'Deposit prescribed information', kind: 'Tenancy', date: '5 May 2026', note: 'How your deposit is protected and returned' },
    { id: 'HR', name: 'How to Rent guide (GOV.UK)', kind: 'Guide', date: '28 Apr 2026', note: 'Given before you signed' },
    ...s.safety.filter(c => c.file).map(c => ({ id: c.id, name: `${c.kind} certificate`, kind: 'Safety certificate' as Kind, date: c.issued!.split(',')[0], note: `Ends ${c.expires}` })),
    ...s.inspections.filter(i => i.status === 'Locked').map(i => ({ id: i.id, name: `${i.kind} inspection report`, kind: 'Inspection report' as Kind, date: i.doneAt!.split(',')[0], note: 'Checked and locked by LSP', view: { type: 'insp' as const, id: i.id } })),
    ...s.jobs.filter(j => ['Approved', 'Invoiced'].includes(j.status)).map(j => ({ id: 'R' + j.id, name: `Repair report · ${j.title}`, kind: 'Repair report' as Kind, date: j.events[j.events.length - 1].at.split(',')[0], note: `${j.proof?.length ?? 0} photos`, view: { type: 'job' as const, id: j.id } })),
    { id: 'RS', name: 'Rent statement', kind: 'Rent', date: '15 Oct 2026', note: 'Every month so far', view: { type: 'rent', id: '' } },
    ...s.damages.filter(d => d.sent).map(d => ({ id: d.id, name: `Damage quote ${d.quoteNo} · ${d.title}`, kind: 'Damage quote' as Kind, date: d.sent!.split(',')[0], note: `${damageLabel(d.status, true)}`, view: { type: 'damage' as const, id: d.id } })),
  ];
}

export function Documents() {
  const s = useStore(); const [f, setF] = useFlt(); const [open, setOpen] = useState<Doc | null>(null);
  const all = docsOf(s).sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  const list = applyFlt(all, f, { text: d => `${d.name} ${d.note}`, type: d => d.kind, date: d => d.date });
  const dl = (d: Doc) => { s.log(`Downloaded ${d.name}`, 'Documents'); s.toast('Download started'); };
  const view = (d: Doc) => { if (!d.view) return dl(d); if (d.view.type === 'tenancy') return s.go('tenancy'); if (d.view.type === 'rent') return s.go('rent'); if (d.view.type === 'damage') return s.go('rent', d.view.id); setOpen(d); };
  const n = (k: Kind[]) => all.filter(d => k.includes(d.kind)).length;
  return <>
    <PageHeader crumbs={crumbsFor('documents', s.go)} title="Documents" />
    <div className="grid g4">
      <Kpi icon={<FileText size={18} />} tone="brand" label={s.role === 'tenant' ? 'Tenancy' : 'Your documents'} value={n(s.role === 'tenant' ? ['Tenancy'] : ['My documents'])} caption={s.role === 'tenant' ? 'agreement and deposit' : 'uploaded for checks'} />
      <Kpi icon={<FileText size={18} />} tone="ok" label="Safety certificates" value={n(['Safety certificate'])} caption="gas, electrical, energy" />
      <Kpi icon={<FileText size={18} />} tone="info" label="Reports" value={n(['Inspection report', 'Repair report'])} caption="checked and locked" />
      <Kpi icon={<FileText size={18} />} tone="neutral" label="Guides" value={n(['Guide'])} caption="your rights" />
    </div>
    <Card title="All documents" sub="Everything for your tenancy. Search, choose a type or a year, then view or download.">
      <FilterBar f={f} set={setF} placeholder="Search documents" types={[...new Set(all.map(d => d.kind))]} typeLabel="All document types" years={yearsOf(all, d => d.date)} shown={list.length} total={all.length} />
      <div className="tablewrap"><table className="t"><thead><tr><th>Document</th><th>Type</th><th>Date</th><th /></tr></thead><tbody>
        {list.map(d => <tr key={d.id} onClick={() => view(d)}><td><span className="cell"><span className="tile t-brand" style={{ width: 32, height: 32 }}><FileText size={15} /></span><span className="stack"><b className="strong">{d.name}</b><span className="caption">{d.note}</span></span></span></td><td><Chip tone="neutral" dot={false}>{d.kind}</Chip></td><td>{d.date}</td>
          <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}><div className="flex" style={{ justifyContent: 'flex-end' }}>{d.view && <Btn sm kind="ghost" icon={<Eye size={14} />} onClick={() => view(d)}>View</Btn>}<Btn sm kind="ghost" icon={<Download size={14} />} onClick={() => dl(d)}>PDF</Btn></div></td></tr>)}
      </tbody></table>{!list.length && <Empty icon={<FolderOpen size={22} />}>No documents match.</Empty>}</div>
    </Card>
    {open?.view?.type === 'insp' && <InspectionModal i={s.inspections.find(i => i.id === open.view!.id)!} onClose={() => setOpen(null)} />}
    {open?.view?.type === 'job' && <RepairReport j={s.jobs.find(j => j.id === open.view!.id)!} onClose={() => setOpen(null)} />}
  </>;
}
