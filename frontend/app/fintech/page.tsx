'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Landmark, ShieldCheck } from 'lucide-react';
import { useAppContext } from '@/lib/AppContext';
import { UserRole } from '@/lib/types/app';

type AuthMode = 'login' | 'register';

const roleCards: Array<{
  role: UserRole;
  label: string;
  title: string;
  description: string;
  icon: typeof Building2;
}> = [
  {
    role: 'borrower',
    label: 'User',
    title: 'MSME / Borrower Portal',
    description: 'Register or sign in to upload documents, check your application status, and view your credit dashboard.',
    icon: Building2,
  },
  {
    role: 'credit_manager',
    label: 'Bank Manager',
    title: 'Credit Manager Portal',
    description: 'Sign in to review applications, monitor risk agents, and manage lending decisions.',
    icon: Landmark,
  },
];

const defaultRouteByRole = (role: UserRole) =>
  role === 'borrower' ? '/fintech/dashboard' : '/fintech/manager';

export default function FintechPage() {
  const router = useRouter();
  const { login, register } = useAppContext();
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<UserRole>('borrower');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  const activeRole = useMemo(() => roleCards.find((entry) => entry.role === role)!, [role]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === 'register' && !name.trim()) {
      setMessage({ kind: 'error', text: 'Please enter your full name before registering.' });
      return;
    }

    if (!email.trim() || !password.trim()) {
      setMessage({ kind: 'error', text: 'Email and password are required.' });
      return;
    }

    const result =
      mode === 'register'
        ? register({ name: name.trim(), email: email.trim(), password, role })
        : login({ email: email.trim(), password, role });

    setMessage({ kind: result.ok ? 'success' : 'error', text: result.message });

    if (result.ok) {
      router.push(result.redirectTo || defaultRouteByRole(role));
    }
  };

  return (
    <div
      className="min-h-screen px-6 py-10 md:px-10"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(212, 168, 67, 0.14), transparent 28%), linear-gradient(180deg, #09111D 0%, #0B0F1A 100%)',
      }}
    >
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border p-8 md:p-10" style={{ borderColor: '#1E2A3A', backgroundColor: 'rgba(9, 17, 29, 0.82)' }}>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]" style={{ borderColor: '#2A3B4E', color: '#D4A843' }}>
            <ShieldCheck size={14} />
            Finserv-AIM Access Portal
          </div>

          <h1 className="max-w-xl text-4xl font-semibold leading-tight md:text-5xl" style={{ color: '#F8FAFC' }}>
            Role-based login for borrowers and bank managers.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: '#94A3B8' }}>
            Choose your portal, sign in or register, and the platform will automatically route you only to the dashboards that belong to your role.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {roleCards.map((card) => {
              const Icon = card.icon;
              const selected = card.role === role;

              return (
                <button
                  key={card.role}
                  type="button"
                  onClick={() => setRole(card.role)}
                  className="rounded-2xl border p-5 text-left transition-all"
                  style={{
                    borderColor: selected ? '#D4A843' : '#1E2A3A',
                    backgroundColor: selected ? 'rgba(212, 168, 67, 0.09)' : '#0F1724',
                    boxShadow: selected ? '0 12px 40px rgba(212, 168, 67, 0.08)' : 'none',
                  }}
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: selected ? '#D4A843' : '#162230', color: selected ? '#0B0F1A' : '#D4A843' }}>
                    <Icon size={22} />
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: selected ? '#F8FAFC' : '#D4A843' }}>
                    {card.label}
                  </div>
                  <h2 className="mt-3 text-xl font-semibold" style={{ color: '#F8FAFC' }}>
                    {card.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6" style={{ color: '#94A3B8' }}>
                    {card.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border p-8 md:p-10" style={{ borderColor: '#1E2A3A', backgroundColor: '#0D1420' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium" style={{ color: '#D4A843' }}>
                {activeRole.title}
              </p>
              <h2 className="mt-2 text-2xl font-semibold" style={{ color: '#F8FAFC' }}>
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
            </div>

            <div className="rounded-full p-1" style={{ backgroundColor: '#121C2A' }}>
              {(['login', 'register'] as AuthMode[]).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setMode(entry)}
                  className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: mode === entry ? '#D4A843' : 'transparent',
                    color: mode === entry ? '#0B0F1A' : '#94A3B8',
                  }}
                >
                  {entry === 'login' ? 'Login' : 'Register'}
                </button>
              ))}
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium" style={{ color: '#CBD5E1' }}>
                  Full Name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors"
                  style={{ borderColor: '#223247', backgroundColor: '#08111C', color: '#F8FAFC' }}
                  placeholder={role === 'borrower' ? 'Aarav Enterprises' : 'Priya Sharma'}
                />
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: '#CBD5E1' }}>
                Email Address
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors"
                style={{ borderColor: '#223247', backgroundColor: '#08111C', color: '#F8FAFC' }}
                placeholder={role === 'borrower' ? 'owner@msme.com' : 'manager@bank.com'}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: '#CBD5E1' }}>
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors"
                style={{ borderColor: '#223247', backgroundColor: '#08111C', color: '#F8FAFC' }}
                placeholder="Enter your password"
              />
            </label>

            {message && (
              <div
                className="rounded-2xl border px-4 py-3 text-sm"
                style={{
                  borderColor: message.kind === 'error' ? '#7F1D1D' : '#14532D',
                  backgroundColor: message.kind === 'error' ? 'rgba(127, 29, 29, 0.16)' : 'rgba(20, 83, 45, 0.16)',
                  color: message.kind === 'error' ? '#FCA5A5' : '#86EFAC',
                }}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:scale-[1.01]"
              style={{ backgroundColor: '#D4A843', color: '#0B0F1A' }}
            >
              {mode === 'login' ? `Login as ${activeRole.label}` : `Register as ${activeRole.label}`}
            </button>
          </form>

          <div className="mt-8 rounded-2xl border p-4 text-sm leading-6" style={{ borderColor: '#1E2A3A', backgroundColor: '#0A111B', color: '#94A3B8' }}>
            Borrowers can access only `Apply` and `My Dashboard`. Bank managers can access only `Manager View` and `Agent Monitor`.
          </div>

          <div className="mt-4 rounded-2xl border p-4 text-sm leading-6" style={{ borderColor: '#2A3B4E', backgroundColor: '#101A27', color: '#CBD5E1' }}>
            Demo login:
            <div style={{ color: '#94A3B8' }}>User: `owner@msme.com` / `demo123`</div>
            <div style={{ color: '#94A3B8' }}>Bank Manager: `manager@bank.com` / `demo123`</div>
          </div>
        </section>
      </div>
    </div>
  );
}
