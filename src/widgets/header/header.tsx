'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRound, Heart, ShoppingBag, Search, Menu, X, ChevronDown } from 'lucide-react';
import { Art } from '@/shared/ui/art';
import { useStore } from '@/shared/ui/store-provider';
import type { Category } from '@/shared/lib/types';
export function Header({ categories }: { categories: Category[] }) {
  const { cart, wishlist, user } = useStore();
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(false);
  const router = useRouter();
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Art image="corner" className="header-corner" />
        <Link href="/" className="brand" aria-label="Kashmir Se home">
          <Art image="flower" />
          <span>
            Kashmir Se<small>FROM KASHMIR TO EVERY HOME</small>
          </span>
        </Link>
        <form
          className="search-form"
          action="/products"
          onSubmit={(e) => {
            e.preventDefault();
            router.push('/products?q=' + encodeURIComponent(query));
          }}
        >
          <Search size={19} />
          <input
            name="q"
            aria-label="Search products"
            placeholder="Search for dry fruits, saffron, shawls, home decor and more…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" aria-label="Submit search">
            <span className="mobile-only">Search</span>
            <span className="desktop-only">↵</span>
          </button>
        </form>
        <div className="header-actions">
          <Link href={user?.role === 'admin' ? '/admin' : '/account'}>
            <UserRound />
            <span>{user ? user.name.split(' ')[0] : 'Account'}</span>
          </Link>
          <Link href="/wishlist">
            <Heart />
            <span>Wishlist</span>
            {wishlist.length > 0 && <b>{wishlist.length}</b>}
          </Link>
          <Link href="/cart">
            <ShoppingBag />
            <span>Bag</span>
            {cart.length > 0 && <b>{cart.reduce((s, l) => s + l.quantity, 0)}</b>}
          </Link>
          <button
            className="menu-toggle"
            aria-label="Toggle category menu"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
        <Art image="corner" className="header-corner right" />
      </header>
      <nav className={`category-nav ${menu ? 'open' : ''}`} aria-label="Product categories">
        {categories.slice(0, 8).map((c) => (
          <Link href={'/categories/' + c._id} key={c._id} onClick={() => setMenu(false)}>
            {c.name}
            <ChevronDown size={12} />
          </Link>
        ))}
        <div className="more-nav">
          <Link href="/categories">
            More <ChevronDown size={12} />
          </Link>
          <div className="more-dropdown">
            {categories.slice(8).map((c) => (
              <Link href={'/categories/' + c._id} key={c._id}>
                {c.name}
              </Link>
            ))}
            <Link href="/categories">All categories →</Link>
          </div>
        </div>
      </nav>
    </>
  );
}
