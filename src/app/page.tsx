import { getProducts, getCategories } from '@/entities/product/model/queries';
import { HomeView } from '@/views/storefront/home';
export default async function Home() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return <HomeView products={products} categories={categories} />;
}
