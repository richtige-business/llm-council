// ============================================
// /app/browser/page.tsx - Route für das Browser-Modul
// 
// Zweck: Next.js App Router Seite für /browser
//        Bindet die BrowserPage Komponente ein
// Verwendet von: Navigation, Sidebar-Links
// ============================================

import { BrowserPage } from '@/modules/browser/components';

// --------------------------------------------
// Metadata für SEO und Browser-Tab
// --------------------------------------------

export const metadata = {
  title: 'Browser | LifeOS',
  description: 'Web-Browser mit Tabs, Verlauf und Lesezeichen',
};

// --------------------------------------------
// Seiten-Komponente
// Rendert einfach die BrowserPage aus dem Modul
// --------------------------------------------

export default function BrowserRoute() {
  return <BrowserPage />;
}











