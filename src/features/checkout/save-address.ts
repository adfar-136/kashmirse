import { collection } from '@/shared/lib/db';
import { HttpError } from '@/shared/lib/auth';
import { sameAddress } from '@/shared/lib/addresses';
import type { Address, User } from '@/shared/lib/types';

export async function saveCheckoutAddress(
  userId: string,
  address: Address,
  key: string,
  addressId?: string,
) {
  const users = await collection<User>('users');
  const user = await users.findOne({ _id: userId });
  if (!user) throw new HttpError(401, 'Please sign in again.');
  if (addressId) {
    if (!user.addresses.some((a) => a.id === addressId))
      throw new HttpError(400, 'This saved address is no longer available.');
    await users.updateOne(
      { _id: userId, 'addresses.id': addressId },
      { $set: { 'addresses.$': { ...address, id: addressId } } },
    );
    return;
  }
  if (user.addresses.some((a) => a.id === key || sameAddress(a, address))) return;
  const result = await users.updateOne(
    {
      _id: userId,
      'addresses.id': { $ne: key },
      $expr: { $lt: [{ $size: { $ifNull: ['$addresses', []] } }, 10] },
    },
    { $push: { addresses: { ...address, id: key } } },
  );
  if (!result.modifiedCount) {
    const latest = await users.findOne({ _id: userId });
    if (latest?.addresses.some((a) => a.id === key || sameAddress(a, address))) return;
    throw new HttpError(
      409,
      'Your address book is full. Manage your addresses or turn off saving and try again.',
    );
  }
}
