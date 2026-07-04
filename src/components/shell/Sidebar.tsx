// ============================================
// Sidebar.tsx - Hauptnavigation der Anwendung
//
// Zweck: Floating Sidebar mit den Kern-Links des
//        LLM Council: Council-Einstieg + Einstellungen.
//        Verwendet das Theme-System für dynamisches Styling.
// Verwendet von: Shell.tsx
// ============================================

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Home, X, Settings, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore, USER_STATUS_OPTIONS } from '@/lib/store/app-store';
import { useThemeStyles } from '@/lib/theme';

export function Sidebar() {
  const t = useTranslations();
  const pathname = usePathname();

  // --------------------------------------------
  // Store-Selektoren (Performance-optimiert)
  // --------------------------------------------
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const userProfile = useAppStore((state) => state.userProfile);

  // Status-Farbe aus den Optionen holen
  const statusColor = USER_STATUS_OPTIONS.find((s) => s.id === userProfile.status)?.color || '#22c55e';

  // Theme-Styles für dynamisches Design
  const { container, navItem, button, accentColor, designStyle, textColor } = useThemeStyles();

  const navLinks = [
    { href: '/', icon: Home, label: t('shell.dashboard') },
    { href: '/settings', icon: Settings, label: t('shell.settings') },
  ];

  // Sidebar schließen nach Navigation
  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          {/* Backdrop - Klick schließt Sidebar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998]"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Floating Sidebar Panel */}
          <motion.aside
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            data-agent-panel="shell-sidebar"
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-6 top-6 bottom-6 z-[9999] flex w-72 flex-col overflow-hidden"
            style={{
              ...container.base,
              boxShadow:
                designStyle === 'glass'
                  ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                  : container.base.boxShadow,
            }}
          >
            {/* Header mit Profil - klickbar, öffnet Profilseite */}
            <div className="flex items-center justify-between p-5">
              <Link href="/profile" onClick={handleNavClick} className="flex-1 group">
                <motion.div className="flex items-center gap-3" whileHover={{ x: 2 }}>
                  {/* Avatar - Bild oder Initialen */}
                  <div
                    className="relative h-11 w-11 flex-shrink-0 overflow-hidden"
                    style={{
                      borderRadius: designStyle === 'brutal' ? '0.5rem' : '50%',
                      border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                      boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : `0 4px 15px ${accentColor}30`,
                    }}
                  >
                    {userProfile.avatar ? (
                      <img src={userProfile.avatar} alt={userProfile.name} className="h-full w-full object-cover" />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)` }}
                      >
                        <span className="text-lg font-semibold text-white">
                          {userProfile.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div
                      className="absolute bottom-0 right-0 h-3 w-3 border-2"
                      style={{
                        backgroundColor: statusColor,
                        borderRadius: '50%',
                        borderColor: designStyle === 'brutal' ? '#000' : 'rgba(0,0,0,0.2)',
                      }}
                    />
                  </div>

                  {/* Name & Status */}
                  <div className="flex-1 min-w-0">
                    <h1
                      className="font-semibold drop-shadow-sm truncate group-hover:opacity-80 transition-opacity"
                      style={{ color: textColor }}
                    >
                      {userProfile.name}
                    </h1>
                    <p className="text-xs flex items-center gap-1.5 truncate" style={{ color: textColor, opacity: 0.6 }}>
                      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                      {USER_STATUS_OPTIONS.find((s) => s.id === userProfile.status)?.name || 'Online'}
                    </p>
                  </div>

                  <ChevronRight
                    className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0"
                    style={{ color: textColor }}
                  />
                </motion.div>
              </Link>

              {/* Close Button */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex h-8 w-8 items-center justify-center transition-all ml-2"
                style={{
                  ...button.base,
                  borderRadius: designStyle === 'brutal' ? '0.375rem' : '9999px',
                  color: textColor,
                  opacity: 0.7,
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Navigation - Council + Settings */}
            <nav className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {navLinks.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href} onClick={handleNavClick}>
                      <motion.div
                        className="flex items-center gap-3 px-4 py-3 transition-all"
                        style={{
                          ...navItem.base,
                          ...(isActive ? navItem.active : {}),
                          color: textColor,
                          opacity: isActive ? 1 : 0.7,
                        }}
                        whileHover={{ x: 4, opacity: 1 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
