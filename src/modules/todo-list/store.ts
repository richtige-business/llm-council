// ============================================
// Todo Liste - Zustand Store
// 
// Zweck: Zentrale Zustandsverwaltung für Todos
// Verwendet von: Komponenten und Agent-Tools
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { emit } from '@/lib/kernel-stub';
import { Todo, TodoStore } from './types';
import { DEFAULT_CATEGORIES, TODO_EVENTS } from './constants';

// --------------------------------------------
// Helper Funktionen
// --------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function sortTodos(todos: Todo[], sortBy: TodoStore['sortBy']): Todo[] {
  return [...todos].sort((a, b) => {
    switch (sortBy) {
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case 'alphabetical':
        return a.text.localeCompare(b.text);
      default:
        return 0;
    }
  });
}

// --------------------------------------------
// Zustand Store
// --------------------------------------------

export const useTodoStore = create<TodoStore>()(
  persist(
    (set, get) => ({
      // --------------------------------------------
      // Initial State
      // --------------------------------------------
      todos: [],
      filter: 'all',
      sortBy: 'created',
      categories: DEFAULT_CATEGORIES,

      // --------------------------------------------
      // CRUD Operationen
      // --------------------------------------------
      addTodo: (text: string, priority = 'medium', category) => {
        const newTodo: Todo = {
          id: generateId(),
          text: text.trim(),
          completed: false,
          createdAt: new Date(),
          priority,
          category
        };

        set((state) => ({
          todos: [newTodo, ...state.todos]
        }));

        // Event emittieren
        emit(TODO_EVENTS.CREATED, {
          todo: newTodo,
          totalCount: get().todos.length
        });
      },

      toggleTodo: (id: string) => {
        set((state) => {
          const updatedTodos = state.todos.map(todo => {
            if (todo.id === id) {
              const updated = {
                ...todo,
                completed: !todo.completed,
                completedAt: !todo.completed ? new Date() : undefined
              };
              
              // Event emittieren
              emit(updated.completed ? TODO_EVENTS.COMPLETED : TODO_EVENTS.UPDATED, {
                todo: updated,
                previousState: todo
              });
              
              return updated;
            }
            return todo;
          });
          
          return { todos: updatedTodos };
        });
      },

      deleteTodo: (id: string) => {
        const todoToDelete = get().todos.find(t => t.id === id);
        
        set((state) => ({
          todos: state.todos.filter(todo => todo.id !== id)
        }));

        if (todoToDelete) {
          emit(TODO_EVENTS.DELETED, {
            todo: todoToDelete,
            remainingCount: get().todos.length
          });
        }
      },

      updateTodo: (id: string, updates) => {
        set((state) => {
          const updatedTodos = state.todos.map(todo => {
            if (todo.id === id) {
              const updated = { ...todo, ...updates };
              
              emit(TODO_EVENTS.UPDATED, {
                todo: updated,
                previousState: todo,
                changes: updates
              });
              
              return updated;
            }
            return todo;
          });
          
          return { todos: updatedTodos };
        });
      },

      // --------------------------------------------
      // Filter und Sortierung
      // --------------------------------------------
      setFilter: (filter) => set({ filter }),
      setSortBy: (sortBy) => set({ sortBy }),

      // --------------------------------------------
      // Kategorien
      // --------------------------------------------
      addCategory: (category: string) => {
        const trimmed = category.trim();
        if (trimmed && !get().categories.includes(trimmed)) {
          set((state) => ({
            categories: [...state.categories, trimmed]
          }));
        }
      },

      removeCategory: (category: string) => {
        set((state) => ({
          categories: state.categories.filter(c => c !== category)
        }));
      },

      // --------------------------------------------
      // Bulk Operationen
      // --------------------------------------------
      clearCompleted: () => {
        const completedTodos = get().todos.filter(t => t.completed);
        
        set((state) => ({
          todos: state.todos.filter(todo => !todo.completed)
        }));

        emit('todo-list.bulk.cleared', {
          deletedCount: completedTodos.length,
          remainingCount: get().todos.length
        });
      },

      toggleAll: () => {
        const allCompleted = get().todos.every(t => t.completed);
        const newCompletedState = !allCompleted;
        
        set((state) => ({
          todos: state.todos.map(todo => ({
            ...todo,
            completed: newCompletedState,
            completedAt: newCompletedState ? new Date() : undefined
          }))
        }));

        emit('todo-list.bulk.toggled', {
          allCompleted: newCompletedState,
          affectedCount: get().todos.length
        });
      },

      // --------------------------------------------
      // Getter Funktionen
      // --------------------------------------------
      getFilteredTodos: () => {
        const { todos, filter, sortBy } = get();
        
        let filtered = todos;
        switch (filter) {
          case 'active':
            filtered = todos.filter(t => !t.completed);
            break;
          case 'completed':
            filtered = todos.filter(t => t.completed);
            break;
          default:
            filtered = todos;
        }
        
        return sortTodos(filtered, sortBy);
      },

      getStats: () => {
        const todos = get().todos;
        const total = todos.length;
        const completed = todos.filter(t => t.completed).length;
        const active = total - completed;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return { total, completed, active, completionRate };
      }
    }),
    {
      name: 'todo-list-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);