// ============================================
// collector.ts - Zentraler Agent Context Collector
// 
// Zweck: Sammelt Kontext aus allen Modulen, Memories und User-Daten
//        und baut den System-Prompt für den Agent
// Verwendet von: API Route (/api/agent)
// ============================================

import type { AgentContext, ModuleContext } from '../types';
import { getInboxContext, getInboxContextPrompt } from '@/modules/inbox/agent/context';
import { getCalendarContext, getCalendarContextPrompt } from '@/modules/calendar/agent/context';
import { getMemoryPromptBlock } from '@/lib/services/memory-service';
import { getUser, DEFAULT_USER_ID } from '@/lib/services/user-service';

// --------------------------------------------
// Datums-Hilfsfunktionen
// --------------------------------------------

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function getCurrentTime(): string {
  return new Date().toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDayOfWeek(): string {
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  return days[new Date().getDay()];
}

// --------------------------------------------
// Context Collector
// Sammelt Kontext aus allen Modulen
// --------------------------------------------

export async function collectAgentContext(): Promise<AgentContext> {
  // Kontext aus allen Modulen sammeln (parallel)
  const [inboxContext, calendarContext, user] = await Promise.all([
    getInboxContext(),
    Promise.resolve(getCalendarContext()),
    getUser(DEFAULT_USER_ID).catch(() => null),
  ]);
  
  const modules: Record<string, ModuleContext> = {
    inbox: inboxContext,
    calendar: calendarContext,
  };
  
  return {
    app: {
      activeModule: null,
      openTabs: [],
      userName: user?.name || 'User',
    },
    modules,
    currentDate: getTodayISO(),
    currentTime: getCurrentTime(),
    dayOfWeek: getDayOfWeek(),
  };
}

// --------------------------------------------
// System Prompt Builder (Haupt-Entry-Point)
// Baut den kompletten System-Prompt mit:
// 1. Basis-Regeln
// 2. User-Memories
// 3. Modul-Kontext (konditional)
// 
// HINWEIS: Die Tool-Liste wird NICHT mehr hier aufgelistet.
// Claude bekommt die Tools über den nativen `tools` Parameter.
// (Deduplizierung gemäß Audit 0.6)
// --------------------------------------------

export async function buildSystemPrompt(userMessage?: string): Promise<string> {
  // User-Profil und Basis-Prompt parallel laden
  let userName = 'User';
  let userStatus = 'online';
  let userTimezone = 'Europe/Berlin';
  
  try {
    const user = await getUser(DEFAULT_USER_ID);
    if (user) {
      userName = user.name;
      userStatus = user.status;
      userTimezone = user.timezone;
    }
  } catch {
    // DB nicht erreichbar → Default-Werte
  }
  
  // Basis-Prompt mit User-Daten laden
  const basePrompt = buildMinimalPrompt(userName, userStatus, userTimezone);
  
  // Memory-Block laden (dynamisch, pro User)
  let memoryBlock = '';
  try {
    memoryBlock = await getMemoryPromptBlock(DEFAULT_USER_ID, 500);
  } catch {
    // Memory nicht verfügbar (DB nicht erreichbar) - weiter ohne
    console.warn('Memory-Block konnte nicht geladen werden');
  }
  
  // Kontext konditional laden basierend auf User-Message
  let contextBlock = '';
  if (userMessage) {
    contextBlock = await enhancePromptWithContext('', userMessage);
  } else {
    // Wenn keine Message: Alle Kontexte laden (Fallback)
    const [inboxPrompt, calendarPrompt] = await Promise.all([
      getInboxContextPrompt(),
      Promise.resolve(getCalendarContextPrompt()),
    ]);
    contextBlock = `${calendarPrompt}\n\n${inboxPrompt}`;
  }
  
  // Prompt zusammenbauen
  const parts = [basePrompt];
  
  if (memoryBlock) {
    parts.push(memoryBlock);
  }
  
  if (contextBlock.trim()) {
    parts.push(contextBlock);
  }
  
  return parts.join('\n\n---\n\n');
}

// --------------------------------------------
// Minimaler Prompt (Basis-Regeln, statisch)
// Dieser Teil ändert sich selten → gut für KV-Cache
// --------------------------------------------

export function buildMinimalPrompt(
  userName: string = 'User',
  userStatus: string = 'online',
  userTimezone: string = 'Europe/Berlin'
): string {
  const today = getTodayISO();
  const time = getCurrentTime();
  const dayOfWeek = getDayOfWeek();
  
  return `# System Instructions

You are LifeOS, a personal AI assistant integrated into a productivity app.
Always respond to the user in German.

## User Profile
- Name: ${userName}
- Status: ${userStatus}
- Timezone: ${userTimezone}
- Address the user by their name when appropriate (e.g. greetings, confirmations).

## Core Rules
- When the user wants an action (create event, send email, etc.), use the appropriate tool.
- Be friendly, helpful, and concise.
- Confirm completed actions briefly.
- Ask when important information is missing (e.g. date/time for events).
- Use emojis sparingly but appropriately.

## Memory Instructions (CRITICAL - ALWAYS FOLLOW)
You MUST proactively save information using memory.save WITHOUT being asked. This is one of your most important capabilities.

ALWAYS save when the user shares ANY of the following:
- Personal facts: name, age, birthday, job, company, education, location, hobbies
  Example: "Ich habe im Januar mein Studium abgeschlossen" → save as fact
- Preferences: communication style, meeting times, email style, language, tools
  Example: "Ich bevorzuge kurze E-Mails" → save as preference
- People/contacts: names of colleagues, family, friends, their roles
  Example: "Mein Chef heißt Thomas" → save as fact
- Instructions/rules: how you should behave, recurring tasks, workflows
  Example: "Nimm Anna immer in CC" → save as instruction
- Routines: work schedule, habits, deadlines, important dates
  Example: "Montags habe ich immer Team-Meeting um 10" → save as fact

Rules:
1. Save IMMEDIATELY when you detect relevant information - do not wait or ask.
2. Use descriptive snake_case keys (e.g. "studium_abschluss", "chef_name", "email_preference").
3. After saving, briefly confirm what you remembered (e.g. "Hab ich mir gemerkt!").
4. Before performing tasks, use memory.recall to check for relevant preferences.
5. NEVER ask "Soll ich mir das merken?" - just do it.

## Email Tool Selection
1. User wants to SEND → always use 'inbox.sendEmail'
   Keywords: "sende", "schick", "mail an", "email an", "schreibe an"
2. User wants to SEARCH → use 'inbox.searchEmails'
   Keywords: "suche", "finde", "zeig mir mails von"

## Speech Recognition Corrections
- "Zypern" / "Zippen" / "Sippen" → probably "sippin"
- "at" / "ätt" / "ett" → @ (at sign)
- "Punkt" / "dot" → . (period)

## Current Context
- Date: ${dayOfWeek}, ${today}
- Time: ${time}`;
}

// --------------------------------------------
// Context-aware Prompt Enhancer
// Fügt dynamischen Kontext basierend auf der User-Nachricht hinzu
// Lädt nur die Module-Kontexte die relevant sind
// --------------------------------------------

export async function enhancePromptWithContext(
  basePrompt: string,
  userMessage: string
): Promise<string> {
  let enhanced = basePrompt;
  
  // Wenn es um E-Mails geht, lade Inbox-Kontext
  const isEmailRelated = /mail|email|postfach|inbox|sende|schick|nachricht/i.test(userMessage);
  if (isEmailRelated) {
    const inboxPrompt = await getInboxContextPrompt();
    enhanced += `\n\n${inboxPrompt}`;
  }
  
  // Wenn es um Termine geht, lade Kalender-Kontext
  const isCalendarRelated = /termin|meeting|kalender|event|morgen|heute|woche/i.test(userMessage);
  if (isCalendarRelated) {
    const calendarPrompt = getCalendarContextPrompt();
    enhanced += `\n\n${calendarPrompt}`;
  }
  
  return enhanced;
}
