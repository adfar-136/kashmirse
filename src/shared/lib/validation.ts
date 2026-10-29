import { z } from 'zod';
import { catalogueCrop } from './catalog-images';
export const addressSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  line1: z.string().trim().min(5).max(200),
  line2: z.string().trim().max(200).default(''),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit postcode'),
});
export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(100),
        variantId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(50),
  address: addressSchema,
  saveAddress: z.boolean().default(false),
  addressId: z.string().min(1).max(100).optional(),
  paymentMethod: z.enum(['cod', 'demo', 'upi', 'card']),
  coupon: z.string().max(40).default(''),
  idempotencyKey: z.string().uuid(),
});
export const authSchema = z.object({
  email: z
    .email()
    .max(200)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(80).optional(),
});
export const productImageSchema = z.union([
  z.enum([
    'walnuts',
    'saffron',
    'pheran',
    'copper',
    'dry-fruits',
    'saffron-tea',
    'pickles',
    'clothing',
    'shawls',
    'crafts',
    'cricket',
    'gifts',
    'hero',
  ]),
  z.string().refine((v) => catalogueCrop(v) !== null, 'Invalid catalogue image'),
  z.string().regex(/^\/uploads\/[a-f0-9-]{36}\.(png|jpg|webp)$/),
]);
export const productSchema = z.object({
  name: z.string().trim().min(3).max(150),
  subtitle: z.string().max(150),
  description: z.string().min(10).max(5000),
  category: z.string().min(1),
  image: productImageSchema,
  gallery: z.array(productImageSchema).max(8).optional(),
  topPick: z.boolean().optional(),
  newArrival: z.boolean().optional(),
  origin: z.string().max(150),
  material: z.string().max(150),
  care: z.string().max(1000),
  details: z.array(z.string().max(500)).max(20),
  featured: z.boolean(),
  active: z.boolean(),
  variants: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        label: z.string().min(1).max(80),
        price: z.number().int().min(1).max(10000000),
        stock: z.number().int().min(0).max(100000),
        sku: z.string().min(1).max(100),
      }),
    )
    .min(1)
    .max(30)
    .refine((v) => new Set(v.map((x) => x.id)).size === v.length, 'Option IDs must be unique')
    .refine((v) => new Set(v.map((x) => x.sku)).size === v.length, 'Option SKUs must be unique'),
});
