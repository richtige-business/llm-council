// ============================================
// CouncilMarkdown.tsx - Markdown-Renderer fuer Council-Bubbles
//
// Zweck: Isolierter Client-Wrapper um react-markdown,
//        wird per next/dynamic mit ssr:false geladen,
//        damit das ESM-only Paket nicht im SSR-Bundle landet.
// Verwendet von: CouncilChatBar, CouncilSeatModalHost
// ============================================

'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CouncilMarkdownProps {
  content: string;
}

export function CouncilMarkdown({ content }: CouncilMarkdownProps) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
}
