import nodemailer from 'nodemailer';
import { randomUUID } from 'node:crypto';
import { collection } from './db';
import type { Order } from './types';
export type Mail = {
  _id: string;
  key: string;
  to: string;
  subject: string;
  text: string;
  status: string;
  attempts: number;
  createdAt: string;
  sentAt?: string;
  error?: string;
};
export async function deliverMail(id: string) {
  const mails = await collection<Mail>('mail_outbox');
  const mail = await mails.findOneAndUpdate(
    { _id: id, status: { $in: ['queued', 'failed', 'preview'] } },
    { $set: { status: 'sending' }, $inc: { attempts: 1 } },
    { returnDocument: 'after' },
  );
  if (!mail) return;
  if (process.env.EMAIL_MODE !== 'smtp') {
    await mails.updateOne({ _id: id }, { $set: { status: 'preview' } });
    return;
  }
  try {
    if (!process.env.SMTP_PASSWORD || !process.env.SMTP_USER)
      throw new Error('SMTP credentials are missing');
    await nodemailer
      .createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || 465),
        secure: process.env.SMTP_PORT !== '587',
        requireTLS: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
        connectionTimeout: 10000,
        socketTimeout: 15000,
      })
      .sendMail({
        from: process.env.SMTP_USER,
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
      });
    await mails.updateOne(
      { _id: id },
      { $set: { status: 'sent', sentAt: new Date().toISOString() }, $unset: { error: '' } },
    );
  } catch {
    await mails.updateOne(
      { _id: id },
      { $set: { status: 'failed', error: 'Delivery failed. Check SMTP configuration and retry.' } },
    );
  }
}
export async function queueMail(key: string, to: string, subject: string, text: string) {
  const mails = await collection<Mail>('mail_outbox');
  await mails.createIndex({ key: 1 }, { unique: true });
  const id = randomUUID();
  await mails.updateOne(
    { key },
    {
      $setOnInsert: {
        _id: id,
        key,
        to,
        subject,
        text,
        status: 'queued',
        attempts: 0,
        createdAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  );
  const mail = await mails.findOne({ key });
  if (mail) await deliverMail(mail._id);
}
export async function notifyOrder(order: Order, event: string) {
  try {
    const origin = process.env.APP_URL || 'http://127.0.0.1:3000';
    const text = `Hello ${order.address.name},\n\nOrder ${order._id}: ${event}.\nPayment: ${order.paymentStatus}.\nTotal: INR ${order.total}.\n${order.items.map((i) => `${i.name} · ${i.variantLabel} × ${i.quantity}`).join('\n')}\n${order.tracking ? 'Tracking: ' + order.tracking : ''}\nView your order: ${origin}/account/orders/${order._id}\n\nKashmir Se\n${order.paymentStatus.includes('simulated') ? 'Simulation: no money was charged.' : ''}`;
    await queueMail(
      `order:${order._id}:${event}`,
      order.email,
      `Kashmir Se · ${order._id} · ${event}`,
      text,
    );
    const owner = process.env.STORE_NOTIFICATION_EMAIL;
    if (owner && owner !== order.email)
      await queueMail(
        `owner:${order._id}:${event}`,
        owner,
        `Store order ${order._id} · ${event}`,
        text,
      );
  } catch {
    /* Orders remain durable if the outbox database is unavailable. */
  }
}
