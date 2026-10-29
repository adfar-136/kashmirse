import { redirect, notFound } from 'next/navigation';
import { orderIdentity } from '@/shared/lib/auth';
import { collection } from '@/shared/lib/db';
import type { Order } from '@/shared/lib/types';
import { getProducts } from '@/entities/product/model/queries';
import { OrderView } from '@/views/account/account';
export const metadata = { title: 'Order details' };
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { id } = await params;
  const u = await orderIdentity();
  if (!u) redirect('/account/login?next=' + encodeURIComponent('/account/orders/' + id));
  const order = await (
    await collection<Order>('orders')
  ).findOne({ _id: id, ...(u.role === 'admin' ? {} : { userId: u._id }) });
  if (!order) notFound();
  return (
    <OrderView
      initialOrder={order}
      products={await getProducts()}
      placed={(await searchParams).placed === '1'}
    />
  );
}
