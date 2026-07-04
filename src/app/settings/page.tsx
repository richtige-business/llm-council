'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { 
  Settings, 
  Image as ImageIcon, 
  Check, 
  Link as LinkIcon, 
  User, 
  AppWindow, 
  Palette, 
  Sparkles, 
  Type, 
  Square, 
  Send,
  LayoutList,
  GripVertical,
  Eye,
  EyeOff,
  Calendar,
  Mail,
  Globe,
  Monitor,
  MessageSquare,
  Wallet,
  CheckSquare,
  Users,
  Blocks,
  Trash2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { 
  useAppStore, 
  defaultBackgrounds, 
  DESIGN_STYLES, 
  ACCENT_COLORS, 
  SURFACE_COLORS, 
  TEXT_COLORS, 
  APP_FONTS,
  SOLID_BACKGROUNDS,
  type DesignStyle 
} from '@/lib/store/app-store';
import { enforceMinRgbaAlpha, useThemeStyles } from '@/lib/theme';
import { useModuleRegistry } from '@/lib/modules/registry';
import { setCookieLocale } from '@/lib/i18n/runtime';
import type { AppLocale } from '@/lib/i18n/config';

// --------------------------------------------
// resolveSettingsIcon - Dynamischer Icon-Resolver fuer Settings
// Liest den Icon-Namen aus dem Modul und gibt die Lucide-Komponente zurueck.
// Fuer native/web Apps wird null zurueckgegeben (dann wird <img> genutzt).
// --------------------------------------------

function resolveSettingsIcon(iconName: string | undefined, moduleId?: string): React.ComponentType<{ className?: string }> {
  if (iconName?.startsWith('http')) return Blocks; // Wird durch <img> ersetzt
  if (iconName) {
    const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
    if (icons[iconName]) return icons[iconName];
    const pascal = iconName.charAt(0).toUpperCase() + iconName.slice(1);
    if (icons[pascal]) return icons[pascal];
  }
  if (moduleId?.startsWith('native-')) return Monitor;
  if (moduleId?.startsWith('webapp-')) return Globe;
  return Blocks;
}

// --------------------------------------------
// Typen für E-Mail-Konten
// --------------------------------------------

interface EmailAccount {
  id: string;
  provider: 'gmail' | 'outlook' | 'imap';
  email: string;
  displayName: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  messageCount: number;
}

export default function SettingsPage() {
  const t = useTranslations();
  // --------------------------------------------
  // Store-Selektoren (Performance-optimiert)
  // --------------------------------------------
  const backgroundImage = useAppStore((state) => state.backgroundImage);
  const setBackgroundImage = useAppStore((state) => state.setBackgroundImage);
  const userName = useAppStore((state) => state.userName);
  const setUserName = useAppStore((state) => state.setUserName);
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);
  const tabBackground = useAppStore((state) => state.tabBackground);
  const setTabBackground = useAppStore((state) => state.setTabBackground);
  const designStyle = useAppStore((state) => state.designStyle);
  const setDesignStyle = useAppStore((state) => state.setDesignStyle);
  const accentColor = useAppStore((state) => state.accentColor);
  const setAccentColor = useAppStore((state) => state.setAccentColor);
  const surfaceColor = useAppStore((state) => state.surfaceColor);
  const setSurfaceColor = useAppStore((state) => state.setSurfaceColor);
  const textColor = useAppStore((state) => state.textColor);
  const setTextColor = useAppStore((state) => state.setTextColor);
  const buttonTextColor = useAppStore((state) => state.buttonTextColor);
  const setButtonTextColor = useAppStore((state) => state.setButtonTextColor);
  const appFont = useAppStore((state) => state.appFont);
  const setAppFont = useAppStore((state) => state.setAppFont);
  const backgroundType = useAppStore((state) => state.backgroundType);
  const setBackgroundType = useAppStore((state) => state.setBackgroundType);
  const solidBackground = useAppStore((state) => state.solidBackground);
  const setSolidBackground = useAppStore((state) => state.setSolidBackground);
  const sidebarModules = useAppStore((state) => state.sidebarModules);
  const toggleSidebarModule = useAppStore((state) => state.toggleSidebarModule);
  
  // Module aus der Registry
  const registryModules = useModuleRegistry((state) => state.modules);
  
  // Generierte Module aus API laden
  const [allModules, setAllModules] = useState<Array<{ id: string; name: string; description: string; icon: string }>>([]);
  
  useEffect(() => {
    const loadModules = async () => {
      // Basis-Module (Built-in)
      const builtInModules = [
        { id: 'calendar', name: 'Kalender', description: 'Termine und Events', icon: 'Calendar' },
        { id: 'inbox', name: 'Inbox', description: 'E-Mail Posteingang', icon: 'Mail' },
        { id: 'browser', name: 'Browser', description: 'Web-Browser', icon: 'Globe' },
      ];
      
      // Module aus API laden
      try {
        const response = await fetch('/api/lab/activate');
        if (response.ok) {
          const data = await response.json();
          const apiModules = (data.modules || []).map((m: Record<string, unknown>) => ({
            id: m.id as string,
            name: m.name as string || m.id as string,
            description: m.description as string || 'Generiertes Modul',
            icon: m.icon as string || 'Blocks',
          }));
          setAllModules([...builtInModules, ...apiModules]);
        } else {
          setAllModules(builtInModules);
        }
      } catch {
        setAllModules(builtInModules);
      }
    };
    
    loadModules();
  }, []);
  
  // Theme-Styles für diese Seite
  const { container, button, input: inputStyles, designStyle: currentDesignStyle, accentColor: currentAccentColor, textColor: currentTextColor } = useThemeStyles();
  
  const [customUrl, setCustomUrl] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const [settingsSearchQuery, setSettingsSearchQuery] = useState('');
  const [privacyModeEnabled, setPrivacyModeEnabled] = useState(false);
  
  // E-Mail-Konten State
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  // E-Mail-Konten laden
  useEffect(() => {
    fetchEmailAccounts();
  }, []);

  // --------------------------------------------
  // Privacy Mode lokal spiegeln
  // Das Tool speichert den Zustand ebenfalls in localStorage.
  // --------------------------------------------

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setPrivacyModeEnabled(window.localStorage.getItem('llm-council-privacy-mode') === 'true');
  }, []);

  const fetchEmailAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const response = await fetch('/api/inbox/accounts');
      if (response.ok) {
        const data = await response.json();
        setEmailAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Konten:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleDeleteAccount = async (accountId: string, email: string) => {
    if (!confirm(t('settings.accountDeleteConfirm', { email }))) {
      return;
    }

    try {
      setDeletingAccountId(accountId);
      const response = await fetch(`/api/inbox/accounts?id=${accountId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setEmailAccounts(prev => prev.filter(acc => acc.id !== accountId));
      } else {
        const error = await response.json();
        alert(`${t('common.error')}: ${error.error || t('settings.deleteFailed')}`);
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      alert(t('settings.accountDeleteError'));
    } finally {
      setDeletingAccountId(null);
    }
  };

  const handleCustomUrl = () => {
    if (customUrl.trim()) {
      setBackgroundImage(customUrl.trim());
      setCustomUrl('');
    }
  };

  const handleSaveName = async () => {
    if (tempName.trim()) {
      const newName = tempName.trim();
      // Sofort im localStorage speichern (für schnelle UI-Aktualisierung)
      setUserName(newName);
      
      // Auch in der Datenbank speichern (async, Fehler ignorieren)
      try {
        await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
        });
      } catch {
        // API nicht erreichbar → localStorage reicht als Fallback
        console.warn('Name konnte nicht in DB gespeichert werden');
      }
    }
    setEditingName(false);
  };

  // --------------------------------------------
  // Privacy Mode sichtbar umschalten
  // Damit Visual-Recipes einen echten UI-Toggle haben.
  // --------------------------------------------

  const handlePrivacyModeChange = (enabled: boolean) => {
    setPrivacyModeEnabled(enabled);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('llm-council-privacy-mode', String(enabled));
    }
  };

  // --------------------------------------------
  // handleLanguageChange - Aktualisiert Sprache sofort
  // Erst lokal für unmittelbare UI-Reaktion, danach
  // asynchron im Profil persistieren.
  // --------------------------------------------

  const handleLanguageChange = async (nextLocale: AppLocale) => {
    if (locale === nextLocale) return;

    setLocale(nextLocale);
    setCookieLocale(nextLocale);
    document.documentElement.lang = nextLocale;

    try {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: nextLocale }),
      });
    } catch {
      console.warn('Sprache konnte nicht in DB gespeichert werden');
    }
  };

  return (
    // h-full für volle verfügbare Höhe (Shell kümmert sich um Chatbar-Freiraum)
    <div
      className="flex h-full items-start justify-center overflow-y-auto p-4 pt-6 md:p-6 md:pt-8"
      data-agent-panel="settings-root"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-6xl p-4 sm:p-6 lg:p-8"
        style={{
          ...container.base,
          // Dynamisch wie Sidebar: folgt Design-Stil + Oberflächenfarbe
          // Bei Glass: weniger transparent + starker Blur für echten Milchglas-Effekt
          background: currentDesignStyle === 'glass'
            ? enforceMinRgbaAlpha(String(surfaceColor), 0.42)
            : container.base.background,
          backdropFilter: currentDesignStyle === 'glass'
            ? 'blur(48px) saturate(175%)'
            : container.base.backdropFilter,
          WebkitBackdropFilter: currentDesignStyle === 'glass'
            ? 'blur(48px) saturate(175%)'
            : container.base.WebkitBackdropFilter,
          border: container.base.border,
          boxShadow: container.base.boxShadow,
        }}
      >
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white drop-shadow-sm">{t('settings.title')}</h1>
            <p className="text-white/60">{t('settings.subtitle')}</p>
          </div>
        </div>

        {/* Settings-Suche */}
        <div className="mb-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-white/75">
              Einstellungen durchsuchen
            </label>
            <input
              type="text"
              value={settingsSearchQuery}
              onChange={(e) => setSettingsSearchQuery(e.target.value)}
              data-agent-input="settings-search"
              className="w-full rounded-xl bg-white/10 px-4 py-2 text-white placeholder:text-white/40 border border-white/10 focus:outline-none focus:border-white/30"
              placeholder="Design, Sprache, Privacy, Hintergrund..."
            />
            <p className="mt-2 text-xs text-white/45">
              Diese Suche dient als sichtbarer Fokuspunkt für Settings-Aktionen.
            </p>
          </div>
        </div>

        {/* User Name Section */}
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
            <User className="h-5 w-5 text-white/70" />
            {t('settings.yourName')}
          </h2>
          
          <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
            {editingName ? (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  className="flex-1 rounded-xl bg-white/10 px-4 py-2 text-white placeholder:text-white/40 border border-white/10 focus:outline-none focus:border-white/30"
                  placeholder={t('settings.yourName')}
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="rounded-xl px-4 py-2 font-medium text-white transition-colors"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor} 0%, #6366f1 100%)`,
                  }}
                >
                  {t('common.save')}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-lg text-white">{userName}</span>
                <button
                  onClick={() => {
                    setTempName(userName);
                    setEditingName(true);
                  }}
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20 border border-white/10"
                >
                  {t('common.edit')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Language Section */}
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
            <Globe className="h-5 w-5 text-white/70" />
            {t('settings.languageTitle')}
          </h2>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-4">
              <p className="text-sm text-white/80">{t('settings.languageDescription')}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/45">
                {t('settings.currentLanguage')}: {locale === 'de' ? t('common.german') : t('common.english')}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {([
                { id: 'de', label: t('common.german') },
                { id: 'en', label: t('common.english') },
              ] as const).map((languageOption) => {
                const isActive = locale === languageOption.id;

                return (
                  <button
                    key={languageOption.id}
                    type="button"
                    onClick={() => handleLanguageChange(languageOption.id)}
                    data-agent-button={`settings-language-${languageOption.id}`}
                    className="flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all"
                    style={{
                      borderColor: isActive ? `${accentColor}99` : 'rgba(255,255,255,0.08)',
                      background: isActive ? `${accentColor}1f` : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <div>
                      <p className="font-medium text-white">{languageOption.label}</p>
                      <p className="text-xs text-white/55">{languageOption.id.toUpperCase()}</p>
                    </div>
                    {isActive ? (
                      <Check className="h-5 w-5" style={{ color: accentColor }} />
                    ) : (
                      <div className="h-5 w-5 rounded-full border border-white/15" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* E-Mail-Konten Section */}
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
            <Mail className="h-5 w-5 text-white/70" />
            {t('settings.emailAccounts')}
          </h2>
          
          <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
            {loadingAccounts ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 text-white/40 animate-spin" />
              </div>
            ) : emailAccounts.length === 0 ? (
              <div className="text-center py-6">
                <Mail className="h-12 w-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/60">{t('settings.noEmailAccounts')}</p>
                <Link
                  href="/inbox"
                  className="inline-block mt-4 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors"
                  style={{ background: accentColor }}
                >
                  Konto verbinden
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {emailAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      {/* Provider Icon */}
                      <div 
                        className="flex h-10 w-10 items-center justify-center rounded-full"
                        style={{
                          background: account.provider === 'gmail' 
                            ? 'linear-gradient(135deg, #EA4335 0%, #FBBC04 50%, #34A853 100%)'
                            : account.provider === 'outlook'
                            ? 'linear-gradient(135deg, #0078D4 0%, #00BCF2 100%)'
                            : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        }}
                      >
                        <Mail className="h-5 w-5 text-white" />
                      </div>
                      
                      {/* Account Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">
                            {account.displayName || account.email}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                            {account.provider.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <span>{account.email}</span>
                          <span>•</span>
                          <span>{account.messageCount} Nachrichten</span>
                          {account.syncError && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-red-400">
                                <AlertCircle className="h-3 w-3" />
                                Sync-Fehler
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {account.syncError && (
                        <Link
                          href="/inbox"
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                        >
                          Neu verbinden
                        </Link>
                      )}
                      <button
                        onClick={() => handleDeleteAccount(account.id, account.email)}
                        disabled={deletingAccountId === account.id}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        {deletingAccountId === account.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        Entfernen
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Add Account Link */}
                <Link
                  href="/inbox"
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  Weiteres Konto verbinden
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Privacy Mode Section */}
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
            <EyeOff className="h-5 w-5 text-white/70" />
            Privacy Mode
          </h2>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="mb-4 text-sm text-white/70">
              Schaltet eine datensparsame lokale Darstellung um und macht Privacy-Aktionen sichtbar steuerbar.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handlePrivacyModeChange(true)}
                data-agent-button="settings-privacy-on"
                className="flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all"
                style={{
                  borderColor: privacyModeEnabled ? `${accentColor}99` : 'rgba(255,255,255,0.08)',
                  background: privacyModeEnabled ? `${accentColor}1f` : 'rgba(255,255,255,0.04)',
                }}
              >
                <div>
                  <p className="font-medium text-white">Aktiviert</p>
                  <p className="text-xs text-white/55">Privacy Mode einschalten</p>
                </div>
                {privacyModeEnabled ? (
                  <Check className="h-5 w-5" style={{ color: accentColor }} />
                ) : (
                  <div className="h-5 w-5 rounded-full border border-white/15" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handlePrivacyModeChange(false)}
                data-agent-button="settings-privacy-off"
                className="flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all"
                style={{
                  borderColor: !privacyModeEnabled ? `${accentColor}99` : 'rgba(255,255,255,0.08)',
                  background: !privacyModeEnabled ? `${accentColor}1f` : 'rgba(255,255,255,0.04)',
                }}
              >
                <div>
                  <p className="font-medium text-white">Deaktiviert</p>
                  <p className="text-xs text-white/55">Privacy Mode ausschalten</p>
                </div>
                {!privacyModeEnabled ? (
                  <Check className="h-5 w-5" style={{ color: accentColor }} />
                ) : (
                  <div className="h-5 w-5 rounded-full border border-white/15" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Module Section */}
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
            <LayoutList className="h-5 w-5 text-white/70" />
            Sidebar Module
          </h2>
          <p className="mb-4 text-sm text-white/60">
            Wähle aus, welche Module in der Sidebar angezeigt werden sollen
          </p>
          
          <div className="space-y-2">
            {allModules.map((module) => {
              const isVisible = sidebarModules.includes(module.id);
              const SettingsIcon = resolveSettingsIcon(module.icon, module.id);
              const settingsHasImage = module.icon?.startsWith('http');
              
              return (
                <button
                  key={module.id}
                  onClick={() => toggleSidebarModule(module.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition-all group"
                  style={{
                    background: isVisible 
                      ? `${accentColor}20` 
                      : 'rgba(255, 255, 255, 0.05)',
                    border: isVisible 
                      ? `1px solid ${accentColor}40` 
                      : '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {/* Drag Handle (fuer zukuenftige Drag-Sortierung) */}
                  <div className="opacity-30 group-hover:opacity-60 transition-opacity">
                    <GripVertical className="h-4 w-4 text-white" />
                  </div>
                  
                  {/* Module Icon */}
                  <div 
                    className="relative flex h-10 w-10 items-center justify-center rounded-lg shrink-0 overflow-hidden"
                    style={{
                      background: settingsHasImage ? 'transparent' : (isVisible ? accentColor : 'rgba(255, 255, 255, 0.1)'),
                    }}
                  >
                    {settingsHasImage ? (
                      <img src={module.icon} alt={module.name} className="absolute inset-0 h-full w-full object-cover" style={{ display: 'block' }} />
                    ) : (
                      <SettingsIcon className="h-5 w-5 text-white" />
                    )}
                  </div>
                  
                  {/* Module Info */}
                  <div className="flex-1 text-left">
                    <h3 className="font-medium text-white">{module.name}</h3>
                    <p className="text-xs text-white/50">{module.description}</p>
                  </div>
                  
                  {/* Visibility Toggle */}
                  <div 
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-all"
                    style={{
                      background: isVisible ? accentColor : 'rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {isVisible ? (
                      <Eye className="h-4 w-4 text-white" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-white/50" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          
          {allModules.length === 0 && (
            <div className="text-center py-8 rounded-xl border border-dashed border-white/20">
              <Blocks className="h-8 w-8 mx-auto mb-2 text-white/30" />
              <p className="text-white/50">Keine Module verfügbar</p>
            </div>
          )}
          
          <p className="mt-4 text-xs text-white/40 text-center">
            Tipp: Gehe zur Bibliothek um weitere Module hinzuzufügen
          </p>
        </div>

        {/* Design Style Section */}
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
            <Sparkles className="h-5 w-5 text-white/70" />
            Design-Stil
          </h2>
          
          <div className="grid grid-cols-3 gap-4">
            {DESIGN_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => setDesignStyle(style.id)}
                data-agent-button={`settings-design-${style.id}`}
                className={`relative overflow-hidden rounded-2xl p-4 transition-all ${
                  designStyle === style.id 
                    ? 'ring-2 ring-white/60' 
                    : 'ring-1 ring-white/10 hover:ring-white/30'
                }`}
              >
                {/* Style Preview */}
                <div 
                  className="mb-3 h-16 w-full rounded-xl"
                  style={getStylePreview(style.id)}
                />
                
                {/* Style Name */}
                <h3 className="text-sm font-medium text-white">{style.name}</h3>
                <p className="mt-1 text-xs text-white/50">{style.description}</p>
                
                {/* Check Mark */}
                {designStyle === style.id && (
                  <div 
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor} 0%, #6366f1 100%)`,
                    }}
                  >
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color Section */}
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
            <Palette className="h-5 w-5 text-white/70" />
            Akzentfarbe
          </h2>
          
          <div className="grid grid-cols-4 gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.id}
                onClick={() => setAccentColor(color.value)}
                className={`group relative aspect-square overflow-hidden rounded-2xl transition-all hover:ring-2 hover:ring-white/40 ${
                  accentColor === color.value ? 'ring-2 ring-white/60' : 'ring-1 ring-white/10'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${color.value} 0%, ${adjustColorBrightness(color.value, -20)} 100%)`,
                }}
                title={color.name}
              >
                {accentColor === color.value && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Check className="h-6 w-6 text-white drop-shadow-lg" />
                  </div>
                )}
                <span className="absolute bottom-2 left-2 text-xs font-medium text-white drop-shadow-lg">
                  {color.name}
                </span>
              </button>
            ))}
          </div>
          
          {/* Custom Color Picker */}
          <div className="mt-4 rounded-2xl bg-white/5 p-4 border border-white/10">
            <h3 className="mb-3 text-sm font-medium text-white/80">
              Eigene Akzentfarbe
            </h3>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-12 w-12 rounded-xl cursor-pointer border border-white/10"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#0ea5e9"
                className="flex-1 rounded-xl bg-white/10 px-4 py-2 text-white placeholder:text-white/40 border border-white/10 focus:outline-none focus:border-white/30 font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Surface Color Section */}
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
            <Square className="h-5 w-5 text-white/70" />
            Oberflächenfarbe
          </h2>
          <p className="mb-4 text-sm text-white/50">
            Hintergrundfarbe für Widgets, Sidebar, Modals und andere Container
          </p>
          
          {/* Glas-Optionen Sektion */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-white/70 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              Glasoptik (transparent mit Blur)
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {SURFACE_COLORS.filter(c => c.id.startsWith('glass-')).map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSurfaceColor(color.value)}
                  className={`group relative aspect-square overflow-hidden rounded-xl transition-all hover:ring-2 hover:ring-white/40 ${
                    surfaceColor === color.value ? 'ring-2 ring-white/60' : 'ring-1 ring-white/10'
                  }`}
                  style={{
                    background: color.value,
                    backdropFilter: 'blur(20px)',
                  }}
                  title={color.name}
                >
                  {surfaceColor === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-5 w-5 text-white drop-shadow-lg" />
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 right-1 text-[9px] font-medium text-white drop-shadow-lg truncate">
                    {color.name.replace('Glas ', '')}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Solide Optionen Sektion */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-white/70 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-gray-400" />
              Solide Farben
            </h3>
            <div className="grid grid-cols-6 gap-2">
              {SURFACE_COLORS.filter(c => c.id.startsWith('solid-')).map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSurfaceColor(color.value)}
                  className={`group relative aspect-square overflow-hidden rounded-xl transition-all hover:ring-2 hover:ring-white/40 ${
                    surfaceColor === color.value ? 'ring-2 ring-white/60' : 'ring-1 ring-white/10'
                  }`}
                  style={{ background: color.value }}
                  title={color.name}
                >
                  {surfaceColor === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-5 w-5 text-white drop-shadow-lg" />
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 right-1 text-[9px] font-medium text-white drop-shadow-lg truncate">
                    {color.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Pastell & Creme Optionen */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-white/70 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-pink-300" />
              Pastell & Creme (Hell-Modus)
            </h3>
            <div className="grid grid-cols-6 gap-2">
              {SURFACE_COLORS.filter(c => c.id.startsWith('pastel-') || c.id.startsWith('cream-')).map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSurfaceColor(color.value)}
                  className={`group relative aspect-square overflow-hidden rounded-xl transition-all hover:ring-2 hover:ring-white/40 ${
                    surfaceColor === color.value ? 'ring-2 ring-white/60' : 'ring-1 ring-white/10'
                  }`}
                  style={{ background: color.value }}
                  title={color.name}
                >
                  {surfaceColor === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-5 w-5 text-gray-700 drop-shadow-lg" />
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 right-1 text-[9px] font-medium text-gray-700 truncate">
                    {color.name.replace('Pastell ', '').replace('Creme ', '')}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Custom Surface Color Picker mit RGBA-Slider */}
          <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
            <h3 className="mb-3 text-sm font-medium text-white/80">
              Eigene Glasfarbe erstellen
            </h3>
            <div className="flex gap-3 items-center mb-3">
              <input
                type="color"
                value={surfaceColor.startsWith('rgba') ? '#1a1a24' : surfaceColor}
                onChange={(e) => {
                  // Konvertiere Hex zu rgba mit aktueller Transparenz
                  const hex = e.target.value;
                  const r = parseInt(hex.slice(1, 3), 16);
                  const g = parseInt(hex.slice(3, 5), 16);
                  const b = parseInt(hex.slice(5, 7), 16);
                  // Extrahiere aktuelle Alpha-Wert oder nutze 0.15 als Default
                  const alphaMatch = surfaceColor.match(/[\d.]+\)$/);
                  const alpha = alphaMatch ? parseFloat(alphaMatch[0]) : 0.15;
                  setSurfaceColor(`rgba(${r}, ${g}, ${b}, ${alpha})`);
                }}
                className="h-12 w-12 rounded-xl cursor-pointer border border-white/10"
              />
              <input
                type="text"
                value={surfaceColor}
                onChange={(e) => setSurfaceColor(e.target.value)}
                placeholder="rgba(255, 255, 255, 0.15)"
                className="flex-1 rounded-xl bg-white/10 px-4 py-2 text-white placeholder:text-white/40 border border-white/10 focus:outline-none focus:border-white/30 font-mono text-sm"
              />
            </div>
            
            {/* Transparenz-Slider */}
            {surfaceColor.startsWith('rgba') && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-white/50 mb-1">
                  <span>Transparenz</span>
                  <span>{Math.round((parseFloat(surfaceColor.match(/[\d.]+\)$/)?.[0] || '0.15') * 100))}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((parseFloat(surfaceColor.match(/[\d.]+\)$/)?.[0] || '0.15') * 100))}
                  onChange={(e) => {
                    const alpha = parseInt(e.target.value) / 100;
                    const rgbMatch = surfaceColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                    if (rgbMatch) {
                      setSurfaceColor(`rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha.toFixed(2)})`);
                    }
                  }}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            )}
            
            {/* Live-Vorschau */}
            <div className="mt-4">
              <p className="text-xs text-white/50 mb-2">Vorschau:</p>
              <div 
                className="h-16 rounded-xl border border-white/10 flex items-center justify-center"
                style={{
                  background: surfaceColor,
                  backdropFilter: surfaceColor.includes('rgba') ? 'blur(20px)' : 'none',
                }}
              >
                <span className="text-sm text-white/80">Widget-Vorschau</span>
              </div>
            </div>
          </div>
        </div>

        {/* Text Color Section */}
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
            <Type className="h-5 w-5 text-white/70" />
            Textfarbe
          </h2>
          <p className="mb-4 text-sm text-white/50">
            Hauptfarbe für Texte, Überschriften und Labels
          </p>
          
          {/* Helle Farben (für dunkle Hintergründe) */}
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-medium text-white/50 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Hell (für dunkle Hintergründe)
            </h3>
            <div className="grid grid-cols-6 gap-2">
              {TEXT_COLORS.filter(c => ['white', 'snow', 'light-gray', 'silver', 'gray'].includes(c.id)).map((color) => (
                <button
                  key={color.id}
                  onClick={() => setTextColor(color.value)}
                  className={`group relative aspect-square overflow-hidden rounded-xl transition-all hover:ring-2 hover:ring-white/40 ${
                    textColor === color.value ? 'ring-2 ring-white/60' : 'ring-1 ring-white/10'
                  }`}
                  style={{ background: '#1a1a24' }}
                  title={color.name}
                >
                  <span 
                    className="absolute inset-0 flex items-center justify-center text-xl font-bold"
                    style={{ color: color.value }}
                  >
                    Aa
                  </span>
                  {textColor === color.value && (
                    <div 
                      className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full"
                      style={{ background: accentColor }}
                    >
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                  <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[8px] font-medium text-white/50 truncate text-center">
                    {color.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Warme & Kühle Töne */}
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-medium text-white/50 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              Warm & Kühl
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {TEXT_COLORS.filter(c => ['warm-white', 'cream', 'peach', 'cool-white', 'ice-blue', 'lavender', 'mint'].includes(c.id)).map((color) => (
                <button
                  key={color.id}
                  onClick={() => setTextColor(color.value)}
                  className={`group relative aspect-square overflow-hidden rounded-xl transition-all hover:ring-2 hover:ring-white/40 ${
                    textColor === color.value ? 'ring-2 ring-white/60' : 'ring-1 ring-white/10'
                  }`}
                  style={{ background: '#1a1a24' }}
                  title={color.name}
                >
                  <span 
                    className="absolute inset-0 flex items-center justify-center text-xl font-bold"
                    style={{ color: color.value }}
                  >
                    Aa
                  </span>
                  {textColor === color.value && (
                    <div 
                      className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full"
                      style={{ background: accentColor }}
                    >
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                  <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[8px] font-medium text-white/50 truncate text-center">
                    {color.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Dunkle Farben (für helle Hintergründe) */}
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-medium text-white/50 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
              Dunkel (für helle Hintergründe)
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {TEXT_COLORS.filter(c => ['charcoal', 'dark-gray', 'slate', 'black', 'deep-black'].includes(c.id)).map((color) => (
                <button
                  key={color.id}
                  onClick={() => setTextColor(color.value)}
                  className={`group relative aspect-square overflow-hidden rounded-xl transition-all hover:ring-2 hover:ring-white/40 ${
                    textColor === color.value ? 'ring-2 ring-white/60' : 'ring-1 ring-white/10'
                  }`}
                  style={{ background: '#f5f5f5' }}
                  title={color.name}
                >
                  <span 
                    className="absolute inset-0 flex items-center justify-center text-xl font-bold"
                    style={{ color: color.value }}
                  >
                    Aa
                  </span>
                  {textColor === color.value && (
                    <div 
                      className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full"
                      style={{ background: accentColor }}
                    >
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                  <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[8px] font-medium text-gray-500 truncate text-center">
                    {color.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Custom Text Color Picker */}
          <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
            <h3 className="mb-3 text-sm font-medium text-white/80">
              Eigene Textfarbe wählen
            </h3>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="h-12 w-12 rounded-xl cursor-pointer border border-white/10"
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                placeholder="#ffffff"
                className="flex-1 rounded-xl bg-white/10 px-4 py-2 text-white placeholder:text-white/40 border border-white/10 focus:outline-none focus:border-white/30 font-mono text-sm"
              />
            </div>
            
            {/* Live-Vorschau */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div 
                className="p-3 rounded-xl border border-white/10"
                style={{ background: '#1a1a24' }}
              >
                <p className="text-xs text-white/50 mb-1">Auf dunkel:</p>
                <p className="text-lg font-medium" style={{ color: textColor }}>
                  Beispieltext
                </p>
              </div>
              <div 
                className="p-3 rounded-xl border border-white/10"
                style={{ background: '#f5f5f5' }}
              >
                <p className="text-xs text-gray-500 mb-1">Auf hell:</p>
                <p className="text-lg font-medium" style={{ color: textColor }}>
                  Beispieltext
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Button Icon/Text Color Section */}
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
            <Square className="h-5 w-5 text-white/70" />
            Button-Iconfarbe
          </h2>
          <p className="mb-4 text-sm text-white/60">
            Farbe für Icons und Text in Buttons (z.B. Chatbar-Button)
          </p>
          
          {/* Farbauswahl in Reihen */}
          <div className="space-y-4">
            {/* Helle Farben */}
            <h3 className="text-sm font-medium" style={{ color: textColor, opacity: 0.6 }}>
              Hell
            </h3>
            <div className="grid grid-cols-6 gap-2">
              {TEXT_COLORS.filter(c => ['white', 'snow', 'light-gray', 'silver', 'gray'].includes(c.id)).map((color) => (
                <button
                  key={color.id}
                  onClick={() => setButtonTextColor(color.value)}
                  className={`group relative aspect-square overflow-hidden rounded-xl transition-all hover:ring-2 hover:ring-white/40 ${
                    buttonTextColor === color.value ? 'ring-2 ring-white/60' : 'ring-1 ring-white/10'
                  }`}
                  style={{ background: accentColor }}
                  title={color.name}
                >
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <span className="text-2xl font-bold" style={{ color: color.value }}>✦</span>
                  </div>
                  {buttonTextColor === color.value && (
                    <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white">
                      <Check className="h-2.5 w-2.5 text-gray-900" />
                    </div>
                  )}
                  <span className="absolute bottom-0.5 left-0 right-0 text-center text-[9px] text-white/80">
                    {color.name}
                  </span>
                </button>
              ))}
            </div>
            
            {/* Dunkle Farben */}
            <h3 className="text-sm font-medium" style={{ color: textColor, opacity: 0.6 }}>
              Dunkel
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {TEXT_COLORS.filter(c => ['charcoal', 'dark-gray', 'slate', 'black', 'deep-black'].includes(c.id)).map((color) => (
                <button
                  key={color.id}
                  onClick={() => setButtonTextColor(color.value)}
                  className={`group relative aspect-square overflow-hidden rounded-xl transition-all hover:ring-2 hover:ring-white/40 ${
                    buttonTextColor === color.value ? 'ring-2 ring-white/60' : 'ring-1 ring-white/10'
                  }`}
                  style={{ background: accentColor }}
                  title={color.name}
                >
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <span className="text-2xl font-bold" style={{ color: color.value }}>✦</span>
                  </div>
                  {buttonTextColor === color.value && (
                    <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white">
                      <Check className="h-2.5 w-2.5 text-gray-900" />
                    </div>
                  )}
                  <span className="absolute bottom-0.5 left-0 right-0 text-center text-[9px] text-white/80">
                    {color.name}
                  </span>
                </button>
              ))}
            </div>
            
            {/* Custom Color */}
            <h3 className="text-sm font-medium" style={{ color: textColor, opacity: 0.6 }}>
              Eigene Farbe wählen
            </h3>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={buttonTextColor}
                onChange={(e) => setButtonTextColor(e.target.value)}
                className="h-12 w-12 rounded-xl cursor-pointer border border-white/10"
              />
              <input
                type="text"
                value={buttonTextColor}
                onChange={(e) => setButtonTextColor(e.target.value)}
                placeholder="#ffffff"
                className="flex-1 rounded-xl bg-white/10 px-4 py-2 text-white placeholder:text-white/40 border border-white/10 focus:outline-none focus:border-white/30 font-mono text-sm"
              />
            </div>

            {/* Vorschau */}
            <div className="mt-4 p-4 rounded-xl border border-white/10" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <p className="text-xs text-white/50 mb-3">Vorschau:</p>
              <div className="flex items-center gap-3">
                <button
                  className="flex h-12 w-12 items-center justify-center rounded-full transition-all"
                  style={{ background: accentColor }}
                >
                  <Send className="h-5 w-5" style={{ color: buttonTextColor }} />
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
                  style={{ background: accentColor }}
                >
                  <Sparkles className="h-4 w-4" style={{ color: buttonTextColor }} />
                  <span style={{ color: buttonTextColor }}>Button</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Font Section */}
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
            <Type className="h-5 w-5 text-white/70" />
            Schriftart
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            {APP_FONTS.map((font) => (
              <button
                key={font.id}
                onClick={() => setAppFont(font.value)}
                className={`group relative overflow-hidden rounded-2xl p-4 transition-all text-left ${
                  appFont === font.value ? 'ring-2 ring-white/60' : 'ring-1 ring-white/10 hover:ring-white/30'
                }`}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                }}
              >
                <span 
                  className="text-lg text-white"
                  style={{ fontFamily: font.value }}
                >
                  {font.name}
                </span>
                <p 
                  className="mt-1 text-sm text-white/50"
                  style={{ fontFamily: font.value }}
                >
                  Das ist ein Beispieltext
                </p>
                {appFont === font.value && (
                  <div 
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: accentColor }}
                  >
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Background Section */}
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
            <ImageIcon className="h-5 w-5 text-white/70" />
            Hintergrund
          </h2>

          {/* Background Type Toggle */}
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setBackgroundType('image')}
              data-agent-button="settings-background-type-image"
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                backgroundType === 'image' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              Bild
            </button>
            <button
              onClick={() => setBackgroundType('solid')}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                backgroundType === 'solid' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              Einfarbig
            </button>
          </div>

          {backgroundType === 'image' ? (
            <>
              {/* Preset Backgrounds */}
              <div className="mb-6 grid grid-cols-3 gap-3">
                {defaultBackgrounds.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setBackgroundImage(bg.url)}
                    data-agent-button={`settings-background-${bg.id}`}
                    className={`group relative aspect-video overflow-hidden rounded-2xl transition-all hover:ring-2 hover:ring-white/40 ${
                      backgroundImage === bg.url ? 'ring-2 ring-white/60' : 'ring-1 ring-white/10'
                    }`}
                  >
                    <img
                      src={bg.url}
                      alt={bg.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute bottom-2 left-2 text-xs font-medium text-white drop-shadow-sm">
                      {bg.name}
                    </span>
                    {backgroundImage === bg.url && (
                      <div 
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full"
                        style={{ background: accentColor }}
                      >
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom URL */}
              <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-white/80">
                  <LinkIcon className="h-4 w-4" />
                  Eigene Bild-URL
                </h3>
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomUrl()}
                    data-agent-input="settings-background-custom-url"
                    placeholder="https://example.com/bild.jpg"
                    className="flex-1 rounded-xl bg-white/10 px-4 py-2 text-white placeholder:text-white/40 border border-white/10 focus:outline-none focus:border-white/30"
                  />
                  <button
                    onClick={handleCustomUrl}
                    disabled={!customUrl.trim()}
                    data-agent-button="settings-background-custom-apply"
                    className="rounded-xl px-4 py-2 font-medium text-white transition-colors disabled:opacity-50"
                    style={{ background: accentColor }}
                  >
                    Anwenden
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Solid Color Backgrounds */}
              <div className="grid grid-cols-4 gap-3">
                {SOLID_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setSolidBackground(bg.value)}
                    className={`group relative aspect-square overflow-hidden rounded-2xl transition-all hover:ring-2 hover:ring-white/40 ${
                      solidBackground === bg.value ? 'ring-2 ring-white/60' : 'ring-1 ring-white/10'
                    }`}
                    style={{ background: bg.value }}
                    title={bg.name}
                  >
                    {solidBackground === bg.value && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="h-6 w-6 text-white drop-shadow-lg" />
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 text-xs font-medium text-white drop-shadow-lg">
                      {bg.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Solid Color */}
              <div className="mt-4 rounded-2xl bg-white/5 p-4 border border-white/10">
                <h3 className="mb-3 text-sm font-medium text-white/80">
                  Eigene Farbe
                </h3>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={solidBackground}
                    onChange={(e) => setSolidBackground(e.target.value)}
                    className="h-12 w-12 rounded-xl cursor-pointer border border-white/10"
                  />
                  <input
                    type="text"
                    value={solidBackground}
                    onChange={(e) => setSolidBackground(e.target.value)}
                    placeholder="#1a1a1a"
                    className="flex-1 rounded-xl bg-white/10 px-4 py-2 text-white placeholder:text-white/40 border border-white/10 focus:outline-none focus:border-white/30 font-mono text-sm"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tab Background Section */}
        <div className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
            <AppWindow className="h-5 w-5 text-white/70" />
            Tab-Hintergrund
          </h2>

          {/* Preset Colors - Undurchsichtig */}
          <p className="mb-2 text-xs text-white/50">Undurchsichtig (empfohlen)</p>
          <div className="mb-4 grid grid-cols-4 gap-3">
            {[
              { name: 'Dunkel', value: 'rgba(20, 20, 28, 0.95)' },
              { name: 'Anthrazit', value: 'rgba(30, 30, 40, 0.95)' },
              { name: 'Schiefer', value: 'rgba(40, 45, 55, 0.95)' },
              { name: 'Navy', value: 'rgba(25, 35, 55, 0.95)' },
              { name: 'Schwarz', value: 'rgba(10, 10, 15, 0.98)' },
              { name: 'Graphit', value: 'rgba(45, 45, 50, 0.95)' },
              { name: 'Dunkellila', value: 'rgba(35, 25, 50, 0.95)' },
              { name: 'Dunkelblau', value: 'rgba(20, 30, 50, 0.95)' },
            ].map((colorOption) => (
              <button
                key={colorOption.value}
                onClick={() => setTabBackground(colorOption.value)}
                className={`group relative aspect-square overflow-hidden rounded-2xl transition-all hover:ring-2 hover:ring-white/40 ${
                  tabBackground === colorOption.value ? 'ring-2 ring-white/60' : 'ring-1 ring-white/10'
                }`}
                style={{
                  background: colorOption.value,
                }}
                title={colorOption.name}
              >
                {tabBackground === colorOption.value && (
                  <div 
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor} 0%, #6366f1 100%)`,
                    }}
                  >
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
                <span className="absolute bottom-2 left-2 text-xs font-medium text-white drop-shadow-sm">
                  {colorOption.name}
                </span>
              </button>
            ))}
          </div>

          {/* Transparente Optionen */}
          <p className="mb-2 text-xs text-white/50">Transparent (Glasoptik)</p>
          <div className="mb-6 grid grid-cols-4 gap-3">
            {[
              { name: 'Glas Hell', value: 'rgba(255, 255, 255, 0.15)' },
              { name: 'Glas Grau', value: 'rgba(128, 128, 128, 0.2)' },
              { name: 'Glas Dunkel', value: 'rgba(0, 0, 0, 0.4)' },
              { name: 'Glas Blau', value: 'rgba(59, 130, 246, 0.25)' },
            ].map((colorOption) => (
              <button
                key={colorOption.value}
                onClick={() => setTabBackground(colorOption.value)}
                className={`group relative aspect-square overflow-hidden rounded-2xl transition-all hover:ring-2 hover:ring-white/40 ${
                  tabBackground === colorOption.value ? 'ring-2 ring-white/60' : 'ring-1 ring-white/10'
                }`}
                style={{
                  background: colorOption.value,
                  backdropFilter: 'blur(40px) saturate(180%)',
                }}
                title={colorOption.name}
              >
                {tabBackground === colorOption.value && (
                  <div 
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor} 0%, #6366f1 100%)`,
                    }}
                  >
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
                <span className="absolute bottom-2 left-2 text-xs font-medium text-white drop-shadow-sm">
                  {colorOption.name}
                </span>
              </button>
            ))}
          </div>

          {/* Custom Color Picker */}
          <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
            <h3 className="mb-3 text-sm font-medium text-white/80">
              Eigene Farbe
            </h3>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={tabBackground.startsWith('#') ? tabBackground : '#ffffff'}
                onChange={(e) => {
                  // Konvertiere Hex zu rgba
                  const hex = e.target.value;
                  const r = parseInt(hex.slice(1, 3), 16);
                  const g = parseInt(hex.slice(3, 5), 16);
                  const b = parseInt(hex.slice(5, 7), 16);
                  setTabBackground(`rgba(${r}, ${g}, ${b}, 0.1)`);
                }}
                className="h-12 w-12 rounded-xl cursor-pointer border border-white/10"
              />
              <input
                type="text"
                value={tabBackground}
                onChange={(e) => setTabBackground(e.target.value)}
                placeholder="rgba(255, 255, 255, 0.1)"
                className="flex-1 rounded-xl bg-white/10 px-4 py-2 text-white placeholder:text-white/40 border border-white/10 focus:outline-none focus:border-white/30 font-mono text-sm"
              />
            </div>
            <p className="mt-2 text-xs text-white/40">
              RGBA-Format: rgba(255, 255, 255, 0.1) oder Hex mit Alpha
            </p>
          </div>

          {/* Live Preview */}
          <div className="mt-4 rounded-2xl bg-white/5 p-4 border border-white/10">
            <p className="mb-2 text-sm font-medium text-white/80">Vorschau</p>
            <div
              className="h-20 rounded-xl border border-white/10"
              style={{
                background: tabBackground,
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// --------------------------------------------
// Hilfsfunktion: Style-Vorschau für jeden Design-Stil
// Zeigt eine visuelle Repräsentation des Stils
// --------------------------------------------

function getStylePreview(style: DesignStyle): React.CSSProperties {
  switch (style) {
    case 'glass':
      return {
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      };
    case 'brutal':
      return {
        background: '#2a2a3c',
        border: '3px solid #000000',
        boxShadow: '4px 4px 0 #000000',
        borderRadius: '0.375rem',
      };
    case 'neo':
      return {
        background: '#1a1a24',
        boxShadow: '6px 6px 12px rgba(0, 0, 0, 0.4), -6px -6px 12px rgba(255, 255, 255, 0.03)',
        borderRadius: '1rem',
      };
    default:
      return {};
  }
}

// --------------------------------------------
// Hilfsfunktion: Farbe aufhellen/abdunkeln
// --------------------------------------------

function adjustColorBrightness(hex: string, percent: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  const adjust = (value: number) => {
    const adjusted = value + (percent / 100) * 255;
    return Math.max(0, Math.min(255, Math.round(adjusted)));
  };
  
  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  
  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}
