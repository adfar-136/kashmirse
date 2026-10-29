'use client';
import { useState } from 'react';
import { api } from '@/shared/lib/client';
import type { Order } from '@/shared/lib/types';
export function ShipmentAdmin({ order, onChange }: { order: Order; onChange: (o: Order) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [weight, setWeight] = useState('0.5');
  const [length, setLength] = useState('20');
  const [breadth, setBreadth] = useState('15');
  const [height, setHeight] = useState('10');
  async function act(action: string) {
    setBusy(true);
    setError('');
    try {
      const d = await api<{ order: Order }>('/api/shipments/' + order._id, {
        method: 'POST',
        body: JSON.stringify({
          action,
          weight: Number(weight),
          length: Number(length),
          breadth: Number(breadth),
          height: Number(height),
        }),
      });
      onChange(d.order);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel spaced">
      <h3>Courier & parcel</h3>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {order.shipment ? (
        <>
          <p>
            {order.shipment.courier} · {order.shipment.status}
          </p>
          <p className="small-text">
            {order.shipment.mode} · AWB {order.shipment.awb || 'pending'}
          </p>
          {order.shipment.labelUrl && (
            <a
              className="text-link"
              href={order.shipment.labelUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open shipping label
            </a>
          )}
        </>
      ) : (
        <div className="form-grid">
          {[
            ['Weight (kg)', weight, setWeight],
            ['Length (cm)', length, setLength],
            ['Breadth (cm)', breadth, setBreadth],
            ['Height (cm)', height, setHeight],
          ].map(([label, value, set]) => (
            <label className="field" key={label as string}>
              {label as string}
              <input
                type="number"
                min="0.05"
                step="0.05"
                value={value as string}
                onChange={(e) => (set as (s: string) => void)(e.target.value)}
              />
            </label>
          ))}
        </div>
      )}
      <div className="form-actions">
        {(order.shipment
          ? ['refresh', 'pickup', 'label', 'cancel', ...(!order.shipment.awb ? ['assign'] : [])]
          : ['book']
        ).map((a) => (
          <button
            type="button"
            className="button secondary small"
            key={a}
            disabled={busy || ['cancelled', 'delivered'].includes(order.status)}
            onClick={() => act(a)}
          >
            {a === 'book'
              ? 'Book shipment'
              : a === 'pickup'
                ? 'Request pickup'
                : a === 'label'
                  ? 'Generate label'
                  : a === 'cancel'
                    ? 'Cancel courier booking'
                    : a === 'assign'
                      ? 'Retry AWB assignment'
                      : 'Refresh tracking'}
          </button>
        ))}
      </div>
      <p className="small-text muted spaced">
        Simulation creates virtual shipments. Live booking requires Shiprocket credentials, pickup
        configuration and measured parcel dimensions. Booking does not mark an order dispatched.
      </p>
    </div>
  );
}
