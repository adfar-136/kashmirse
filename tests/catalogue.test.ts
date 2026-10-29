import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { catalogueProducts, catalogueCategories } from '../scripts/catalogue-data';
import { catalogueCrop } from '../src/shared/lib/catalog-images';
import { productSchema } from '../src/shared/lib/validation';

test('all 12 departments have at least six distinct, valid products', () => {
  assert.equal(catalogueCategories.length, 12);
  assert.equal(catalogueProducts.length, 78);
  assert.equal(new Set(catalogueProducts.map((p) => p._id)).size, 78);
  assert.equal(new Set(catalogueProducts.map((p) => p.name)).size, 78);
  assert.equal(new Set(catalogueProducts.map((p) => p.image)).size, 78);
  for (const category of catalogueCategories) {
    const products = catalogueProducts.filter((p) => p.category === category._id);
    assert.ok(products.length >= 6, category.name);
    assert.ok(
      new Set(products.map((p) => p.variants[0].price)).size >= 5,
      `${category.name} needs varied prices`,
    );
    assert.ok(
      products.every((p) => p.material.length > 0),
      `${category.name} needs material or ingredient details`,
    );
    assert.equal(
      new Set(products.map((p) => p.material + ':' + p.details[0])).size,
      products.length,
      `${category.name} needs product-specific specifications`,
    );
    for (const product of products)
      assert.ok(productSchema.safeParse(product).success, product._id);
  }
});

test('every generated photo points to an existing atlas and a valid, distinct tile', () => {
  const images = new Set<string>();
  for (const product of catalogueProducts) {
    for (const image of product.gallery || [product.image]) {
      const crop = catalogueCrop(image);
      if (!crop) {
        assert.ok(['walnuts', 'saffron', 'pheran', 'copper'].includes(image));
        continue;
      }
      assert.equal(crop.category, product.category);
      assert.ok(existsSync(`public/catalog/${crop.category}.webp`), image);
      assert.ok(!images.has(image), `Duplicate product photograph: ${image}`);
      images.add(image);
    }
  }
  assert.equal(images.size, 78);
  assert.equal(catalogueCrop('catalog:unknown:0'), null);
  assert.equal(catalogueCrop('catalog:dry-fruits:8'), null);
  assert.equal(catalogueCrop('catalog:../../secret:0'), null);
});

test('catalogue options have unique SKUs and sensible quantity-based prices', () => {
  const skus = catalogueProducts.flatMap((p) => p.variants.map((v) => v.sku));
  assert.equal(new Set(skus).size, skus.length);
  for (const product of catalogueProducts) {
    assert.ok(product.description.includes(product.subtitle));
    assert.ok(
      product.variants.every((v) => v.price > 0 && Number.isInteger(v.price) && v.stock >= 0),
    );
  }
  const walnuts = catalogueProducts.find((p) => p._id === 'walnut-kernels')!;
  assert.ok(
    walnuts.variants.find((v) => v.label === '1 kg')!.price >
      walnuts.variants.find((v) => v.label === '500 g')!.price,
  );
  assert.equal(catalogueProducts.filter((p) => p.featured).length, 4);
  assert.equal(catalogueProducts.filter((p) => p.topPick).length, 4);
  assert.equal(catalogueProducts.filter((p) => p.newArrival).length, 4);
});

test('catalogue refresh preserves reservations when an option is renamed or a weight is added', async () => {
  const { mergeSeedVariants } = await import('../scripts/catalogue-migration');
  const old = [
    { id: 'v0', label: '500 g', price: 500, stock: 7, sku: 'OLD0' },
    { id: 'v1', label: '1 kg', price: 1000, stock: 3, sku: 'OLD1' },
  ];
  const desired = [
    { id: 'v0', label: '500 g', price: 549, stock: 50, sku: 'NEW0' },
    { id: 'v1', label: '250 g', price: 299, stock: 40, sku: 'NEW1' },
    { id: 'v2', label: '1 kg', price: 1049, stock: 50, sku: 'NEW2' },
  ];
  const result = mergeSeedVariants(old, desired);
  assert.equal(result.find((v) => v.label === '1 kg')?.id, 'v1');
  assert.equal(result.find((v) => v.label === '1 kg')?.stock, 3);
  assert.equal(result.find((v) => v.label === '500 g')?.stock, 7);
  assert.equal(new Set(result.map((v) => v.id)).size, 3);
  assert.equal(
    mergeSeedVariants(
      [{ ...old[0], label: 'Standard' }],
      [{ ...desired[0], label: '4-piece box' }],
    )[0].stock,
    7,
  );
});

test('address duplicate detection tolerates whitespace and casing but keeps different destinations', async () => {
  const { sameAddress } = await import('../src/shared/lib/addresses');
  const a = {
    name: 'Test Customer',
    phone: '9876543210',
    line1: '12 Garden Street',
    line2: '',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
  };
  assert.ok(sameAddress(a, { ...a, name: ' test  customer ', city: 'new delhi' }));
  assert.ok(!sameAddress(a, { ...a, line1: '45 Garden Street' }));
});
