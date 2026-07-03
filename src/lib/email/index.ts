// ============================================
// index.ts - Email Utilities Exports
// 
// Zweck: Zentraler Export für alle E-Mail-Utilities
// HINWEIS: Client-safe Exporte hier, Server-only in imap.ts
// ============================================

// Client-safe Exporte (können im Browser verwendet werden)
export {
  KNOWN_PROVIDERS,
  detectProvider,
} from './providers';

// Server-only Exporte müssen direkt aus './imap' importiert werden
// import { testImapConnection, fetchImapMessages, ... } from '@/lib/email/imap';

