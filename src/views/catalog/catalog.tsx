'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Product, Category } from '@/shared/lib/types';
import { ProductCard } from '@/entities/product/ui/product-card';
import { Art } from '@/shared/ui/art';
import { useStore } from '@/shared/ui/store-provider';
export function CatalogView({
  products,
  categories,
  category,
  query = '',
  wishlistOnly = false,
  collection = '',
}: {
  products: Product[];
  categories: Category[];
  category?: Category;
  query?: string;
  wishlistOnly?: boolean;
  collection?: string;
}) {
  const [selected, setSelected] = useState(category ? category._id : '');
  const [sort, setSort] = useState('featured');
  const [max, setMax] = useState('');
  const [inStock, setInStock] = useState(false);
  const { wishlist } = useStore();
  const filtered = useMemo(
    () =>
      products
        .filter(
          (p) =>
            (!selected || p.category === selected) &&
            (collection !== 'top-picks' || p.topPick) &&
            (collection !== 'new-arrivals' || p.newArrival) &&
            (!wishlistOnly || wishlist.includes(p._id)) &&
            (!query ||
              (
                p.name +
                ' ' +
                p.subtitle +
                ' ' +
                p.category +
                ' ' +
                (p.category === 'dry-fruits' ? 'akhrot badam nuts' : '') +
                ' ' +
                (p.category === 'clothing' ? 'phiran pheran suit' : '')
              )
                .toLowerCase()
                .includes(query.toLowerCase())) &&
            (!max || Math.min(...p.variants.map((v) => v.price)) <= Number(max)) &&
            (!inStock || p.variants.some((v) => v.stock > 0)),
        )
        .sort((a, b) =>
          sort === 'price-low'
            ? a.variants[0].price - b.variants[0].price
            : sort === 'price-high'
              ? b.variants[0].price - a.variants[0].price
              : sort === 'name'
                ? a.name.localeCompare(b.name)
                : sort === 'newest'
                  ? b.createdAt.localeCompare(a.createdAt)
                  : Number(b.featured) - Number(a.featured),
        ),
    [products, selected, sort, max, inStock, query, wishlistOnly, wishlist, collection],
  );
  return (
    <div className="page-width">
      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <span>{wishlistOnly ? 'Wishlist' : category?.name || 'All products'}</span>
      </div>
      <div className="page-heading">
        <p className="eyebrow">A little closer to Kashmir</p>
        <h1>
          {wishlistOnly
            ? 'Your little favourites.'
            : query
              ? `Searching for “${query}”`
              : collection === 'top-picks'
                ? 'Kashmir Se top picks.'
                : collection === 'new-arrivals'
                  ? 'New little discoveries.'
                  : category?.name || 'Explore Kashmir.'}
        </h1>
        <p>
          {wishlistOnly
            ? 'Keep the things you love close. Your saved collection is right here.'
            : category?.description ||
              'Discover flavours, threads and beautiful everyday things from the valley.'}
        </p>
      </div>
      <div className="catalog-layout">
        <aside className="filters" aria-label="Product filters">
          <h3>Refine your collection</h3>
          <div className="filter-group">
            <h3>Categories</h3>
            <label>
              <input
                type="radio"
                name="category"
                checked={!selected}
                onChange={() => setSelected('')}
              />
              All products
            </label>
            {categories.map((c) => (
              <label key={c._id}>
                <input
                  type="radio"
                  name="category"
                  checked={selected === c._id}
                  onChange={() => setSelected(c._id)}
                />
                {c.name}
              </label>
            ))}
          </div>
          <div className="filter-group">
            <h3>Price & availability</h3>
            <label htmlFor="max-price">Maximum price (₹)</label>
            <input
              id="max-price"
              type="number"
              min="0"
              value={max}
              placeholder="Any price"
              style={{ width: '100%' }}
              onChange={(e) => setMax(e.target.value)}
            />
            <label>
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
              />
              In stock only
            </label>
            <button
              className="text-link"
              style={{ background: 'none', border: 0, fontSize: 11 }}
              onClick={() => {
                setSelected('');
                setMax('');
                setInStock(false);
              }}
            >
              Clear filters
            </button>
          </div>
        </aside>
        <div>
          <div className="catalog-toolbar">
            <span>
              {filtered.length} {filtered.length === 1 ? 'treasure' : 'treasures'} to discover
            </span>
            <label>
              Sort by{' '}
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="newest">Newest first</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
          {filtered.length ? (
            <div className="product-grid">
              {filtered.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>
                {wishlistOnly ? 'A little room for favourites.' : 'No treasures found just yet.'}
              </h2>
              <p>
                {wishlistOnly
                  ? 'Tap the heart on a product to save it here.'
                  : 'Try a different search or clear your filters.'}
              </p>
              <Link className="button" href="/products">
                Browse all products →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export function CategoriesView({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  return (
    <div className="page-width">
      <div className="page-heading">
        <p className="eyebrow">The many sides of the valley</p>
        <h1>Find your piece of Kashmir.</h1>
        <p>Something for your kitchen, your wardrobe, your home—and someone you love.</p>
      </div>
      <div className="category-directory">
        {categories.map((c) => (
          <Link href={'/categories/' + c._id} key={c._id} className="directory-card">
            <Art image={c.image} alt={c.name} />
            <div>
              <h2>{c.name}</h2>
              <p>{c.description}</p>
              <span className="eyebrow">
                {products.filter((p) => p.category === c._id).length} products · Explore →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
