import { getProducts, getSettings } from '@/entities/product/model/queries';
import { CartView } from '@/features/cart/cart-view';
export const metadata = { title: 'Your bag' };
export default async function Cart() {
  return <CartView products={await getProducts()} settings={await getSettings()} />;
}
