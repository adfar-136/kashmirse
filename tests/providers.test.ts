import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { validSignature } from '../src/shared/lib/payments';
import { deliveryQuote } from '../src/shared/lib/delivery';

test('payment signatures reject payload tampering, wrong secrets and malformed signatures', () => {
  const payload = 'order_test|pay_test';
  const signature = createHmac('sha256', 'test-secret').update(payload).digest('hex');
  assert.equal(validSignature(payload, signature, 'test-secret'), true);
  assert.equal(validSignature(payload + 'x', signature, 'test-secret'), false);
  assert.equal(validSignature(payload, signature, 'wrong-secret'), false);
  assert.equal(validSignature(payload, 'bad', 'test-secret'), false);
});
test('courier adapter validates postcodes and distinguishes virtual estimates from provider coverage', async () => {
  const oldMode = process.env.DELIVERY_MODE;
  const oldEmail = process.env.SHIPROCKET_EMAIL;
  const oldPass = process.env.SHIPROCKET_PASSWORD;
  const oldPin = process.env.SHIPROCKET_PICKUP_PINCODE;
  const oldFetch = globalThis.fetch;
  try {
    process.env.DELIVERY_MODE = 'simulation';
    await assert.rejects(deliveryQuote('000000', false));
    const sim = await deliveryQuote('110001', true);
    assert.equal(sim.mode, 'simulation');
    assert.match(sim.note, /Simulated/);
    process.env.DELIVERY_MODE = 'shiprocket';
    process.env.SHIPROCKET_EMAIL = 'test@example.test';
    process.env.SHIPROCKET_PASSWORD = 'fixture';
    process.env.SHIPROCKET_PICKUP_PINCODE = '190001';
    let available = true;
    let calls = 0;
    globalThis.fetch = async (input, init) => {
      calls++;
      const url = String(input);
      if (url.endsWith('auth/login')) return Response.json({ token: 'fixture-token' });
      assert.match(url, /pickup_postcode=190001/);
      assert.match(url, /delivery_postcode=110001/);
      assert.match(url, /cod=1/);
      assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer fixture-token');
      return Response.json({
        data: {
          available_courier_companies: available
            ? [{ courier_name: 'Fixture courier', courier_company_id: 7, cod: 1, etd: '5 days' }]
            : [],
        },
      });
    };
    const real = await deliveryQuote('110001', true, 0.8);
    assert.equal(real.mode, 'shiprocket');
    assert.equal(real.serviceable, true);
    assert.equal(real.courierId, 7);
    assert.equal(real.codAvailable, true);
    available = false;
    assert.equal((await deliveryQuote('110001', true)).serviceable, false);
    assert.equal(calls, 4);
  } finally {
    globalThis.fetch = oldFetch;
    for (const [k, v] of Object.entries({
      DELIVERY_MODE: oldMode,
      SHIPROCKET_EMAIL: oldEmail,
      SHIPROCKET_PASSWORD: oldPass,
      SHIPROCKET_PICKUP_PINCODE: oldPin,
    })) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
