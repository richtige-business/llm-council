// ============================================
// page.tsx - Inbox Route
// 
// Zweck: Next.js App Router Seite für /inbox
// Verwendet von: Routing
// ============================================

import { Suspense } from 'react';
import { InboxPage } from '@/modules/inbox/components';

export default function Inbox() {
  return (
    <Suspense fallback={<InboxPageFallback />}>
      <InboxPage />
    </Suspense>
  );
}

function InboxPageFallback() {
  return <div className="flex h-full items-center justify-center p-4 text-sm text-white/60">Postfach wird geladen...</div>;
}











