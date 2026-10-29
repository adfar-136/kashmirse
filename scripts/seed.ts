import { MongoClient } from 'mongodb';
import { hash } from 'bcryptjs';
import { appendPurchaseOptions } from './purchase-options';
import { mergeSeedVariants } from './catalogue-migration';
import type { Product, Category, User, Order, Review } from '../src/shared/lib/types';
import { catalogueProducts, catalogueCategories } from './catalogue-data';
import { defaultSettings } from '../src/shared/lib/commerce';
const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017');
await client.connect();
const db = client.db(process.env.MONGODB_DB || 'kashmir_se');
const now = new Date().toISOString();
const beforeOrders = await db.collection('orders').countDocuments();
const beforeUsers = await db.collection('users').countDocuments();
let preservedOptions = 0;
let addedPurchaseOptions = 0;
const categories = catalogueCategories;
const products = catalogueProducts;
for (const c of categories)
  await db
    .collection<Category>('categories')
    .updateOne({ _id: c._id }, { $set: c }, { upsert: true });
for (const p of products) {
  const existing = await db
    .collection<Product & { catalogRevision?: number; optionRevision?: number }>('products')
    .findOne({ _id: p._id });
  if (!existing) {
    await db.collection<Product>('products').insertOne(p);
    continue;
  }
  // Migrate only owned seed records, preserving reserved stock, option IDs and review totals.
  // Existing customer orders remain immutable snapshots of the original purchase.
  if ((existing.catalogRevision || 0) < p.catalogRevision) {
    const variants = mergeSeedVariants(existing.variants, p.variants);
    preservedOptions += existing.variants.length;
    const { _id, rating, reviewCount, ...updates } = p;
    await db.collection<Product>('products').updateOne({ _id }, { $set: { ...updates, variants } });
  }
  if ((existing.optionRevision || 0) < (p.optionRevision || 0)) {
    const fresh = await db.collection<Product>('products').findOne({ _id: p._id });
    const variants = appendPurchaseOptions(fresh!.variants, p.variants);
    addedPurchaseOptions += variants.length - fresh!.variants.length;
    preservedOptions += fresh!.variants.length;
    await db
      .collection('products')
      .updateOne({ _id: p._id as never }, { $set: { variants, optionRevision: p.optionRevision } });
  }
}
await db.collection('products').createIndex({ slug: 1 }, { unique: true });
await db.collection('products').createIndex({ category: 1, active: 1 });
await db.collection('users').createIndex({ email: 1 }, { unique: true });
await db.collection('orders').createIndex({ userId: 1, createdAt: -1 });
await db.collection('orders').createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });
await db.collection('reviews').createIndex({ userId: 1, productId: 1 }, { unique: true });
await db.collection('auth_attempts').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const users: User[] = [
  {
    _id: 'demo-customer',
    name: 'Aarav Sharma',
    email: 'customer@kashmirse.local',
    passwordHash: await hash('KashmirSe123!', 12),
    role: 'customer',
    wishlist: ['kashmiri-saffron', 'copper-jug'],
    addresses: [
      {
        id: 'demo-address',
        name: 'Aarav Sharma',
        phone: '9876543210',
        line1: '12, Garden View Apartments',
        line2: 'Demo address',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
    ],
    createdAt: now,
  },
  {
    _id: 'demo-admin',
    name: 'Kashmir Se Admin',
    email: 'admin@kashmirse.local',
    passwordHash: await hash('KashmirSeAdmin123!', 12),
    role: 'admin',
    wishlist: [],
    addresses: [],
    createdAt: now,
  },
];
for (const u of users)
  await db
    .collection<User>('users')
    .updateOne({ _id: u._id }, { $setOnInsert: u }, { upsert: true });
await db
  .collection('settings')
  .updateOne({ _id: 'store' as never }, { $setOnInsert: defaultSettings }, { upsert: true });
await db.collection('coupons').updateOne(
  { _id: 'welcome10' as never },
  {
    $setOnInsert: {
      _id: 'welcome10',
      code: 'WELCOME10',
      type: 'percent',
      value: 10,
      minOrder: 999,
      maxDiscount: 500,
      active: true,
      expiresAt: '2027-12-31T23:59:59.000Z',
    },
  },
  { upsert: true },
);
await db.collection('coupons').createIndex({ code: 1 }, { unique: true });
for (let i = 0; i < 3; i++) {
  const p = products[i];
  const createdAt = new Date(Date.now() - (i + 2) * 86400000).toISOString();
  const status = (['delivered', 'shipped', 'processing'] as const)[i];
  const order: Order = {
    _id: `KS-DEMO-100${i + 1}`,
    userId: 'demo-customer',
    email: users[0].email,
    items: [
      {
        productId: p._id,
        variantId: p.variants[0].id,
        quantity: 1,
        name: p.name,
        variantLabel: p.variants[0].label,
        price: p.variants[0].price,
        image: p.image,
        slug: p.slug,
      },
    ],
    address: users[0].addresses[0],
    subtotal: p.variants[0].price,
    shipping: 99,
    discount: 0,
    total: p.variants[0].price + 99,
    coupon: '',
    paymentMethod: 'cod',
    paymentStatus: status === 'delivered' ? 'collected' : 'pending',
    status,
    history: [
      { status: 'confirmed', note: 'Sample order placed', at: createdAt },
      { status, note: 'Demonstration tracking update', at: now },
    ],
    tracking: status === 'shipped' ? 'DEMO-KS-1002' : '',
    createdAt,
  };
  await db
    .collection<Order>('orders')
    .updateOne({ _id: order._id }, { $setOnInsert: order }, { upsert: true });
}
const review: Review = {
  _id: 'demo-review',
  userId: 'demo-customer',
  productId: 'walnut-kernels',
  name: 'Aarav S. (sample)',
  rating: 5,
  title: 'A little taste of home',
  body: 'This is a sample review to demonstrate the review system. It is not a real customer endorsement.',
  approved: true,
  verified: true,
  createdAt: now,
};
await db
  .collection<Review>('reviews')
  .updateOne({ _id: review._id }, { $setOnInsert: review }, { upsert: true });
await db
  .collection<Product>('products')
  .updateOne({ _id: 'walnut-kernels' }, { $set: { rating: 5, reviewCount: 1 } });
if (
  (await db.collection('orders').countDocuments()) < beforeOrders ||
  (await db.collection('users').countDocuments()) < beforeUsers
)
  throw new Error('Existing records were lost');
console.log(
  `Preserved ${preservedOptions} existing inventory options, added ${addedPurchaseOptions} pack/size options and verified order/account counts.`,
);
await client.close();
console.log(
  `Seeded ${categories.length} categories, ${products.length} products, 2 local accounts, 3 sample orders, 1 sample review and WELCOME10. Existing accounts, orders, reserved stock and custom records preserved; owned catalogue records migrated to revision 2.`,
);
