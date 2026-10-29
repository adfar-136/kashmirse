import { redirect, notFound } from 'next/navigation';
import { session } from '@/shared/lib/auth';
import { collection } from '@/shared/lib/db';
import { getCategories, getSettings } from '@/entities/product/model/queries';
import type { Product, Order, User, Review, Coupon } from '@/shared/lib/types';
import { AdminView } from '@/views/admin/admin';
export const metadata = { title: 'Store dashboard' };
export default async function Admin({ params }: { params: Promise<{ section?: string[] }> }) {
  const section = (await params).section?.join('/') || '';
  if (
    ![
      '',
      'products',
      'orders',
      'inventory',
      'customers',
      'categories',
      'coupons',
      'reviews',
      'enquiries',
      'settings',
      'notifications',
    ].includes(section)
  )
    notFound();
  const u = await session();
  if (!u)
    redirect(
      '/account/login?next=' + encodeURIComponent('/admin' + (section ? '/' + section : '')),
    );
  if (u.role !== 'admin') redirect('/account');
  const [products, orders, users, categories, reviews, coupons, enquiries, settings] =
    await Promise.all([
      (await collection<Product>('products')).find({}).sort({ createdAt: 1 }).toArray(),
      (await collection<Order>('orders')).find({}).sort({ createdAt: -1 }).toArray(),
      (await collection<User>('users')).find({}, { projection: { passwordHash: 0 } }).toArray(),
      getCategories(),
      (await collection<Review>('reviews')).find({}).toArray(),
      (await collection<Coupon>('coupons')).find({}).toArray(),
      (
        await collection<{
          _id: string;
          name: string;
          email: string;
          type: string;
          subject: string;
          message: string;
          status: string;
          createdAt: string;
        }>('enquiries')
      )
        .find({})
        .sort({ createdAt: -1 })
        .toArray(),
      getSettings(),
    ]);
  return (
    <AdminView
      section={section}
      products={products}
      orders={orders}
      users={users}
      categories={categories}
      reviews={reviews}
      coupons={coupons}
      enquiries={enquiries}
      settings={settings}
    />
  );
}
