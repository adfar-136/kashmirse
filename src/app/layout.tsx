import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/shared/ui/store-provider';
import { Header } from '@/widgets/header/header';
import { Footer } from '@/widgets/footer/footer';
import { getCategories } from '@/entities/product/model/queries';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { default: 'Kashmir Se — From Kashmir to every home', template: '%s | Kashmir Se' },
  description:
    'Discover Kashmiri dry fruits, saffron, clothing, shawls, crafts and gifts. A local demonstration of the Kashmir Se store.',
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategories();
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body>
        <StoreProvider>
          <Header categories={categories} />
          <main id="main">{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
