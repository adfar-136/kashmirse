'use client';
import { useState } from 'react';
import { api } from '@/shared/lib/client';
import { money } from '@/shared/lib/commerce';
import type { Order } from '@/shared/lib/types';
type Result = { razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, callback: () => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}
export function PaymentPanel({ order, onPaid }: { order: Order; onPaid: () => void }) {
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function start() {
    setBusy(true);
    setError('');
    try {
      const d = await api<{
        mode: string;
        paid?: boolean;
        key: string;
        providerOrderId: string;
        amount: number;
      }>('/api/payments/start', { method: 'POST', body: JSON.stringify({ orderId: order._id }) });
      if (d.paid) {
        onPaid();
        return;
      }
      if (d.mode === 'simulation') {
        setStage('simulation');
        return;
      }
      if (!window.Razorpay)
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://checkout.razorpay.com/v1/checkout.js';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Unable to load secure checkout.'));
          document.body.appendChild(s);
        });
      if (!window.Razorpay) throw new Error('Payment window unavailable');
      const r = new window.Razorpay({
        key: d.key,
        order_id: d.providerOrderId,
        amount: d.amount,
        currency: 'INR',
        name: 'Kashmir Se',
        description: order._id,
        prefill: { name: order.address.name, email: order.email, contact: order.address.phone },
        theme: { color: '#8f682c' },
        handler: async (result: Result) => {
          try {
            await api('/api/payments/verify', {
              method: 'POST',
              body: JSON.stringify({ orderId: order._id, ...result }),
            });
            onPaid();
          } catch (e) {
            setError((e as Error).message);
          }
        },
        modal: {
          ondismiss: () => setError('Payment window closed. Your order is saved; you can retry.'),
        },
      });
      r.on('payment.failed', () => setError('Payment was unsuccessful. Please retry.'));
      r.open();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function simulate(outcome: string) {
    setBusy(true);
    setError('');
    try {
      await api('/api/payments/simulate', {
        method: 'POST',
        body: JSON.stringify({ orderId: order._id, outcome }),
      });
      if (outcome === 'success') onPaid();
      else {
        setStage('');
        setError(
          outcome === 'failed'
            ? 'Simulated payment failed. No money charged. Retry when ready.'
            : 'Simulated payment cancelled. Your order remains unpaid.',
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel spaced payment-panel">
      <p className="eyebrow">Secure payment</p>
      <h2>
        {order.paymentMethod === 'upi' ? 'UPI payment' : 'Card payment'} · {money(order.total)}
      </h2>
      <p>Order {order._id} is saved. Complete payment before dispatch.</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {stage === 'simulation' ? (
        <div className="demo-note">
          <strong>Virtual payment check · no money moves</strong>
          <p>
            {order.paymentMethod === 'upi'
              ? 'Test approving a UPI request. No UPI PIN or bank app is needed.'
              : 'Test a card authorization. Do not enter real card details.'}
          </p>
          <p>Amount: {money(order.total)} · INR</p>
          <div className="form-actions">
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => simulate('success')}
            >
              Simulate success
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => simulate('failed')}
            >
              Simulate failure
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => simulate('cancelled')}
            >
              Cancel payment
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="button" onClick={start} disabled={busy}>
          {busy ? 'Preparing…' : 'Continue to payment →'}
        </button>
      )}
      <p className="small-text muted spaced">
        Real UPI and card information is entered only in Razorpay’s hosted checkout when enabled.
        Kashmir Se never stores card numbers, CVV or UPI PINs.
      </p>
    </section>
  );
}
