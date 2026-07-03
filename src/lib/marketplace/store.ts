// ============================================
// store.ts - Marketplace Zustand Store
// 
// Zweck: Verwaltet den Marketplace-State (Installationen, Wishlist, Reviews)
// Verwendet von: Library Page, Detail Page, Marketplace Komponenten
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserReview, MarketplaceFilters, SortOption, PriceFilter, RatingFilter, ModuleCategory } from './types';

// --------------------------------------------
// Store State Interface
// Definiert alle Daten die gespeichert werden
// --------------------------------------------

interface MarketplaceState {
  // --------------------------------------------
  // Installierte Module
  // Liste der Module-IDs die der User "installiert" hat
  // --------------------------------------------
  installedModules: string[];
  
  // --------------------------------------------
  // Wishlist / Wunschliste
  // Module die der User später installieren möchte
  // --------------------------------------------
  wishlist: string[];
  
  // --------------------------------------------
  // User-Bewertungen
  // Bewertungen die der aktuelle Nutzer abgegeben hat
  // Key: moduleId, Value: Review-Daten
  // --------------------------------------------
  userReviews: Record<string, UserReview>;
  
  // --------------------------------------------
  // Hilfreiche Bewertungen
  // IDs von Reviews die der User als "hilfreich" markiert hat
  // --------------------------------------------
  helpfulReviews: string[];
  
  // --------------------------------------------
  // Filter-State
  // Aktuelle Filter-Einstellungen für die Marketplace-Ansicht
  // --------------------------------------------
  filters: MarketplaceFilters;
  
  // --------------------------------------------
  // Ansichts-Modus
  // Grid oder Liste
  // --------------------------------------------
  viewMode: 'grid' | 'list';
  
  // --------------------------------------------
  // Aktiver Marketplace Tab
  // apps, models, integrations, datasets
  // --------------------------------------------
  activeTab: 'apps' | 'models' | 'integrations' | 'datasets';
}

// --------------------------------------------
// Store Actions Interface
// Alle Funktionen die den State ändern
// --------------------------------------------

interface MarketplaceActions {
  // Installation
  installModule: (moduleId: string) => void;
  uninstallModule: (moduleId: string) => void;
  isModuleInstalled: (moduleId: string) => boolean;
  
  // Wishlist
  toggleWishlist: (moduleId: string) => void;
  isInWishlist: (moduleId: string) => boolean;
  
  // Reviews
  addReview: (moduleId: string, review: UserReview) => void;
  updateReview: (moduleId: string, review: UserReview) => void;
  deleteReview: (moduleId: string) => void;
  getUserReview: (moduleId: string) => UserReview | null;
  
  // Helpful
  markReviewHelpful: (reviewId: string) => void;
  unmarkReviewHelpful: (reviewId: string) => void;
  isReviewMarkedHelpful: (reviewId: string) => boolean;
  
  // Filter
  setSearchQuery: (query: string) => void;
  setCategory: (category: ModuleCategory | 'all') => void;
  setPriceFilter: (filter: PriceFilter) => void;
  setRatingFilter: (filter: RatingFilter) => void;
  setSortBy: (sort: SortOption) => void;
  resetFilters: () => void;
  
  // View
  setViewMode: (mode: 'grid' | 'list') => void;
  setActiveTab: (tab: 'apps' | 'models' | 'integrations' | 'datasets') => void;
}

// --------------------------------------------
// Default Filter-Werte
// --------------------------------------------

const DEFAULT_FILTERS: MarketplaceFilters = {
  search: '',
  category: 'all',
  priceFilter: 'all',
  ratingFilter: 'all',
  sortBy: 'popular',
};

// --------------------------------------------
// Zustand Store erstellen
// Mit persist middleware für LocalStorage
// --------------------------------------------

export const useMarketplaceStore = create<MarketplaceState & MarketplaceActions>()(
  persist(
    (set, get) => ({
      // --------------------------------------------
      // Initial State
      // --------------------------------------------
      installedModules: [],
      wishlist: [],
      userReviews: {},
      helpfulReviews: [],
      filters: DEFAULT_FILTERS,
      viewMode: 'grid',
      activeTab: 'apps',
      
      // --------------------------------------------
      // Installation Actions
      // Modul installieren/deinstallieren
      // --------------------------------------------
      
      installModule: (moduleId) => {
        set((state) => {
          // Prüfen ob bereits installiert
          if (state.installedModules.includes(moduleId)) {
            return state;
          }
          return {
            installedModules: [...state.installedModules, moduleId],
          };
        });
      },
      
      uninstallModule: (moduleId) => {
        set((state) => ({
          installedModules: state.installedModules.filter(id => id !== moduleId),
        }));
      },
      
      isModuleInstalled: (moduleId) => {
        return get().installedModules.includes(moduleId);
      },
      
      // --------------------------------------------
      // Wishlist Actions
      // Modul zur Wunschliste hinzufügen/entfernen
      // --------------------------------------------
      
      toggleWishlist: (moduleId) => {
        set((state) => {
          const isInList = state.wishlist.includes(moduleId);
          return {
            wishlist: isInList
              ? state.wishlist.filter(id => id !== moduleId)
              : [...state.wishlist, moduleId],
          };
        });
      },
      
      isInWishlist: (moduleId) => {
        return get().wishlist.includes(moduleId);
      },
      
      // --------------------------------------------
      // Review Actions
      // Bewertungen verwalten
      // --------------------------------------------
      
      addReview: (moduleId, review) => {
        set((state) => ({
          userReviews: {
            ...state.userReviews,
            [moduleId]: review,
          },
        }));
      },
      
      updateReview: (moduleId, review) => {
        set((state) => ({
          userReviews: {
            ...state.userReviews,
            [moduleId]: review,
          },
        }));
      },
      
      deleteReview: (moduleId) => {
        set((state) => {
          const newReviews = { ...state.userReviews };
          delete newReviews[moduleId];
          return { userReviews: newReviews };
        });
      },
      
      getUserReview: (moduleId) => {
        return get().userReviews[moduleId] || null;
      },
      
      // --------------------------------------------
      // Helpful Actions
      // Reviews als hilfreich markieren
      // --------------------------------------------
      
      markReviewHelpful: (reviewId) => {
        set((state) => {
          if (state.helpfulReviews.includes(reviewId)) {
            return state;
          }
          return {
            helpfulReviews: [...state.helpfulReviews, reviewId],
          };
        });
      },
      
      unmarkReviewHelpful: (reviewId) => {
        set((state) => ({
          helpfulReviews: state.helpfulReviews.filter(id => id !== reviewId),
        }));
      },
      
      isReviewMarkedHelpful: (reviewId) => {
        return get().helpfulReviews.includes(reviewId);
      },
      
      // --------------------------------------------
      // Filter Actions
      // Marketplace Filter verwalten
      // --------------------------------------------
      
      setSearchQuery: (query) => {
        set((state) => ({
          filters: { ...state.filters, search: query },
        }));
      },
      
      setCategory: (category) => {
        set((state) => ({
          filters: { ...state.filters, category },
        }));
      },
      
      setPriceFilter: (filter) => {
        set((state) => ({
          filters: { ...state.filters, priceFilter: filter },
        }));
      },
      
      setRatingFilter: (filter) => {
        set((state) => ({
          filters: { ...state.filters, ratingFilter: filter },
        }));
      },
      
      setSortBy: (sort) => {
        set((state) => ({
          filters: { ...state.filters, sortBy: sort },
        }));
      },
      
      resetFilters: () => {
        set({ filters: DEFAULT_FILTERS });
      },
      
      // --------------------------------------------
      // View Actions
      // Ansichts-Einstellungen
      // --------------------------------------------
      
      setViewMode: (mode) => {
        set({ viewMode: mode });
      },
      
      setActiveTab: (tab) => {
        set({ activeTab: tab });
      },
    }),
    {
      // --------------------------------------------
      // Persist Konfiguration
      // Speichert State im LocalStorage
      // --------------------------------------------
      name: 'lifeos-marketplace-state',
      
      // Nur bestimmte Felder persistieren
      partialize: (state) => ({
        installedModules: state.installedModules,
        wishlist: state.wishlist,
        userReviews: state.userReviews,
        helpfulReviews: state.helpfulReviews,
        viewMode: state.viewMode,
        // Filter nicht persistieren (soll bei Neustart zurückgesetzt werden)
      }),
      merge: (persistedState, currentState) => {
        const merged =
          persistedState && typeof persistedState === 'object'
            ? { ...currentState, ...persistedState }
            : currentState;
        const removedId = 'desktop-runner';
        if (Array.isArray(merged.installedModules)) {
          merged.installedModules = merged.installedModules.filter((x) => x !== removedId);
        }
        if (Array.isArray(merged.wishlist)) {
          merged.wishlist = merged.wishlist.filter((x) => x !== removedId);
        }
        if (
          merged.userReviews &&
          typeof merged.userReviews === 'object' &&
          removedId in merged.userReviews
        ) {
          const { [removedId]: _drop, ...rest } = merged.userReviews;
          merged.userReviews = rest;
        }
        return merged;
      },
    }
  )
);

// --------------------------------------------
// Selectors für optimierte Re-renders
// Verwende diese statt direktem Store-Zugriff
// --------------------------------------------

export const useInstalledModules = () => 
  useMarketplaceStore((state) => state.installedModules);

export const useWishlist = () => 
  useMarketplaceStore((state) => state.wishlist);

export const useMarketplaceFilters = () => 
  useMarketplaceStore((state) => state.filters);

export const useMarketplaceViewMode = () => 
  useMarketplaceStore((state) => state.viewMode);

export const useMarketplaceActiveTab = () => 
  useMarketplaceStore((state) => state.activeTab);

// --------------------------------------------
// Hilfsfunktion: Modul-Status ermitteln
// Gibt den aktuellen Status eines Moduls zurück
// --------------------------------------------

export type ModuleStatus = 'not_installed' | 'installed' | 'built_in';

export function getModuleStatus(
  moduleId: string, 
  isBuiltIn: boolean,
  installedModules: string[]
): ModuleStatus {
  if (isBuiltIn) return 'built_in';
  if (installedModules.includes(moduleId)) return 'installed';
  return 'not_installed';
}


