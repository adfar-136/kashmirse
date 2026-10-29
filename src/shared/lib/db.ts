import { MongoClient, type Db, type Document } from 'mongodb';
const state = globalThis as unknown as { mongoPromise?: Promise<MongoClient> };
export async function db(): Promise<Db> {
  if (!state.mongoPromise) {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017', {
      serverSelectionTimeoutMS: 5000,
    });
    state.mongoPromise = client.connect().catch((e) => {
      state.mongoPromise = undefined;
      throw e;
    });
  }
  return (await state.mongoPromise).db(process.env.MONGODB_DB || 'kashmir_se');
}
export async function collection<T extends Document>(name: string) {
  return (await db()).collection<T>(name);
}
