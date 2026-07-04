// ============================================
// I18nProvider.tsx - Globaler Locale-Provider
//
// Zweck: Versorgt die App mit DE/EN-Übersetzungen,
//        synchronisiert Cookie + DOM und fängt
//        Alttexte über eine Fallback-Schicht ab.
// Verwendet von: ModuleProvider
// ============================================

'use client';

import { NextIntlClientProvider } from 'next-intl';
import {
  useEffect,
  useRef,
  type PropsWithChildren,
} from 'react';
import { useAppStore } from '@/lib/store/app-store';
import { DEFAULT_APP_TIME_ZONE, DEFAULT_LOCALE, type AppLocale } from '@/lib/i18n/config';
import { getMessages, type AppMessages } from '@/lib/i18n/messages';
import { getCookieLocale, setCookieLocale, translateRuntimeText } from '@/lib/i18n/runtime';

interface I18nProviderProps extends PropsWithChildren {
  locale: AppLocale;
  messages: AppMessages;
}

type LocaleInput = string | string[] | undefined;

const runtimeLocaleRef: { current: AppLocale } = { current: DEFAULT_LOCALE };
let runtimePatched = false;

function resolveLocaleInput(locales?: LocaleInput): LocaleInput {
  if (!locales) return runtimeLocaleRef.current;

  const list = Array.isArray(locales) ? locales : [locales];
  const first = list[0]?.toLowerCase();
  if (!first) return runtimeLocaleRef.current;

  if (first.startsWith('de') || first.startsWith('en')) {
    return runtimeLocaleRef.current;
  }

  return locales;
}

function patchRuntimeLocaleApis() {
  if (runtimePatched || typeof window === 'undefined') return;
  runtimePatched = true;

  const originalDateToLocaleString = Date.prototype.toLocaleString;
  const originalDateToLocaleDateString = Date.prototype.toLocaleDateString;
  const originalDateToLocaleTimeString = Date.prototype.toLocaleTimeString;
  const originalNumberToLocaleString = Number.prototype.toLocaleString;
  const originalAlert = window.alert.bind(window);
  const originalConfirm = window.confirm.bind(window);
  const originalPrompt = window.prompt.bind(window);
  const OriginalDateTimeFormat = Intl.DateTimeFormat;
  const OriginalNumberFormat = Intl.NumberFormat;

  Date.prototype.toLocaleString = function patchedDateToLocaleString(
    locales?: LocaleInput,
    options?: Intl.DateTimeFormatOptions
  ) {
    return originalDateToLocaleString.call(this, resolveLocaleInput(locales), options);
  };

  Date.prototype.toLocaleDateString = function patchedDateToLocaleDateString(
    locales?: LocaleInput,
    options?: Intl.DateTimeFormatOptions
  ) {
    return originalDateToLocaleDateString.call(this, resolveLocaleInput(locales), options);
  };

  Date.prototype.toLocaleTimeString = function patchedDateToLocaleTimeString(
    locales?: LocaleInput,
    options?: Intl.DateTimeFormatOptions
  ) {
    return originalDateToLocaleTimeString.call(this, resolveLocaleInput(locales), options);
  };

  Number.prototype.toLocaleString = function patchedNumberToLocaleString(
    locales?: LocaleInput,
    options?: Intl.NumberFormatOptions
  ) {
    return originalNumberToLocaleString.call(this, resolveLocaleInput(locales), options);
  };

  const PatchedDateTimeFormat = function patchedIntlDateTimeFormat(
    this: unknown,
    locales?: LocaleInput,
    options?: Intl.DateTimeFormatOptions
  ) {
    return new OriginalDateTimeFormat(resolveLocaleInput(locales), options);
  } as unknown as typeof Intl.DateTimeFormat;

  PatchedDateTimeFormat.supportedLocalesOf = OriginalDateTimeFormat.supportedLocalesOf.bind(
    OriginalDateTimeFormat
  );
  PatchedDateTimeFormat.prototype = OriginalDateTimeFormat.prototype;
  Intl.DateTimeFormat = PatchedDateTimeFormat;

  const PatchedNumberFormat = function patchedIntlNumberFormat(
    this: unknown,
    locales?: LocaleInput,
    options?: Intl.NumberFormatOptions
  ) {
    return new OriginalNumberFormat(resolveLocaleInput(locales), options);
  } as unknown as typeof Intl.NumberFormat;

  PatchedNumberFormat.supportedLocalesOf = OriginalNumberFormat.supportedLocalesOf.bind(
    OriginalNumberFormat
  );
  PatchedNumberFormat.prototype = OriginalNumberFormat.prototype;
  Intl.NumberFormat = PatchedNumberFormat;

  window.alert = ((message?: unknown) =>
    originalAlert(
      translateRuntimeText(String(message ?? ''), runtimeLocaleRef.current)
    )) as typeof window.alert;

  window.confirm = ((message?: string) =>
    originalConfirm(
      translateRuntimeText(String(message ?? ''), runtimeLocaleRef.current)
    )) as typeof window.confirm;

  window.prompt = ((message?: string, defaultValue?: string) =>
    originalPrompt(
      translateRuntimeText(String(message ?? ''), runtimeLocaleRef.current),
      defaultValue
    )) as typeof window.prompt;
}

function translateTextNode(node: Node, locale: AppLocale) {
  if (node.nodeType !== Node.TEXT_NODE) return;
  if (!node.nodeValue?.trim()) return;

  const parentElement = node.parentElement;
  if (
    parentElement?.closest('input, textarea, [contenteditable="true"], code, pre')
  ) {
    return;
  }

  const translated = translateRuntimeText(node.nodeValue, locale);
  if (translated !== node.nodeValue) {
    node.nodeValue = translated;
  }
}

function translateElementAttributes(element: Element, locale: AppLocale) {
  const target = element as HTMLElement;
  const attributes = ['placeholder', 'title', 'aria-label', 'value'];

  for (const attribute of attributes) {
    const currentValue = target.getAttribute(attribute);
    if (!currentValue) continue;

    const translated = translateRuntimeText(currentValue, locale);
    if (translated !== currentValue) {
      target.setAttribute(attribute, translated);
    }
  }

  if (element instanceof HTMLOptionElement) {
    const translated = translateRuntimeText(element.text, locale);
    if (translated !== element.text) {
      element.text = translated;
    }
  }
}

function translateDocument(locale: AppLocale) {
  if (typeof document === 'undefined') return;

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  );

  let currentNode = walker.currentNode;
  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      translateTextNode(currentNode, locale);
    } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
      translateElementAttributes(currentNode as Element, locale);
    }

    currentNode = walker.nextNode();
  }
}

export function I18nProvider({
  locale,
  messages,
  children,
}: I18nProviderProps) {
  const storeLocale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);
  const observerRef = useRef<MutationObserver | null>(null);
  const cookieLocale =
    typeof document !== 'undefined' &&
    document.cookie.includes('llm-council-locale=')
      ? getCookieLocale()
      : null;
  const effectiveLocale =
    storeLocale !== DEFAULT_LOCALE ? storeLocale : cookieLocale || locale;
  const activeMessages = effectiveLocale === locale ? messages : getMessages(effectiveLocale);

  useEffect(() => {
    runtimeLocaleRef.current = effectiveLocale;
    patchRuntimeLocaleApis();
    setCookieLocale(effectiveLocale);
    document.documentElement.lang = effectiveLocale;

    if (storeLocale !== effectiveLocale) {
      setLocale(effectiveLocale);
    }

    translateDocument(effectiveLocale);

    observerRef.current?.disconnect();
    observerRef.current = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          translateTextNode(mutation.target, effectiveLocale);
        }

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node, effectiveLocale);
            return;
          }

          if (node.nodeType === Node.ELEMENT_NODE) {
            translateElementAttributes(node as Element, effectiveLocale);
            translateDocument(effectiveLocale);
          }
        });
      }
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label', 'value'],
    });

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [effectiveLocale, setLocale, storeLocale]);

  return (
    <NextIntlClientProvider
      locale={effectiveLocale}
      messages={activeMessages}
      timeZone={DEFAULT_APP_TIME_ZONE}
    >
      {children}
    </NextIntlClientProvider>
  );
}
