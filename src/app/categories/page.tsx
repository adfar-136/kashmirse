import { getProducts, getCategories } from '@/entities/product/model/queries';
import { CategoriesView } from '@/views/catalog/catalog';
export const metadata = { title: 'All categories' };
export default async function Categories() {
  return <CategoriesView products={await getProducts()} categories={await getCategories()} />;
}
