import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, assertOrigin, HttpError } from '@/shared/lib/auth';
import { fail, jsonBody } from '@/shared/lib/http';
import { collection } from '@/shared/lib/db';
import { deliveryMode, deliveryQuote, shiprocket, syncShipment } from '@/shared/lib/delivery';
import { notifyOrder } from '@/shared/lib/notifications';
import type { Order } from '@/shared/lib/types';
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await assertOrigin();
    await requireAdmin();
    const { id } = await ctx.params;
    const input = z
      .object({
        action: z.enum(['book', 'refresh', 'pickup', 'label', 'cancel', 'assign']),
        weight: z.number().min(0.05).max(100).default(0.5),
        length: z.number().min(1).max(200).default(20),
        breadth: z.number().min(1).max(200).default(15),
        height: z.number().min(1).max(200).default(10),
      })
      .parse(await jsonBody(req));
    const orders = await collection<Order>('orders');
    let order = await orders.findOne({ _id: id });
    if (!order) throw new HttpError(404, 'Order not found');
    if (['cancelled', 'delivered'].includes(order.status))
      throw new HttpError(409, 'Shipment cannot be changed for this order.');
    if (
      deliveryMode() === 'shiprocket' &&
      order.paymentMethod !== 'cod' &&
      order.paymentStatus !== 'paid'
    )
      throw new HttpError(409, 'Real courier bookings require a real verified payment or COD.');
    if (
      order.paymentMethod !== 'cod' &&
      !['paid', 'simulated paid — no money charged', 'demo — no money charged'].includes(
        order.paymentStatus,
      )
    )
      throw new HttpError(409, 'Verify payment before shipping.');
    if (input.action === 'book' && !order.shipment) {
      const lock = await orders.updateOne(
        { _id: id, shipment: { $exists: false }, shipmentBooking: { $ne: true } },
        { $set: { shipmentBooking: true } },
      );
      if (!lock.modifiedCount)
        throw new HttpError(409, 'Shipment booking is in progress. Refresh before retrying.');
      try {
        const quote = await deliveryQuote(
          order.address.pincode,
          order.paymentMethod === 'cod',
          input.weight,
        );
        if (!quote.serviceable) throw new HttpError(400, 'This postcode is not serviceable.');
        let shipment: NonNullable<Order['shipment']>;
        const at = new Date().toISOString();
        if (deliveryMode() === 'simulation')
          shipment = {
            mode: 'simulation',
            shipmentId: 'SIM-' + id,
            awb: 'SIM-AWB-' + id,
            courier: 'Virtual Kashmir courier',
            status: 'simulated booking — no courier booked',
            bookedAt: at,
          };
        else {
          if (!process.env.SHIPROCKET_PICKUP_LOCATION)
            throw new HttpError(503, 'Configure pickup location first.');
          const a = order.address;
          const created = await shiprocket('orders/create/adhoc', {
            order_id: id,
            order_date: order.createdAt.slice(0, 19).replace('T', ' '),
            pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION,
            billing_customer_name: a.name,
            billing_last_name: '',
            billing_address: a.line1,
            billing_address_2: a.line2,
            billing_city: a.city,
            billing_pincode: a.pincode,
            billing_state: a.state,
            billing_country: 'India',
            billing_email: order.email,
            billing_phone: a.phone,
            shipping_is_billing: true,
            order_items: order.items.map((i) => ({
              name: i.name,
              sku: i.productId + '-' + i.variantId,
              units: i.quantity,
              selling_price: i.price,
            })),
            payment_method: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
            shipping_charges: order.shipping,
            total_discount: order.discount,
            sub_total: order.subtotal,
            ...{
              length: input.length,
              breadth: input.breadth,
              height: input.height,
              weight: input.weight,
            },
          });
          if (!created.shipment_id)
            throw new HttpError(
              502,
              'Courier did not return a shipment ID. Check provider dashboard before retrying.',
            );
          shipment = {
            mode: 'shiprocket',
            shipmentId: String(created.shipment_id),
            providerOrderId: String(created.order_id),
            awb: '',
            courier: quote.courier,
            status: 'created; AWB pending',
            bookedAt: at,
          };
          // Save provider identity before AWB call so a failed AWB request cannot duplicate a booking.
          await orders.updateOne({ _id: id }, { $set: { shipment, tracking: shipment.awb } });
          const awb = await shiprocket('courier/assign/awb', {
            shipment_id: created.shipment_id,
            courier_id: quote.courierId,
          });
          const data = awb.response?.data;
          if (data?.awb_code) {
            shipment.awb = String(data.awb_code);
            shipment.courier = data.courier_name || shipment.courier;
            shipment.status = 'AWB assigned';
          }
        }
        await orders.updateOne({ _id: id }, { $set: { shipment, tracking: shipment.awb } });
      } finally {
        await orders.updateOne({ _id: id }, { $unset: { shipmentBooking: '' } });
      }
    } else if (order.shipment) {
      let shipment = order.shipment;
      if (input.action === 'cancel') {
        if (shipment.mode === 'shiprocket')
          await shiprocket('orders/cancel', { ids: [Number(shipment.providerOrderId)] });
        shipment = { ...shipment, status: 'cancelled' };
      } else if (shipment.mode === 'simulation')
        shipment = {
          ...shipment,
          status:
            input.action === 'pickup'
              ? 'simulated pickup requested'
              : input.action === 'label'
                ? 'simulation — no shipping label'
                : 'simulated tracking refreshed',
        };
      else if (input.action === 'assign') {
        if (shipment.status === 'cancelled') throw new HttpError(409, 'Shipment is cancelled.');
        const q = await deliveryQuote(
          order.address.pincode,
          order.paymentMethod === 'cod',
          input.weight,
        );
        if (!q.serviceable) throw new HttpError(409, 'No courier is available.');
        const result = await shiprocket('courier/assign/awb', {
          shipment_id: Number(shipment.shipmentId),
          courier_id: q.courierId,
        });
        const data = result.response?.data;
        if (!data?.awb_code)
          throw new HttpError(
            502,
            'AWB assignment did not complete. Retry or inspect the provider dashboard.',
          );
        shipment = {
          ...shipment,
          awb: String(data.awb_code),
          courier: data.courier_name || shipment.courier,
          status: 'AWB assigned',
        };
      } else if (input.action === 'pickup') {
        if (!shipment.awb) throw new HttpError(409, 'Assign AWB in the courier dashboard first.');
        await shiprocket('courier/generate/pickup', { shipment_id: [Number(shipment.shipmentId)] });
        shipment = { ...shipment, status: 'pickup requested' };
      } else if (input.action === 'label') {
        const d = await shiprocket('courier/generate/label', {
          shipment_id: [Number(shipment.shipmentId)],
        });
        const url = d.label_url;
        if (typeof url === 'string' && url.startsWith('https://'))
          shipment = { ...shipment, labelUrl: url };
      } else {
        return NextResponse.json({ order: await syncShipment(id) });
      }
      await orders.updateOne({ _id: id }, { $set: { shipment, tracking: shipment.awb } });
    } else throw new HttpError(409, 'Book a shipment first.');
    order = await orders.findOne({ _id: id });
    if (order) await notifyOrder(order, 'shipment ' + input.action);
    return NextResponse.json({ order });
  } catch (e) {
    return fail(e);
  }
}
