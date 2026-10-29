'use client';
import Link from 'next/link';
import { PaymentPanel } from '@/features/checkout/payment';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  MapPin,
  UserRound,
  Heart,
  LogOut,
  MessageCircle,
} from 'lucide-react';
import type { PublicUser, Order, Address, Product } from '@/shared/lib/types';
import { money, formatDate } from '@/shared/lib/commerce';
import { api } from '@/shared/lib/client';
import { useStore } from '@/shared/ui/store-provider';
import { Art } from '@/shared/ui/art';
import { AddressFields, emptyAddress } from '@/features/checkout/checkout';
const sections = [
  ['', 'Overview', LayoutDashboard],
  ['orders', 'My orders', Package],
  ['addresses', 'Addresses', MapPin],
  ['profile', 'Profile', UserRound],
  ['support', 'Support', MessageCircle],
] as const;
export function OrderCard({ order: o }: { order: Order }) {
  return (
    <article className="order-card">
      <div className="order-card-head">
        <span>
          {o._id} · {formatDate(o.createdAt)}
        </span>
        <span className={'badge ' + o.status}>{o.status}</span>
      </div>
      <div className="order-card-body">
        <Art image={o.items[0]?.image || 'gifts'} alt={o.items[0]?.name} />
        <div>
          <h3>{o.items.map((i) => i.name).join(', ')}</h3>
          <p>
            {o.items.reduce((s, i) => s + i.quantity, 0)} item(s) · {money(o.total)}
          </p>
        </div>
        <Link href={'/account/orders/' + o._id} className="button secondary small">
          View order →
        </Link>
      </div>
    </article>
  );
}
export function AccountView({
  initialUser,
  orders,
  section = '',
}: {
  initialUser: PublicUser;
  orders: Order[];
  section?: string;
}) {
  const { user, refreshUser, logout, toast, wishlist } = useStore();
  const u = user || initialUser;
  const router = useRouter();
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function saveAddresses(addresses: Address[]) {
    setBusy(true);
    setError('');
    try {
      await api('/api/account', { method: 'PATCH', body: JSON.stringify({ addresses }) });
      await refreshUser();
      setShowForm(false);
      setEditing(null);
      setAddress(emptyAddress);
      toast('Address book updated.');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function profile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/account', {
        method: 'PATCH',
        body: JSON.stringify({ name: new FormData(e.currentTarget).get('name') }),
      });
      await refreshUser();
      toast('Profile updated.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-width">
      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <span>Your account</span>
      </div>
      <div className="account-layout">
        <aside className="account-sidebar">
          <h3>Hello, {u.name.split(' ')[0]}.</h3>
          <p>Your little corner of Kashmir.</p>
          <nav className="account-nav">
            {sections.map(([slug, label, Icon]) => (
              <Link
                href={'/account' + (slug ? '/' + slug : '')}
                key={slug}
                className={section === slug ? 'active' : ''}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
            <Link href="/wishlist">
              <Heart size={16} />
              Wishlist
            </Link>
            {u.role === 'admin' && <Link href="/admin">Store dashboard ↗</Link>}
            <button
              onClick={async () => {
                await logout();
                router.push('/');
                router.refresh();
              }}
            >
              <LogOut size={16} />
              Sign out
            </button>
          </nav>
        </aside>
        <div>
          <div className="account-top">
            <h1>
              {section === 'orders'
                ? 'Your orders.'
                : section === 'addresses'
                  ? 'Your address book.'
                  : section === 'profile'
                    ? 'A little about you.'
                    : section === 'support'
                      ? 'Here to help.'
                      : `Welcome home, ${u.name.split(' ')[0]}.`}
            </h1>
          </div>
          {error && <div className="form-error">{error}</div>}
          {section === '' && (
            <>
              <p className="muted">
                Your favourites, deliveries and little discoveries—all together.
              </p>
              <div className="stats">
                <div className="stat">
                  <p>Orders placed</p>
                  <strong>{orders.length}</strong>
                </div>
                <div className="stat">
                  <p>On their way</p>
                  <strong>
                    {
                      orders.filter((o) =>
                        ['confirmed', 'processing', 'shipped'].includes(o.status),
                      ).length
                    }
                  </strong>
                </div>
                <div className="stat">
                  <p>Saved favourites</p>
                  <strong>{wishlist.length}</strong>
                </div>
                <div className="stat">
                  <p>Saved addresses</p>
                  <strong>{u.addresses.length}</strong>
                </div>
              </div>
              <div className="section-title">
                <h2>Recent discoveries.</h2>
                <span className="title-rule" />
                <Link href="/account/orders">All orders →</Link>
              </div>
              {orders.slice(0, 3).map((o) => (
                <OrderCard key={o._id} order={o} />
              ))}
              {!orders.length && (
                <div className="empty-state">
                  <h2>Your first discovery awaits.</h2>
                  <Link className="button" href="/products">
                    Explore Kashmir
                  </Link>
                </div>
              )}
            </>
          )}
          {section === 'orders' && (
            <>
              {orders.map((o) => (
                <OrderCard key={o._id} order={o} />
              ))}
              {!orders.length && (
                <div className="empty-state">
                  <h2>No orders just yet.</h2>
                  <Link className="button" href="/products">
                    Explore Kashmir
                  </Link>
                </div>
              )}
            </>
          )}
          {section === 'addresses' && (
            <>
              <div className="addresses">
                {u.addresses.map((a, i) => (
                  <div className="address-card" key={a.id || i}>
                    <h3>{a.name}</h3>
                    <p>
                      {a.line1}
                      <br />
                      {a.line2 && (
                        <>
                          {a.line2}
                          <br />
                        </>
                      )}
                      {a.city}, {a.state} {a.pincode}
                      <br />
                      {a.phone}
                    </p>
                    <div className="address-actions">
                      <button
                        onClick={() => {
                          setAddress(a);
                          setEditing(a.id || String(i));
                          setShowForm(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => saveAddresses(u.addresses.filter((_, j) => i !== j))}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="button secondary spaced"
                onClick={() => {
                  setAddress(emptyAddress);
                  setEditing(null);
                  setShowForm(!showForm);
                }}
              >
                + Add an address
              </button>
              {showForm && (
                <form
                  className="panel spaced"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const next = editing
                      ? u.addresses.map((a, i) =>
                          (a.id || String(i)) === editing ? { ...address, id: a.id } : a,
                        )
                      : [...u.addresses, { ...address, id: crypto.randomUUID() }];
                    saveAddresses(next);
                  }}
                >
                  <h2>{editing ? 'Edit address' : 'A new doorstep'}</h2>
                  <AddressFields value={address} onChange={setAddress} />
                  <div className="form-actions">
                    <button className="button" disabled={busy}>
                      {busy ? 'Saving…' : 'Save address'}
                    </button>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
          {section === 'profile' && (
            <form className="panel" onSubmit={profile}>
              <label className="field">
                Your name
                <input name="name" defaultValue={u.name} required minLength={2} maxLength={80} />
              </label>
              <label className="field">
                Email address
                <input value={u.email} readOnly />
              </label>
              <p className="small-text muted">
                Contact support for help changing your sign-in email or recovering access.
              </p>
              <button className="button spaced" disabled={busy}>
                {busy ? 'Saving…' : 'Save your details'}
              </button>
            </form>
          )}
          {section === 'support' && (
            <div className="panel">
              <h2>A real question deserves care.</h2>
              <p className="muted">
                For an order issue, include your order number. Your message is saved in the store’s
                support dashboard.
              </p>
              <Link href="/contact" className="button spaced">
                Send a message →
              </Link>
              <Link href="/help" className="text-link" style={{ display: 'block', marginTop: 24 }}>
                Browse common questions
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export function OrderView({
  initialOrder,
  products,
  placed = false,
}: {
  initialOrder: Order;
  products: Product[];
  placed?: boolean;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [returnForm, setReturnForm] = useState(false);
  const [error, setError] = useState('');
  const { add, toast } = useStore();
  async function update(body: Record<string, string>) {
    setBusy(true);
    setError('');
    try {
      const d = await api<{ order: Order }>('/api/orders/' + order._id, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setOrder(d.order);
      setReturnForm(false);
      toast('Your order has been updated.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-width">
      <div className="breadcrumb">
        <Link href="/account">Account</Link>
        <span>/</span>
        <Link href="/account/orders">Orders</Link>
        <span>/</span>
        <span>{order._id}</span>
      </div>
      {placed && (
        <div className="success-note">
          <strong>Thank you. A little Kashmir is on its way.</strong>
          <br />
          Your order has been saved. This local demo does not arrange a real shipment or charge a
          payment.
        </div>
      )}
      <div className="page-heading">
        <p className="eyebrow">Placed {formatDate(order.createdAt)}</p>
        <h1>Your little collection.</h1>
        <p>
          {order._id} <span className={'badge ' + order.status}>{order.status}</span>
        </p>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="split-layout">
        <div className="panel">
          <h2>Inside your order.</h2>
          {order.items.map((i) => (
            <div className="cart-line" key={i.productId + i.variantId}>
              <Art image={i.image} alt={i.name} />
              <div>
                <Link href={'/products/' + i.slug}>
                  <h3>{i.name}</h3>
                </Link>
                <p>
                  {i.variantLabel} · Qty {i.quantity}
                </p>
              </div>
              <span className="cart-price">{money(i.price * i.quantity)}</span>
            </div>
          ))}
          <div className="form-actions">
            {['confirmed', 'processing'].includes(order.status) && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => update({ status: 'cancelled' })}
              >
                Cancel order
              </button>
            )}
            {order.status === 'delivered' && !order.returnRequest && (
              <button className="button secondary" onClick={() => setReturnForm(!returnForm)}>
                Request return / help
              </button>
            )}
            <button
              className="button secondary"
              onClick={() => {
                for (const item of order.items) {
                  const p = products.find((p) => p._id === item.productId);
                  if (p) add(p, item.variantId, item.quantity);
                }
                toast('Available items added to your bag.');
              }}
            >
              Buy again
            </button>
            <button className="button secondary" onClick={() => window.print()}>
              Print invoice
            </button>
          </div>
          {returnForm && (
            <form
              className="spaced"
              onSubmit={(e) => {
                e.preventDefault();
                update({ returnReason: reason });
              }}
            >
              <label className="field">
                Tell us what happened
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  minLength={10}
                  maxLength={1000}
                />
              </label>
              <p className="muted small-text">
                Requests are reviewed by the store team. Eligibility depends on the product and
                condition.
              </p>
              <button className="button small spaced" disabled={busy}>
                Submit request
              </button>
            </form>
          )}
          {order.returnRequest && (
            <div className="alert-note">
              Return request: <strong>{order.returnRequest.status}</strong>
              <br />
              {order.returnRequest.reason}
            </div>
          )}
          <div className="spaced">
            {['upi', 'card'].includes(order.paymentMethod) &&
              !['paid', 'simulated paid — no money charged'].includes(order.paymentStatus) &&
              order.status !== 'cancelled' && (
                <PaymentPanel order={order} onPaid={() => window.location.reload()} />
              )}
            {order.shipment && (
              <div className="demo-note">
                <strong>{order.shipment.courier}</strong>
                <p>{order.shipment.status}</p>
                <p>
                  {order.shipment.mode === 'simulation'
                    ? 'Virtual shipment; no parcel has been handed to a real courier.'
                    : 'AWB: ' + order.shipment.awb}
                </p>
                {order.shipment.trackingUrl && (
                  <a
                    href={order.shipment.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link"
                  >
                    Track with courier
                  </a>
                )}
              </div>
            )}
            <h2>The journey so far.</h2>
            <div className="timeline">
              {order.history.map((h, i) => (
                <div key={i}>
                  <span className="timeline-dot" />
                  <div>
                    <h3>{h.status.replaceAll('-', ' ')}</h3>
                    <p>
                      {h.note}
                      <br />
                      {formatDate(h.at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {order.tracking && (
              <p className="small-text">
                Tracking reference: <strong>{order.tracking}</strong>
              </p>
            )}
          </div>
        </div>
        <aside>
          <div className="panel">
            <h2>Delivered to.</h2>
            <h3>{order.address.name}</h3>
            <p className="muted small-text">
              {order.address.line1}
              <br />
              {order.address.line2 && (
                <>
                  {order.address.line2}
                  <br />
                </>
              )}
              {order.address.city}, {order.address.state} {order.address.pincode}
              <br />
              {order.address.phone}
            </p>
          </div>
          <div className="panel spaced">
            <h2>Order summary.</h2>
            <div className="summary-row">
              <span>Products</span>
              <span>{money(order.subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>{money(order.shipping)}</span>
            </div>
            <div className="summary-row">
              <span>Discount</span>
              <span>−{money(order.discount)}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{money(order.total)}</span>
            </div>
            <p className="small-text muted spaced">
              Payment: {order.paymentMethod === 'cod' ? 'Cash on delivery' : 'Demo prepaid'}
              <br />
              {order.paymentStatus}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
