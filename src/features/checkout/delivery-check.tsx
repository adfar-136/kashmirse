'use client';
import { useState } from 'react';
import { api } from '@/shared/lib/client';
export function DeliveryCheck({ pincode, cod }: { pincode: string; cod: boolean }) {
  const [result, setResult] = useState<{
    mode: string;
    serviceable: boolean;
    codAvailable: boolean;
    courier: string;
    estimatedDays: string;
    note: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState('');
  return (
    <div className="delivery-check spaced">
      <button
        type="button"
        className="button secondary small"
        disabled={busy || pincode.length !== 6}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            setResult(
              await api(
                '/api/delivery?pincode=' +
                  encodeURIComponent(pincode) +
                  '&cod=' +
                  (cod ? '1' : '0'),
              ),
            );
            setChecked(pincode + cod);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Checking…' : 'Check delivery to ' + (pincode || 'your postcode')}
      </button>
      {error && <p role="alert">{error}</p>}
      {result && checked === pincode + cod && (
        <div role="status" className="demo-note">
          <strong>
            {result.serviceable ? 'Delivery available' : 'Delivery unavailable'}
            {result.mode === 'simulation' ? ' · simulation' : ''}
          </strong>
          <p>
            {result.courier} · {result.estimatedDays}
          </p>
          <p>{result.note}</p>
          {cod && !result.codAvailable && <p>COD is unavailable. Choose online payment.</p>}
        </div>
      )}
    </div>
  );
}
