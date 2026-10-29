import { notFound } from 'next/navigation';
import { getProducts, getCategories } from '@/entities/product/model/queries';
import { CatalogView } from '@/views/catalog/catalog';
export default async function Category({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const category = categories.find((c) => c._id === slug);
  if (!category) notFound();
  return <CatalogView products={products} categories={categories} category={category} />;
}
