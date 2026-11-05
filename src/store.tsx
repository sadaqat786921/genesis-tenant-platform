import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import * as D from './data';
import { useLocation, useNavigate } from 'react-router-dom';

/* Tenant portal. Two demo sign-ins:
   - tenant: Daniel Price, living at Flat 4, 19 Highgate Hill
   - applicant: Aisha Rahman, applying for 31 Ash Grove (application → move-in)
   Only that person's own records are loaded. Landlord money, other tenants and internal costs are never loaded. */

export type Role = 'tenant' | 'applicant';
export type Route = 'home' | 'application' | 'messages' | 'myhome' | 'tenancy' | 'repairs' | 'visits' | 'rent' | 'documents' | 'account';
export const ROUTES: Route[] = ['home', 'application', 'messages', 'myhome', 'tenancy', 'repairs', 'visits', 'rent', 'documents', 'account'];
type Setter<T> = (fn: (prev: T[]) => T[]) => void;

const ME_T = D.TENANTS.find(t => t.id === D.ME)!;
const ME_A = D.APPLICANTS.find(a => a.id === D.APPLICANT_ID)!;
/** A repair as the tenant may see it: no prices, contractor costs or landlord invoices. */
const strip = (j: D.Job): D.Job => ({ ...j, cost: 0, price: 0, hours: undefined, rate: undefined, invoice: undefined, cInvoice: undefined, lines: undefined, comms: [] });
const JOBS = D.JOBS.filter(j => j.tenant === D.ME || (j.property === ME_T.property && !j.ownerRepair && j.by.startsWith('Tenant'))).map(strip);

export interface TReq { id: string; kind: 'Payment plan' | 'Renewal' | 'Contact details' | 'Other'; title: string; about: string; at: string; status: 'Sent' | 'Done'; reply?: string; answered?: string }
export interface VisitAnswer { status: 'confirmed' | 'change'; at: string; note?: string; key?: boolean }

interface Store {
  route: Route; detail: string | null; go: (r: Route, detail?: string | null) => void;
  toast: (msg: string) => void; toasts: { id: number; msg: string }[];
  log: (what: string, area: string, who?: string) => void; activity: D.Activity[];
  role: Role; setRole: (r: Role) => void;
  me: D.Tenant; setMe: (fn: (t: D.Tenant) => D.Tenant) => void;
  app: D.Applicant; setApp: (fn: (a: D.Applicant) => D.Applicant) => void;
  properties: D.Property[]; contractors: D.Contractor[]; staff: D.Staff[];
  jobs: D.Job[]; setJobs: Setter<D.Job>;
  inspections: D.Inspection[]; safety: D.SafetyCert[];
  rent: D.RentRow[]; setRent: Setter<D.RentRow>;
  notices: D.Notice[];
  requests: TReq[]; setRequests: Setter<TReq>;
  visits: Record<string, VisitAnswer>; answerVisit: (id: string, a: VisitAnswer) => void;
  read: string[]; markRead: (ids: string[]) => void;
}
const Ctx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(Ctx);

function useList<T>(init: T[]): [T[], Setter<T>] {
  const [v, setV] = useState<T[]>(init);
  return [v, useCallback((fn: (prev: T[]) => T[]) => setV(prev => fn(prev)), [])];
}
const SEEN_BEFORE = D.parseDate('13 Oct 2026, 00:00').getTime();
const ACT: D.Activity[] = [
  { id: 'A1', at: '14 Oct 2026, 11:00', who: 'Emma Thompson', what: 'Booked your routine inspection (28 Oct, 11:00) and gas safety check (5 Nov, 09:00)', area: 'Visits' },
  { id: 'A2', at: '13 Oct 2026, 10:20', who: 'Emma Thompson', what: 'Checked your bathroom fan repair and sent it for approval', area: 'Repairs' },
  { id: 'A3', at: '13 Oct 2026, 09:30', who: 'Emma Thompson', what: 'Sent a rent reminder: £450 still owed for October', area: 'Rent' },
  { id: 'A4', at: '12 Oct 2026, 19:10', who: 'Daniel Price', what: 'Reported a repair: bathroom extractor fan', area: 'Repairs' },
  { id: 'A5', at: '3 Oct 2026, 14:00', who: 'Emma Thompson', what: 'Recorded £900 rent for October', area: 'Rent' },
  { id: 'A6', at: '22 Sep 2026, 11:20', who: 'Volt Electrical', what: 'Replaced the hallway smoke alarm and tested it', area: 'Repairs' },
  { id: 'A7', at: '1 May 2026, 10:50', who: 'Clear View Inspections', what: 'Move-in inspection done and signed by you', area: 'Visits' },
];

/** Session key: '' when signed out, otherwise who signed in. */
export const SIGNED_KEY = 'genesis-tn-signed-in';
const savedRole = (): Role => { try { return sessionStorage.getItem(SIGNED_KEY) === 'applicant' ? 'applicant' : 'tenant'; } catch { return 'tenant'; } };
export function StoreProvider({ children }: { children: ReactNode }) {
  const loc = useLocation(); const nav = useNavigate();
  const parts = loc.pathname.split('/').filter(Boolean);
  const [role, setRoleState] = useState<Role>(savedRole);
  const fallback: Route = role === 'tenant' ? 'home' : 'application';
  const route = (ROUTES.includes(parts[0] as Route) ? parts[0] : fallback) as Route;
  const detail = parts[1] ? decodeURIComponent(parts[1]) : null;
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [activity, setActivity] = useState<D.Activity[]>(ACT);
  const [me, setMeState] = useState<D.Tenant>(ME_T);
  const [app, setAppState] = useState<D.Applicant>(ME_A);
  const [jobs, setJobs] = useList(JOBS);
  const [rent, setRent] = useList(D.RENT.filter(r => r.tenant === D.ME));
  const [requests, setRequests] = useList<TReq>([]);
  const [visits, setVisits] = useState<Record<string, VisitAnswer>>({});
  const [read, setRead] = useState<string[]>([...ME_T.comms, ...ME_A.comms].filter(c => D.parseDate(c.at).getTime() < SEEN_BEFORE).map(c => c.id));

  const go = useCallback((r: Route, d: string | null = null) => { nav('/' + r + (d ? '/' + encodeURIComponent(d) : '')); window.scrollTo({ top: 0 }); }, [nav]);
  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  }, []);
  const log = useCallback((what: string, area: string, who?: string) => {
    setActivity(a => [{ id: 'H' + Date.now() + Math.random(), at: D.nowStamp(), who: who ?? '', what, area }, ...a]);
  }, []);
  const setRole = useCallback((r: Role) => setRoleState(r), []);
  const setMe = useCallback((fn: (t: D.Tenant) => D.Tenant) => setMeState(t => fn(t)), []);
  const setApp = useCallback((fn: (a: D.Applicant) => D.Applicant) => setAppState(a => fn(a)), []);
  const answerVisit = useCallback((id: string, a: VisitAnswer) => setVisits(v => ({ ...v, [id]: a })), []);
  const markRead = useCallback((ids: string[]) => setRead(r => [...new Set([...r, ...ids])]), []);
  const value = useMemo(() => ({
    route, detail, go, toast, toasts, log, activity, role, setRole, me, setMe, app, setApp,
    properties: D.PROPERTIES.filter(p => p.id === ME_T.property || p.id === ME_A.property), contractors: D.CONTRACTORS, staff: D.STAFF,
    jobs, setJobs, inspections: D.INSPECTIONS.filter(i => i.property === ME_T.property), safety: D.SAFETY.filter(c => c.property === ME_T.property),
    rent, setRent, notices: D.NOTICES, requests, setRequests, visits, answerVisit, read, markRead,
  }), [route, detail, go, toast, toasts, log, activity, role, setRole, me, setMe, app, setApp, jobs, setJobs, rent, setRent, requests, setRequests, visits, answerVisit, read, markRead]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const staff = (id?: string) => D.STAFF.find(s => s.id === id);
export const money = (n: number): string => n < 0 ? '−' + money(-n) : '£' + n.toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
export const rentStatus = (r: D.RentRow): { label: string; tone: D.Tone } => {
  if (r.paid >= r.amount) return { label: 'Paid', tone: 'ok' };
  const d = D.daysFrom(r.due);
  if (r.paid > 0) return d < 0 ? { label: `${money(r.amount - r.paid)} still owed`, tone: 'err' } : { label: 'Part-paid', tone: 'warn' };
  if (d < 0) return { label: `Late · ${-d} days`, tone: 'err' };
  if (d === 0) return { label: 'Due today', tone: 'info' };
  return { label: 'Due ' + r.due.replace(' 2026', ''), tone: 'neutral' };
};
/** The person signed in: name, email and phone for either sign-in. */
export const who = (s: Store) => s.role === 'tenant' ? { name: s.me.name, email: s.me.email, phone: s.me.phone, comms: s.me.comms } : { name: s.app.name, email: s.app.email, phone: s.app.phone, comms: s.app.comms };
