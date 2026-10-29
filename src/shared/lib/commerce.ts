import type { Coupon, Settings, CartLine } from './types';
export const money = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
export const defaultSettings: Settings = {
  _id: 'store',
  storeName: 'Kashmir Se',
  supportEmail: 'hello@kashmirse.example',
  phone: '',
  freeShippingAt: 1999,
  shippingFee: 99,
  codEnabled: true,
  announcement: 'From Kashmir to every home',
};
export function totals(subtotal: number, coupon: Coupon | null, settings = defaultSettings) {
  let discount = 0;
  if (
    coupon &&
    coupon.active &&
    Date.parse(coupon.expiresAt) > Date.now() &&
    subtotal >= coupon.minOrder
  )
    discount = Math.min(
      subtotal,
      coupon.maxDiscount,
      coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : coupon.value,
    );
  const shipping = subtotal === 0 || subtotal >= settings.freeShippingAt ? 0 : settings.shippingFee;
  return { subtotal, discount, shipping, total: subtotal - discount + shipping };
}
export function normalizeLines(lines: CartLine[]): CartLine[] {
  const map = new Map<string, CartLine>();
  for (const line of lines) {
    const key = line.productId + ':' + line.variantId;
    const prev = map.get(key);
    map.set(key, { ...line, quantity: (prev?.quantity || 0) + line.quantity });
  }
  const result = [...map.values()];
  if (result.some((l) => l.quantity > 10)) throw new Error('Maximum 10 of each option per order.');
  return result;
}
export const orderTransitions: Record<string, string[]> = {
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};
export function canTransition(from: string, to: string) {
  return orderTransitions[from]?.includes(to) || false;
}
export const formatDate = (s: string) =>
  new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
