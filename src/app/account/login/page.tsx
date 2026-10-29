import { AuthForm } from '@/features/auth/auth-form';
export const metadata = { title: 'Sign in' };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return <AuthForm next={(await searchParams).next} />;
}
