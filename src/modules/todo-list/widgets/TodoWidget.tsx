'use client';

// ============================================
// Todo Liste - Dashboard Widget
// 
// Zweck: Kompaktes Todo-Widget für das Dashboard
// Verwendet von: LifeOS Dashboard
// ============================================

import React from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Plus, Check, Clock, TrendingUp } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { useTodoStore } from '../store';

export function TodoWidget() {
  const styles = useThemeStyles();
  const { getFilteredTodos, getStats, addTodo, toggleTodo } = useTodoStore();
  
  const stats = getStats();
  const recentTodos = getFilteredTodos().slice(0, 3);
  const [newTodoText, setNewTodoText] = React.useState('');

  const handleQuickAdd = () => {
    if (newTodoText.trim()) {
      addTodo(newTodoText);
      setNewTodoText('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${styles.glass} p-4 rounded-xl border border-white/20 h-full`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <CheckSquare className="text-blue-400" size={20} />
        <h3 className="text-white font-medium">Todos</h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center">
          <p className="text-lg font-bold text-white">{stats.active}</p>
          <p className="text-xs text-gray-400">Aktiv</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-400">{stats.completed}</p>
          <p className="text-xs text-gray-400">Erledigt</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-yellow-400">{stats.completionRate}%</p>
          <p className="text-xs text-gray-400">Fortschritt</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-600 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-blue-400 to-green-400 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${stats.completionRate}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Quick Add */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleQuickAdd()}
          placeholder="Schnell hinzufügen..."
          className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm placeholder-white/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        />
        <button
          onClick={handleQuickAdd}
          disabled={!newTodoText.trim()}
          className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:opacity-50 text-white rounded transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Recent Todos */}
      <div className="space-y-2">
        {recentTodos.length === 0 ? (
          <div className="text-center py-4">
            <Clock className="mx-auto text-gray-400 mb-2" size={24} />
            <p className="text-gray-400 text-sm">Noch keine Todos</p>
          </div>
        ) : (
          recentTodos.map((todo) => (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-2 p-2 rounded-lg bg-white/5 ${todo.completed ? 'opacity-60' : ''}`}
            >
              <button
                onClick={() => toggleTodo(todo.id)}
                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                  todo.completed
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-400 hover:border-green-400'
                }`}
              >
                {todo.completed && <Check size={10} />}
              </button>
              <p className={`flex-1 text-sm truncate ${
                todo.completed ? 'line-through text-gray-400' : 'text-white'
              }`}>
                {todo.text}
              </p>
            </motion.div>
          ))
        )}
      </div>

      {/* Footer Link */}
      {stats.total > 3 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-center text-xs text-gray-400">
            und {stats.total - 3} weitere...
          </p>
        </div>
      )}
    </motion.div>
  );
}