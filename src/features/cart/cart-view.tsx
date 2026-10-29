'use client';
import Link from 'next/link';
import { ShoppingBag, Trash2 } from 'lucide-react';
import type { Product, Settings } from '@/shared/lib/types';
import { purchaseSummary } from '@/shared/lib/product-options';
import { money, totals } from '@/shared/lib/commerce';
import { useStore } from '@/shared/ui/store-provider';
import { Art } from '@/shared/ui/art';
export function CartView({ products, settings }: { products: Product[]; settings: Settings }) {
  const { cart, change, clear } = useStore();
  const lines = cart.map((l) => ({ line: l, p: products.find((p) => p._id === l.productId) }));
  const subtotal = lines.reduce(
    (s, { line, p }) =>
      s + (p?.variants.find((v) => v.id === line.variantId)?.price || 0) * line.quantity,
    0,
  );
  const amount = totals(subtotal, null, settings);
  const invalid = lines.some(
    ({ line, p }) =>
      !p || !p.variants.some((v) => v.id === line.variantId && v.stock >= line.quantity),
  );
  return (
    <div className="page-width">
      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <span>Your bag</span>
      </div>
      <div className="page-heading">
        <p className="eyebrow">A little Kashmir, coming home</p>
        <h1>Your shopping bag.</h1>
      </div>
      {!cart.length ? (
        <div className="empty-state">
          <ShoppingBag size={40} strokeWidth={1} />
          <h2>Your next discovery is waiting.</h2>
          <p>Your bag is empty. Explore the valley and find something you’ll love.</p>
          <Link href="/products" className="button">
            Explore Kashmir →
          </Link>
        </div>
      ) : (
        <div className="split-layout">
          <div>
            {invalid && (
              <div className="form-error">
                Some items or quantities are unavailable. Update or remove them before checkout.
              </div>
            )}
            {lines.map(({ line, p }) => {
              const v = p?.variants.find((v) => v.id === line.variantId);
              return (
                <div className="cart-line" key={line.productId + line.variantId}>
                  <Art image={p?.image || 'gifts'} alt={p?.name || 'Unavailable product'} />
                  <div>
                    <Link href={p ? '/products/' + p.slug : '/products'}>
                      <h3>{p?.name || 'Unavailable product'}</h3>
                    </Link>
                    <p>
                      {v?.label || 'Unavailable option'} · {v ? money(v.price) : '—'} per pack
                    </p>
                    {v && <p className="small-text">{purchaseSummary(v, line.quantity)}</p>}
                    <div className="quantity">
                      <button
                        aria-label={'Decrease ' + (p?.name || 'item')}
                        onClick={() => change(line.productId, line.variantId, line.quantity - 1)}
                      >
                        −
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        aria-label={'Increase ' + (p?.name || 'item')}
                        disabled={line.quantity >= Math.min(v?.stock || 0, 10)}
                        onClick={() => change(line.productId, line.variantId, line.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      className="remove"
                      onClick={() => change(line.productId, line.variantId, 0)}
                    >
                      Remove
                    </button>
                    {v && line.quantity > v.stock && (
                      <p style={{ color: 'var(--error)' }}>Only {v.stock} available</p>
                    )}
                  </div>
                  <div className="cart-price">{v ? money(v.price * line.quantity) : '—'}</div>
                </div>
              );
            })}
            <div className="flex-between spaced">
              <Link href="/products" className="text-link small-text">
                ← Continue exploring
              </Link>
              <button className="remove" onClick={clear}>
                Empty bag
              </button>
            </div>
          </div>
          <aside className="panel summary">
            <h2>A little summary.</h2>
            <div className="summary-row">
              <span>Products</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>{amount.shipping ? money(amount.shipping) : 'On us'}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{money(amount.total)}</span>
            </div>
            {subtotal < settings.freeShippingAt && (
              <p className="muted small-text spaced">
                You’re {money(settings.freeShippingAt - subtotal)} away from free shipping.
              </p>
            )}
            {invalid ? (
              <button className="button" disabled>
                Review unavailable items
              </button>
            ) : (
              <Link href="/checkout" className="button">
                Continue to checkout →
              </Link>
            )}
            <p className="tax-note spaced">
              Offer codes can be applied at checkout. Final prices and stock are checked by the
              server.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
