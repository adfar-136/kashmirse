import { notFound } from 'next/navigation';
import { ContentView, validPages } from '@/views/content/content';
import { getSettings } from '@/entities/product/model/queries';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: (await params).slug.replaceAll('-', ' ') };
}
export default async function Content({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!validPages.includes(slug)) notFound();
  return <ContentView slug={slug} settings={await getSettings()} />;
}
