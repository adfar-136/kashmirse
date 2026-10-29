import { getProducts, getSettings } from '@/entities/product/model/queries';
import { redirect } from 'next/navigation';
import { session } from '@/shared/lib/auth';
import { CheckoutView } from '@/features/checkout/checkout';
export const metadata = { title: 'Checkout' };
export default async function Checkout() {
  if (!(await session())) redirect('/account/login?next=/checkout');
  return <CheckoutView products={await getProducts()} settings={await getSettings()} />;
}
