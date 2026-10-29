'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Heart, ShoppingBag, Truck, ShieldCheck, Star } from 'lucide-react';
import type { Product, Review, Category } from '@/shared/lib/types';
import {
  optionHeading,
  unitPrice,
  purchaseSummary,
  sortedOptions,
} from '@/shared/lib/product-options';
import { money, formatDate } from '@/shared/lib/commerce';
import { api } from '@/shared/lib/client';
import { Art } from '@/shared/ui/art';
import { useStore } from '@/shared/ui/store-provider';
import { ProductCard } from '@/entities/product/ui/product-card';
export function ProductView({
  product: p,
  reviews,
  related,
  category,
}: {
  product: Product;
  reviews: Review[];
  related: Product[];
  category?: Category;
}) {
  const { add, cart, wishlist, toggleWish, user, toast } = useStore();
  const [selected, setSelected] = useState(
    p.variants.find((v) => v.stock > 0)?.id || p.variants[0].id,
  );
  const [photo, setPhoto] = useState(p.image);
  const gallery = Array.from(new Set([p.image, ...(p.gallery || [])]));
  const [qty, setQty] = useState(1);
  const [pin, setPin] = useState('');
  const [delivery, setDelivery] = useState('');
  const [busy, setBusy] = useState(false);
  const v = p.variants.find((v) => v.id === selected)!;
  const inBag = cart.find((l) => l.productId === p._id && l.variantId === selected)?.quantity || 0;
  const available = Math.max(0, Math.min(10, v.stock) - inBag);
  async function review(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    try {
      const result = await api<{ message: string }>('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          productId: p._id,
          rating: Number(data.get('rating')),
          title: data.get('title'),
          body: data.get('body'),
        }),
      });
      toast(result.message);
      form.reset();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-width">
      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href={'/categories/' + p.category}>{category?.name}</Link>
        <span>/</span>
        <span>{p.name}</span>
      </div>
      <div className="product-detail">
        <div className="product-gallery">
          <Art image={photo} alt={p.name} />
          {gallery.length > 1 && (
            <div className="product-gallery-thumbs" aria-label="Product photographs">
              {gallery.map((image, i) => (
                <button
                  key={image}
                  className={photo === image ? 'active' : ''}
                  aria-label={`View product photo ${i + 1}`}
                  aria-pressed={photo === image}
                  onClick={() => setPhoto(image)}
                >
                  <Art image={image} />
                </button>
              ))}
            </div>
          )}
          <small>
            Illustrative product photography · Read the selected option and specifications below.
          </small>
        </div>
        <div className="product-details">
          <p className="eyebrow">{p.origin}</p>
          <h1>{p.name}</h1>
          <p className="subtitle">{p.subtitle}</p>
          <div className="rating">
            <Star size={14} />
            {p.reviewCount
              ? `${p.rating.toFixed(1)} · ${p.reviewCount} review${p.reviewCount === 1 ? '' : 's'}`
              : 'Be the first to share your experience'}
          </div>
          <p className="detail-price">{money(v.price)}</p>
          <span className="tax-note">
            Price per selected pack. Shipping is calculated at checkout.
          </span>
          <p className="variant-label">
            {optionHeading(p)}: <strong>{v.label}</strong>
          </p>
          <div className="variant-buttons">
            {sortedOptions(p.variants).map((option) => (
              <button
                key={option.id}
                className={selected === option.id ? 'active' : ''}
                aria-pressed={selected === option.id}
                onClick={() => {
                  setSelected(option.id);
                  setQty(1);
                }}
              >
                <span>{option.label}</span>
                <small>{money(option.price)}</small>
                {option.stock === 0 ? ' · Sold out' : ''}
              </button>
            ))}
          </div>
          {unitPrice(p, v) && <p className="unit-price">{unitPrice(p, v)}</p>}
          <p className="stock-note">
            {v.stock > 0 ? `${v.stock} available · SKU ${v.sku}` : 'Currently unavailable'}
          </p>
          <p className="variant-label">Number of packs</p>
          <div className="purchase-row">
            <div className="quantity" role="group" aria-label="Number of packs">
              <button
                aria-label="Decrease quantity"
                disabled={qty <= 1}
                onClick={() => setQty(qty - 1)}
              >
                −
              </button>
              <span aria-live="polite">{qty}</span>
              <button
                aria-label="Increase quantity"
                disabled={qty >= available}
                onClick={() => setQty(qty + 1)}
              >
                +
              </button>
            </div>
            <button
              className="button"
              onClick={() => add(p, selected, qty)}
              disabled={!v.stock || qty > available}
            >
              <ShoppingBag size={17} />
              Add to Bag
            </button>
            <button
              className="icon-button"
              aria-label="Save to wishlist"
              aria-pressed={wishlist.includes(p._id)}
              onClick={() => toggleWish(p._id)}
            >
              <Heart size={20} fill={wishlist.includes(p._id) ? 'currentColor' : 'none'} />
            </button>
          </div>
          <div className="purchase-summary" aria-live="polite">
            <p>{purchaseSummary(v, qty)}</p>
            <strong>Item total: {money(v.price * qty)}</strong>
            {inBag > 0 && (
              <p className="small-text">
                {inBag} pack{inBag === 1 ? '' : 's'} of this option already in your bag.
              </p>
            )}
            <p className="small-text muted">
              Quantity means number of packs. Different sizes can be added separately.
            </p>
          </div>
          <p className="small-text spaced">
            Need a larger order?{' '}
            <Link href="/bulk" className="text-link">
              Ask for a bulk quote →
            </Link>
          </p>
          <div className="postcode-box">
            <span className="sans small-text">
              <Truck size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} />
              Delivery to your doorstep
            </span>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setDelivery(
                  /^[1-9]\d{5}$/.test(pin)
                    ? 'Estimated dispatch: 2–3 working days; delivery typically 4–8 working days after dispatch. This is a demo estimate; postcode serviceability is not connected to a courier.'
                    : 'Please enter a valid 6-digit Indian postcode.',
                );
              }}
            >
              <input
                aria-label="Delivery postcode"
                placeholder="Enter postcode"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />
              <button className="button secondary small">Check</button>
            </form>
            {delivery && <p>{delivery}</p>}
          </div>
          <div className="detail-accordions">
            <details open>
              <summary>The little details</summary>
              <p>{p.description}</p>
              <ul>
                {p.details.map((d) => (
                  <li key={d}>
                    {d.startsWith('Selected option:')
                      ? 'Selected pack / size: ' + v.label + '. Choose another option above.'
                      : d}
                  </li>
                ))}
              </ul>
            </details>
            <details>
              <summary>Origin, material & care</summary>
              <p>
                Origin: {p.origin}
                <br />
                Material / ingredients: {p.material}
                <br />
                {p.care}
              </p>
            </details>
            <details>
              <summary>Delivery & returns</summary>
              <p>
                Standard shipping is calculated at checkout. Items may arrive in separate packages.
                For an issue, request help within 7 days of delivery; eligibility depends on product
                type and condition.{' '}
                <Link className="text-link" href="/returns">
                  Read the policy
                </Link>
                .
              </p>
            </details>
          </div>
        </div>
      </div>
      <section className="review-section">
        <h2>Words from our customers.</h2>
        <div className="review-grid">
          <div>
            {reviews.length ? (
              reviews.map((r) => (
                <article className="review" key={r._id}>
                  <span className="rating-stars">
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(5 - r.rating)}
                  </span>
                  <h3>{r.title}</h3>
                  <p>{r.body}</p>
                  <small>
                    {r.name} · {formatDate(r.createdAt)}
                    {r.verified ? ' · Delivered purchase' : ''}
                  </small>
                </article>
              ))
            ) : (
              <p className="muted">No reviews yet. A little room for your story.</p>
            )}
          </div>
          <div className="panel">
            <h3>Share your experience</h3>
            {user ? (
              <form onSubmit={review}>
                <label className="field">
                  Your rating
                  <select name="rating" defaultValue="5">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} stars
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  A few words
                  <input name="title" required minLength={3} maxLength={100} />
                </label>
                <label className="field">
                  Your review
                  <textarea name="body" required minLength={10} maxLength={2000} />
                </label>
                <p className="muted small-text">
                  Available after a delivered purchase. Reviews are moderated before publication.
                </p>
                <button className="button small spaced" disabled={busy}>
                  {busy ? 'Submitting…' : 'Submit review'}
                </button>
              </form>
            ) : (
              <>
                <p className="muted small-text">Sign in to review a delivered purchase.</p>
                <Link
                  className="button small spaced"
                  href={'/account/login?next=' + encodeURIComponent('/products/' + p.slug)}
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
      {related.length > 0 && (
        <section className="discovery-section">
          <div className="section-title">
            <h2>A few more discoveries.</h2>
            <span className="title-rule" />
          </div>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
