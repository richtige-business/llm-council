// ============================================
// Database Explorer Page - Integrierte Datenbank-Ansicht
// 
// Zweck: Zeigt alle DB-Tabellen gruppiert nach Modul an
//        Jeder Modul-Agent sieht genau welche Tabellen ihm gehören
// Verwendet von: Profil-Seite (Link "Datenbank öffnen")
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Table2,
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Rows3,
  RefreshCw,
  Brain,
  Mail,
  Calendar,
  GraduationCap,
} from 'lucide-react';
import Link from 'next/link';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Typen
// --------------------------------------------

interface TableInfo {
  name: string;
  displayName: string;
  rowCount: number;
}

interface ModuleGroup {
  moduleId: string;
  label: string;
  icon: string;
  color: string;
  tables: TableInfo[];
  totalRows: number;
}

interface TableData {
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

// --------------------------------------------
// Icon-Mapping: String → Lucide Component
// --------------------------------------------

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Brain,
  Mail,
  Calendar,
  GraduationCap,
};

// --------------------------------------------
// Hilfsfunktion: Wert für die Anzeige formatieren
// Kürzt lange Strings, formatiert JSON und Dates
// --------------------------------------------

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  
  // ISO-Date erkennen und formatieren
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    try {
      return new Date(value).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return value;
    }
  }
  
  if (typeof value === 'string') {
    return value.length > 80 ? value.slice(0, 80) + '…' : value;
  }
  
  // Objekte/Arrays als kompaktes JSON
  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    return json.length > 80 ? json.slice(0, 80) + '…' : json;
  }
  
  return String(value);
}

// --------------------------------------------
// Spaltenbreite basierend auf dem Namen bestimmen
// --------------------------------------------

function getColumnWidth(col: string): string {
  if (col === 'id') return 'min-w-[120px] max-w-[180px]';
  if (col.includes('At') || col.includes('date')) return 'min-w-[140px]';
  if (col === 'content' || col === 'body' || col === 'summary') return 'min-w-[200px] max-w-[300px]';
  if (col === 'value') return 'min-w-[150px] max-w-[250px]';
  return 'min-w-[100px] max-w-[200px]';
}

// --------------------------------------------
// Database Explorer Komponente
// --------------------------------------------

export default function DatabasePage() {
  const { container, button, accentColor, textColor, designStyle } = useThemeStyles();
  
  // State
  const [groups, setGroups] = useState<ModuleGroup[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Welche Modul-Gruppen sind aufgeklappt?
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // --------------------------------------------
  // Tabellen laden (gruppiert nach Modul)
  // --------------------------------------------
  
  const loadTables = useCallback(async () => {
    setLoadingTables(true);
    try {
      const res = await fetch('/api/database?action=tables');
      const json = await res.json();
      if (json.success) {
        setGroups(json.data);
        
        // Alle Gruppen die Daten haben automatisch aufklappen
        const withData = new Set<string>();
        for (const group of json.data as ModuleGroup[]) {
          if (group.totalRows > 0) {
            withData.add(group.moduleId);
          }
        }
        // Falls keine Daten: Erste Gruppe aufklappen
        if (withData.size === 0 && json.data.length > 0) {
          withData.add(json.data[0].moduleId);
        }
        setExpandedGroups(withData);
      }
    } catch {
      console.error('Fehler beim Laden der Tabellen');
    } finally {
      setLoadingTables(false);
    }
  }, []);
  
  useEffect(() => {
    loadTables();
  }, [loadTables]);
  
  // --------------------------------------------
  // Tabellenzeilen laden
  // --------------------------------------------
  
  const loadRows = useCallback(async (tableName: string, page: number = 1) => {
    setLoadingRows(true);
    try {
      const res = await fetch(`/api/database?action=rows&table=${tableName}&page=${page}&limit=50`);
      const json = await res.json();
      if (json.success) {
        setTableData(json.data);
      }
    } catch {
      console.error('Fehler beim Laden der Zeilen');
    } finally {
      setLoadingRows(false);
    }
  }, []);
  
  // Tabelle auswählen
  const selectTable = (name: string) => {
    setSelectedTable(name);
    setCurrentPage(1);
    loadRows(name, 1);
  };
  
  // Seite wechseln
  const changePage = (page: number) => {
    setCurrentPage(page);
    if (selectedTable) loadRows(selectedTable, page);
  };
  
  // Gruppe auf-/zuklappen
  const toggleGroup = (moduleId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };
  
  // Gesamte Zeilenanzahl und Tabellenanzahl
  const totalRows = groups.reduce((sum, g) => sum + g.totalRows, 0);
  const totalTables = groups.reduce((sum, g) => sum + g.tables.length, 0);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ----------------------------------------
          Header
          ---------------------------------------- */}
      <div className="shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/profile">
            <motion.div
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
              style={{ ...button.base, color: textColor, opacity: 0.7 }}
              whileHover={{ x: -4, opacity: 1 }}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Profil</span>
            </motion.div>
          </Link>
          
          <div className="flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: textColor }}>
              <Database className="h-5 w-5" style={{ color: accentColor }} />
              Datenbank Explorer
            </h1>
            <p className="text-xs mt-0.5" style={{ color: textColor, opacity: 0.5 }}>
              {groups.length} Module · {totalTables} Tabellen · {totalRows} Einträge
            </p>
          </div>
          
          <motion.button
            onClick={() => {
              loadTables();
              if (selectedTable) loadRows(selectedTable, currentPage);
            }}
            className="p-2 rounded-xl"
            style={{ ...button.base, color: textColor, opacity: 0.5 }}
            whileHover={{ opacity: 1, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
      
      {/* ----------------------------------------
          Content: Sidebar + Tabelle
          ---------------------------------------- */}
      <div className="flex flex-1 gap-4 px-6 pb-6 overflow-hidden">
        {/* ========================================
            Modul-gruppierte Sidebar (links)
            ======================================== */}
        <motion.div
          className="w-60 shrink-0 overflow-y-auto rounded-2xl"
          style={{
            ...container.base,
            boxShadow: designStyle === 'glass'
              ? '0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.08) inset'
              : container.base.boxShadow,
          }}
        >
          {loadingTables ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: accentColor }} />
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {groups.map((group) => {
                const isExpanded = expandedGroups.has(group.moduleId);
                const IconComponent = ICON_MAP[group.icon] || Database;
                
                return (
                  <div key={group.moduleId}>
                    {/* Modul-Gruppe Header */}
                    <motion.button
                      onClick={() => toggleGroup(group.moduleId)}
                      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-left"
                      whileHover={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <IconComponent
                        className="h-4 w-4 shrink-0"
                        style={{ color: group.color }}
                      />
                      <span
                        className="text-xs font-semibold flex-1"
                        style={{ color: textColor, opacity: 0.9 }}
                      >
                        {group.label}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full mr-1"
                        style={{
                          background: group.totalRows > 0 ? `${group.color}20` : 'rgba(255,255,255,0.05)',
                          color: group.totalRows > 0 ? group.color : textColor,
                          opacity: group.totalRows > 0 ? 1 : 0.3,
                        }}
                      >
                        {group.totalRows}
                      </span>
                      <ChevronDown
                        className="h-3 w-3 shrink-0 transition-transform"
                        style={{
                          color: textColor,
                          opacity: 0.3,
                          transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                        }}
                      />
                    </motion.button>
                    
                    {/* Tabellen in dieser Gruppe */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-4 space-y-0.5 pb-1">
                            {group.tables.map((table) => {
                              const isActive = selectedTable === table.name;
                              return (
                                <motion.button
                                  key={table.name}
                                  onClick={() => selectTable(table.name)}
                                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left transition-all"
                                  style={{
                                    background: isActive ? `${group.color}15` : 'transparent',
                                    borderLeft: isActive
                                      ? `2px solid ${group.color}`
                                      : '2px solid transparent',
                                  }}
                                  whileHover={{
                                    background: isActive ? undefined : 'rgba(255,255,255,0.03)',
                                  }}
                                >
                                  <Table2
                                    className="h-3 w-3 shrink-0"
                                    style={{
                                      color: isActive ? group.color : textColor,
                                      opacity: isActive ? 1 : 0.3,
                                    }}
                                  />
                                  <span
                                    className="text-[11px] font-medium truncate flex-1"
                                    style={{
                                      color: isActive ? group.color : textColor,
                                      opacity: isActive ? 1 : 0.7,
                                    }}
                                  >
                                    {table.displayName}
                                  </span>
                                  {table.rowCount > 0 && (
                                    <span
                                      className="text-[9px] px-1 py-0.5 rounded-full shrink-0"
                                      style={{
                                        background: `${group.color}15`,
                                        color: group.color,
                                      }}
                                    >
                                      {table.rowCount}
                                    </span>
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
        
        {/* ========================================
            Tabelleninhalt (rechts)
            ======================================== */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-2xl" style={container.base}>
          <AnimatePresence mode="wait">
            {!selectedTable ? (
              // Keine Tabelle ausgewählt → Platzhalter
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full gap-3"
              >
                <Rows3 className="h-10 w-10" style={{ color: textColor, opacity: 0.15 }} />
                <p className="text-sm" style={{ color: textColor, opacity: 0.3 }}>
                  Wähle eine Tabelle aus der Seitenleiste
                </p>
              </motion.div>
            ) : loadingRows ? (
              // Laden...
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center h-full"
              >
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: accentColor }} />
              </motion.div>
            ) : tableData ? (
              // Tabellen-Daten anzeigen
              <motion.div
                key={selectedTable}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full"
              >
                {/* Tabellen-Header mit Modul-Farbe */}
                <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    {/* Modul-Farb-Indikator */}
                    {(() => {
                      const parentGroup = groups.find(g => g.tables.some(t => t.name === selectedTable));
                      return parentGroup ? (
                        <div
                          className="w-1 h-8 rounded-full"
                          style={{ background: parentGroup.color }}
                        />
                      ) : null;
                    })()}
                    <div>
                      <h2 className="text-sm font-semibold" style={{ color: textColor }}>
                        {tableData.table}
                      </h2>
                      <p className="text-xs" style={{ color: textColor, opacity: 0.4 }}>
                        {tableData.pagination.totalCount} Einträge · {tableData.columns.length} Spalten
                        {(() => {
                          const parentGroup = groups.find(g => g.tables.some(t => t.name === selectedTable));
                          return parentGroup ? ` · ${parentGroup.label}` : '';
                        })()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Pagination */}
                  {tableData.pagination.totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={() => changePage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="p-1.5 rounded-lg disabled:opacity-20"
                        style={{ color: textColor }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </motion.button>
                      <span className="text-xs" style={{ color: textColor, opacity: 0.6 }}>
                        {currentPage} / {tableData.pagination.totalPages}
                      </span>
                      <motion.button
                        onClick={() => changePage(currentPage + 1)}
                        disabled={currentPage >= tableData.pagination.totalPages}
                        className="p-1.5 rounded-lg disabled:opacity-20"
                        style={{ color: textColor }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </motion.button>
                    </div>
                  )}
                </div>
                
                {/* Scrollbare Tabelle */}
                <div className="flex-1 overflow-auto">
                  {tableData.rows.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm" style={{ color: textColor, opacity: 0.3 }}>
                        Tabelle ist leer
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 z-10">
                        <tr
                          style={{
                            background: designStyle === 'glass'
                              ? 'rgba(0,0,0,0.4)'
                              : 'rgba(0,0,0,0.2)',
                            backdropFilter: 'blur(12px)',
                          }}
                        >
                          {tableData.columns.map((col) => (
                            <th
                              key={col}
                              className={`px-3 py-2.5 text-left font-semibold whitespace-nowrap ${getColumnWidth(col)}`}
                              style={{ color: textColor, opacity: 0.6 }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.rows.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-white/[0.03] transition-colors"
                            style={{
                              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)';
                            }}
                          >
                            {tableData.columns.map((col) => (
                              <td
                                key={col}
                                className={`px-3 py-2 whitespace-nowrap truncate ${getColumnWidth(col)}`}
                                style={{ color: textColor, opacity: 0.8 }}
                                title={String(row[col] ?? '')}
                              >
                                {col === 'id' ? (
                                  <span
                                    className="px-1.5 py-0.5 rounded font-mono text-[10px]"
                                    style={{ background: 'rgba(255,255,255,0.05)' }}
                                  >
                                    {formatCellValue(row[col])}
                                  </span>
                                ) : (
                                  formatCellValue(row[col])
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
