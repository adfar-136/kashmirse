import type { Address } from './types';
const fields = ['name', 'phone', 'line1', 'line2', 'city', 'state', 'pincode'] as const;
export function sameAddress(a: Address, b: Address) {
  return fields.every(
    (key) =>
      a[key].trim().toLowerCase().replace(/\s+/g, ' ') ===
      b[key].trim().toLowerCase().replace(/\s+/g, ' '),
  );
}
