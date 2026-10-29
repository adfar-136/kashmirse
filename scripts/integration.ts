import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { MongoClient } from 'mongodb';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const origin = new URL(base).origin;
const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017');
await client.connect();
const database = client.db(process.env.MONGODB_DB || 'kashmir_se');
const createdUsers: string[] = [];
const createdProducts: string[] = [];
const createdOrders: string[] = [];
const createdUploads: string[] = [];
let checks = 0;
async function request(
  path: string,
  {
    method = 'GET',
    body,
    cookie = '',
    raw = false,
    expected = 200,
  }: { method?: string; body?: unknown; cookie?: string; raw?: boolean; expected?: number } = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: ${response.status} ${await response.clone().text()}`,
  );
  checks++;
  if (raw) return { response, data: null as any, cookie: '' };
  const data = await response.json();
  return { response, data, cookie: (response.headers.get('set-cookie') || '').split(';')[0] };
}
try {
  await request('/api/health');
  const { data: catalog } = await request('/api/products');
  assert.ok(catalog.products.length >= 56);
  assert.equal(catalog.categories.length, 12);
  await request('/api/admin/overview', { expected: 401 });
  await request('/api/orders', { expected: 401 });
  const { cookie: admin } = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@kashmirse.local', password: 'KashmirSeAdmin123!' },
  });
  const imageForm = new FormData();
  imageForm.set(
    'file',
    new File(
      [
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jOioAAAAASUVORK5CYII=',
          'base64',
        ),
      ],
      'test.png',
      { type: 'image/png' },
    ),
  );
  const upload = await fetch(base + '/api/admin/upload', {
    method: 'POST',
    headers: { Cookie: admin, Origin: origin },
    body: imageForm,
  });
  assert.equal(upload.status, 200);
  const uploaded = await upload.json();
  createdUploads.push(uploaded.path.split('/').pop());
  checks++;
  const photo = await fetch(base + uploaded.path);
  assert.equal(photo.status, 200);
  assert.equal(photo.headers.get('content-type'), 'image/png');
  checks++;
  const invalidForm = new FormData();
  invalidForm.set(
    'file',
    new File(['<script>invalid</script>'], 'test.png', { type: 'image/png' }),
  );
  const invalidUpload = await fetch(base + '/api/admin/upload', {
    method: 'POST',
    headers: { Cookie: admin, Origin: origin },
    body: invalidForm,
  });
  assert.equal(invalidUpload.status, 400);
  checks++;
  const stamp = randomUUID().slice(0, 8);
  const register = async (n: number) => {
    const { data, cookie } = await request('/api/auth/register', {
      method: 'POST',
      body: {
        email: `integration-${stamp}-${n}@example.test`,
        password: 'TestPass123!',
        name: 'Integration Customer ' + n,
      },
    });
    createdUsers.push(data.user._id);
    assert.equal(data.user.passwordHash, undefined);
    return cookie;
  };
  const customer = await register(1);
  const other = await register(2);
  await request('/api/admin/overview', { cookie: customer, expected: 403 });
  await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'nobody@example.test', password: 'WrongPass123!' },
    expected: 401,
  });
  const original = catalog.products.find((p: any) => p._id === 'walnut-kernels');
  const { _id, slug, rating, reviewCount, createdAt, ...fields } = original;
  fields.name = 'Integration Test Product ' + stamp;
  fields.featured = false;
  fields.variants = [
    { id: randomUUID(), label: 'Test pack', price: 699, stock: 8, sku: 'INTEGRATION-' + stamp },
  ];
  const {
    data: { item: product },
  } = await request('/api/admin/products', { method: 'POST', cookie: admin, body: fields });
  createdProducts.push(product._id);
  const address = {
    name: 'Integration Customer',
    phone: '9876543210',
    line1: '12 Test Street',
    line2: 'Test only',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
  };
  const payload = {
    items: [{ productId: product._id, variantId: product.variants[0].id, quantity: 2, price: 1 }],
    address,
    paymentMethod: 'demo',
    coupon: 'WELCOME10',
    idempotencyKey: randomUUID(),
  };
  const {
    data: { order },
  } = await request('/api/orders', {
    method: 'POST',
    cookie: customer,
    body: payload,
    expected: 201,
  });
  createdOrders.push(order._id);
  assert.equal(order.subtotal, 1398);
  assert.equal(order.discount, 140);
  assert.equal(order.total, 1357);
  assert.equal(order.items[0].price, 699);
  assert.match(order.paymentStatus, /no money charged/);
  const stock = async () =>
    ((await database.collection('products').findOne({ _id: product._id as never })) as any)
      .variants[0].stock;
  assert.equal(await stock(), 6);
  const replay = await request('/api/orders', { method: 'POST', cookie: customer, body: payload });
  assert.equal(replay.data.order._id, order._id);
  assert.equal(await stock(), 6);
  await request('/api/orders/' + order._id, { cookie: other, expected: 404 });
  await request('/api/orders/' + order._id, {
    method: 'PATCH',
    cookie: customer,
    body: { status: 'shipped' },
    expected: 403,
  });
  await request('/api/orders/' + order._id, {
    method: 'PATCH',
    cookie: customer,
    body: { status: 'cancelled' },
  });
  assert.equal(await stock(), 8);
  await request('/api/orders/' + order._id, {
    method: 'PATCH',
    cookie: customer,
    body: { status: 'cancelled' },
    expected: 409,
  });
  assert.equal(await stock(), 8);
  await request('/api/orders', {
    method: 'POST',
    cookie: customer,
    body: {
      ...payload,
      idempotencyKey: randomUUID(),
      items: [{ ...payload.items[0], quantity: 10 }],
      coupon: '',
    },
    expected: 409,
  });
  await request('/api/orders', {
    method: 'POST',
    cookie: customer,
    body: { ...payload, idempotencyKey: randomUUID(), address: { ...address, pincode: '123' } },
    expected: 400,
  });
  const fulfilled = await request('/api/orders', {
    method: 'POST',
    cookie: customer,
    body: { ...payload, idempotencyKey: randomUUID(), coupon: '' },
    expected: 201,
  });
  const fulfilledId = fulfilled.data.order._id;
  createdOrders.push(fulfilledId);
  await request('/api/orders/' + fulfilledId, {
    method: 'PATCH',
    cookie: admin,
    body: { status: 'delivered' },
    expected: 409,
  });
  for (const status of ['processing', 'shipped', 'delivered'])
    await request('/api/orders/' + fulfilledId, {
      method: 'PATCH',
      cookie: admin,
      body: { status, tracking: 'TEST-TRACK' },
    });
  await request('/api/orders/' + fulfilledId, {
    method: 'PATCH',
    cookie: customer,
    body: { status: 'cancelled' },
    expected: 409,
  });
  await request('/api/orders/' + fulfilledId, {
    method: 'PATCH',
    cookie: customer,
    body: { returnReason: 'Test only: checking the return request workflow.' },
  });
  await request('/api/orders/' + fulfilledId, {
    method: 'PATCH',
    cookie: admin,
    body: { returnStatus: 'refunded' },
    expected: 409,
  });
  await request('/api/orders/' + fulfilledId, {
    method: 'PATCH',
    cookie: admin,
    body: { returnStatus: 'approved' },
  });
  await request('/api/orders/' + fulfilledId, {
    method: 'PATCH',
    cookie: admin,
    body: { returnStatus: 'refunded' },
  });
  await request('/api/reviews', {
    method: 'POST',
    cookie: other,
    body: {
      productId: product._id,
      rating: 5,
      title: 'Test review',
      body: 'This is only an automated test review.',
    },
    expected: 403,
  });
  await request('/api/reviews', {
    method: 'POST',
    cookie: customer,
    body: {
      productId: product._id,
      rating: 5,
      title: 'Test review',
      body: 'This is only an automated test review.',
    },
  });
  const { data: reviewData } = await request('/api/admin/reviews', { cookie: admin });
  const review = reviewData.items.find((r: any) => r.productId === product._id);
  assert.equal(review.approved, false);
  await request('/api/admin/reviews', {
    method: 'PATCH',
    cookie: admin,
    body: { id: review._id, approved: true },
  });
  await request('/api/account', {
    method: 'PATCH',
    cookie: customer,
    body: { addresses: [address], wishlist: [product._id] },
  });
  const account = await request('/api/account', { cookie: customer });
  assert.equal(account.data.user.wishlist[0], product._id);
  assert.equal(account.data.user.addresses.length, 1);
  assert.equal(account.data.user.passwordHash, undefined);
  const noOrigin = await fetch(base + '/api/account', {
    method: 'PATCH',
    headers: { Cookie: customer, 'Content-Type': 'application/json' },
    body: '{"name":"Bad Origin"}',
  });
  assert.equal(noOrigin.status, 403);
  checks++;
  await request('/api/coupons/validate', {
    method: 'POST',
    body: { code: 'WELCOME10', subtotal: 100 },
    expected: 400,
  });
  await request('/api/coupons/validate', {
    method: 'POST',
    body: { code: 'WELCOME10', subtotal: 1500 },
  });
  // A single remaining unit can only be purchased once under concurrent requests.
  await database
    .collection('products')
    .updateOne({ _id: product._id as never }, { $set: { 'variants.0.stock': 1 } });
  const concurrent = await Promise.all(
    [1, 2].map(() =>
      fetch(base + '/api/orders', {
        method: 'POST',
        headers: { Cookie: customer, Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          coupon: '',
          idempotencyKey: randomUUID(),
          items: [{ ...payload.items[0], quantity: 1 }],
        }),
      }),
    ),
  );
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 409]);
  for (const response of concurrent) {
    const d = await response.json();
    if (d.order) createdOrders.push(d.order._id);
  }
  assert.equal(await stock(), 0);
  checks++;
  await database
    .collection('products')
    .updateOne({ _id: product._id as never }, { $set: { 'variants.0.stock': 2 } });
  await request('/api/orders', {
    method: 'POST',
    body: {
      ...payload,
      email: `guest-${stamp}@example.test`,
      coupon: '',
      idempotencyKey: randomUUID(),
      items: [{ ...payload.items[0], quantity: 1 }],
    },
    expected: 401,
  });
  assert.equal(await stock(), 2);
  const checkoutRedirect = await fetch(base + '/checkout', { redirect: 'manual' });
  assert.ok([200, 307].includes(checkoutRedirect.status));
  if (checkoutRedirect.status === 307)
    assert.match(checkoutRedirect.headers.get('location') || '', /account\/login\?next=\/checkout/);
  else {
    const page = await checkoutRedirect.text();
    assert.ok(page.includes('__next-page-redirect'));
    assert.ok(page.includes('/account/login?next=/checkout'));
    assert.ok(!page.includes('Save this address for my next order'));
  }
  checks++;
  await request('/checkout', { cookie: customer, raw: true });
  await request('/api/orders', {
    method: 'POST',
    cookie: customer,
    body: {
      ...payload,
      coupon: '',
      addressId: 'another-customers-address',
      saveAddress: true,
      idempotencyKey: randomUUID(),
      items: [{ ...payload.items[0], quantity: 1 }],
    },
    expected: 400,
  });
  const nextAddress = {
    ...address,
    line1: '45 Another Test Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
  };
  const addressPayload = {
    ...payload,
    email: 'untrusted@example.test',
    address: nextAddress,
    saveAddress: true,
    coupon: '',
    idempotencyKey: randomUUID(),
    items: [{ ...payload.items[0], quantity: 1 }],
  };
  const saved = await request('/api/orders', {
    method: 'POST',
    cookie: customer,
    body: addressPayload,
    expected: 201,
  });
  createdOrders.push(saved.data.order._id);
  assert.notEqual(saved.data.order.email, 'untrusted@example.test');
  const addresses = await request('/api/account', { cookie: customer });
  assert.equal(addresses.data.user.addresses.length, 2);
  assert.equal(addresses.data.user.addresses[1].line1, nextAddress.line1);
  assert.ok(addresses.data.user.addresses[1].id);
  await request('/api/orders', { method: 'POST', cookie: customer, body: addressPayload });
  const replayAddresses = await request('/api/account', { cookie: customer });
  assert.equal(replayAddresses.data.user.addresses.length, 2);
  assert.equal(await stock(), 1);
  const editAddress = { ...nextAddress, line2: 'Updated landmark' };
  const edited = await request('/api/orders', {
    method: 'POST',
    cookie: customer,
    body: {
      ...addressPayload,
      address: editAddress,
      addressId: addresses.data.user.addresses[1].id,
      idempotencyKey: randomUUID(),
    },
    expected: 201,
  });
  createdOrders.push(edited.data.order._id);
  const editedAccount = await request('/api/account', { cookie: customer });
  assert.equal(editedAccount.data.user.addresses.length, 2);
  assert.equal(editedAccount.data.user.addresses[1].line2, 'Updated landmark');
  await request('/api/orders/' + saved.data.order._id, { cookie: other, expected: 404 });
  const collections = await request('/api/products');
  assert.ok(collections.data.products.length >= 78);
  const seeded = collections.data.products.filter((p: any) => p.catalogRevision === 2);
  assert.equal(seeded.length, 78);
  assert.equal(new Set(seeded.map((p: any) => p.image)).size, 78);
  for (const category of collections.data.categories) {
    assert.ok(
      collections.data.products.filter((p: any) => p.category === category._id).length >= 6,
    );
    await request('/catalog/' + category._id + '.webp', { raw: true });
  }
  await request('/products?collection=top-picks', { raw: true });
  await request('/products?collection=new-arrivals', { raw: true });
  const weighted = catalog.products.find((p: any) => p._id === 'walnut-kernels');
  const small = weighted.variants.find((v: any) => v.label === '100 g');
  const large = weighted.variants.find((v: any) => v.label === '500 g');
  assert.ok(small && large);
  checks++;
  const weightedOrder = (
    await request('/api/orders', {
      method: 'POST',
      cookie: customer,
      expected: 201,
      body: {
        items: [
          { productId: weighted._id, variantId: small.id, quantity: 2 },
          { productId: weighted._id, variantId: large.id, quantity: 1 },
        ],
        address,
        paymentMethod: 'cod',
        idempotencyKey: randomUUID(),
      },
    })
  ).data.order;
  createdOrders.push(weightedOrder._id);
  assert.equal(weightedOrder.subtotal, small.price * 2 + large.price);
  assert.equal(weightedOrder.items[0].variantLabel, '100 g');
  assert.equal(weightedOrder.items[1].variantLabel, '500 g');
  checks += 3;
  await request('/api/orders/' + weightedOrder._id, {
    method: 'PATCH',
    cookie: customer,
    body: { status: 'cancelled' },
  });

  const pages = [
    '/',
    '/products',
    '/categories',
    '/categories/dry-fruits',
    '/products/walnut-kernels',
    '/wishlist',
    '/cart',
    '/account/login',
    '/about',
    '/contact',
    '/bulk',
    '/help',
    '/shipping',
    '/returns',
    '/privacy',
    '/terms',
    '/makers',
    '/journal',
    '/journal/a-cup-of-kahwa',
    '/track',
  ];
  for (const path of pages) await request(path, { raw: true });
  for (const path of [
    '/account',
    '/account/orders',
    '/account/addresses',
    '/account/profile',
    '/account/support',
    '/account/orders/' + order._id,
  ])
    await request(path, { cookie: customer, raw: true });
  for (const path of [
    '/admin',
    '/admin/products',
    '/admin/orders',
    '/admin/inventory',
    '/admin/customers',
    '/admin/categories',
    '/admin/coupons',
    '/admin/reviews',
    '/admin/enquiries',
    '/admin/settings',
  ])
    await request(path, { cookie: admin, raw: true });
  await request('/api/auth/logout', { method: 'POST', cookie: customer, body: {} });
  console.log(`PASS: ${checks} API, access-control, stock concurrency and page checks.`);
} finally {
  await database.collection('mail_outbox').deleteMany({
    $or: [
      {
        key: {
          $in: createdOrders.flatMap((id) =>
            [
              'order received',
              'awaiting payment',
              'payment confirmed',
              'cancelled',
              'processing',
              'shipped',
              'delivered',
              'return requested',
              'return approved',
              'return declined',
              'return refunded',
            ].flatMap((e) => [`order:${id}:${e}`, `owner:${id}:${e}`]),
          ),
        },
      },
    ],
  });
  await database.collection('orders').deleteMany({ _id: { $in: createdOrders } as never });
  await database.collection('reviews').deleteMany({ productId: { $in: createdProducts } });
  await database.collection('products').deleteMany({ _id: { $in: createdProducts } as never });
  await database.collection('users').deleteMany({ _id: { $in: createdUsers } as never });
  for (const name of createdUploads)
    await unlink(join(process.cwd(), '.data', 'uploads', name)).catch(() => {});
  await client.close();
}
