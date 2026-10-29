import { redirect, notFound } from 'next/navigation';
import { session } from '@/shared/lib/auth';
import { collection } from '@/shared/lib/db';
import type { Order } from '@/shared/lib/types';
import { AccountView } from '@/views/account/account';
export const metadata = { title: 'Your account' };
export default async function Account({ params }: { params: Promise<{ section?: string[] }> }) {
  const slug = (await params).section?.join('/') || '';
  if (!['', 'orders', 'addresses', 'profile', 'support'].includes(slug)) notFound();
  const user = await session();
  if (!user)
    redirect('/account/login?next=' + encodeURIComponent('/account' + (slug ? '/' + slug : '')));
  const orders = await (
    await collection<Order>('orders')
  )
    .find({ userId: user._id })
    .sort({ createdAt: -1 })
    .toArray();
  return <AccountView initialUser={user} orders={orders} section={slug} />;
}
