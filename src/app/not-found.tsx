import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="empty-state">
      <span className="eyebrow">404 · A little off the path</span>
      <h1>Let’s find your way home.</h1>
      <p>The page or product you’re looking for isn’t here.</p>
      <Link href="/products" className="button">
        Explore Kashmir →
      </Link>
    </div>
  );
}
