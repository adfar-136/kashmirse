import { HttpError } from './auth';
export const deliveryMode = () =>
  process.env.DELIVERY_MODE === 'shiprocket' ? 'shiprocket' : 'simulation';
export async function shiprocket(path: string, body?: unknown) {
  if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD)
    throw new HttpError(503, 'Courier credentials are missing.');
  const auth = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!auth.ok) throw new HttpError(502, 'Courier authentication failed');
  const { token } = await auth.json();
  const r = await fetch('https://apiv2.shiprocket.in/v1/external/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const data = await r.json();
  if (!r.ok || data.status === false || data.status_code === 422)
    throw new HttpError(502, 'Courier request failed. Check shipment details before retrying.');
  return data;
}
export async function deliveryQuote(pincode: string, cod: boolean, weight = 0.5) {
  if (!/^[1-9]\d{5}$/.test(pincode)) throw new HttpError(400, 'Enter a valid six-digit postcode.');
  if (deliveryMode() === 'simulation')
    return {
      mode: 'simulation',
      serviceable: true,
      codAvailable: true,
      courier: 'Virtual Kashmir courier',
      estimatedDays: '5–8 business days',
      note: 'Simulated coverage; no postcode is verified with a real courier.',
    };
  if (!process.env.SHIPROCKET_PICKUP_PINCODE)
    throw new HttpError(503, 'Configure pickup postcode first.');
  const d = await shiprocket(
    'courier/serviceability/?' +
      new URLSearchParams({
        pickup_postcode: process.env.SHIPROCKET_PICKUP_PINCODE,
        delivery_postcode: pincode,
        cod: cod ? '1' : '0',
        weight: String(weight),
      }),
  );
  const options = d.data?.available_courier_companies || [];
  const best = options[0];
  return {
    mode: 'shiprocket',
    serviceable: !!best,
    codAvailable: options.some((o: { cod: number }) => !!o.cod),
    courier: best?.courier_name || '',
    courierId: best?.courier_company_id,
    estimatedDays: best?.etd || '',
    note: 'Courier estimate; store shipping charges are shown in your order summary.',
  };
}

export async function syncShipment(id: string) {
  const { collection } = await import('./db');
  const { notifyOrder } = await import('./notifications');
  const orders = await collection<import('./types').Order>('orders');
  const order = await orders.findOne({ _id: id });
  if (!order?.shipment || order.shipment.mode !== 'shiprocket')
    throw new HttpError(404, 'Live shipment not found');
  const d = await shiprocket(
    'courier/track/shipment/' + encodeURIComponent(order.shipment.shipmentId),
  );
  const t = d.tracking_data;
  const current = String(t?.shipment_track?.[0]?.current_status || order.shipment.status);
  const url =
    typeof t?.track_url === 'string' && t.track_url.startsWith('https://')
      ? t.track_url
      : order.shipment.trackingUrl;
  const at = new Date().toISOString();
  const upper = current.toUpperCase();
  const next =
    upper === 'DELIVERED'
      ? 'delivered'
      : ['PICKED UP', 'SHIPPED', 'IN TRANSIT', 'OUT FOR DELIVERY'].includes(upper)
        ? 'shipped'
        : null;
  const advance =
    next && !['cancelled', 'delivered'].includes(order.status) && order.status !== next;
  await orders.updateOne(
    { _id: id, status: order.status },
    {
      $set: {
        'shipment.status': current,
        ...(url ? { 'shipment.trackingUrl': url } : {}),
        ...(advance ? { status: next } : {}),
      },
      ...(advance
        ? { $push: { history: { status: next!, note: 'Verified courier update: ' + current, at } } }
        : {}),
    },
  );
  const fresh = await orders.findOne({ _id: id });
  if (fresh && (current !== order.shipment.status || advance))
    await notifyOrder(fresh, 'delivery ' + current);
  return fresh;
}
