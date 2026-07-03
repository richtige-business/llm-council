// ============================================
// Todo Liste - TypeScript Types
// 
// Zweck: Alle TypeScript Interfaces und Types für das Todo Modul
// Verwendet von: Alle anderen Dateien im Modul
// ============================================

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
  priority: 'low' | 'medium' | 'high';
  category?: string;
}

export interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  sortBy: 'created' | 'priority' | 'alphabetical';
  categories: string[];
}

export interface TodoActions {
  // CRUD Operationen
  addTodo: (text: string, priority?: Todo['priority'], category?: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateTodo: (id: string, updates: Partial<Pick<Todo, 'text' | 'priority' | 'category'>>) => void;
  
  // Filter und Sortierung
  setFilter: (filter: TodoState['filter']) => void;
  setSortBy: (sortBy: TodoState['sortBy']) => void;
  
  // Kategorien
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  
  // Bulk Operationen
  clearCompleted: () => void;
  toggleAll: () => void;
  
  // Getter
  getFilteredTodos: () => Todo[];
  getStats: () => {
    total: number;
    completed: number;
    active: number;
    completionRate: number;
  };
}

export type TodoStore = TodoState & TodoActions;