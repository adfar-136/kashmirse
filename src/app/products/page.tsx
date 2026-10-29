import { getProducts, getCategories } from '@/entities/product/model/queries';
import { CatalogView } from '@/views/catalog/catalog';
export const metadata = { title: 'Explore Kashmir' };
export default async function Products({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; collection?: string }>;
}) {
  const [products, categories, params] = await Promise.all([
    getProducts(),
    getCategories(),
    searchParams,
  ]);
  return (
    <CatalogView
      products={products}
      categories={categories}
      query={params.q || ''}
      collection={
        ['top-picks', 'new-arrivals'].includes(params.collection || '') ? params.collection : ''
      }
    />
  );
}
