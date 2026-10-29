'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/shared/lib/client';
export function RecoveryForm({ token }: { token?: string }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div className="page-width">
      <form
        className="panel recovery-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          const f = new FormData(e.currentTarget);
          try {
            if (token && f.get('password') !== f.get('confirm'))
              throw new Error('Passwords do not match.');
            const d = await api<{ message: string }>(
              '/api/recovery/' + (token ? 'reset' : 'request'),
              {
                method: 'POST',
                body: JSON.stringify(
                  token ? { token, password: f.get('password') } : { email: f.get('email') },
                ),
              },
            );
            setMessage(d.message);
            setDone(true);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="eyebrow">Your Kashmir Se account</p>
        <h1>{token ? 'Choose a new password' : 'Forgot your password?'}</h1>
        <p className="muted">
          {token
            ? 'Your reset link expires after 30 minutes and can be used once.'
            : 'Enter your account email and we will send a reset link.'}
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="demo-note" role="status">
            {message}
          </p>
        )}
        {!done && (
          <>
            {token ? (
              <>
                <label className="field">
                  New password
                  <input
                    type="password"
                    name="password"
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <label className="field">
                  Confirm password
                  <input
                    type="password"
                    name="confirm"
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                </label>
              </>
            ) : (
              <label className="field">
                Email address
                <input type="email" name="email" autoComplete="email" required />
              </label>
            )}
            <button className="button" disabled={busy}>
              {busy ? 'Please wait…' : token ? 'Save new password' : 'Send reset link'}
            </button>
          </>
        )}
        <p className="spaced">
          <Link className="text-link" href="/account/login">
            Return to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
