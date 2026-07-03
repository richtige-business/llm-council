// ============================================
// providers.ts - Bekannte E-Mail-Provider Konfigurationen
// 
// Zweck: IMAP/SMTP Server-Konfigurationen für bekannte Provider
//        Diese Datei kann im Client UND Server verwendet werden
// Verwendet von: AccountSetup.tsx, imap.ts
// ============================================

// --------------------------------------------
// Bekannte IMAP/SMTP Server-Konfigurationen
// Diese werden automatisch angewendet wenn der Provider erkannt wird
// --------------------------------------------

export const KNOWN_PROVIDERS: Record<string, {
  name: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
}> = {
  'gmx.de': {
    name: 'GMX',
    imapHost: 'imap.gmx.net',
    imapPort: 993,
    smtpHost: 'mail.gmx.net',
    smtpPort: 587,
  },
  'gmx.net': {
    name: 'GMX',
    imapHost: 'imap.gmx.net',
    imapPort: 993,
    smtpHost: 'mail.gmx.net',
    smtpPort: 587,
  },
  'web.de': {
    name: 'WEB.DE',
    imapHost: 'imap.web.de',
    imapPort: 993,
    smtpHost: 'smtp.web.de',
    smtpPort: 587,
  },
  't-online.de': {
    name: 'T-Online',
    imapHost: 'secureimap.t-online.de',
    imapPort: 993,
    smtpHost: 'securesmtp.t-online.de',
    smtpPort: 465,
  },
  'freenet.de': {
    name: 'Freenet',
    imapHost: 'mx.freenet.de',
    imapPort: 993,
    smtpHost: 'mx.freenet.de',
    smtpPort: 587,
  },
  'yahoo.com': {
    name: 'Yahoo',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    smtpHost: 'smtp.mail.yahoo.com',
    smtpPort: 587,
  },
  'yahoo.de': {
    name: 'Yahoo',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    smtpHost: 'smtp.mail.yahoo.com',
    smtpPort: 587,
  },
  'icloud.com': {
    name: 'iCloud',
    imapHost: 'imap.mail.me.com',
    imapPort: 993,
    smtpHost: 'smtp.mail.me.com',
    smtpPort: 587,
  },
  'me.com': {
    name: 'iCloud',
    imapHost: 'imap.mail.me.com',
    imapPort: 993,
    smtpHost: 'smtp.mail.me.com',
    smtpPort: 587,
  },
  'aol.com': {
    name: 'AOL',
    imapHost: 'imap.aol.com',
    imapPort: 993,
    smtpHost: 'smtp.aol.com',
    smtpPort: 587,
  },
  'posteo.de': {
    name: 'Posteo',
    imapHost: 'posteo.de',
    imapPort: 993,
    smtpHost: 'posteo.de',
    smtpPort: 587,
  },
  'mailbox.org': {
    name: 'Mailbox.org',
    imapHost: 'imap.mailbox.org',
    imapPort: 993,
    smtpHost: 'smtp.mailbox.org',
    smtpPort: 587,
  },
};

// --------------------------------------------
// Provider aus E-Mail-Domain erkennen
// --------------------------------------------

export function detectProvider(email: string): typeof KNOWN_PROVIDERS[string] | null {
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) return null;
  
  return KNOWN_PROVIDERS[domain] || null;
}











