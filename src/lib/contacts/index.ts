// ============================================
// index.ts - Contacts Library Exports
// 
// Zweck: Zentrale Exports für Kontakt-Funktionalitäten
// Verwendet von: API Routes, Komponenten
// ============================================

export {
  findOrCreateContact,
  checkAndCreateContactForBidirectionalMail,
  updateContactCategory,
  getContacts,
  deleteContact,
  linkMessageToContact,
  linkAllMessagesFromSender,
  classifyEmailCategory,
  extractNameFromEmail,
} from './contact-service';

export type {
  ContactData,
  ContactCreateResult,
} from './contact-service';
