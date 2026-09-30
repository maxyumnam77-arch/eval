import { useState } from 'react';
import { json, request } from '../api';

export type Account = { id: string; username: string; displayName: string; role: 'student' | 'admin' };
export type Session = { token: string; user: Account };

export function LoginView({ onLogin }: { onLogin: (session: Session) => void }) {
  const [register, setRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const session = await request<Session>(register ? '/auth/register' : '/auth/login',
        json('POST', { username, displayName, password }));
      onLogin(session);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return <div className="min-h-screen flex items-center justify-center p-5 text-slate-900"
    style={{ background: 'linear-gradient(135deg,#C9D2DB,#E7EAEC)' }}>
    <section className="alpine-card light-theme w-full max-w-md p-7 space-y-5">
      <div><h1 className="text-xl font-bold">Smart Exam Evaluation</h1>
        <p className="text-sm text-slate-600 mt-1">{register ? 'Create a student account' : 'Sign in to your workspace'}</p></div>
      <form className="space-y-3" onSubmit={submit}>
        <label className="block text-sm font-semibold">{register ? 'Student ID' : 'ID'}
          <input className="w-full mt-1 p-3 rounded-xl border border-slate-300 bg-white/80" required autoComplete="username"
            value={username} onChange={e => setUsername(e.target.value)} /></label>
        {register && <label className="block text-sm font-semibold">Name
          <input className="w-full mt-1 p-3 rounded-xl border border-slate-300 bg-white/80" required
            value={displayName} onChange={e => setDisplayName(e.target.value)} /></label>}
        <label className="block text-sm font-semibold">Password
          <input className="w-full mt-1 p-3 rounded-xl border border-slate-300 bg-white/80" type="password" required minLength={8}
            autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} /></label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="alpine-btn-blue text-white w-full p-3 font-bold disabled:opacity-50">
          {busy ? 'Please wait…' : register ? 'Create student account' : 'Sign in'}</button>
      </form>
      <button className="text-sm text-blue-700 underline" onClick={() => { setRegister(!register); setError(''); }}>
        {register ? 'Already have an account? Sign in' : 'New student? Create an account'}</button>
      <p className="text-xs text-slate-600">Admin accounts are created locally with <code>python -m backend.create_admin</code>.</p>
    </section>
  </div>;
}
