// ============================================
// LifeOS Design System Reference
// 
// Zweck: Zentrale Referenz für das Theme-System
//        Wird vom Module Builder Agent verwendet
// ============================================

// --------------------------------------------
// Design-Stile Übersicht
// --------------------------------------------

export const DESIGN_STYLES = {
  glass: {
    name: 'Glassmorphism',
    description: 'Transparente Oberflächen mit Blur-Effekt',
    characteristics: [
      'backdrop-filter: blur(40px) saturate(180%)',
      'Transparente Hintergründe (rgba)',
      'Weiche Borders (rgba weiß, 15-20%)',
      'Subtile Glow-Shadows',
      'border-radius: 1rem - 1.5rem',
    ],
    cssExample: `
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(40px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border-radius: 1.5rem;
    `,
  },
  
  brutal: {
    name: 'Neo-Brutalism',
    description: 'Kräftige Farben, harte Kanten und Schatten',
    characteristics: [
      'Solide Hintergrundfarben',
      'Schwarze Borders (2-3px solid #000)',
      'Harte Offset-Shadows (3px 3px 0 #000)',
      'border-radius: 0.375rem - 0.5rem',
      'Fette Typografie (font-weight: 700)',
      'Kein Blur, keine Transparenz',
    ],
    cssExample: `
      background: #2a2a3c;
      border: 3px solid #000000;
      box-shadow: 6px 6px 0 #000000;
      border-radius: 0.5rem;
      font-weight: 700;
    `,
  },
  
  neo: {
    name: 'Neomorphism',
    description: 'Weiche, erhöhte Oberflächen mit sanften Schatten',
    characteristics: [
      'Weiche erhöhte Oberflächen',
      'Keine sichtbaren Borders',
      'Dual-Shadow (dunkel + hell)',
      'border-radius: 0.75rem - 1.25rem',
      'Inset-Shadows für Inputs',
    ],
    cssExample: `
      background: #1a1a24;
      border: none;
      box-shadow: 
        8px 8px 16px rgba(0, 0, 0, 0.4),
        -8px -8px 16px rgba(255, 255, 255, 0.03);
      border-radius: 1.25rem;
    `,
  },
} as const;

// --------------------------------------------
// Theme Hook Usage
// --------------------------------------------

export const THEME_HOOK_REFERENCE = `
## useThemeStyles Hook

Import:
\`\`\`typescript
import { useThemeStyles } from '@/lib/theme';
\`\`\`

Usage:
\`\`\`typescript
const { 
  // Fertige Style-Objekte
  container,     // ContainerStyles - Für Hauptcontainer, Modals
  surface,       // SurfaceStyles - Für Cards, Panels
  button,        // ButtonStyles - Für alle Buttons
  input,         // InputStyles - Für Inputs, Textareas
  navItem,       // NavItemStyles - Für Navigation
  
  // Aktuelle Werte
  accentColor,   // string - User's Hauptfarbe (z.B. "#8b5cf6")
  surfaceColor,  // string - Hintergrundfarbe
  textColor,     // string - Textfarbe (z.B. "#ffffff")
  designStyle,   // "glass" | "brutal" | "neo"
  appFont,       // string - Font-Familie
  buttonTextColor, // string - Button-Textfarbe
} = useThemeStyles();
\`\`\`

## Style-Objekte Struktur

### container
- container.base: CSSProperties - Basis-Container-Styles

### surface
- surface.base: CSSProperties - Basis-Surface-Styles

### button
- button.base: CSSProperties - Standard-Button
- button.hover: CSSProperties - Hover-State
- button.active: CSSProperties - Active-State
- button.primary: CSSProperties - Primary-Button (Akzentfarbe)
- button.primaryHover: CSSProperties - Primary-Hover

### input
- input.base: CSSProperties - Basis-Input
- input.focus: CSSProperties - Focus-State

### navItem
- navItem.base: CSSProperties - Basis-NavItem
- navItem.active: CSSProperties - Aktiver State
- navItem.hover: CSSProperties - Hover-State
`;

// --------------------------------------------
// Code Patterns
// --------------------------------------------

export const CODE_PATTERNS = {
  container: `
// Container für Hauptbereiche, Modals, Dialoge
<div style={container.base}>
  {/* Content */}
</div>
`,
  
  surface: `
// Surface für Cards, Panels, Boxen
<div style={surface.base}>
  <h2 style={{ color: textColor }}>Titel</h2>
  <p style={{ color: textColor, opacity: 0.7 }}>Beschreibung</p>
</div>
`,
  
  button: `
// Standard Button
<button style={button.base}>
  Klick mich
</button>

// Primary Button
<button style={button.primary}>
  Speichern
</button>

// Mit Hover (wenn nötig)
<button 
  style={button.base}
  onMouseEnter={(e) => Object.assign(e.currentTarget.style, button.hover)}
  onMouseLeave={(e) => Object.assign(e.currentTarget.style, button.base)}
>
  Hover me
</button>
`,
  
  input: `
// Input mit Focus-Handling
<input 
  style={input.base}
  onFocus={(e) => Object.assign(e.currentTarget.style, input.focus)}
  onBlur={(e) => Object.assign(e.currentTarget.style, input.base)}
  placeholder="Eingabe..."
/>
`,
  
  conditionalStyle: `
// Für stil-spezifische Anpassungen
<div style={{
  ...surface.base,
  fontWeight: designStyle === 'brutal' ? 700 : 400,
  borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
}}>
`,
  
  accentColor: `
// Akzentfarbe für Highlights
<div style={{ 
  background: accentColor,
  boxShadow: \`0 4px 15px \${accentColor}40\`  // 40 = 25% Opacity
}}>

// Für Text-Akzente
<span style={{ color: accentColor }}>Wichtig!</span>
`,
  
  textColor: `
// Primärer Text
<p style={{ color: textColor }}>Haupttext</p>

// Sekundärer Text (gedimmt)
<p style={{ color: textColor, opacity: 0.7 }}>Beschreibung</p>

// Tertiärer Text (sehr gedimmt)
<p style={{ color: textColor, opacity: 0.5 }}>Timestamp</p>

// Disabled/Muted Text
<p style={{ color: textColor, opacity: 0.3 }}>Deaktiviert</p>
`,
  
  tailwindCombined: `
// Tailwind für Layout, Theme für Farben
<div 
  className="flex items-center gap-4 p-4 rounded-lg"
  style={{ ...surface.base, color: textColor }}
>
  <h2 className="text-xl font-bold">Titel</h2>
</div>
`,
};

// --------------------------------------------
// Quick Reference für Agent
// --------------------------------------------

export const AGENT_QUICK_REFERENCE = `
┌────────────────────────────────────────────────────────────┐
│              LIFEOS THEME QUICK REFERENCE                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  IMPORT:  import { useThemeStyles } from '@/lib/theme';    │
│                                                            │
│  ┌─────────────┬─────────────┬─────────────┐              │
│  │   GLASS     │   BRUTAL    │    NEO      │              │
│  ├─────────────┼─────────────┼─────────────┤              │
│  │ blur(40px)  │ #000 border │ dual shadow │              │
│  │ rgba bg     │ solid bg    │ soft raise  │              │
│  │ r: 1.5rem   │ r: 0.375rem │ r: 1.25rem  │              │
│  │ soft glow   │ hard offset │ no border   │              │
│  │ transparent │ bold fonts  │ inset input │              │
│  └─────────────┴─────────────┴─────────────┘              │
│                                                            │
│  STYLES:                                                   │
│  • container.base  → Hauptcontainer, Modals               │
│  • surface.base    → Cards, Panels                        │
│  • button.base     → Standard Button                      │
│  • button.primary  → Akzent Button                        │
│  • input.base      → Textfelder                           │
│                                                            │
│  COLORS:                                                   │
│  • accentColor     → Highlight-Farbe des Users            │
│  • textColor       → Primäre Textfarbe                    │
│  • surfaceColor    → Hintergrundfarbe                     │
│                                                            │
│  CONDITIONAL:                                              │
│  designStyle === 'brutal' ? hardStyle : softStyle         │
│                                                            │
│  TEXT OPACITY:                                             │
│  • 1.0  → Primärer Text                                   │
│  • 0.7  → Sekundärer Text                                 │
│  • 0.5  → Tertiärer Text                                  │
│  • 0.3  → Disabled/Muted                                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
`;

// --------------------------------------------
// Häufige Fehler
// --------------------------------------------

export const COMMON_MISTAKES = [
  {
    wrong: 'background: "white"',
    right: 'background: surfaceColor oder surface.base',
    reason: 'Hardcoded Farben ignorieren das Theme',
  },
  {
    wrong: 'borderRadius: "1rem"',
    right: 'borderRadius: designStyle === "brutal" ? "0.5rem" : "1rem"',
    reason: 'Brutal-Style hat kleinere Border-Radien',
  },
  {
    wrong: 'color: "#333"',
    right: 'color: textColor',
    reason: 'Textfarbe kommt aus dem Theme',
  },
  {
    wrong: 'boxShadow: "0 4px 6px rgba(0,0,0,0.1)"',
    right: 'boxShadow: designStyle === "brutal" ? "3px 3px 0 #000" : "0 4px 15px rgba(0,0,0,0.2)"',
    reason: 'Shadows sind stil-abhängig',
  },
  {
    wrong: 'border: "1px solid #ccc"',
    right: 'border: designStyle === "brutal" ? "2px solid #000" : "1px solid rgba(255,255,255,0.1)"',
    reason: 'Brutal hat schwarze, dicke Borders',
  },
];

// --------------------------------------------
// Lucide Icons Empfehlungen
// --------------------------------------------

export const RECOMMENDED_ICONS = {
  productivity: ['CheckSquare', 'ListTodo', 'Calendar', 'Clock', 'Target', 'Flag'],
  finance: ['DollarSign', 'CreditCard', 'PiggyBank', 'TrendingUp', 'Wallet', 'Receipt'],
  health: ['Heart', 'Activity', 'Dumbbell', 'Apple', 'Brain', 'Moon'],
  social: ['Users', 'MessageCircle', 'Share2', 'UserPlus', 'Globe', 'Link'],
  creative: ['Palette', 'Pencil', 'Camera', 'Music', 'Film', 'Sparkles'],
  games: ['Gamepad2', 'Crown', 'Trophy', 'Dice1', 'Puzzle', 'Swords'],
  system: ['Settings', 'Bell', 'Search', 'Home', 'Menu', 'MoreHorizontal'],
};


