'use client';
import Link from 'next/link';
import { PaymentPanel } from './payment';
import { DeliveryCheck } from './delivery-check';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, Settings, Address, Coupon, Order } from '@/shared/lib/types';
import { purchaseSummary } from '@/shared/lib/product-options';
import { money, totals } from '@/shared/lib/commerce';
import { api } from '@/shared/lib/client';
import { useStore } from '@/shared/ui/store-provider';
import { Art } from '@/shared/ui/art';
export const addressFields = [
  ['name', 'Full name'],
  ['phone', 'Mobile number'],
  ['line1', 'House / flat / street'],
  ['line2', 'Area / landmark (optional)'],
  ['city', 'City'],
  ['state', 'State / union territory'],
  ['pincode', 'Postcode'],
] as const;
export function AddressFields({
  value,
  onChange,
}: {
  value: Address;
  onChange: (a: Address) => void;
}) {
  return (
    <div className="form-grid">
      {addressFields.map(([key, label]) => (
        <label
          className={'field ' + (['line1', 'line2'].includes(key) ? 'full-span' : '')}
          key={key}
        >
          {label}
          <input
            autoComplete={
              {
                name: 'name',
                phone: 'tel',
                line1: 'address-line1',
                line2: 'address-line2',
                city: 'address-level2',
                state: 'address-level1',
                pincode: 'postal-code',
              }[key]
            }
            required={key !== 'line2'}
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            maxLength={key === 'phone' ? 10 : key === 'pincode' ? 6 : 200}
            inputMode={['phone', 'pincode'].includes(key) ? 'numeric' : 'text'}
            pattern={
              key === 'phone' ? '[6-9][0-9]{9}' : key === 'pincode' ? '[1-9][0-9]{5}' : undefined
            }
          />
        </label>
      ))}
    </div>
  );
}
export const emptyAddress: Address = {
  name: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
};
export function CheckoutView({ products, settings }: { products: Product[]; settings: Settings }) {
  const { cart, user, authReady, clear, refreshUser } = useStore();
  const router = useRouter();
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [selectedAddress, setSelectedAddress] = useState(-1);
  const [saveAddress, setSaveAddress] = useState(true);
  const initialized = useRef('');
  useEffect(() => {
    if (!user || initialized.current === user._id) return;
    initialized.current = user._id;
    if (user.addresses.length) {
      setAddress(user.addresses[0]);
      setSelectedAddress(0);
      setSaveAddress(false);
    } else {
      setAddress({ ...emptyAddress, name: user.name });
      setSelectedAddress(-1);
      setSaveAddress(true);
    }
  }, [user]);
  const [method, setMethod] = useState<'cod' | 'upi' | 'card'>(settings.codEnabled ? 'cod' : 'upi');
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [error, setError] = useState('');
  const [couponNote, setCouponNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const key = useRef('');
  const lines = cart.map((l) => ({ line: l, p: products.find((p) => p._id === l.productId) }));
  const amount = totals(
    lines.reduce(
      (s, { line, p }) =>
        s + (p?.variants.find((v) => v.id === line.variantId)?.price || 0) * line.quantity,
      0,
    ),
    coupon,
    settings,
  );
  const invalid = lines.some(
    ({ line, p }) =>
      !p || !p.variants.some((v) => v.id === line.variantId && v.stock >= line.quantity),
  );
  async function apply() {
    setChecking(true);
    setCouponNote('');
    try {
      const d = await api<{ coupon: Coupon }>('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code, subtotal: amount.subtotal }),
      });
      setCoupon(d.coupon);
      setCouponNote('Offer applied.');
    } catch (e) {
      setCoupon(null);
      setCouponNote((e as Error).message);
    } finally {
      setChecking(false);
    }
  }
  async function place(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    if (!key.current) key.current = crypto.randomUUID();
    try {
      const { order } = await api<{ order: Order }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart,
          address,
          saveAddress,
          addressId: selectedAddress >= 0 ? user?.addresses[selectedAddress]?.id : undefined,
          paymentMethod: method,
          coupon: coupon?.code || '',
          idempotencyKey: key.current,
        }),
      });
      if (
        ['upi', 'card'].includes(order.paymentMethod) &&
        !['paid', 'simulated paid — no money charged'].includes(order.paymentStatus)
      ) {
        setPendingOrder(order);
        setBusy(false);
        return;
      }
      clear();
      await refreshUser().catch(() => {});
      router.push('/account/orders/' + order._id + '?placed=1');
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  if (!authReady) return <div className="loading-state">Preparing checkout…</div>;
  if (!user)
    return (
      <div className="empty-state">
        <h1>A little introduction first.</h1>
        <p>Sign in to use your details, choose a saved address and place your order.</p>
        <Link className="button" href="/account/login?next=/checkout">
          Sign in to continue →
        </Link>
      </div>
    );
  if (pendingOrder)
    return (
      <div className="page-width">
        <PaymentPanel
          order={pendingOrder}
          onPaid={() => {
            clear();
            refreshUser().catch(() => {});
            router.push('/account/orders/' + pendingOrder._id + '?placed=1');
          }}
        />
        <p className="spaced">
          <Link className="text-link" href={'/account/orders/' + pendingOrder._id}>
            View saved order or cancel it
          </Link>
        </p>
      </div>
    );
  if (!cart.length)
    return (
      <div className="empty-state">
        <h1>Your bag is waiting.</h1>
        <p>Add a few favourites before checking out.</p>
        <Link className="button" href="/products">
          Explore Kashmir →
        </Link>
      </div>
    );
  return (
    <div className="page-width">
      <div className="breadcrumb">
        <Link href="/cart">Your bag</Link>
        <span>/</span>
        <span>Checkout</span>
      </div>
      <div className="page-heading">
        <p className="eyebrow">Just a few details</p>
        <h1>Bring a little Kashmir home.</h1>
      </div>
      <form onSubmit={place}>
        <div className="split-layout">
          <div>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            {invalid && (
              <div className="form-error">
                An item is unavailable.{' '}
                <Link href="/cart" className="text-link">
                  Review your bag
                </Link>
                .
              </div>
            )}
            <section className="panel">
              <p className="checkout-step">01 / Your doorstep</p>
              <div className="checkout-account">
                <div>
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <Link className="text-link" href="/account/profile">
                  Your profile
                </Link>
              </div>
              {user.addresses.length > 0 && (
                <>
                  <div className="flex-between address-heading">
                    <h3>Choose a delivery address</h3>
                    <Link href="/account/addresses" className="text-link small-text">
                      Manage addresses
                    </Link>
                  </div>
                  <div className="checkout-addresses">
                    {user.addresses.map((a, i) => (
                      <label
                        className={'checkout-address ' + (selectedAddress === i ? 'selected' : '')}
                        key={a.id || i}
                      >
                        <input
                          type="radio"
                          name="deliveryAddress"
                          checked={selectedAddress === i}
                          onChange={() => {
                            setSelectedAddress(i);
                            setAddress(a);
                            setSaveAddress(false);
                          }}
                        />
                        <span>
                          <strong>{a.name}</strong>
                          <span>
                            {a.line1}
                            {a.line2 ? ', ' + a.line2 : ''}
                          </span>
                          <span>
                            {a.city}, {a.state} {a.pincode}
                          </span>
                          <span>{a.phone}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}
              <button
                type="button"
                className="button secondary small address-add"
                onClick={() => {
                  setSelectedAddress(-1);
                  setAddress({
                    ...emptyAddress,
                    name: user.name,
                    phone: user.addresses[0]?.phone || '',
                  });
                  setSaveAddress(user.addresses.length < 10);
                }}
              >
                + Add another address
              </button>
              <h3 className="checkout-address-form-title">
                {selectedAddress >= 0
                  ? 'Confirm your delivery details'
                  : 'Enter a new delivery address'}
              </h3>
              <AddressFields value={address} onChange={setAddress} />
              <DeliveryCheck pincode={address.pincode} cod={method === 'cod'} />
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  disabled={selectedAddress < 0 && user.addresses.length >= 10}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                />
                {selectedAddress >= 0
                  ? 'Save any changes to this address'
                  : 'Save this address for my next order'}
              </label>
              {selectedAddress < 0 && user.addresses.length >= 10 && (
                <p className="small-text muted">
                  Your address book has 10 addresses. You can use this address for this order, or{' '}
                  <Link className="text-link" href="/account/addresses">
                    manage saved addresses
                  </Link>
                  .
                </p>
              )}
              <p className="muted small-text">
                Order details will be available in your account. Email: {user.email}
              </p>
            </section>
            <section className="panel spaced">
              <p className="checkout-step">02 / Payment</p>
              {settings.codEnabled && (
                <label className={'radio-option ' + (method === 'cod' ? 'selected' : '')}>
                  <input
                    type="radio"
                    name="payment"
                    checked={method === 'cod'}
                    onChange={() => setMethod('cod')}
                  />
                  <div>
                    Cash on delivery
                    <p>
                      Pay when your order arrives. This local store does not book a real courier.
                    </p>
                  </div>
                </label>
              )}
              {(['upi', 'card'] as const).map((m) => (
                <label key={m} className={'radio-option ' + (method === m ? 'selected' : '')}>
                  <input
                    type="radio"
                    name="payment"
                    checked={method === m}
                    onChange={() => setMethod(m)}
                  />
                  <div>
                    {m === 'upi'
                      ? 'UPI · Google Pay, PhonePe, Paytm & more'
                      : 'Debit / credit card'}
                    <p>
                      {m === 'upi'
                        ? 'Pay securely using your preferred UPI app.'
                        : 'Visa, Mastercard, RuPay and supported cards through Razorpay.'}
                    </p>
                  </div>
                </label>
              ))}
              <div className="demo-note">
                Online payment opens a virtual final check until Razorpay is configured. No real
                card details or UPI PIN are collected here. Delivery availability is checked again
                before your order is saved.
              </div>
            </section>
          </div>
          <aside className="panel summary">
            <h2>Your little collection.</h2>
            <div className="checkout-items">
              {lines.map(({ line, p }) => (
                <div className="cart-line" key={line.productId + line.variantId}>
                  <Art image={p?.image || 'gifts'} />
                  <div>
                    <h3>{p?.name || 'Unavailable item'}</h3>
                    <p>
                      {purchaseSummary(
                        {
                          label:
                            p?.variants.find((v) => v.id === line.variantId)?.label ||
                            'Unavailable',
                        },
                        line.quantity,
                      )}
                    </p>
                  </div>
                  <span className="small-text">
                    {money(
                      (p?.variants.find((v) => v.id === line.variantId)?.price || 0) *
                        line.quantity,
                    )}
                  </span>
                </div>
              ))}
            </div>
            <label className="field">
              Have an offer code?
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ width: '100%' }}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="WELCOME10"
                />
                <button
                  type="button"
                  className="button small secondary"
                  onClick={apply}
                  disabled={checking}
                >
                  {checking ? '…' : 'Apply'}
                </button>
              </div>
            </label>
            {couponNote && <p className="small-text muted">{couponNote}</p>}
            {coupon && (
              <button
                type="button"
                className="remove"
                onClick={() => {
                  setCoupon(null);
                  setCode('');
                  setCouponNote('');
                }}
              >
                Remove offer
              </button>
            )}
            <div className="summary-row">
              <span>Products</span>
              <span>{money(amount.subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>{amount.shipping ? money(amount.shipping) : 'On us'}</span>
            </div>
            {amount.discount > 0 && (
              <div className="summary-row">
                <span>Offer savings</span>
                <span>−{money(amount.discount)}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>Total</span>
              <span>{money(amount.total)}</span>
            </div>
            <label
              className="check-field"
              style={{ alignItems: 'start', fontSize: 10, lineHeight: 1.8 }}
            >
              <input type="checkbox" required />{' '}
              <span>
                I have read the{' '}
                <Link href="/terms" className="text-link">
                  purchase terms
                </Link>{' '}
                and{' '}
                <Link href="/returns" className="text-link">
                  returns policy
                </Link>
                .
              </span>
            </label>
            <button className="button" disabled={busy || invalid}>
              {busy
                ? 'Placing your order…'
                : method === 'cod'
                  ? 'Place COD order →'
                  : 'Save order & continue to payment →'}
            </button>
            <p className="tax-note spaced">
              Prices and availability are verified again when you place your order.
            </p>
          </aside>
        </div>
      </form>
    </div>
  );
}
