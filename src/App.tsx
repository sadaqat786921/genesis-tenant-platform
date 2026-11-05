import { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useStore, SIGNED_KEY, type Role } from './store';
import { Sidebar, Login } from './Shell';
import { Toasts } from './ui';
import HomePage from './pages/Home';
import { Application } from './pages/Application';
import { Messages } from './pages/Messages';
import { MyHome } from './pages/MyHome';
import { Tenancy } from './pages/Tenancy';
import { Repairs } from './pages/Repairs';
import { Visits } from './pages/Visits';
import { Rent } from './pages/Rent';
import { Documents } from './pages/Documents';
import { Account } from './pages/Account';

const PAGES = { home: HomePage, application: Application, messages: Messages, myhome: MyHome, tenancy: Tenancy, repairs: Repairs, visits: Visits, rent: Rent, documents: Documents, account: Account };
/** Screens an applicant can open. Everything else belongs to a tenant who has moved in. */
const APPLICANT_OK = ['application', 'messages', 'myhome', 'documents', 'account'];

const read = () => { try { return !!sessionStorage.getItem(SIGNED_KEY); } catch { return false; } };
const write = (v: Role | '') => { try { v ? sessionStorage.setItem(SIGNED_KEY, v) : sessionStorage.removeItem(SIGNED_KEY); } catch { /* ignore */ } };

function Platform({ onLogout }: { onLogout: () => void }) {
  const s = useStore();
  if (s.role === 'applicant' && !APPLICANT_OK.includes(s.route)) return <Navigate to="/application" replace />;
  if (s.role === 'tenant' && s.route === 'application') return <Navigate to="/home" replace />;
  const Page = PAGES[s.route];
  return <div className="app">
    <Sidebar onLogout={onLogout} />
    <main className="content" key={s.role + s.route + (s.detail ?? '')}><Page /></main>
  </div>;
}

export default function App() {
  const s = useStore();
  const [auth, setAuth] = useState(read);
  const nav = useNavigate();
  const signIn = (r: Role) => { write(r); s.setRole(r); setAuth(true); nav(r === 'tenant' ? '/home' : '/application', { replace: true }); };
  if (!auth) return <><Login onDone={signIn} /><Toasts /></>;
  return <>
    <Routes>
      <Route path="/" element={<Navigate to={s.role === 'tenant' ? '/home' : '/application'} replace />} />
      <Route path="/login" element={<Navigate to={s.role === 'tenant' ? '/home' : '/application'} replace />} />
      <Route path="/*" element={<Platform onLogout={() => { write(''); setAuth(false); nav('/login', { replace: true }); }} />} />
    </Routes>
    <Toasts />
  </>;
}
