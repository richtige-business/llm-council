// ============================================
// /app/calendar/page.tsx - Route für das Kalender-Modul
// 
// Zweck: Next.js App Router Seite für /calendar
//        Bindet die CalendarPage Komponente ein
// Verwendet von: Navigation, Sidebar-Links
// ============================================

import { CalendarPage } from '@/modules/calendar/components';

// --------------------------------------------
// Metadata für SEO und Browser-Tab
// --------------------------------------------

export const metadata = {
  title: 'Kalender | LifeOS',
  description: 'Plane und verwalte deine Termine und Events',
};

// --------------------------------------------
// Seiten-Komponente
// Rendert einfach die CalendarPage aus dem Modul
// --------------------------------------------

export default function CalendarRoute() {
  return <CalendarPage />;
}











