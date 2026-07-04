// ============================================
// index.ts - Events Module Export
// 
// Zweck: Re-exportiert alle Event-bezogenen Module
// Verwendet von: Module, Components
// ============================================

export {
  useEventBus,
  useModuleEvents,
  STANDARD_EVENTS,
} from './event-bus';

export type {
  StandardEventType,
  CalendarEventPayload,
  InboxEmailPayload,
  NotificationPayload,
  DataPayload,
} from './event-bus';



