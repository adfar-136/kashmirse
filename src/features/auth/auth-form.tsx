'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/shared/lib/client';
import { useStore } from '@/shared/ui/store-provider';
import { Art } from '@/shared/ui/art';
import type { PublicUser } from '@/shared/lib/types';
export function AuthForm({ next = '/account' }: { next?: string }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { refreshUser } = useStore();
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    try {
      const d = await api<{ user: PublicUser }>('/api/auth/' + mode, {
        method: 'POST',
        body: JSON.stringify({ name: f.get('name') || undefined, email, password }),
      });
      await refreshUser();
      const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/account';
      router.push(d.user.role === 'admin' && safe === '/account' ? '/admin' : safe);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-width">
      <div className="auth-layout">
        <div className="auth-intro">
          <p className="eyebrow">From Kashmir, with love</p>
          <h1>
            A little closer.
            <br />A little more you.
          </h1>
          <p>Keep your favourites, follow your orders and find your next little discovery.</p>
          <Art image="flower" />
        </div>
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => {
                setMode('register');
                setError('');
              }}
            >
              Create account
            </button>
          </div>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          {mode === 'register' && (
            <label className="field">
              Your name
              <input name="name" autoComplete="name" required minLength={2} maxLength={80} />
            </label>
          )}
          <label className="field">
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={8}
              maxLength={128}
            />
          </label>
          {mode === 'register' && (
            <p className="muted small-text" style={{ marginBottom: 18 }}>
              Use at least 8 characters. By creating an account you agree to our{' '}
              <Link className="text-link" href="/terms">
                terms
              </Link>{' '}
              and{' '}
              <Link className="text-link" href="/privacy">
                privacy policy
              </Link>
              .
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? 'One moment…' : mode === 'login' ? 'Welcome back →' : 'Create your account →'}
          </button>
          <div className="demo-note">
            <strong>Explore the local demo</strong>
            <p>Choose a demo account below, then sign in.</p>
            <div className="horizontal-list" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="button secondary small"
                onClick={() => {
                  setMode('login');
                  setEmail('customer@kashmirse.local');
                  setPassword('KashmirSe123!');
                }}
              >
                Customer demo
              </button>
              <button
                type="button"
                className="button secondary small"
                onClick={() => {
                  setMode('login');
                  setEmail('admin@kashmirse.local');
                  setPassword('KashmirSeAdmin123!');
                }}
              >
                Admin demo
              </button>
            </div>
          </div>
          <Link className="text-link small-text" href="/account/forgot-password">
            Forgot your password?
          </Link>
        </form>
      </div>
    </div>
  );
}
