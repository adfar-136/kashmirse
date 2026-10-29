import { RecoveryForm } from '@/features/auth/recovery';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return <RecoveryForm token={(await searchParams).token || 'invalid'} />;
}
