'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from '@/lib/theme';
import { I18nProvider } from './I18nProvider';
import type { AppLocale } from '@/lib/i18n/config';
import type { AppMessages } from '@/lib/i18n/messages';

interface ModuleProviderProps {
  children: ReactNode;
  locale: AppLocale;
  messages: AppMessages;
}

export function ModuleProvider({ children, locale, messages }: ModuleProviderProps) {
  return (
    <I18nProvider locale={locale} messages={messages}>
      <ThemeProvider>{children}</ThemeProvider>
    </I18nProvider>
  );
}
