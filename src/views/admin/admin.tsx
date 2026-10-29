'use client';
import Link from 'next/link';
import { ShipmentAdmin } from '@/features/checkout/shipment-admin';
import { Outbox } from '@/features/checkout/outbox';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Boxes,
  Tags,
  Settings as SettingsIcon,
  MessageCircle,
  Star,
  Ticket,
  LogOut,
  ArrowUpRight,
} from 'lucide-react';
import type {
  Product,
  Order,
  Category,
  PublicUser,
  Review,
  Coupon,
  Settings,
  Variant,
} from '@/shared/lib/types';
import { money, formatDate, canTransition } from '@/shared/lib/commerce';
import { api } from '@/shared/lib/client';
import { Art } from '@/shared/ui/art';
import { useStore } from '@/shared/ui/store-provider';
type Enquiry = {
  _id: string;
  name: string;
  email: string;
  type: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
};
type Props = {
  section: string;
  products: Product[];
  orders: Order[];
  users: PublicUser[];
  categories: Category[];
  reviews: Review[];
  coupons: Coupon[];
  enquiries: Enquiry[];
  settings: Settings;
};
const nav = [
  ['', 'Overview', LayoutDashboard],
  ['products', 'Products', Package],
  ['orders', 'Orders', ShoppingBag],
  ['inventory', 'Inventory', Boxes],
  ['customers', 'Customers', Users],
  ['categories', 'Categories', Tags],
  ['coupons', 'Offers', Ticket],
  ['reviews', 'Reviews', Star],
  ['enquiries', 'Enquiries', MessageCircle],
  ['settings', 'Store settings', SettingsIcon],
  ['notifications', 'Email outbox', MessageCircle],
] as const;
const blank: Omit<Product, '_id' | 'slug' | 'rating' | 'reviewCount' | 'createdAt'> = {
  name: '',
  subtitle: '',
  description: '',
  category: 'dry-fruits',
  image: 'walnuts',
  origin: 'Kashmir',
  material: '',
  details: [],
  care: '',
  featured: false,
  active: true,
  variants: [{ id: 'option-1', label: 'Standard', price: 1, stock: 0, sku: 'KS-NEW-1' }],
};
function writable(p: Product) {
  return {
    name: p.name,
    subtitle: p.subtitle,
    description: p.description,
    category: p.category,
    image: p.image,
    origin: p.origin,
    material: p.material,
    details: p.details,
    care: p.care,
    featured: p.featured,
    topPick: p.topPick || false,
    newArrival: p.newArrival || false,
    gallery: p.gallery || [],
    active: p.active,
    variants: p.variants,
  };
}
export function AdminView(props: Props) {
  const { section, products, orders, users, categories, reviews, coupons, enquiries, settings } =
    props;
  const router = useRouter();
  const { toast, logout } = useStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [editor, setEditor] = useState<Product | 'new' | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | 'new' | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  async function update(resource: string, data: unknown, method = 'PATCH') {
    setBusy(true);
    setError('');
    try {
      await api('/api/admin/' + resource, { method, body: JSON.stringify(data) });
      toast('Changes saved.');
      router.refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function updateOrder(o: Order, data: Record<string, string>) {
    setBusy(true);
    setError('');
    try {
      const d = await api<{ order: Order }>('/api/orders/' + o._id, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      setSelectedOrder(d.order);
      toast('Order updated.');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const title = nav.find((n) => n[0] === section)?.[1] || 'Overview';
  const visibleProducts = products.filter(
    (p) =>
      (p.name + ' ' + p._id).toLowerCase().includes(query.toLowerCase()) &&
      (!filter || p.category === filter),
  );
  const visibleOrders = orders.filter(
    (o) =>
      (o._id + ' ' + o.address.name + ' ' + o.email).toLowerCase().includes(query.toLowerCase()) &&
      (!filter || o.status === filter),
  );
  const sales = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const low = products.flatMap((p) =>
    p.variants.filter((v) => v.stock <= 10).map((v) => ({ p, v })),
  );
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h2>Kashmir Se</h2>
        <p className="eyebrow">The store room</p>
        <nav className="account-nav">
          {nav.map(([slug, name, Icon]) => (
            <Link
              href={'/admin' + (slug ? '/' + slug : '')}
              key={slug}
              className={section === slug ? 'active' : ''}
            >
              <Icon size={16} />
              {name}
            </Link>
          ))}
          <Link href="/">
            Visit storefront <ArrowUpRight size={15} />
          </Link>
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
      <div className="admin-main">
        <div className="page-heading admin-title">
          <div>
            <p className="eyebrow">Kashmir Se / Store management</p>
            <h1>{section === '' ? 'A little overview.' : title + '.'}</h1>
          </div>
          {section === 'products' && (
            <button className="button" onClick={() => setEditor('new')}>
              + Add product
            </button>
          )}
          {section === 'coupons' && (
            <button className="button" onClick={() => setSelectedCoupon('new')}>
              + Create offer
            </button>
          )}
        </div>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        {section === '' && (
          <>
            <div className="demo-note">
              Local store dashboard · Includes seeded demonstration orders, stock, customers and
              reviews. No real payment settlements or courier bookings.
            </div>
            <div className="stats">
              <div className="stat">
                <p>Order value (excl. cancelled)</p>
                <strong>{money(sales)}</strong>
              </div>
              <div className="stat">
                <p>Total orders</p>
                <strong>{orders.length}</strong>
              </div>
              <div className="stat">
                <p>Active products</p>
                <strong>{products.filter((p) => p.active).length}</strong>
              </div>
              <div className="stat">
                <p>Customers</p>
                <strong>{users.filter((u) => u.role === 'customer').length}</strong>
              </div>
            </div>
            <div className="admin-columns">
              <div className="panel">
                <h2>Orders needing care.</h2>
                {orders
                  .filter((o) => ['confirmed', 'processing'].includes(o.status))
                  .slice(0, 5)
                  .map((o) => (
                    <div className="summary-row" key={o._id}>
                      <Link href="/admin/orders" className="text-link">
                        {o._id}
                      </Link>
                      <span>{money(o.total)}</span>
                    </div>
                  ))}
                <Link href="/admin/orders" className="button secondary small spaced">
                  Manage orders →
                </Link>
              </div>
              <div className="panel">
                <h2>A few things to check.</h2>
                <div className="summary-row">
                  <span>Low-stock options</span>
                  <strong>{low.length}</strong>
                </div>
                <div className="summary-row">
                  <span>Reviews awaiting approval</span>
                  <strong>{reviews.filter((r) => !r.approved).length}</strong>
                </div>
                <div className="summary-row">
                  <span>Open enquiries</span>
                  <strong>{enquiries.filter((e) => e.status !== 'resolved').length}</strong>
                </div>
                <div className="summary-row">
                  <span>Return requests</span>
                  <strong>
                    {orders.filter((o) => o.returnRequest?.status === 'requested').length}
                  </strong>
                </div>
              </div>
            </div>
            <div className="panel spaced">
              <h2>Orders over the last seven days.</h2>
              {Array.from({ length: 7 }, (_, i) => {
                const day = new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10);
                const total = orders
                  .filter((o) => o.createdAt.startsWith(day) && o.status !== 'cancelled')
                  .reduce((s, o) => s + o.total, 0);
                return (
                  <div key={day}>
                    <div className="summary-row">
                      <span>{formatDate(day)}</span>
                      <span>{money(total)}</span>
                    </div>
                    <div className="progress-track" style={{ margin: '0 0 10px' }}>
                      <span
                        style={{ width: (sales ? Math.min(100, (total / sales) * 100) : 0) + '%' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {['products', 'inventory'].includes(section) && (
          <>
            <div className="admin-search">
              <input
                aria-label="Search products"
                placeholder="Search products or IDs…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                aria-label="Filter category"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option value={c._id} key={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {editor && (
              <ProductEditor
                product={editor === 'new' ? null : editor}
                categories={categories}
                busy={busy}
                onClose={() => setEditor(null)}
                onSave={async (data) => {
                  if (
                    await update(
                      'products',
                      editor === 'new' ? data : { ...data, id: editor._id },
                      editor === 'new' ? 'POST' : 'PATCH',
                    )
                  )
                    setEditor(null);
                }}
              />
            )}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price / stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <div className="table-name">
                          <Art image={p.image} />
                          <div>
                            {p.name}
                            <small>{p.variants.length} option(s)</small>
                          </div>
                        </div>
                      </td>
                      <td>{categories.find((c) => c._id === p.category)?.name}</td>
                      <td>
                        {p.variants.map((v) => (
                          <div key={v.id}>
                            {v.label}: {money(v.price)} ·{' '}
                            <span className={v.stock <= 10 ? 'inventory-low' : ''}>
                              {v.stock} in stock
                            </span>
                          </div>
                        ))}
                      </td>
                      <td>
                        <span className="badge">
                          {p.active ? 'Active' : 'Archived'}
                          {p.featured ? ' · Featured' : ''}
                        </span>
                      </td>
                      <td>
                        <div className="inline-actions">
                          <button className="button secondary small" onClick={() => setEditor(p)}>
                            Edit
                          </button>
                          <button
                            className="button secondary small"
                            disabled={busy}
                            onClick={() =>
                              update('products', { ...writable(p), id: p._id, active: !p.active })
                            }
                          >
                            {p.active ? 'Archive' : 'Restore'}
                          </button>
                          <Link className="text-link" href={'/products/' + p.slug}>
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!visibleProducts.length && <p className="panel">No matching products.</p>}
          </>
        )}
        {section === 'notifications' && <Outbox />}
        {section === 'orders' && (
          <>
            <div className="admin-search">
              <input
                aria-label="Search orders"
                placeholder="Search order number, customer or email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter order status"
              >
                <option value="">All statuses</option>
                {['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            {selectedOrder && (
              <div className="editor-panel">
                <div className="flex-between">
                  <h2>{selectedOrder._id}</h2>
                  <button className="button secondary small" onClick={() => setSelectedOrder(null)}>
                    Close
                  </button>
                </div>
                <p className="small-text">
                  {selectedOrder.address.name} · {selectedOrder.email}
                  <br />
                  {selectedOrder.address.line1}, {selectedOrder.address.city},{' '}
                  {selectedOrder.address.state} {selectedOrder.address.pincode}
                  <br />
                  {selectedOrder.address.phone}
                </p>
                <p className="small-text spaced">
                  {selectedOrder.items
                    .map((i) => `${i.name} (${i.variantLabel}) × ${i.quantity}`)
                    .join(' · ')}
                </p>
                <p className="spaced">
                  {money(selectedOrder.total)} ·{' '}
                  <span className={'badge ' + selectedOrder.status}>{selectedOrder.status}</span>
                </p>
                <p className="small-text muted spaced">Payment: {selectedOrder.paymentStatus}</p>
                <ShipmentAdmin
                  order={selectedOrder}
                  onChange={(o) => {
                    setSelectedOrder(o);
                    router.refresh();
                  }}
                />
                <form
                  className="form-actions"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    updateOrder(selectedOrder, {
                      status: String(f.get('status')),
                      tracking: String(f.get('tracking') || ''),
                    });
                  }}
                >
                  <select name="status" required aria-label="Next order status">
                    <option value="">Choose next status</option>
                    {['processing', 'shipped', 'delivered', 'cancelled']
                      .filter((s) => canTransition(selectedOrder.status, s))
                      .map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                  </select>
                  <input
                    className="search"
                    name="tracking"
                    placeholder="Tracking reference (for dispatch)"
                    maxLength={100}
                  />
                  <button
                    className="button small"
                    disabled={busy || ['delivered', 'cancelled'].includes(selectedOrder.status)}
                  >
                    Update order
                  </button>
                </form>
                {selectedOrder.returnRequest && (
                  <div className="panel spaced">
                    <h3>Return: {selectedOrder.returnRequest.status}</h3>
                    <p className="small-text">{selectedOrder.returnRequest.reason}</p>
                    <div className="form-actions">
                      {selectedOrder.returnRequest.status === 'requested' && (
                        <>
                          <button
                            className="button small"
                            disabled={busy}
                            onClick={() => updateOrder(selectedOrder, { returnStatus: 'approved' })}
                          >
                            Approve request
                          </button>
                          <button
                            className="button secondary small"
                            disabled={busy}
                            onClick={() => updateOrder(selectedOrder, { returnStatus: 'declined' })}
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {selectedOrder.returnRequest.status === 'approved' && (
                        <button
                          className="button small"
                          disabled={busy}
                          onClick={() => updateOrder(selectedOrder, { returnStatus: 'refunded' })}
                        >
                          Record manual refund
                        </button>
                      )}
                    </div>
                    <p className="tax-note spaced">Recording a refund does not transfer money.</p>
                  </div>
                )}
                <div className="timeline">
                  {selectedOrder.history.map((h, i) => (
                    <div key={i}>
                      <span className="timeline-dot" />
                      <div>
                        <h3>{h.status}</h3>
                        <p>
                          {h.note} · {formatDate(h.at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Payment / return</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((o) => (
                    <tr key={o._id}>
                      <td>
                        {o._id}
                        <br />
                        <span className="muted">{formatDate(o.createdAt)}</span>
                      </td>
                      <td>
                        {o.address.name}
                        <br />
                        {o.email}
                      </td>
                      <td>{money(o.total)}</td>
                      <td>
                        <span className={'badge ' + o.status}>{o.status}</span>
                      </td>
                      <td>
                        {o.paymentMethod}
                        <br />
                        {o.returnRequest?.status || '—'}
                      </td>
                      <td>
                        <button
                          className="button secondary small"
                          onClick={() => setSelectedOrder(o)}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {section === 'customers' && (
          <>
            <div className="admin-search">
              <input
                aria-label="Search customers"
                placeholder="Search name or email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>Orders</th>
                    <th>Order value</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(
                      (u) =>
                        u.role === 'customer' &&
                        (u.name + ' ' + u.email).toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((u) => (
                      <tr key={u._id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{formatDate(u.createdAt)}</td>
                        <td>{orders.filter((o) => o.userId === u._id).length}</td>
                        <td>
                          {money(
                            orders
                              .filter((o) => o.userId === u._id && o.status !== 'cancelled')
                              .reduce((s, o) => s + o.total, 0),
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {section === 'categories' && (
          <>
            {editCategory && (
              <form
                className="editor-panel"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  if (
                    await update('categories', {
                      id: editCategory._id,
                      name: f.get('name'),
                      description: f.get('description'),
                    })
                  )
                    setEditCategory(null);
                }}
              >
                <h2>Edit category</h2>
                <label className="field">
                  Name
                  <input name="name" defaultValue={editCategory.name} required minLength={2} />
                </label>
                <label className="field">
                  Description
                  <textarea name="description" defaultValue={editCategory.description} />
                </label>
                <div className="form-actions">
                  <button className="button" disabled={busy}>
                    Save category
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setEditCategory(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Products</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c._id}>
                      <td>
                        <div className="table-name">
                          <Art image={c.image} />
                          {c.name}
                        </div>
                      </td>
                      <td>{c.description}</td>
                      <td>{products.filter((p) => p.category === c._id).length}</td>
                      <td>
                        <button
                          className="button small secondary"
                          onClick={() => setEditCategory(c)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {section === 'coupons' && (
          <>
            {selectedCoupon && (
              <CouponEditor
                coupon={selectedCoupon === 'new' ? null : selectedCoupon}
                onClose={() => setSelectedCoupon(null)}
                busy={busy}
                onSave={async (c) => {
                  if (
                    await update(
                      'coupons',
                      selectedCoupon === 'new' ? c : { ...c, id: selectedCoupon._id },
                      selectedCoupon === 'new' ? 'POST' : 'PATCH',
                    )
                  )
                    setSelectedCoupon(null);
                }}
              />
            )}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Benefit</th>
                    <th>Minimum order</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c._id}>
                      <td>
                        <strong>{c.code}</strong>
                      </td>
                      <td>
                        {c.type === 'percent' ? c.value + '%' : money(c.value)} · cap{' '}
                        {money(c.maxDiscount)}
                      </td>
                      <td>{money(c.minOrder)}</td>
                      <td>{formatDate(c.expiresAt)}</td>
                      <td>{c.active ? 'Active' : 'Inactive'}</td>
                      <td>
                        <button
                          className="button secondary small"
                          onClick={() => setSelectedCoupon(c)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {section === 'reviews' && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer / product</th>
                  <th>Review</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r._id}>
                    <td>
                      {r.name}
                      <br />
                      {products.find((p) => p._id === r.productId)?.name}
                    </td>
                    <td>
                      <strong>{r.title}</strong>
                      <br />
                      {r.body}
                    </td>
                    <td>{r.rating}/5</td>
                    <td>{r.approved ? 'Published' : 'Pending'}</td>
                    <td>
                      <button
                        className="button secondary small"
                        disabled={busy}
                        onClick={() => update('reviews', { id: r._id, approved: !r.approved })}
                      >
                        {r.approved ? 'Unpublish' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {section === 'enquiries' && (
          <>
            {!enquiries.length && (
              <div className="empty-state">
                <h2>All quiet in the inbox.</h2>
                <p>Contact, bulk and custom order messages will appear here.</p>
              </div>
            )}
            {enquiries.map((e) => (
              <div className="panel" style={{ marginBottom: 20 }} key={e._id}>
                <div className="flex-between">
                  <h3>{e.subject}</h3>
                  <span className={'badge ' + e.status}>{e.status}</span>
                </div>
                <p className="small-text muted">
                  {e.name} · {e.email} · {e.type} · {formatDate(e.createdAt)}
                </p>
                <p className="small-text spaced" style={{ whiteSpace: 'pre-wrap' }}>
                  {e.message}
                </p>
                <div className="form-actions">
                  <select
                    aria-label={'Status for ' + e.subject}
                    value={e.status}
                    disabled={busy}
                    onChange={(event) =>
                      update('enquiries', { id: e._id, status: event.target.value })
                    }
                  >
                    <option value="new">New</option>
                    <option value="in-progress">In progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <a
                    className="text-link small-text"
                    href={
                      'mailto:' + e.email + '?subject=' + encodeURIComponent('Re: ' + e.subject)
                    }
                  >
                    Open email reply ↗
                  </a>
                </div>
              </div>
            ))}
          </>
        )}
        {section === 'settings' && (
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              update('settings', {
                id: 'store',
                storeName: f.get('storeName'),
                supportEmail: f.get('supportEmail'),
                phone: f.get('phone'),
                freeShippingAt: Number(f.get('freeShippingAt')),
                shippingFee: Number(f.get('shippingFee')),
                announcement: f.get('announcement'),
                codEnabled: f.get('codEnabled') === 'on',
              });
            }}
          >
            <h2>The store details.</h2>
            <div className="form-grid">
              {[
                ['storeName', 'Store name'],
                ['supportEmail', 'Support email'],
                ['phone', 'Support phone (optional)'],
                ['announcement', 'Store message'],
              ].map(([key, label]) => (
                <label className="field" key={key}>
                  {label}
                  <input
                    name={key}
                    defaultValue={String(settings[key as keyof Settings])}
                    required={key !== 'phone'}
                    type={key === 'supportEmail' ? 'email' : 'text'}
                  />
                </label>
              ))}
              <label className="field">
                Free shipping above (₹)
                <input
                  type="number"
                  min={0}
                  max={100000}
                  name="freeShippingAt"
                  defaultValue={settings.freeShippingAt}
                  required
                />
              </label>
              <label className="field">
                Standard shipping fee (₹)
                <input
                  type="number"
                  min={0}
                  max={10000}
                  name="shippingFee"
                  defaultValue={settings.shippingFee}
                  required
                />
              </label>
            </div>
            <label className="check-field">
              <input type="checkbox" name="codEnabled" defaultChecked={settings.codEnabled} />
              Enable cash on delivery
            </label>
            <div className="demo-note">
              Live payment processing, email/SMS and courier APIs are not connected. Customer-facing
              support details must be set to real business details before launch.
            </div>
            <button className="button" disabled={busy}>
              {busy ? 'Saving…' : 'Save settings'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
function ProductEditor({
  product,
  categories,
  onSave,
  onClose,
  busy,
}: {
  product: Product | null;
  categories: Category[];
  onSave: (d: typeof blank) => Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  const [data, setData] = useState(
    product
      ? writable(product)
      : { ...blank, variants: [{ ...blank.variants[0], id: crypto.randomUUID() }] },
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  function field(key: keyof typeof blank, value: unknown) {
    setData((d) => ({ ...d, [key]: value }));
  }
  function variant(i: number, key: keyof Variant, value: string | number) {
    setData((d) => ({
      ...d,
      variants: d.variants.map((v, j) => (i === j ? { ...v, [key]: value } : v)),
    }));
  }
  return (
    <form
      className="editor-panel"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(data);
      }}
    >
      <div className="flex-between">
        <h2>{product ? 'Edit ' + product.name : 'A new discovery.'}</h2>
        <button type="button" className="button secondary small" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="form-grid">
        <label className="field">
          Product name
          <input
            value={data.name}
            onChange={(e) => field('name', e.target.value)}
            required
            minLength={3}
            maxLength={150}
          />
        </label>
        <label className="field">
          Subtitle
          <input
            value={data.subtitle}
            onChange={(e) => field('subtitle', e.target.value)}
            maxLength={150}
          />
        </label>
        <label className="field">
          Category
          <select value={data.category} onChange={(e) => field('category', e.target.value)}>
            {categories.map((c) => (
              <option value={c._id} key={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Reference image
          <select value={data.image} onChange={(e) => field('image', e.target.value)}>
            {[
              'walnuts',
              'saffron',
              'pheran',
              'copper',
              'dry-fruits',
              'saffron-tea',
              'pickles',
              'clothing',
              'shawls',
              'crafts',
              'cricket',
              'gifts',
            ].map((i) => (
              <option key={i}>{i}</option>
            ))}
            {data.image.startsWith('catalog:') && (
              <option value={data.image}>Catalogue photograph</option>
            )}
            {data.image.startsWith('/uploads/') && (
              <option value={data.image}>Uploaded photo</option>
            )}
          </select>
        </label>
        <label className="field">
          Origin
          <input
            value={data.origin}
            onChange={(e) => field('origin', e.target.value)}
            maxLength={150}
          />
        </label>
        <label className="field">
          Material / ingredients
          <input
            value={data.material}
            onChange={(e) => field('material', e.target.value)}
            maxLength={150}
          />
        </label>
        <label className="field full-span">
          Description
          <textarea
            value={data.description}
            onChange={(e) => field('description', e.target.value)}
            required
            minLength={10}
            maxLength={5000}
          />
        </label>
        <label className="field full-span">
          Details (one per line)
          <textarea
            value={data.details.join('\n')}
            onChange={(e) => field('details', e.target.value.split('\n'))}
          />
        </label>
        <label className="field full-span">
          Care & storage
          <textarea
            value={data.care}
            onChange={(e) => field('care', e.target.value)}
            maxLength={1000}
          />
        </label>
        <label className="field full-span">
          Upload a product photo (JPEG, PNG or WebP, up to 5 MB)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              setUploadError('');
              try {
                const form = new FormData();
                form.set('file', file);
                const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error);
                field('image', result.path);
              } catch (err) {
                setUploadError((err as Error).message);
              } finally {
                setUploading(false);
              }
            }}
          />
          {uploading ? 'Uploading…' : uploadError || 'Uploads stay on this local server.'}
        </label>
      </div>
      <div className="variant-editor">
        <h3>Options, price & inventory</h3>
        {data.variants.map((v, i) => (
          <div className="variant-row" key={v.id}>
            <label className="field">
              Option
              <input
                required
                value={v.label}
                onChange={(e) => variant(i, 'label', e.target.value)}
              />
            </label>
            <label className="field">
              Price (₹)
              <input
                type="number"
                required
                min={1}
                step={1}
                value={v.price}
                onChange={(e) => variant(i, 'price', Number(e.target.value))}
              />
            </label>
            <label className="field">
              Stock
              <input
                type="number"
                required
                min={0}
                step={1}
                value={v.stock}
                onChange={(e) => variant(i, 'stock', Number(e.target.value))}
              />
            </label>
            <label className="field">
              SKU
              <input required value={v.sku} onChange={(e) => variant(i, 'sku', e.target.value)} />
            </label>
            <button
              type="button"
              className="button secondary small"
              disabled={data.variants.length === 1}
              onClick={() =>
                field(
                  'variants',
                  data.variants.filter((_, j) => i !== j),
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button secondary small"
          onClick={() =>
            field('variants', [
              ...data.variants,
              { id: crypto.randomUUID(), label: '', price: 1, stock: 0, sku: 'KS-' + Date.now() },
            ])
          }
        >
          + Add option
        </button>
      </div>
      <div className="horizontal-list">
        <label className="check-field">
          <input
            type="checkbox"
            checked={data.featured}
            onChange={(e) => field('featured', e.target.checked)}
          />
          Featured on homepage
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={data.topPick || false}
            onChange={(e) => field('topPick', e.target.checked)}
          />
          Top pick
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={data.newArrival || false}
            onChange={(e) => field('newArrival', e.target.checked)}
          />
          New arrival
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={data.active}
            onChange={(e) => field('active', e.target.checked)}
          />
          Active / available in catalogue
        </label>
      </div>
      <div className="form-actions">
        <button className="button" disabled={busy || uploading}>
          {busy ? 'Saving…' : 'Save product'}
        </button>
        <button type="button" className="button secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
function CouponEditor({
  coupon,
  onSave,
  onClose,
  busy,
}: {
  coupon: Coupon | null;
  onSave: (c: Omit<Coupon, '_id'>) => Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  return (
    <form
      className="editor-panel"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave({
          code: String(f.get('code')).toUpperCase(),
          type: f.get('type') as 'percent' | 'fixed',
          value: Number(f.get('value')),
          minOrder: Number(f.get('minOrder')),
          maxDiscount: Number(f.get('maxDiscount')),
          active: f.get('active') === 'on',
          expiresAt: new Date(String(f.get('expiresAt'))).toISOString(),
        });
      }}
    >
      <h2>{coupon ? 'Edit offer' : 'A little offer.'}</h2>
      <div className="form-grid">
        <label className="field">
          Code
          <input name="code" defaultValue={coupon?.code} required pattern="[A-Za-z0-9]{3,30}" />
        </label>
        <label className="field">
          Discount type
          <select name="type" defaultValue={coupon?.type || 'percent'}>
            <option value="percent">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </label>
        {[
          ['value', 'Value', coupon?.value || 10],
          ['minOrder', 'Minimum order (₹)', coupon?.minOrder || 0],
          ['maxDiscount', 'Maximum discount (₹)', coupon?.maxDiscount || 500],
        ].map(([key, label, value]) => (
          <label className="field" key={key}>
            {label}
            <input
              type="number"
              required
              min={key === 'minOrder' ? 0 : 1}
              name={String(key)}
              defaultValue={value}
            />
          </label>
        ))}
        <label className="field">
          Expires
          <input
            type="datetime-local"
            required
            name="expiresAt"
            defaultValue={(coupon?.expiresAt || '2027-12-31T23:59:00.000Z').slice(0, 16)}
          />
        </label>
      </div>
      <label className="check-field">
        <input type="checkbox" name="active" defaultChecked={coupon?.active ?? true} />
        Active
      </label>
      <div className="form-actions">
        <button className="button" disabled={busy}>
          Save offer
        </button>
        <button type="button" className="button secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
