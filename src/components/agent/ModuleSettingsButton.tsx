// ============================================
// ModuleSettingsButton.tsx - Einstellungs-Zahnrad für Module
// 
// Zweck: Legacy-Platzhalter für den früheren Floating-Settings-Button
// Verwendet von: CalendarPage, InboxPage, etc.
// ============================================

'use client';

// --------------------------------------------
// Props
// --------------------------------------------

interface ModuleSettingsButtonProps {
  moduleId: string;
  moduleName: string;
  moduleColor?: string;
}

// --------------------------------------------
// Komponente
// --------------------------------------------

export function ModuleSettingsButton(_props: ModuleSettingsButtonProps) {
  void _props;
  return null;
}

export default ModuleSettingsButton;


