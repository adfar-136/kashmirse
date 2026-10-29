import { collection } from '@/shared/lib/db';
import { defaultSettings } from '@/shared/lib/commerce';
import type { Product, Category, Review, Settings } from '@/shared/lib/types';
export async function getProducts() {
  return (await collection<Product>('products'))
    .find({ active: true })
    .sort({ featured: -1, createdAt: 1 })
    .toArray();
}
export async function getProduct(slug: string) {
  return (await collection<Product>('products')).findOne({ slug, active: true });
}
export async function getCategories() {
  return (await collection<Category>('categories')).find({}).toArray();
}
export async function getReviews(id: string) {
  return (await collection<Review>('reviews'))
    .find({ productId: id, approved: true })
    .sort({ createdAt: -1 })
    .toArray();
}
export async function getSettings() {
  return (
    (await (await collection<Settings>('settings')).findOne({ _id: 'store' })) || defaultSettings
  );
}
