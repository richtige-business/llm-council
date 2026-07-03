// ============================================
// types.ts - Marketplace TypeScript Definitionen
// 
// Zweck: Definiert alle Typen für den Marketplace
// Verwendet von: store.ts, mock-data.ts, alle Marketplace-Komponenten
// ============================================

import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import { formatRelativeTime, getCookieLocale } from '@/lib/i18n/runtime';

// --------------------------------------------
// Modul-Kategorien
// Alle verfügbaren Kategorien im Marketplace
// --------------------------------------------

export type ModuleCategory = 
  | 'productivity'   // Produktivität (Pomodoro, Notes, etc.)
  | 'calendar'       // Kalender & Termine
  | 'finance'        // Finanzen & Budget
  | 'health'         // Gesundheit & Fitness
  | 'education'      // Bildung & Lernen
  | 'games'          // Spiele & Unterhaltung
  | 'developer'      // Entwickler-Tools
  | 'creative'       // Kreativ (Design, Musik, etc.)
  | 'ai'             // KI & ML Tools
  | 'integrations'   // Externe Integrationen
  | 'social'         // Social & Kommunikation
  | 'lifestyle';     // Lifestyle & Alltag

// --------------------------------------------
// Base-Kategorien (für Bases & Module > Bases)
// --------------------------------------------

export type BaseCategory =
  | 'personal'
  | 'business'
  | 'education'
  | 'creative'
  | 'health';

// --------------------------------------------
// Kategorie-Metadaten
// Label, Icon und Farbe für jede Kategorie
// --------------------------------------------

export interface CategoryMeta {
  id: ModuleCategory;
  label: string;
  icon: string;           // Lucide icon name
  color: string;          // Hex color für Badge
}

export const CATEGORY_META: Record<ModuleCategory, CategoryMeta> = {
  productivity: { id: 'productivity', label: 'Produktivität', icon: 'CheckSquare', color: '#22c55e' },
  calendar: { id: 'calendar', label: 'Kalender', icon: 'Calendar', color: '#3b82f6' },
  finance: { id: 'finance', label: 'Finanzen', icon: 'Wallet', color: '#f59e0b' },
  health: { id: 'health', label: 'Gesundheit', icon: 'Heart', color: '#ef4444' },
  education: { id: 'education', label: 'Bildung', icon: 'GraduationCap', color: '#8b5cf6' },
  games: { id: 'games', label: 'Spiele', icon: 'Gamepad2', color: '#ec4899' },
  developer: { id: 'developer', label: 'Developer', icon: 'Code', color: '#64748b' },
  creative: { id: 'creative', label: 'Kreativ', icon: 'Palette', color: '#f97316' },
  ai: { id: 'ai', label: 'KI & ML', icon: 'Brain', color: '#06b6d4' },
  integrations: { id: 'integrations', label: 'Integrationen', icon: 'Plug', color: '#14b8a6' },
  social: { id: 'social', label: 'Social', icon: 'Users', color: '#a855f7' },
  lifestyle: { id: 'lifestyle', label: 'Lifestyle', icon: 'Sparkles', color: '#eab308' },
};

// --------------------------------------------
// Preismodelle
// Verschiedene Preis-Typen für Module
// --------------------------------------------

export type PricingType = 'free' | 'paid' | 'freemium' | 'subscription';

export interface ModulePricing {
  type: PricingType;
  price?: number;                // Preis in Cent (z.B. 499 = 4.99€)
  currency?: 'EUR' | 'USD';
  interval?: 'month' | 'year';   // Für Subscriptions
  trialDays?: number;            // Kostenlose Testphase
}

// --------------------------------------------
// Entwickler-Informationen
// Wer hat das Modul erstellt?
// --------------------------------------------

export interface ModuleDeveloper {
  id: string;
  name: string;
  verified: boolean;             // Verifizierter Entwickler?
  avatar?: string;               // Avatar-URL
  website?: string;              // Website-Link
}

// --------------------------------------------
// Modul-Statistiken
// Downloads, Bewertungen, Wachstum
// --------------------------------------------

export interface ModuleStats {
  downloads: number;             // Gesamtanzahl Downloads
  rating: number;                // Durchschnittsbewertung 0-5
  reviewCount: number;           // Anzahl Bewertungen
  weeklyGrowth?: number;         // Wöchentliches Wachstum in Prozent
  weeklyDownloads?: number;      // Downloads diese Woche
}

// --------------------------------------------
// Medien-Assets
// Screenshots und Videos
// --------------------------------------------

export interface ModuleMedia {
  screenshots: string[];         // Screenshot-URLs
  video?: string;                // Video-URL (YouTube, etc.)
  icon?: string;                 // Custom Icon URL (falls nicht Lucide)
}

// --------------------------------------------
// Technische Details
// Version, Größe, Kompatibilität
// --------------------------------------------

export interface ModuleTechnical {
  version: string;               // z.B. "1.2.3"
  size: string;                  // z.B. "245 KB"
  minLifeOSVersion: string;      // Mindestversion von LifeOS
  permissions: string[];         // Benötigte Berechtigungen
  lastUpdated: string;           // ISO Date String
  releaseDate: string;           // Erstveröffentlichung
}

// --------------------------------------------
// Changelog-Eintrag
// Was ist neu in dieser Version?
// --------------------------------------------

export interface ChangelogEntry {
  version: string;
  date: string;                  // ISO Date String
  changes: string[];             // Liste der Änderungen
}

// --------------------------------------------
// Marketplace Item Type
// Unterscheidet zwischen Apps, Modellen, Integrationen, Datensätzen
// --------------------------------------------

export type MarketplaceItemType = 'apps' | 'models' | 'integrations' | 'datasets';

// --------------------------------------------
// Haupt-Interface: MarketplaceModule
// Vollständiges Datenmodell für ein Modul
// --------------------------------------------

export interface MarketplaceModule {
  // Identifikation
  id: string;                    // Eindeutige ID
  name: string;                  // Anzeigename
  slug: string;                  // URL-freundlicher Name
  
  // Typ (für Tab-Filter)
  type: MarketplaceItemType;     // apps, models, integrations, datasets
  
  // Darstellung
  icon: string;                  // Lucide icon name
  color: string;                 // Akzentfarbe (Hex)
  gradient?: string;             // Optional: Gradient für Icon-Hintergrund
  
  // Beschreibungen
  shortDescription: string;      // Max 100 Zeichen, für Karten
  fullDescription: string;       // Ausführlich, unterstützt Markdown
  
  // Kategorisierung
  category: ModuleCategory;
  tags: string[];                // Suchbegriffe
  
  // Preisgestaltung
  pricing: ModulePricing;
  
  // Entwickler
  developer: ModuleDeveloper;
  
  // Statistiken
  stats: ModuleStats;
  
  // Medien
  media: ModuleMedia;
  
  // Technische Infos
  technical: ModuleTechnical;
  
  // Changelog
  changelog: ChangelogEntry[];
  
  // Flags
  isFeatured?: boolean;          // Editor's Choice
  isTrending?: boolean;          // Trending diese Woche
  isNew?: boolean;               // Neu im Marketplace (< 30 Tage)
  isBuiltIn?: boolean;           // Bereits in LifeOS integriert
  isUserCreated?: boolean;       // Vom Benutzer erstellt (Module Builder)
  isWebApp?: boolean;            // Web-App (wird per Browser gestreamt)
  isNativeApp?: boolean;         // Legacy-Flag (frueher VNC/macOS; nicht mehr genutzt)
  
  // Route zum Modul (wenn installiert)
  route?: string;

  // Optional: Eintragstyp innerhalb "Bases & Module"
  entityType?: 'module' | 'base';
  // Optional: Nur für Base-Einträge
  includedModules?: string[];
  baseCategory?: BaseCategory;
}

// --------------------------------------------
// Bewertungs-Interface
// Eine einzelne Bewertung von einem Nutzer
// --------------------------------------------

export interface ModuleReview {
  id: string;
  moduleId: string;
  
  // Nutzer-Info
  userId: string;
  userName: string;
  userAvatar?: string;
  
  // Bewertung
  rating: number;                // 1-5 Sterne
  title: string;                 // Kurzer Titel
  content: string;               // Ausführlicher Text
  
  // Metadaten
  createdAt: string;             // ISO Date String
  updatedAt?: string;            // Falls bearbeitet
  
  // Interaktion
  helpfulCount: number;          // "War hilfreich" Zähler
  
  // Entwickler-Antwort
  developerResponse?: {
    content: string;
    createdAt: string;
  };
}

// --------------------------------------------
// User Review (für Store)
// Bewertung die der aktuelle Nutzer abgibt
// --------------------------------------------

export interface UserReview {
  rating: number;
  title: string;
  content: string;
  createdAt: string;
}

// --------------------------------------------
// Filter & Sortierung
// Für die Marketplace-Ansicht
// --------------------------------------------

export type SortOption = 
  | 'popular'      // Nach Downloads
  | 'rating'       // Nach Bewertung
  | 'newest'       // Nach Erscheinungsdatum
  | 'updated'      // Nach letztem Update
  | 'name';        // Alphabetisch

export type PriceFilter = 'all' | 'free' | 'paid';

export type RatingFilter = 'all' | '4+' | '3+';

export interface MarketplaceFilters {
  search: string;
  category: ModuleCategory | 'all';
  priceFilter: PriceFilter;
  ratingFilter: RatingFilter;
  sortBy: SortOption;
}

// --------------------------------------------
// Default Filter-Werte
// --------------------------------------------

export const DEFAULT_FILTERS: MarketplaceFilters = {
  search: '',
  category: 'all',
  priceFilter: 'all',
  ratingFilter: 'all',
  sortBy: 'popular',
};

// --------------------------------------------
// Hilfsfunktionen für Preisdarstellung
// --------------------------------------------

/**
 * Formatiert einen Preis zur Anzeige
 * @param pricing - Preismodell des Moduls
 * @returns Formatierter Preis-String
 */
export function formatPrice(pricing: ModulePricing): string {
  if (pricing.type === 'free') {
    return 'Kostenlos';
  }
  
  if (pricing.type === 'freemium') {
    return 'Freemium';
  }
  
  if (!pricing.price) {
    return 'Kostenlos';
  }
  
  // Preis von Cent in Euro/Dollar konvertieren
  const priceValue = (pricing.price / 100).toFixed(2);
  const currencySymbol = pricing.currency === 'USD' ? '$' : '€';
  
  if (pricing.type === 'subscription') {
    const intervalLabel = pricing.interval === 'year' ? '/Jahr' : '/Monat';
    return `${currencySymbol}${priceValue}${intervalLabel}`;
  }
  
  return `${currencySymbol}${priceValue}`;
}

/**
 * Prüft ob ein Modul kostenpflichtig ist
 * @param pricing - Preismodell des Moduls
 * @returns true wenn kostenpflichtig
 */
export function isPaidModule(pricing: ModulePricing): boolean {
  return pricing.type === 'paid' || pricing.type === 'subscription';
}

// --------------------------------------------
// Hilfsfunktionen für Statistiken
// --------------------------------------------

/**
 * Formatiert große Zahlen zur Anzeige
 * @param num - Zahl zum Formatieren
 * @returns Formatierter String (z.B. "12.5K")
 */
export function formatDownloads(num: number): string {
  const locale = typeof document === 'undefined' ? DEFAULT_LOCALE : getCookieLocale();

  if (num >= 1000000) {
    return `${new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    }).format(num / 1000000)}M`;
  }
  if (num >= 1000) {
    return `${new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    }).format(num / 1000)}K`;
  }
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Berechnet relative Zeit seit einem Datum
 * @param dateString - ISO Date String
 * @returns Relativer Zeit-String (z.B. "vor 3 Tagen")
 */
export function getRelativeTime(dateString: string): string {
  const locale = typeof document === 'undefined' ? DEFAULT_LOCALE : getCookieLocale();
  return formatRelativeTime(dateString, locale);
}
