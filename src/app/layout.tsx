import type { Metadata } from 'next';
import { ModuleProvider } from '@/components/providers';
import { getServerLocale } from '@/lib/i18n/server';
import { getMessages } from '@/lib/i18n/messages';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'LLM Council',
    description: 'Standalone council workspace for building in public.',
    icons: {
      icon: '/favicon.ico',
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  const localeMessages = getMessages(locale);

  return (
    <html lang={locale} className="dark">
      <body className="min-h-screen font-sans antialiased">
        <ModuleProvider locale={locale} messages={localeMessages}>
          {children}
        </ModuleProvider>
      </body>
    </html>
  );
}
