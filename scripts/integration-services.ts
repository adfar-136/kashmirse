import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { MongoClient } from 'mongodb';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const client = await new MongoClient(
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
).connect();
const db = client.db(process.env.MONGODB_DB || 'kashmir_se');
const stamp = randomUUID();
const email = `services-${stamp}@example.test`;
let userId = '';
const orders: string[] = [];
let checks = 0;
let reserved = false;
let product: any;
async function call(path: string, method = 'GET', body?: unknown, cookie = '', status = 200) {
  const r = await fetch(base + path, {
    method,
    headers: {
      Origin: base,
      'x-forwarded-for': stamp,
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  assert.equal(r.status, status, `${path}: ${await r.clone().text()}`);
  checks++;
  return { data: await r.json(), cookie: (r.headers.get('set-cookie') || '').split(';')[0] };
}
try {
  const registration = await call('/api/auth/register', 'POST', {
    email,
    name: 'Service Test',
    password: 'TestPass123!',
  });
  const customer = registration.cookie;
  userId = registration.data.user._id;
  const admin = (
    await call('/api/auth/login', 'POST', {
      email: 'admin@kashmirse.local',
      password: 'KashmirSeAdmin123!',
    })
  ).cookie;
  await call('/api/notifications', 'GET', undefined, customer, 403);
  await call('/api/delivery/webhook', 'POST', { awb: 'fake' }, '', 401);
  for (const path of [
    '/admin/notifications',
    '/account/forgot-password',
    '/account/reset-password?token=invalid',
  ]) {
    const r = await fetch(base + path, { headers: { Cookie: admin } });
    assert.equal(r.status, 200);
    checks++;
  }
  await call('/api/delivery?pincode=110001', 'GET', undefined, '', 401);
  await call('/api/delivery?pincode=000000', 'GET', undefined, customer, 400);
  const quote = (await call('/api/delivery?pincode=110001&cod=1', 'GET', undefined, customer)).data;
  assert.equal(quote.mode, 'simulation');
  assert.equal(quote.serviceable, true);
  checks += 2;
  product = await db.collection('products').findOne({ active: true, 'variants.stock': { $gt: 2 } });
  const variant = product.variants.find((v: any) => v.stock > 2);
  const address = {
    name: 'Service Test',
    phone: '9876543210',
    line1: '12 Test Road',
    line2: '',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
  };
  const order = (
    await call(
      '/api/orders',
      'POST',
      {
        items: [{ productId: product._id, variantId: variant.id, quantity: 1 }],
        address,
        paymentMethod: 'upi',
        idempotencyKey: randomUUID(),
      },
      customer,
      201,
    )
  ).data.order;
  orders.push(order._id);
  reserved = true;
  assert.equal(order.paymentStatus, 'pending');
  checks++;
  await call('/api/shipments/' + order._id, 'POST', { action: 'book' }, customer, 403);
  await call('/api/shipments/' + order._id, 'POST', { action: 'book' }, admin, 409);
  await call('/api/orders/' + order._id, 'PATCH', { status: 'processing' }, admin, 409);
  const start = (await call('/api/payments/start', 'POST', { orderId: order._id }, customer)).data;
  assert.equal(start.mode, 'simulation');
  assert.equal(start.amount, order.total * 100);
  checks += 2;
  await call(
    '/api/payments/verify',
    'POST',
    { orderId: order._id, razorpay_payment_id: 'fake', razorpay_signature: '0'.repeat(64) },
    customer,
    400,
  );
  await call('/api/payments/simulate', 'POST', { orderId: order._id, outcome: 'failed' }, customer);
  await call(
    '/api/payments/simulate',
    'POST',
    { orderId: order._id, outcome: 'cancelled' },
    customer,
  );
  const paid = (
    await call(
      '/api/payments/simulate',
      'POST',
      { orderId: order._id, outcome: 'success' },
      customer,
    )
  ).data.order;
  assert.equal(paid.paymentStatus, 'simulated paid — no money charged');
  checks++;
  await call(
    '/api/payments/simulate',
    'POST',
    { orderId: order._id, outcome: 'success' },
    customer,
  );
  const booked = (
    await call(
      '/api/shipments/' + order._id,
      'POST',
      { action: 'book', weight: 0.7, length: 20, breadth: 15, height: 10 },
      admin,
    )
  ).data.order;
  assert.equal(booked.shipment.mode, 'simulation');
  checks++;
  await call('/api/shipments/' + order._id, 'POST', { action: 'pickup' }, admin);
  await call('/api/shipments/' + order._id, 'POST', { action: 'label' }, admin);
  await call('/api/shipments/' + order._id, 'POST', { action: 'refresh' }, admin);
  await call('/api/shipments/' + order._id, 'POST', { action: 'cancel' }, admin);
  await call('/api/orders/' + order._id, 'PATCH', { status: 'cancelled' }, customer);
  reserved = false;
  await call(
    '/api/payments/simulate',
    'POST',
    { orderId: order._id, outcome: 'success' },
    customer,
    409,
  );
  const preview = (await call('/api/notifications', 'GET', undefined, admin)).data;
  const mail = preview.mails.find((m: any) => m.to === email);
  assert.equal(mail.status, 'preview');
  checks++;
  await call('/api/notifications', 'POST', { id: mail._id }, admin);
  await call('/api/recovery/request', 'POST', { email });
  const resetMail = await db
    .collection('mail_outbox')
    .findOne({ to: email, subject: 'Reset your Kashmir Se password' });
  assert.ok(resetMail);
  const token = resetMail.text.match(/token=([a-f0-9]{64})/)[1];
  checks++;
  assert.equal(await db.collection('password_resets').countDocuments({ _id: token as never }), 0);
  checks++;
  const hash = createHash('sha256').update(token).digest('hex');
  const record = await db.collection('password_resets').findOne({ _id: hash as never });
  assert.ok(record);
  checks++;
  await db
    .collection('password_resets')
    .updateOne({ _id: hash as never }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  await call('/api/recovery/reset', 'POST', { token, password: 'NewPass123!' }, '', 400);
  await db
    .collection('password_resets')
    .updateOne({ _id: hash as never }, { $set: { expiresAt: new Date(Date.now() + 60000) } });
  await call('/api/recovery/reset', 'POST', { token, password: 'NewPass123!' });
  await call('/api/recovery/reset', 'POST', { token, password: 'Another123!' }, '', 400);
  await call('/api/orders', 'GET', undefined, customer, 401);
  await call('/api/auth/login', 'POST', { email, password: 'TestPass123!' }, '', 401);
  await call('/api/auth/login', 'POST', { email, password: 'NewPass123!' });
  const unknown = await call('/api/recovery/request', 'POST', {
    email: `missing-${stamp}@example.test`,
  });
  assert.ok(unknown.data.message.startsWith('If an account exists'));
  checks++;
  await call('/api/payments/webhook', 'POST', { event: 'payment.captured' }, '', 400);
  console.log(`PASS: ${checks} payment, shipment, email and recovery checks.`);
} finally {
  if (reserved && orders.length) {
    const o = await db.collection('orders').findOne({ _id: orders[0] as never });
    if (o)
      for (const i of o.items)
        await db
          .collection('products')
          .updateOne(
            { _id: i.productId, 'variants.id': i.variantId },
            { $inc: { 'variants.$.stock': i.quantity } },
          );
  }
  await db.collection('orders').deleteMany({ _id: { $in: orders } as never });
  await db.collection('mail_outbox').deleteMany({
    $or: [
      { to: email },
      { key: { $regex: stamp } },
      {
        key: {
          $in: orders.flatMap((id) =>
            [
              'order received',
              'awaiting payment',
              'payment confirmed',
              'shipment book',
              'shipment pickup',
              'shipment label',
              'shipment refresh',
              'shipment cancel',
              'cancelled',
            ].map((e) => `owner:${id}:${e}`),
          ),
        },
      },
    ],
  });
  if (userId) {
    await db.collection('users').deleteOne({ _id: userId as never });
    await db.collection('password_resets').deleteMany({ userId });
  }
  const ipHash = createHash('sha256').update(stamp).digest('hex');
  await db.collection('recovery_limits').deleteMany({ _id: { $regex: '^' + ipHash } as never });
  await client.close();
}
