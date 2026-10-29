import type { Product, Variant } from '../src/shared/lib/types';
import { grams } from '../src/shared/lib/product-options';
/** Illustrative sizes/prices only; retain every original SKU and purchase option. */
export function expandedOptions(p: Product): Variant[] {
  let labels: string[] = [];
  if (p.category === 'dry-fruits') labels = ['100 g', '250 g', '500 g', '1 kg'];
  else if (p._id === 'kashmiri-saffron') labels = ['0.5 g', '1 g', '2 g', '5 g', '10 g'];
  else if (p._id === 'valley-honey') labels = ['100 g', '250 g', '500 g', '1 kg'];
  else if (p.category === 'saffron-tea') labels = ['50 g', '100 g', '250 g'];
  else if (p._id === 'mushqbudji-rice') labels = ['500 g', '1 kg', '5 kg'];
  else if (p._id === 'ver-masala') labels = ['50 g', '100 g', '250 g'];
  else if (p.category === 'food-pickles') labels = ['150 g', '300 g', '500 g'];
  else if (p._id === 'gucchi-morels') labels = ['10 g', '25 g', '50 g', '100 g'];
  else if (p.category === 'dried-foods')
    labels = p._id === 'dried-haakh' ? ['75 g', '150 g', '300 g'] : ['50 g', '100 g', '250 g'];
  else if (p.category === 'fresh-produce')
    labels = ['kashmiri-apples', 'seasonal-pears', 'golden-quince'].includes(p._id)
      ? ['1 kg', '3 kg', '5 kg']
      : ['250 g', '500 g', '1 kg'];
  else if (p.category === 'bakery' && grams(p.variants[0].label))
    labels = ['bakery-cookies', 'almond-cookies'].includes(p._id)
      ? ['200 g', '400 g', '800 g']
      : ['100 g', '250 g', '500 g'];
  else if (p._id === 'kashmiri-kulcha') labels = ['Pack of 6', 'Pack of 12'];
  else if (p._id === 'baqerkhani') labels = ['Pack of 4', 'Pack of 8'];
  else if (p._id === 'kids-pheran')
    labels = ['2–4 years', '4–6 years', '6–8 years', '8–10 years', '10–12 years'];
  else if (p.category === 'clothing' && p.variants.some((v) => v.label === 'S'))
    labels = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  else if (p._id === 'junior-bat') labels = ['Size 3', 'Size 4', 'Size 5', 'Size 6'];
  else if (['copper-jug', 'copper-samovar'].includes(p._id))
    labels =
      p._id === 'copper-jug'
        ? ['500 ml', '1 litre', '1.5 litres']
        : ['2 litres', '3 litres', '5 litres'];
  else if (p._id === 'copper-cups') labels = ['Set of 2', 'Set of 4', 'Set of 6'];
  else if (p._id === 'crewel-cushions') labels = ['Set of 2', 'Set of 4'];
  const base = p.variants[0];
  const baseWeight = grams(base.label);
  return [
    ...p.variants,
    ...labels
      .filter((label) => !p.variants.some((v) => v.label === label))
      .map((label) => {
        const weight = grams(label);
        let ratio = weight && baseWeight ? weight / baseWeight : 1;
        if (label.startsWith('Pack of ') || label.startsWith('Set of '))
          ratio = Number(label.match(/\d+/)![0]) / Number(base.label.match(/\d+/)![0]);
        if (p._id === 'copper-jug')
          ratio = label === '500 ml' ? 0.65 : label === '1.5 litres' ? 1.4 : 1;
        if (p._id === 'copper-samovar')
          ratio = label === '2 litres' ? 0.8 : label === '5 litres' ? 1.5 : 1;
        const key = label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/-$/, '');
        return {
          id: `${p._id}-size-${key}`,
          label,
          price: Math.max(1, Math.round(base.price * ratio)),
          stock: 18,
          sku: `KS-${p._id.toUpperCase()}-SIZE-${key.toUpperCase()}`,
        };
      }),
  ];
}
/** Add missing examples without overwriting staff prices, stock, custom options or identities. */
export function appendPurchaseOptions(existing: Variant[], desired: Variant[]) {
  const labels = new Set(existing.map((v) => v.label));
  const ids = new Set(existing.map((v) => v.id));
  const skus = new Set(existing.map((v) => v.sku));
  const additions = desired.filter((v) => !labels.has(v.label));
  for (const v of additions) {
    if (ids.has(v.id) || skus.has(v.sku)) throw new Error('Purchase option identity collision');
    ids.add(v.id);
    skus.add(v.sku);
  }
  return [...existing, ...additions];
}
