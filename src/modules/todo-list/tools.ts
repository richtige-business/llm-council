// ============================================
// Todo Liste - Agent Tools und System Prompt
// 
// Zweck: Tools für AI-Agents und System Prompt
// Verwendet von: LifeOS AI-System
// ============================================

import { ModuleTool, ModuleSystemPrompt } from '@/types/agent';

// --------------------------------------------
// Agent Tools
// --------------------------------------------

export const moduleTools: ModuleTool[] = [
  {
    id: 'todo_create',
    name: 'create_todo',
    description: 'Erstellt eine neue Todo-Aufgabe',
    category: 'write',
    parameters: [
      { name: 'text', type: 'string', description: 'Der Text der Aufgabe', required: true },
      { name: 'priority', type: 'string', description: 'Priorität: low, medium, high', required: false },
      { name: 'category', type: 'string', description: 'Kategorie für die Aufgabe', required: false }
    ],
    returns: 'Die erstellte Todo-Aufgabe mit ID und Metadaten',
    implementation: `
      const { addTodo } = useTodoStore.getState();
      addTodo(
        args.text,
        args.priority || 'medium',
        args.category
      );
      
      // Letzte hinzugefügte Aufgabe zurückgeben
      const todos = useTodoStore.getState().todos;
      return {
        success: true,
        todo: todos[0],
        message: \`Todo "\${args.text}" wurde erstellt\`
      };
    `,
    examples: [
      'Erstelle eine neue Aufgabe "Einkaufen gehen"',
      'Füge "Meeting vorbereiten" mit hoher Priorität hinzu',
      'Neue Aufgabe "Zahnarzttermin" in der Kategorie Gesundheit'
    ]
  },
  
  {
    id: 'todo_list',
    name: 'list_todos',
    description: 'Listet Todos basierend auf Filtern auf',
    category: 'read',
    parameters: [
      { name: 'filter', type: 'string', description: 'Filter: all, active, completed', required: false },
      { name: 'category', type: 'string', description: 'Nur Todos aus dieser Kategorie', required: false },
      { name: 'limit', type: 'number', description: 'Maximale Anzahl Ergebnisse', required: false }
    ],
    returns: 'Array von Todo-Aufgaben und Statistiken',
    implementation: `
      const { getFilteredTodos, getStats, setFilter } = useTodoStore.getState();
      
      // Filter setzen falls angegeben
      if (args.filter) {
        setFilter(args.filter);
      }
      
      let todos = getFilteredTodos();
      
      // Kategorie-Filter
      if (args.category) {
        todos = todos.filter(todo => 
          todo.category?.toLowerCase() === args.category.toLowerCase()
        );
      }
      
      // Limit anwenden
      if (args.limit && args.limit > 0) {
        todos = todos.slice(0, args.limit);
      }
      
      const stats = getStats();
      
      return {
        todos,
        stats,
        totalFound: todos.length,
        appliedFilters: {
          filter: args.filter || 'current',
          category: args.category || 'all',
          limit: args.limit || 'none'
        }
      };
    `,
    examples: [
      'Zeige mir alle Todos',
      'Liste aktive Aufgaben auf',
      'Zeige erledigte Todos aus der Kategorie Arbeit',
      'Die 5 neuesten Aufgaben'
    ]
  },
  
  {
    id: 'todo_complete',
    name: 'complete_todo',
    description: 'Markiert eine Todo-Aufgabe als erledigt oder nicht erledigt',
    category: 'update',
    parameters: [
      { name: 'id', type: 'string', description: 'ID der Todo-Aufgabe', required: false },
      { name: 'text', type: 'string', description: 'Text der Aufgabe (falls ID unbekannt)', required: false },
      { name: 'completed', type: 'boolean', description: 'Erledigt-Status', required: false }
    ],
    returns: 'Aktualisierte Todo-Aufgabe',
    implementation: `
      const { todos, toggleTodo } = useTodoStore.getState();
      
      let todo;
      
      // Todo anhand ID finden
      if (args.id) {
        todo = todos.find(t => t.id === args.id);
      }
      // Todo anhand Text finden
      else if (args.text) {
        todo = todos.find(t => 
          t.text.toLowerCase().includes(args.text.toLowerCase())
        );
      }
      
      if (!todo) {
        return {
          success: false,
          message: 'Todo nicht gefunden'
        };
      }
      
      // Nur togglen wenn der gewünschte Status anders ist
      const shouldToggle = args.completed !== undefined 
        ? todo.completed !== args.completed
        : true;
      
      if (shouldToggle) {
        toggleTodo(todo.id);
        
        // Aktualisierte Version holen
        const updatedTodo = useTodoStore.getState().todos.find(t => t.id === todo.id);
        
        return {
          success: true,
          todo: updatedTodo,
          message: \`Todo "\${todo.text}" wurde \${updatedTodo.completed ? 'erledigt' : 'aktiviert'}\`
        };
      }
      
      return {
        success: true,
        todo,
        message: \`Todo "\${todo.text}" ist bereits \${todo.completed ? 'erledigt' : 'aktiv'}\`
      };
    `,
    examples: [
      'Markiere "Einkaufen gehen" als erledigt',
      'Todo mit ID abc123 abschließen',
      'Setze "Meeting vorbereiten" auf nicht erledigt'
    ]
  },
  
  {
    id: 'todo_delete',
    name: 'delete_todo',
    description: 'Löscht eine Todo-Aufgabe',
    category: 'delete',
    parameters: [
      { name: 'id', type: 'string', description: 'ID der Todo-Aufgabe', required: false },
      { name: 'text', type: 'string', description: 'Text der Aufgabe (falls ID unbekannt)', required: false },
      { name: 'deleteCompleted', type: 'boolean', description: 'Alle erledigten Todos löschen', required: false }
    ],
    returns: 'Bestätigung der Löschung',
    implementation: `
      const { todos, deleteTodo, clearCompleted } = useTodoStore.getState();
      
      // Alle erledigten löschen
      if (args.deleteCompleted) {
        const completedCount = todos.filter(t => t.completed).length;
        clearCompleted();
        return {
          success: true,
          message: \`\${completedCount} erledigte Todos wurden gelöscht\`
        };
      }
      
      let todo;
      
      // Todo anhand ID finden
      if (args.id) {
        todo = todos.find(t => t.id === args.id);
      }
      // Todo anhand Text finden  
      else if (args.text) {
        todo = todos.find(t => 
          t.text.toLowerCase().includes(args.text.toLowerCase())
        );
      }
      
      if (!todo) {
        return {
          success: false,
          message: 'Todo nicht gefunden'
        };
      }
      
      deleteTodo(todo.id);
      
      return {
        success: true,
        deletedTodo: todo,
        message: \`Todo "\${todo.text}" wurde gelöscht\`
      };
    `,
    examples: [
      'Lösche "Alte Aufgabe"',
      'Entferne Todo mit ID xyz789',
      'Alle erledigten Todos löschen'
    ]
  },
  
  {
    id: 'todo_stats',
    name: 'get_todo_stats',
    description: 'Liefert Statistiken über alle Todos',
    category: 'read',
    parameters: [],
    returns: 'Detaillierte Statistiken über Todo-Aufgaben',
    implementation: `
      const { getStats, todos, categories } = useTodoStore.getState();
      const stats = getStats();
      
      // Zusätzliche Statistiken
      const priorityStats = todos.reduce((acc, todo) => {
        acc[todo.priority] = (acc[todo.priority] || 0) + 1;
        return acc;
      }, {});
      
      const categoryStats = todos.reduce((acc, todo) => {
        const cat = todo.category || 'Ohne Kategorie';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});
      
      // Durchschnittliche Erledigungszeit berechnen
      const completedTodos = todos.filter(t => t.completed && t.completedAt);
      let avgCompletionTime = 0;
      
      if (completedTodos.length > 0) {
        const totalTime = completedTodos.reduce((sum, todo) => {
          const created = new Date(todo.createdAt).getTime();
          const completed = new Date(todo.completedAt).getTime();
          return sum + (completed - created);
        }, 0);
        
        avgCompletionTime = Math.round(totalTime / completedTodos.length / (1000 * 60 * 60 * 24)); // Tage
      }
      
      return {
        ...stats,
        priorityStats,
        categoryStats,
        availableCategories: categories,
        avgCompletionTime: avgCompletionTime + ' Tage',
        productivity: {
          dailyAverage: stats.total > 0 ? Math.round(stats.total / 7) : 0,
          weeklyGoal: Math.max(10, stats.total),
          streak: stats.completionRate > 80 ? 'Hoch' : stats.completionRate > 50 ? 'Mittel' : 'Niedrig'
        }
      };
    `,
    examples: [
      'Zeige mir die Todo-Statistiken',
      'Wie ist meine Produktivität?',
      'Todo-Übersicht und Fortschritt'
    ]
  }
];

// --------------------------------------------
// System Prompt
// --------------------------------------------

export const moduleSystemPrompt: ModuleSystemPrompt = {
  description: 'Ich verwalte deine Todo-Liste und helfe dir dabei, deine Aufgaben zu organisieren und zu erledigen. Ich kann Todos erstellen, anzeigen, bearbeiten und löschen, sowie detaillierte Statistiken über deine Produktivität liefern.',
  
  capabilities: [
    'Neue Todo-Aufgaben erstellen mit Prioritäten und Kategorien',
    'Bestehende Todos anzeigen, filtern und sortieren',
    'Aufgaben als erledigt markieren oder reaktivieren',
    'Todos bearbeiten und löschen',
    'Detaillierte Statistiken und Produktivitäts-Analysen',
    'Kategorien verwalten und organisieren',
    'Bulk-Operationen für mehrere Todos',
    'Intelligente Suche nach Aufgaben anhand von Text'
  ],
  
  limitations: [
    'Keine Erinnerungen oder Benachrichtigungen',
    'Keine Synchronisation mit externen Kalendern',
    'Keine Teilaufgaben oder Sub-Todos',
    'Keine Zeitschätzungen oder Zeiterfassung',
    'Keine Team-Kollaboration oder Sharing'
  ],
  
  useCases: [
    'Tägliche Aufgaben und Erledigungen verwalten',
    'Projekte in kleine, machbare Schritte unterteilen',
    'Prioritäten setzen und wichtige Aufgaben hervorheben',
    'Produktivität durch Kategorisierung steigern',
    'Fortschritt verfolgen und Motivation aufrechterhalten',
    'Schnelle Erfassung spontaner Ideen und Aufgaben'
  ],
  
  exampleInteractions: [
    'User: "Erstelle eine neue Aufgabe: Präsentation fertigstellen" → Ich erstelle ein neues Todo mit dem Text "Präsentation fertigstellen" und mittlerer Priorität.',
    
    'User: "Zeige mir alle offenen Aufgaben" → Ich liste alle aktiven (nicht erledigten) Todos mit ihren Details auf.',
    
    'User: "Markiere Einkaufen als erledigt" → Ich finde das Todo "Einkaufen" und setze es auf erledigt.',
    
    'User: "Wie steht es um meine Produktivität?" → Ich zeige detaillierte Statistiken: Gesamtzahl, erledigte Aufgaben, Completion-Rate und weitere Insights.',
    
    'User: "Lösche alle erledigten Aufgaben" → Ich entferne alle als erledigt markierten Todos aus der Liste.',
    
    'User: "Erstelle \"Zahnarzttermin vereinbaren\" mit hoher Priorität in der Kategorie Gesundheit" → Ich erstelle das Todo mit den spezifizierten Attributen.'
  ]
};