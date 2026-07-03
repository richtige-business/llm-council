'use client';

// ============================================
// Todo Liste - Hauptseiten-Komponente
// 
// Zweck: Vollständige Todo-Listen Benutzeroberfläche
// Verwendet von: LifeOS Router
// ============================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Filter, 
  SortAsc, 
  Check, 
  Trash2, 
  Edit, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  List,
  X,
  Save,
  Tag
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { useTodoStore } from '../store';
import { Todo } from '../types';
import { TODO_PRIORITIES, TODO_FILTERS, TODO_SORT_OPTIONS, TODO_MODULE_INFO } from '../constants';
import { ModuleSettingsButton } from '@/components/agent';

// --------------------------------------------
// Haupt-Komponente
// --------------------------------------------

export function TodoPage() {
  const styles = useThemeStyles();
  const {
    todos,
    filter,
    sortBy,
    categories,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
    setFilter,
    setSortBy,
    addCategory,
    clearCompleted,
    toggleAll,
    getFilteredTodos,
    getStats
  } = useTodoStore();

  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<Todo['priority']>('medium');
  const [newTodoCategory, setNewTodoCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  
  const filteredTodos = getFilteredTodos();
  const stats = getStats();

  // --------------------------------------------
  // Event Handlers
  // --------------------------------------------

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      addTodo(
        newTodoText,
        newTodoPriority,
        newTodoCategory || undefined
      );
      setNewTodoText('');
      setNewTodoCategory('');
      setNewTodoPriority('medium');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTodo();
    }
  };

  const handleEditStart = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const handleEditSave = (id: string) => {
    if (editText.trim()) {
      updateTodo(id, { text: editText.trim() });
    }
    setEditingId(null);
    setEditText('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      addCategory(newCategory.trim());
      setNewCategory('');
    }
  };

  // --------------------------------------------
  // Sub-Komponenten
  // --------------------------------------------

  const TodoItem = ({ todo }: { todo: Todo }) => {
    const isEditing = editingId === todo.id;
    const priorityConfig = TODO_PRIORITIES[todo.priority];

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`${styles.glass} p-4 rounded-xl border border-white/20 ${todo.completed ? 'opacity-60' : ''}`}
      >
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <button
            onClick={() => toggleTodo(todo.id)}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
              todo.completed
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 hover:border-green-400'
            }`}
          >
            {todo.completed && <Check size={12} />}
          </button>

          {/* Text */}
          <div className="flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleEditSave(todo.id)}
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  autoFocus
                />
                <button
                  onClick={() => handleEditSave(todo.id)}
                  className="p-1 text-green-400 hover:bg-green-500/20 rounded transition-colors"
                >
                  <Save size={16} />
                </button>
                <button
                  onClick={handleEditCancel}
                  className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div>
                <p className={`${todo.completed ? 'line-through text-gray-400' : 'text-white'}`}>
                  {todo.text}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {/* Priorität */}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                    {priorityConfig.label}
                  </span>
                  
                  {/* Kategorie */}
                  {todo.category && (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full text-xs flex items-center gap-1">
                      <Tag size={10} />
                      {todo.category}
                    </span>
                  )}
                  
                  {/* Datum */}
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(todo.createdAt).toLocaleDateString('de-DE')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Aktionen */}
          {!isEditing && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleEditStart(todo)}
                className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/20 rounded transition-all duration-200"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-all duration-200"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${styles.glass} p-6 rounded-2xl border border-white/20`}
        >
          <h1 className="text-3xl font-bold text-white mb-2">Todo Liste</h1>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-gray-400 text-sm">Gesamt</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{stats.active}</p>
              <p className="text-gray-400 text-sm">Aktiv</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
              <p className="text-gray-400 text-sm">Erledigt</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">{stats.completionRate}%</p>
              <p className="text-gray-400 text-sm">Fortschritt</p>
            </div>
          </div>
        </motion.div>

        {/* Neuen Todo hinzufügen */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${styles.glass} p-6 rounded-2xl border border-white/20`}
        >
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Neue Aufgabe hinzufügen..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <button
                onClick={handleAddTodo}
                disabled={!newTodoText.trim()}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Hinzufügen
              </button>
            </div>
            
            <div className="flex gap-3">
              {/* Priorität */}
              <select
                value={newTodoPriority}
                onChange={(e) => setNewTodoPriority(e.target.value as Todo['priority'])}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {Object.entries(TODO_PRIORITIES).map(([key, config]) => (
                  <option key={key} value={key} className="bg-gray-800">
                    {config.label}
                  </option>
                ))}
              </select>
              
              {/* Kategorie */}
              <select
                value={newTodoCategory}
                onChange={(e) => setNewTodoCategory(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="" className="bg-gray-800">Keine Kategorie</option>
                {categories.map((category) => (
                  <option key={category} value={category} className="bg-gray-800">
                    {category}
                  </option>
                ))}
              </select>
              
              {/* Neue Kategorie */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  placeholder="Neue Kategorie"
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategory.trim()}
                  className="px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filter und Sortierung */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`${styles.glass} p-4 rounded-xl border border-white/20`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Filter */}
              <div className="flex items-center gap-2">
                {Object.entries(TODO_FILTERS).map(([key, config]) => {
                  const IconComponent = key === 'all' ? List : key === 'active' ? Clock : CheckCircle;
                  return (
                    <button
                      key={key}
                      onClick={() => setFilter(key as any)}
                      className={`px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                        filter === key
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <IconComponent size={16} />
                      {config.label}
                    </button>
                  );
                })}
              </div>
              
              {/* Sortierung */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {Object.entries(TODO_SORT_OPTIONS).map(([key, config]) => (
                  <option key={key} value={key} className="bg-gray-800">
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Bulk Aktionen */}
            <div className="flex items-center gap-2">
              {stats.total > 0 && (
                <button
                  onClick={toggleAll}
                  className="px-3 py-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                >
                  {stats.active === 0 ? 'Alle deaktivieren' : 'Alle erledigen'}
                </button>
              )}
              {stats.completed > 0 && (
                <button
                  onClick={clearCompleted}
                  className="px-3 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  Erledigte löschen
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Todo Liste */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredTodos.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`${styles.glass} p-8 rounded-xl border border-white/20 text-center`}
              >
                <p className="text-gray-400 text-lg">
                  {filter === 'all'
                    ? 'Noch keine Todos vorhanden'
                    : filter === 'active'
                    ? 'Keine aktiven Todos'
                    : 'Keine erledigten Todos'}
                </p>
              </motion.div>
            ) : (
              filteredTodos.map((todo) => (
                <TodoItem key={todo.id} todo={todo} />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Agent Settings Button */}
      <ModuleSettingsButton
        moduleId={TODO_MODULE_INFO.id}
        moduleName={TODO_MODULE_INFO.name}
        moduleColor={TODO_MODULE_INFO.color}
      />
    </div>
  );
}