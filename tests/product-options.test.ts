import test from 'node:test';
import assert from 'node:assert/strict';
import {
  grams,
  unitPrice,
  purchaseSummary,
  sortedOptions,
  optionHeading,
} from '../src/shared/lib/product-options';
import { appendPurchaseOptions } from '../scripts/purchase-options';
import { catalogueProducts } from '../scripts/catalogue-data';
test('net weight parser and totals distinguish grams from sizes, dimensions and set counts', () => {
  assert.equal(grams('0.5 g'), 0.5);
  assert.equal(grams('1 kg'), 1000);
  for (const label of ['200 × 100 cm', 'Set of 2', 'XS', '1 litre', 'Pack of 6', '0 g'])
    assert.equal(grams(label), null);
  assert.equal(purchaseSummary({ label: '500 g' }, 2), '2 × 500 g = 1 kg total');
  assert.equal(purchaseSummary({ label: '0.5 g' }, 3), '3 × 0.5 g = 1.5 g total');
  assert.equal(purchaseSummary({ label: 'M' }, 2), '2 × M');
});
test('catalogue offers category-appropriate choices and comparable prices', () => {
  const get = (id: string) => catalogueProducts.find((p) => p._id === id)!;
  for (const id of ['walnut-kernels', 'local-almonds'])
    assert.ok(
      ['100 g', '250 g', '500 g', '1 kg'].every((label) =>
        get(id).variants.some((v) => v.label === label),
      ),
    );
  assert.deepEqual(
    sortedOptions(get('kashmiri-saffron').variants).map((v) => v.label),
    ['0.5 g', '1 g', '2 g', '5 g', '10 g'],
  );
  assert.equal(optionHeading(get('kids-pheran')), 'Age group');
  assert.equal(optionHeading(get('embroidered-pheran')), 'Clothing size');
  assert.equal(optionHeading(get('kashmiri-saffron')), 'Pack weight');
  assert.match(unitPrice(get('kashmiri-saffron'), get('kashmiri-saffron').variants[0])!, /\/ g$/);
  assert.match(unitPrice(get('walnut-kernels'), get('walnut-kernels').variants[0])!, /\/ 100 g$/);
  assert.equal(unitPrice(get('embroidered-pheran'), get('embroidered-pheran').variants[0]), null);
});
test('option additions preserve inventory, staff prices and custom options and are repeatable', () => {
  const source = catalogueProducts.find((p) => p._id === 'walnut-kernels')!;
  const existing = [
    { ...source.variants[0], stock: 3, price: 1234 },
    { id: 'custom', label: 'Gift pouch', price: 2000, stock: 2, sku: 'CUSTOM' },
  ];
  const merged = appendPurchaseOptions(existing, source.variants);
  assert.deepEqual(merged[0], existing[0]);
  assert.deepEqual(merged[1], existing[1]);
  assert.deepEqual(appendPurchaseOptions(merged, source.variants), merged);
  assert.equal(new Set(merged.map((v) => v.id)).size, merged.length);
});
