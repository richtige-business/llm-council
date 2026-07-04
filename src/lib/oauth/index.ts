// ============================================
// index.ts - OAuth Exports
// 
// Zweck: Zentraler Export für alle OAuth-Utilities
// ============================================

export {
  getGoogleAuthUrl,
  exchangeCodeForTokens as exchangeGoogleCode,
  refreshAccessToken as refreshGoogleToken,
  getGoogleUserInfo,
  // Nachrichten
  fetchGmailMessages,
  fetchGmailMessage,
  modifyGmailMessage,
  sendGmailMessage,
  trashGmailMessage,
  untrashGmailMessage,
  deleteGmailMessagePermanently,
  // Entwürfe
  createGmailDraft,
  updateGmailDraft,
  deleteGmailDraft,
  fetchGmailDrafts,
  sendGmailDraft,
  // Spam
  markAsSpam,
  unmarkAsSpam,
  // Gesendet
  fetchGmailSentMessages,
  // Konstanten
  GMAIL_LABELS,
  type GoogleTokens,
  type GoogleUserInfo,
} from './google';

export {
  getMicrosoftAuthUrl,
  exchangeCodeForTokens as exchangeMicrosoftCode,
  refreshAccessToken as refreshMicrosoftToken,
  getMicrosoftUserInfo,
  fetchOutlookMessages,
  fetchOutlookMessage,
  updateOutlookMessage,
  sendOutlookMessage,
  type MicrosoftTokens,
  type MicrosoftUserInfo,
} from './microsoft';




