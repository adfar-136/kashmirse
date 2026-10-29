import { getProducts, getCategories } from '@/entities/product/model/queries';
import { CatalogView } from '@/views/catalog/catalog';
export const metadata = { title: 'Your wishlist' };
export default async function Wishlist() {
  return (
    <CatalogView products={await getProducts()} categories={await getCategories()} wishlistOnly />
  );
}
