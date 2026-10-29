'use client';
import { useEffect, useState } from 'react';
import { api } from '@/shared/lib/client';
import type { Mail } from '@/shared/lib/notifications';
export function Outbox() {
  const [mails, setMails] = useState<Mail[]>([]);
  const [mode, setMode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      const d = await api<{ mails: Mail[]; mode: string }>('/api/notifications');
      setMails(d.mails);
      setMode(d.mode);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <section className="panel">
      <h2>Email notifications</h2>
      <p className="demo-note">
        {mode === 'smtp'
          ? 'SMTP enabled. Check each delivery status below.'
          : 'Preview mode: emails are saved locally; nothing is sent. Configure Gmail SMTP to enable delivery.'}
      </p>
      <button className="button secondary small" onClick={load}>
        Refresh outbox
      </button>
      {error && <p role="alert">{error}</p>}
      {mails.length === 0 && <p>No email events yet.</p>}
      {mails.map((m) => (
        <details className="panel spaced" key={m._id}>
          <summary>
            {m.subject} · {m.status}
          </summary>
          <p className="small-text">
            To: {m.to} · Attempts: {m.attempts}
          </p>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.text}</pre>
          {m.error && <p>{m.error}</p>}
          {['preview', 'failed', 'queued'].includes(m.status) && (
            <button
              className="button secondary small"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api('/api/notifications', {
                    method: 'POST',
                    body: JSON.stringify({ id: m._id }),
                  });
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Retry delivery
            </button>
          )}
        </details>
      ))}
    </section>
  );
}
