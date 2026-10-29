import type { Product, Variant } from './types';
import { money } from './commerce';
/** Only explicit net weights, never garment dimensions, litre capacities or set counts. */
export function grams(label: string): number | null {
  const m = label.trim().match(/^(\d+(?:\.\d+)?)\s*(kg|g)$/i);
  if (!m) return null;
  const value = Number(m[1]) * (m[2].toLowerCase() === 'kg' ? 1000 : 1);
  return value > 0 ? value : null;
}
export function formatWeight(value: number) {
  return value >= 1000
    ? `${Number((value / 1000).toFixed(3))} kg`
    : `${Number(value.toFixed(2))} g`;
}
export function optionHeading(p: Pick<Product, 'category' | 'variants' | '_id'>) {
  if (p.variants.every((v) => grams(v.label) !== null)) return 'Pack weight';
  if (p.category === 'clothing')
    return p._id === 'kids-pheran'
      ? 'Age group'
      : p.variants.some((v) => ['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(v.label))
        ? 'Clothing size'
        : 'Stitching';
  if (p.category === 'cricket') return 'Bat size / kit';
  if (p.category === 'shawls') return 'Dimensions';
  if (p.category === 'gifts') return 'Gift set';
  return 'Size / pack';
}
export function unitPrice(p: Pick<Product, '_id'>, v: Variant) {
  const weight = grams(v.label);
  if (!weight) return null;
  const unit = p._id === 'kashmiri-saffron' ? 1 : 100;
  return `${money(Math.round((v.price / weight) * unit))} / ${unit === 1 ? 'g' : '100 g'}`;
}
export function purchaseSummary(v: Pick<Variant, 'label'>, qty: number) {
  const weight = grams(v.label);
  return `${qty} × ${v.label}${weight ? ' = ' + formatWeight(weight * qty) + ' total' : ''}`;
}
export function sortedOptions(variants: Variant[]) {
  if (!variants.every((v) => grams(v.label) !== null)) return variants;
  return [...variants].sort((a, b) => grams(a.label)! - grams(b.label)!);
}
