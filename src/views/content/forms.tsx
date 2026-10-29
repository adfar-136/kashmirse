'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/shared/lib/client';
import { useStore } from '@/shared/ui/store-provider';
export function EnquiryForm({
  type = 'support',
}: {
  type?: 'support' | 'bulk' | 'custom' | 'stock';
}) {
  const { user } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  return sent ? (
    <div className="success-note">
      <strong>Thank you for getting in touch.</strong>
      <p>
        Your message has been saved to the local support dashboard. No email or SMS has been sent.
      </p>
      <button className="button small secondary spaced" onClick={() => setSent(false)}>
        Send another message
      </button>
    </div>
  ) : (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const f = new FormData(e.currentTarget);
        try {
          await api('/api/enquiries', {
            method: 'POST',
            body: JSON.stringify({
              type,
              name: f.get('name'),
              email: f.get('email'),
              subject: f.get('subject'),
              message: f.get('message'),
            }),
          });
          setSent(true);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{type === 'bulk' ? 'Something thoughtful, together.' : 'Tell us a little more.'}</h2>
      {error && <div className="form-error">{error}</div>}
      <div className="form-grid">
        <label className="field">
          Your name
          <input name="name" defaultValue={user?.name} required minLength={2} maxLength={100} />
        </label>
        <label className="field">
          Email address
          <input name="email" type="email" defaultValue={user?.email} required maxLength={200} />
        </label>
        <label className="field full-span">
          {type === 'bulk' ? 'Occasion / quantity / preferred products' : 'Subject / order number'}
          <input name="subject" required minLength={3} maxLength={200} />
        </label>
        <label className="field full-span">
          Your message
          <textarea name="message" required minLength={10} maxLength={5000} />
        </label>
      </div>
      <button className="button" disabled={busy}>
        {busy ? 'Sending…' : 'Send your message →'}
      </button>
    </form>
  );
}
export function TrackView() {
  const [id, setId] = useState('');
  const { user, authReady } = useStore();
  const router = useRouter();
  return (
    <div className="content-width">
      <div className="page-heading">
        <p className="eyebrow">From the valley to your doorstep</p>
        <h1>Follow your little collection.</h1>
        <p>Enter your order number and sign in with the account used to place it.</p>
      </div>
      <form
        className="panel"
        style={{ maxWidth: 600 }}
        onSubmit={(e) => {
          e.preventDefault();
          const next = '/account/orders/' + encodeURIComponent(id.trim());
          router.push(next);
        }}
      >
        <label className="field">
          Order number
          <input
            placeholder="KS-DEMO-1001"
            value={id}
            onChange={(e) => setId(e.target.value.toUpperCase())}
            required
            pattern="KS-[A-Z0-9-]+"
            maxLength={60}
          />
        </label>
        <button className="button" disabled={!authReady}>
          Track order →
        </button>
        <p className="muted small-text spaced">
          You can also find every order in{' '}
          <Link className="text-link" href="/account/orders">
            your account
          </Link>
          .
        </p>
      </form>
    </div>
  );
}
