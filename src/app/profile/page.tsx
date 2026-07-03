// ============================================
// Profile Page - Nutzerprofil bearbeiten
// 
// Zweck: Social-Media-ähnliches Profil mit Avatar, Name, Bio, Status
//        Daten werden über die API aus der DB geladen/gespeichert
//        Beim ersten Load: localStorage-Daten werden in die DB migriert
// Verwendet von: Sidebar (Header-Klick), direkte Navigation
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Camera, 
  Pencil, 
  Check, 
  X, 
  Trash2,
  Link as LinkIcon,
  ArrowLeft,
  Loader2,
  Database,
  Brain,
} from 'lucide-react';
import Link from 'next/link';
import { 
  useAppStore, 
  USER_STATUS_OPTIONS,
  type UserStatus 
} from '@/lib/store/app-store';
import { useThemeStyles } from '@/lib/theme';
import type { AppLocale } from '@/lib/i18n/config';
import { setCookieLocale } from '@/lib/i18n/runtime';

// --------------------------------------------
// Typen für das User-Profil aus der API
// --------------------------------------------

interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  bio: string | null;
  status: string;
  timezone: string;
  language: string;
}

// --------------------------------------------
// Profil-Seiten Komponente
// Zeigt und bearbeitet das Nutzerprofil
// --------------------------------------------

export default function ProfilePage() {
  // --------------------------------------------
  // Store-Selektoren (als Cache/Fallback)
  // Wichtig: useRef für den Fallback-Zugriff, damit kein
  // Re-Render-Loop entsteht
  // --------------------------------------------
  const storeProfile = useAppStore((state) => state.userProfile);
  const storeProfileRef = useRef(storeProfile);
  storeProfileRef.current = storeProfile;
  
  // Store-Setter (stabile Referenzen, lösen keinen Loop aus)
  const setStoreProfile = useAppStore((state) => state.setUserProfile);
  const setStoreAvatar = useAppStore((state) => state.setUserAvatar);
  const setStoreBio = useAppStore((state) => state.setUserBio);
  const setStoreStatus = useAppStore((state) => state.setUserStatus);
  const setStoreLocale = useAppStore((state) => state.setLocale);
  
  // Theme-Styles
  const { 
    container, 
    button, 
    input: inputStyles, 
    accentColor, 
    designStyle, 
    textColor 
  } = useThemeStyles();
  
  // --------------------------------------------
  // API State
  // --------------------------------------------
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // --------------------------------------------
  // Memory-Statistiken
  // --------------------------------------------
  const [memoryCount, setMemoryCount] = useState(0);
  
  // --------------------------------------------
  // Local State für Bearbeitung
  // --------------------------------------------
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [editingBio, setEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState('');
  const [showAvatarInput, setShowAvatarInput] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  const bioInputRef = useRef<HTMLTextAreaElement>(null);
  
  // --------------------------------------------
  // Profil aus API laden (nur einmal beim Mount!)
  // Beinhaltet localStorage → DB Migration
  // --------------------------------------------
  
  useEffect(() => {
    let cancelled = false;
    
    async function loadProfile() {
      try {
        const res = await fetch('/api/user/profile');
        const json = await res.json();
        
        if (cancelled) return;
        
        if (json.success && json.data) {
          const dbProfile = json.data as UserProfile;
          const localProfile = storeProfileRef.current;
          
          // ============================================
          // Migration: localStorage → DB
          // Wenn DB noch Default-Werte hat aber localStorage
          // bereits echte Daten enthält → migrieren
          // ============================================
          const isDbDefault = dbProfile.name === 'User' && !dbProfile.bio && !dbProfile.avatar;
          const hasLocalData = localProfile.name !== 'User' || localProfile.bio || localProfile.avatar;
          
          if (isDbDefault && hasLocalData) {
            console.log('🔄 Migriere localStorage-Profil in die Datenbank...');
            
            const migrationData: Record<string, unknown> = {};
            if (localProfile.name && localProfile.name !== 'User') migrationData.name = localProfile.name;
            if (localProfile.bio) migrationData.bio = localProfile.bio;
            if (localProfile.avatar) migrationData.avatar = localProfile.avatar;
            if (localProfile.status && localProfile.status !== 'online') migrationData.status = localProfile.status;
            
            if (Object.keys(migrationData).length > 0) {
              const migrateRes = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(migrationData),
              });
              const migrateJson = await migrateRes.json();
              
              if (cancelled) return;
              
              if (migrateJson.success && migrateJson.data) {
                console.log('✅ Migration abgeschlossen');
                setProfile(migrateJson.data);
                setTempName(migrateJson.data.name);
                setTempBio(migrateJson.data.bio || '');
                setLoading(false);
                return;
              }
            }
          }
          
          // Normaler Fall: DB-Daten übernehmen
          setProfile(dbProfile);
          setTempName(dbProfile.name);
          setTempBio(dbProfile.bio || '');
          
          // localStorage-Cache synchronisieren (DB → localStorage)
          setStoreProfile({ name: dbProfile.name });
          setStoreAvatar(dbProfile.avatar);
          setStoreBio(dbProfile.bio || '');
          setStoreStatus(dbProfile.status as UserStatus);
          setStoreLocale((dbProfile.language || 'de') as AppLocale);
          setCookieLocale((dbProfile.language || 'de') as AppLocale);
          document.documentElement.lang = (dbProfile.language || 'de') as AppLocale;
        }
      } catch {
        if (cancelled) return;
        
        // Fallback auf localStorage wenn API nicht erreichbar
        console.warn('API nicht erreichbar, nutze localStorage-Fallback');
        const local = storeProfileRef.current;
        setProfile({
          id: 'default-user',
          name: local.name,
          email: null,
          avatar: local.avatar,
          bio: local.bio,
          status: local.status,
          timezone: 'Europe/Berlin',
          language: 'de',
        });
        setStoreLocale('de');
        setCookieLocale('de');
        setTempName(local.name);
        setTempBio(local.bio);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    
    // Memory-Statistiken parallel laden
    async function loadMemoryStats() {
      try {
        const res = await fetch('/api/agent/memory?stats=true');
        const json = await res.json();
        if (!cancelled && json.success && json.data) {
          setMemoryCount(json.data.total || 0);
        }
      } catch {
        // Nicht kritisch, ignorieren
      }
    }
    
    loadProfile();
    loadMemoryStats();
    
    return () => { cancelled = true; };
    // Leere Dependency-Liste: Nur einmal beim Mount laden!
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // --------------------------------------------
  // Profil über API aktualisieren
  // Aktualisiert auch den localStorage-Cache
  // --------------------------------------------
  
  const updateProfile = async (data: Partial<UserProfile>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      
      if (json.success && json.data) {
        setProfile(json.data);
        
        // localStorage-Cache synchronisieren
        if (data.name) setStoreProfile({ name: data.name });
        if (data.avatar !== undefined) setStoreAvatar(data.avatar);
        if (data.bio !== undefined) setStoreBio(data.bio || '');
        if (data.status) setStoreStatus(data.status as UserStatus);
      }
    } catch {
      // Fallback: Nur im localStorage speichern
      console.warn('API nicht erreichbar, speichere nur in localStorage');
      if (data.name) setStoreProfile({ name: data.name });
      if (data.avatar !== undefined) setStoreAvatar(data.avatar);
      if (data.bio !== undefined) setStoreBio(data.bio || '');
      if (data.status) setStoreStatus(data.status as UserStatus);
    } finally {
      setSaving(false);
    }
  };
  
  // --------------------------------------------
  // Hilfsfunktionen
  // --------------------------------------------
  
  // Aktives Profil (API oder Fallback)
  const activeProfile = profile || {
    name: storeProfile.name,
    avatar: storeProfile.avatar,
    bio: storeProfile.bio,
    status: storeProfile.status,
  };
  
  // Status-Farbe aus den Optionen holen
  const statusColor = USER_STATUS_OPTIONS.find(s => s.id === activeProfile.status)?.color || '#22c55e';
  
  // Name speichern
  const handleSaveName = () => {
    if (tempName.trim()) {
      updateProfile({ name: tempName.trim() });
    }
    setEditingName(false);
  };
  
  // Name bearbeiten abbrechen
  const handleCancelName = () => {
    setTempName(activeProfile.name);
    setEditingName(false);
  };
  
  // Bio speichern
  const handleSaveBio = () => {
    updateProfile({ bio: tempBio.trim().slice(0, 160) });
    setEditingBio(false);
  };
  
  // Bio bearbeiten abbrechen
  const handleCancelBio = () => {
    setTempBio(activeProfile.bio || '');
    setEditingBio(false);
  };
  
  // Avatar-URL setzen
  const handleSetAvatar = () => {
    if (avatarUrl.trim()) {
      updateProfile({ avatar: avatarUrl.trim() });
    }
    setShowAvatarInput(false);
    setAvatarUrl('');
  };
  
  // Avatar entfernen
  const handleRemoveAvatar = () => {
    updateProfile({ avatar: null });
    setShowAvatarInput(false);
    setAvatarUrl('');
  };
  
  // (keine externen Links mehr - DB-Ansicht ist jetzt eine eigene Seite)
  
  // --------------------------------------------
  // Loading State
  // --------------------------------------------
  
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: accentColor }} />
      </div>
    );
  }

  return (
    <div className="flex h-full items-start justify-center p-6 pt-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* ----------------------------------------
            Zurück-Button
            ---------------------------------------- */}
        <Link href="/" className="inline-block mb-6">
          <motion.div
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
            style={{
              ...button.base,
              color: textColor,
              opacity: 0.7,
            }}
            whileHover={{ x: -4, opacity: 1 }}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Zurück</span>
          </motion.div>
        </Link>
        
        {/* ----------------------------------------
            Profil-Karte
            ---------------------------------------- */}
        <motion.div
          className="overflow-hidden relative"
          style={{
            ...container.base,
            boxShadow: designStyle === 'glass' 
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
              : container.base.boxShadow,
          }}
        >
          {/* Saving-Indikator */}
          {saving && (
            <div className="absolute top-2 right-2 z-10">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: accentColor }} />
            </div>
          )}
          
          {/* ----------------------------------------
              Avatar-Bereich (oben, groß)
              ---------------------------------------- */}
          <div className="relative flex flex-col items-center pt-8 pb-6 px-6">
            {/* Avatar */}
            <div className="relative group">
              <motion.div 
                className="h-28 w-28 overflow-hidden"
                style={{
                  borderRadius: designStyle === 'brutal' ? '1rem' : '50%',
                  border: designStyle === 'brutal' ? '3px solid #000' : 'none',
                  boxShadow: designStyle === 'brutal' 
                    ? '5px 5px 0 #000' 
                    : `0 8px 30px ${accentColor}40`,
                }}
                whileHover={{ scale: 1.02 }}
              >
                {activeProfile.avatar ? (
                  <img 
                    src={activeProfile.avatar} 
                    alt={activeProfile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div 
                    className="flex h-full w-full items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
                    }}
                  >
                    <span className="text-4xl font-bold text-white">
                      {activeProfile.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </motion.div>
              
              {/* Kamera-Button zum Ändern */}
              <motion.button
                onClick={() => setShowAvatarInput(!showAvatarInput)}
                className="absolute bottom-0 right-0 h-9 w-9 flex items-center justify-center"
                style={{
                  background: accentColor,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '50%',
                  border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                  boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : `0 4px 15px ${accentColor}50`,
                  color: '#fff',
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Camera className="h-4 w-4" />
              </motion.button>
              
              {/* Status-Indikator */}
              <div 
                className="absolute -bottom-1 -left-1 h-6 w-6 border-4 flex items-center justify-center"
                style={{
                  backgroundColor: statusColor,
                  borderRadius: '50%',
                  borderColor: container.base.backgroundColor,
                }}
              />
            </div>
            
            {/* Avatar URL Input */}
            {showAvatarInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 w-full space-y-2"
              >
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="Bild-URL eingeben..."
                    className="flex-1 px-3 py-2 text-sm outline-none"
                    style={{
                      ...inputStyles.base,
                      color: textColor,
                    }}
                  />
                  <motion.button
                    onClick={handleSetAvatar}
                    className="px-3 py-2"
                    style={{
                      background: accentColor,
                      borderRadius: inputStyles.base.borderRadius,
                      color: '#fff',
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </motion.button>
                </div>
                {activeProfile.avatar && (
                  <motion.button
                    onClick={handleRemoveAvatar}
                    className="flex items-center gap-2 px-3 py-2 text-sm w-full justify-center"
                    style={{
                      ...button.base,
                      color: '#ef4444',
                    }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Avatar entfernen
                  </motion.button>
                )}
              </motion.div>
            )}
            
            {/* ----------------------------------------
                Name (editierbar)
                ---------------------------------------- */}
            <div className="mt-4 w-full text-center">
              {editingName ? (
                <div className="flex items-center justify-center gap-2">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') handleCancelName();
                    }}
                    className="px-3 py-2 text-xl font-semibold text-center outline-none w-48"
                    style={{
                      ...inputStyles.base,
                      color: textColor,
                    }}
                    autoFocus
                  />
                  <motion.button
                    onClick={handleSaveName}
                    className="p-2"
                    style={{ color: '#22c55e' }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Check className="h-5 w-5" />
                  </motion.button>
                  <motion.button
                    onClick={handleCancelName}
                    className="p-2"
                    style={{ color: '#ef4444' }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  onClick={() => {
                    setTempName(activeProfile.name);
                    setEditingName(true);
                  }}
                  className="group flex items-center justify-center gap-2 mx-auto"
                  whileHover={{ scale: 1.02 }}
                >
                  <h1 
                    className="text-2xl font-semibold" 
                    style={{ color: textColor }}
                  >
                    {activeProfile.name}
                  </h1>
                  <Pencil 
                    className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" 
                    style={{ color: textColor }}
                  />
                </motion.button>
              )}
            </div>
          </div>
          
          {/* Divider */}
          <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          {/* ----------------------------------------
              Bio-Bereich
              ---------------------------------------- */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: textColor, opacity: 0.5 }}
              >
                Über mich
              </h3>
              {!editingBio && (
                <motion.button
                  onClick={() => {
                    setTempBio(activeProfile.bio || '');
                    setEditingBio(true);
                  }}
                  className="p-1.5"
                  style={{ color: textColor, opacity: 0.5 }}
                  whileHover={{ opacity: 1, scale: 1.1 }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </motion.button>
              )}
            </div>
            
            {editingBio ? (
              <div className="space-y-2">
                <textarea
                  ref={bioInputRef}
                  value={tempBio}
                  onChange={(e) => setTempBio(e.target.value.slice(0, 160))}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') handleCancelBio();
                  }}
                  placeholder="Erzähl etwas über dich..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm outline-none resize-none"
                  style={{
                    ...inputStyles.base,
                    color: textColor,
                  }}
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <span 
                    className="text-xs"
                    style={{ color: textColor, opacity: 0.4 }}
                  >
                    {tempBio.length}/160
                  </span>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={handleCancelBio}
                      className="px-3 py-1.5 text-sm"
                      style={{
                        ...button.base,
                        color: textColor,
                        opacity: 0.7,
                      }}
                      whileHover={{ opacity: 1 }}
                    >
                      Abbrechen
                    </motion.button>
                    <motion.button
                      onClick={handleSaveBio}
                      className="px-3 py-1.5 text-sm"
                      style={{
                        background: accentColor,
                        borderRadius: button.base.borderRadius,
                        color: '#fff',
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Speichern
                    </motion.button>
                  </div>
                </div>
              </div>
            ) : (
              <p 
                className="text-sm leading-relaxed"
                style={{ color: textColor, opacity: activeProfile.bio ? 0.8 : 0.4 }}
              >
                {activeProfile.bio || 'Noch keine Bio hinzugefügt...'}
              </p>
            )}
          </div>
          
          {/* Divider */}
          <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          {/* ----------------------------------------
              Status-Auswahl
              ---------------------------------------- */}
          <div className="p-6">
            <h3 
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: textColor, opacity: 0.5 }}
            >
              Status
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              {USER_STATUS_OPTIONS.map((status) => {
                const isActive = activeProfile.status === status.id;
                return (
                  <motion.button
                    key={status.id}
                    onClick={() => updateProfile({ status: status.id })}
                    className="flex items-center gap-3 px-4 py-3 transition-all"
                    style={{
                      ...button.base,
                      background: isActive 
                        ? `${status.color}20`
                        : button.base.background,
                      border: isActive 
                        ? `1px solid ${status.color}40`
                        : '1px solid transparent',
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span 
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <span 
                      className="text-sm font-medium"
                      style={{ color: isActive ? status.color : textColor }}
                    >
                      {status.name}
                    </span>
                    {isActive && (
                      <Check 
                        className="h-4 w-4 ml-auto" 
                        style={{ color: status.color }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
          
          {/* Divider */}
          <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          {/* ----------------------------------------
              Daten & Gedächtnis Bereich
              Quick-Links zu DB-UI und Memory-Stats
              ---------------------------------------- */}
          <div className="p-6">
            <h3 
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: textColor, opacity: 0.5 }}
            >
              Daten & Gedächtnis
            </h3>
            
            <div className="space-y-2">
              {/* Memory-Statistiken */}
              <div 
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  ...button.base,
                }}
              >
                <Brain className="h-5 w-5" style={{ color: accentColor }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: textColor }}>
                    Agent-Gedächtnis
                  </p>
                  <p className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                    {memoryCount === 0 
                      ? 'Noch keine Erinnerungen gespeichert' 
                      : `${memoryCount} gespeicherte Erinnerung${memoryCount !== 1 ? 'en' : ''}`}
                  </p>
                </div>
              </div>
              
              {/* Datenbank Explorer Link (intern) */}
              <Link href="/profile/database">
                <motion.div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl w-full"
                  style={{
                    ...button.base,
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Database className="h-5 w-5" style={{ color: accentColor }} />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium" style={{ color: textColor }}>
                      Datenbank öffnen
                    </p>
                    <p className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                      Alle Tabellen und Einträge anzeigen
                    </p>
                  </div>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ 
                      background: `${accentColor}20`, 
                      color: accentColor,
                    }}
                  >
                    →
                  </span>
                </motion.div>
              </Link>
            </div>
          </div>
        </motion.div>
        
        {/* ----------------------------------------
            Footer-Info
            ---------------------------------------- */}
        <p 
          className="text-center text-xs mt-6"
          style={{ color: textColor, opacity: 0.3 }}
        >
          Dein Profil wird in der Datenbank gespeichert und ist geräteübergreifend verfügbar.
        </p>
      </motion.div>
    </div>
  );
}
