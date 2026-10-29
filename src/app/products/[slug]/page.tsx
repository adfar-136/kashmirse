import { notFound } from 'next/navigation';
import {
  getProduct,
  getProducts,
  getCategories,
  getReviews,
} from '@/entities/product/model/queries';
import { ProductView } from '@/views/product/product';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProduct((await params).slug);
  return { title: p?.name || 'Product not found' };
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const [products, categories, reviews] = await Promise.all([
    getProducts(),
    getCategories(),
    getReviews(p._id),
  ]);
  return (
    <ProductView
      product={p}
      reviews={reviews}
      related={products.filter((v) => v.category === p.category && v._id !== p._id).slice(0, 4)}
      category={categories.find((c) => c._id === p.category)}
    />
  );
}
