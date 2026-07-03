// ============================================
// catalog.ts - Katalog externer Web-Apps
//
// Zweck: Statischer App-Katalog fuer Cloud-Browser-Streaming
// Verwendet von: Library, ModuleFactory, API-Routen
// ============================================

import type { MarketplaceModule } from '@/lib/marketplace/types';
import { DEFAULT_LOCALE, type AppLocale } from '@/lib/i18n/config';
import { getCookieLocale, translateOwnedSystemText } from '@/lib/i18n/runtime';

// --------------------------------------------
// Typen fuer Katalogeintraege
// --------------------------------------------

export type ExternalAppCategory =
  | 'productivity'
  | 'creative'
  | 'communication'
  | 'development'
  | 'media'
  | 'other';

export type ExternalAppMcpSupport = 'official' | 'community' | 'none';

export interface ExternalAppMcpInfo {
  support: ExternalAppMcpSupport;
  serverUrl?: string;
  note?: string;
}

export interface ExternalAppCatalogEntry {
  id: string;
  name: string;
  icon: string;
  color: string;
  gradient: string;
  url: string;
  category: ExternalAppCategory;
  description: string;
  tags?: string[];
  website?: string;
  domains?: string[];
  mcp?: ExternalAppMcpInfo;
  allowCustomUrl?: boolean;
}

// --------------------------------------------
// Hilfsfunktion fuer Favicon-URLs
// --------------------------------------------

const favicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

function getRuntimeLocale(): AppLocale {
  return typeof document === 'undefined' ? DEFAULT_LOCALE : getCookieLocale();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deriveNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const base = hostname.split('.')[0] || hostname;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return 'Externe App';
  }
}

function buildFallbackGradient(color: string): string {
  return `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`;
}

function buildFullDescription(entry: ExternalAppCatalogEntry): string {
  const locale = getRuntimeLocale();
  const lines = [
    `# ${entry.name}`,
    '',
    translateOwnedSystemText(entry.description, locale),
  ];

  if (entry.mcp) {
    lines.push('', '## MCP');

    if (entry.mcp.support === 'official') {
      lines.push('- Offizieller MCP-Server verfuegbar');
    } else if (entry.mcp.support === 'community') {
      lines.push('- Community-MCP verfuegbar');
    } else {
      lines.push('- Aktuell kein offizieller MCP-Server hinterlegt');
    }

    if (entry.mcp.serverUrl) {
      lines.push(`- Server: ${entry.mcp.serverUrl}`);
    }

    if (entry.mcp.note) {
      lines.push(`- Hinweis: ${entry.mcp.note}`);
    }
  }

  return translateOwnedSystemText(lines.join('\n'), locale);
}

function buildMarketplaceTags(entry: ExternalAppCatalogEntry): string[] {
  const mcpTags =
    entry.mcp?.support === 'official'
      ? ['mcp', 'official-mcp']
      : entry.mcp?.support === 'community'
        ? ['mcp', 'community-mcp']
        : ['web-only'];

  return Array.from(
    new Set(['webapp', 'cloud', 'streaming', entry.id, ...(entry.tags || []), ...mcpTags])
  );
}

// --------------------------------------------
// Statischer Katalog externer Apps
// --------------------------------------------

export const EXTERNAL_APP_CATALOG: ExternalAppCatalogEntry[] = [
  {
    id: 'canva',
    name: 'Canva',
    icon: 'Palette',
    color: '#00C4CC',
    gradient: 'linear-gradient(135deg, #00C4CC 0%, #7D2AE8 100%)',
    url: 'https://www.canva.com',
    website: 'https://www.canva.com',
    domains: ['canva.com'],
    category: 'creative',
    description:
      'Designs, Praesentationen, Whiteboards und Social Assets direkt als Web-App in LifeOS nutzen.',
    tags: ['design', 'presentations', 'creative-suite'],
    mcp: {
      support: 'official',
      serverUrl: 'https://mcp.canva.com/mcp',
      note: 'Offizieller Remote-MCP mit OAuth fuer Canva-Workflows.',
    },
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: 'BookOpen',
    color: '#111111',
    gradient: 'linear-gradient(135deg, #111111 0%, #3f3f46 100%)',
    url: 'https://www.notion.so',
    website: 'https://www.notion.so',
    domains: ['notion.so', 'notion.site'],
    category: 'productivity',
    description:
      'Dokumente, Wikis, Projekte und Datenbanken in einer flexiblen Workspace-Web-App organisieren.',
    tags: ['docs', 'wiki', 'notes', 'projects'],
    mcp: {
      support: 'official',
      note: 'Offizieller Notion MCP Server fuer Seiten, Suche und Datenquellen.',
    },
  },
  {
    id: 'figma',
    name: 'Figma',
    icon: 'PenTool',
    color: '#7C3AED',
    gradient: 'linear-gradient(135deg, #F24E1E 0%, #A259FF 50%, #0ACF83 100%)',
    url: 'https://www.figma.com',
    website: 'https://www.figma.com',
    domains: ['figma.com'],
    category: 'creative',
    description:
      'Produktdesign, UI-Files, Komponenten und FigJam-Boards als kreative Web-App in LifeOS verwenden.',
    tags: ['ui', 'design-system', 'figjam', 'prototyping'],
    mcp: {
      support: 'official',
      serverUrl: 'https://mcp.figma.com/mcp',
      note: 'Offizieller Figma Remote-MCP fuer Design-Kontext und Canvas-Aktionen.',
    },
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: 'Github',
    color: '#24292F',
    gradient: 'linear-gradient(135deg, #24292F 0%, #57606A 100%)',
    url: 'https://github.com',
    website: 'https://github.com',
    domains: ['github.com'],
    category: 'development',
    description:
      'Repositories, Pull Requests, Issues und Automationen direkt ueber die GitHub-Weboberflaeche steuern.',
    tags: ['code', 'repositories', 'pull-requests', 'issues'],
    mcp: {
      support: 'official',
      serverUrl: 'https://api.githubcopilot.com/mcp/',
      note: 'Offizieller GitHub MCP Server mit Remote-OAuth-Unterstuetzung.',
    },
  },
  {
    id: 'linear',
    name: 'Linear',
    icon: 'GitBranch',
    color: '#5E6AD2',
    gradient: 'linear-gradient(135deg, #5E6AD2 0%, #8B5CF6 100%)',
    url: 'https://linear.app',
    website: 'https://linear.app',
    domains: ['linear.app'],
    category: 'productivity',
    description:
      'Issues, Projekte, Roadmaps und Team-Planung mit einer schnellen Produktivitaetsoberflaeche verwalten.',
    tags: ['issues', 'roadmap', 'product-management'],
    mcp: {
      support: 'official',
      serverUrl: 'https://mcp.linear.app/mcp',
      note: 'Offizieller Linear Remote-MCP fuer Issues, Projekte und Teams.',
    },
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: 'MessageSquare',
    color: '#4A154B',
    gradient: 'linear-gradient(135deg, #4A154B 0%, #611F69 100%)',
    url: 'https://app.slack.com/client',
    website: 'https://slack.com',
    domains: ['slack.com', 'app.slack.com'],
    category: 'communication',
    description:
      'Channels, Threads, Nachrichten und Team-Kommunikation als zentrale Web-App in LifeOS zusammenfuehren.',
    tags: ['chat', 'team', 'messaging', 'workspace'],
    mcp: {
      support: 'official',
      note: 'Offizieller Slack MCP Server fuer Suche, Messaging und Slack-Canvas-Workflows.',
    },
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'Instagram',
    color: '#E1306C',
    gradient: 'linear-gradient(135deg, #F58529 0%, #DD2A7B 50%, #8134AF 100%)',
    url: 'https://www.instagram.com',
    website: 'https://www.instagram.com',
    domains: ['instagram.com'],
    category: 'communication',
    description:
      'Feeds, DMs, Creator-Posts und Community-Management ueber die Instagram-Web-App in LifeOS oeffnen.',
    tags: ['social', 'creator', 'dm', 'community'],
    mcp: {
      support: 'none',
      note: 'Aktuell nur als Web-App vorgesehen. Community-MCP kann spaeter optional folgen.',
    },
  },
];

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------

function mapCategoryToMarketplace(
  category: ExternalAppCategory
): MarketplaceModule['category'] {
  if (category === 'media') return 'lifestyle';
  if (category === 'communication') return 'social';
  if (category === 'development') return 'developer';
  if (category === 'other') return 'integrations';
  return category;
}

export function externalCatalogToMarketplaceModule(
  entry: ExternalAppCatalogEntry
): MarketplaceModule {
  const locale = getRuntimeLocale();
  const domain = (() => {
    try {
      return new URL(entry.url).hostname;
    } catch {
      return entry.url;
    }
  })();

  return {
    id: `extapp-${entry.id}`,
    name: translateOwnedSystemText(entry.name, locale),
    slug: entry.id,
    type: 'apps',
    icon: entry.icon,
    color: entry.color,
    gradient: entry.gradient,
    shortDescription: translateOwnedSystemText(entry.description, locale),
    fullDescription: buildFullDescription(entry),
    category: mapCategoryToMarketplace(entry.category),
    tags: buildMarketplaceTags(entry),
    pricing: { type: 'free' },
    developer: {
      id: entry.id,
      name: translateOwnedSystemText(entry.name, locale),
      verified: true,
      website: entry.website,
    },
    stats: { downloads: 0, rating: 5, reviewCount: 0 },
    media: { screenshots: [], icon: favicon(domain) },
    technical: {
      version: entry.mcp?.support === 'official' ? 'Cloud + MCP' : 'Cloud',
      size: 'Browser',
      minLifeOSVersion: '1.0.0',
      permissions:
        entry.mcp && entry.mcp.support !== 'none'
          ? ['browser', 'stream', 'mcp']
          : ['browser', 'stream'],
      lastUpdated: new Date().toISOString(),
      releaseDate: '2026-01-01T00:00:00Z',
    },
    changelog: [],
    isWebApp: true,
    route: entry.url,
  };
}

// --------------------------------------------
// URL-Resolver fuer bekannte Web-Apps
// Erzeugt fuer manuelle URLs automatisch Name, Icon,
// Farbe, Beschreibung und MCP-Metadaten.
// --------------------------------------------

export function deriveExternalAppCatalogEntry(
  url: string,
  preferredName?: string
): ExternalAppCatalogEntry {
  const hostname = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return '';
    }
  })();

  const knownEntry = EXTERNAL_APP_CATALOG.find((entry) =>
    (entry.domains || []).some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    )
  );

  if (knownEntry) {
    return knownEntry;
  }

  const resolvedName = preferredName?.trim() || deriveNameFromUrl(url);
  const fallbackColor = '#06b6d4';
  const fallbackId = slugify(hostname || resolvedName || 'custom-app') || 'custom-app';

  return {
    id: `custom-${fallbackId}`,
    name: resolvedName,
    icon: 'Globe',
    color: fallbackColor,
    gradient: buildFallbackGradient(fallbackColor),
    url,
    website: url,
    domains: hostname ? [hostname] : [],
    category: 'other',
    description: `Eigene Web-App fuer ${resolvedName} in LifeOS.`,
    tags: ['custom', 'manual'],
    mcp: {
      support: 'none',
      note: 'Noch kein MCP-Mapping hinterlegt.',
    },
    allowCustomUrl: true,
  };
}
