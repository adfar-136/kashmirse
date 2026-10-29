import Link from 'next/link';
import { Art } from '@/shared/ui/art';
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <Link className="footer-brand" href="/">
            Kashmir Se
          </Link>
          <p>
            A little of the valley.
            <br />A little closer to home.
          </p>
          <span className="eyebrow">Thoughtfully chosen. Rooted in Kashmir.</span>
        </div>
        <div>
          <h3>Discover</h3>
          <Link href="/categories">All categories</Link>
          <Link href="/gifts">Thoughtful gifts</Link>
          <Link href="/makers">Our makers</Link>
          <Link href="/journal">The Kashmir journal</Link>
        </div>
        <div>
          <h3>Here to help</h3>
          <Link href="/track">Track your order</Link>
          <Link href="/help">Help & FAQs</Link>
          <Link href="/shipping">Shipping & delivery</Link>
          <Link href="/returns">Returns & refunds</Link>
          <Link href="/contact">Contact us</Link>
        </div>
        <div>
          <h3>Our little store</h3>
          <Link href="/about">Our story</Link>
          <Link href="/bulk">Bulk & custom orders</Link>
          <Link href="/account">Your account</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms of purchase</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Kashmir Se</span>
        <span>
          Local demonstration store · Seeded catalogue & illustrative reference imagery · No live
          payments
        </span>
      </div>
      <Art image="bottom" className="footer-flowers" />
    </footer>
  );
}
