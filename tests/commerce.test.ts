import test from 'node:test';
import assert from 'node:assert/strict';
import { totals, normalizeLines, canTransition, defaultSettings } from '../src/shared/lib/commerce';
import { addressSchema, checkoutSchema, productSchema } from '../src/shared/lib/validation';
const coupon = {
  _id: 'c',
  code: 'SAVE10',
  type: 'percent' as const,
  value: 10,
  minOrder: 999,
  maxDiscount: 500,
  active: true,
  expiresAt: '2099-01-01T00:00:00.000Z',
};
test('totals apply shipping, minimum order, percentage rounding and maximum discount', () => {
  assert.deepEqual(totals(1398, coupon), {
    subtotal: 1398,
    discount: 140,
    shipping: 99,
    total: 1357,
  });
  assert.equal(totals(998, coupon).discount, 0);
  assert.equal(totals(10000, coupon).discount, 500);
  assert.equal(totals(1999, null).shipping, 0);
  assert.equal(totals(0, null).total, 0);
  assert.equal(totals(1398, { ...coupon, expiresAt: '2000-01-01T00:00:00Z' }).discount, 0);
});
test('fixed offers never exceed the order subtotal or cap', () => {
  assert.equal(totals(100, { ...coupon, type: 'fixed', value: 500, minOrder: 0 }).discount, 100);
});
test('duplicate cart lines merge before inventory validation', () => {
  assert.deepEqual(
    normalizeLines([
      { productId: 'p', variantId: 'v', quantity: 2 },
      { productId: 'p', variantId: 'v', quantity: 3 },
    ]),
    [{ productId: 'p', variantId: 'v', quantity: 5 }],
  );
  assert.throws(() =>
    normalizeLines([
      { productId: 'p', variantId: 'v', quantity: 6 },
      { productId: 'p', variantId: 'v', quantity: 6 },
    ]),
  );
});
test('fulfilment cannot go backwards or cancel a shipped order', () => {
  assert.ok(canTransition('confirmed', 'processing'));
  assert.ok(canTransition('processing', 'shipped'));
  assert.ok(canTransition('shipped', 'delivered'));
  assert.ok(!canTransition('shipped', 'cancelled'));
  assert.ok(!canTransition('delivered', 'confirmed'));
  assert.ok(!canTransition('cancelled', 'processing'));
});
test('checkout rejects invalid Indian address formats and unreasonable quantities', () => {
  const address = {
    name: 'Test Customer',
    phone: '9876543210',
    line1: '12 Test Street',
    line2: '',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
  };
  assert.ok(addressSchema.safeParse(address).success);
  assert.ok(!addressSchema.safeParse({ ...address, pincode: '000000' }).success);
  assert.ok(!addressSchema.safeParse({ ...address, phone: '123' }).success);
  assert.ok(
    !checkoutSchema.safeParse({
      items: [{ productId: 'x', variantId: 'y', quantity: 0 }],
      address,
      paymentMethod: 'demo',
      coupon: '',
      idempotencyKey: 'bad',
    }).success,
  );
});
