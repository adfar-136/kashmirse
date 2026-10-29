'use client';
import Link from 'next/link';
import { useState } from 'react';
import { optionHeading, sortedOptions, unitPrice } from '@/shared/lib/product-options';
import { Heart, ShoppingBag } from 'lucide-react';
import type { Product } from '@/shared/lib/types';
import { money } from '@/shared/lib/commerce';
import { Art } from '@/shared/ui/art';
import { useStore } from '@/shared/ui/store-provider';
export function ProductCard({ product: p }: { product: Product }) {
  const { add, wishlist, toggleWish } = useStore();
  const [selected, setSelected] = useState(
    p.variants.find((v) => v.stock > 0)?.id || p.variants[0].id,
  );
  const first = p.variants.find((v) => v.id === selected) || p.variants[0];
  return (
    <article className="product-card">
      <div className="product-image">
        <Link href={'/products/' + p.slug} aria-label={'View ' + p.name}>
          <Art image={p.image} alt={p.name} />
        </Link>
        <button
          className={`heart ${wishlist.includes(p._id) ? 'selected' : ''}`}
          aria-label={(wishlist.includes(p._id) ? 'Remove ' : 'Save ') + p.name}
          aria-pressed={wishlist.includes(p._id)}
          onClick={() => toggleWish(p._id)}
        >
          <Heart size={18} />
        </button>
        {p.newArrival && <span className="new-label">New</span>}
        {p.variants.every((v) => v.stock === 0) && (
          <span className="stock-label">Currently unavailable</span>
        )}
      </div>
      <div className="product-info">
        <Link href={'/products/' + p.slug}>
          <h3>{p.name}</h3>
        </Link>
        <p>{p.subtitle}</p>
        {p.variants.length > 1 ? (
          <label className="card-option">
            <span>{optionHeading(p)}</span>
            <select
              aria-label={optionHeading(p) + ' for ' + p.name}
              value={first.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {sortedOptions(p.variants).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} · {money(v.price)}
                  {v.stock === 0 ? ' · Sold out' : ''}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="card-pack">{first.label}</p>
        )}
        {unitPrice(p, first) && <p className="card-unit-price">{unitPrice(p, first)}</p>}
        <div className="product-bottom">
          <span className="price">{money(first.price)}</span>
          <button className="button small" onClick={() => add(p, first.id)} disabled={!first.stock}>
            <ShoppingBag size={15} />
            Add to Bag
          </button>
        </div>
      </div>
    </article>
  );
}
