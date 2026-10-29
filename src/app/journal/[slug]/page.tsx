import Link from 'next/link';
import { notFound } from 'next/navigation';
import { articles } from '@/views/content/content';
import { Art } from '@/shared/ui/art';
export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = articles.find((a) => a.slug === slug);
  if (!a) notFound();
  return (
    <article className="content-width">
      <div className="breadcrumb">
        <Link href="/journal">The Kashmir journal</Link>
        <span>/</span>
        <span>A little guide</span>
      </div>
      <div className="content-hero">
        <div>
          <p className="eyebrow">Notes from the valley</p>
          <h1>{a.title}</h1>
          <p>{a.intro}</p>
        </div>
        <Art image={a.image} />
      </div>
      <div className="prose">
        {a.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <Link href="/products" className="button spaced">
          Discover the collection →
        </Link>
      </div>
    </article>
  );
}
