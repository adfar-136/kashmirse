'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="empty-state">
      <h1>A little pause.</h1>
      <p>We couldn’t load this page. Check that local MongoDB is running and try again.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
