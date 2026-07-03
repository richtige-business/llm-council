// ============================================
// /app/chat/page.tsx - Redirect zu /agents
// 
// Zweck: Backward-Compatibility Redirect
//        Chat wurde zu Agents umgebaut
// ============================================

import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Agents | LifeOS',
  description: 'KI-Agenten mit Chat, Web Research, Memory und Multi-Modell-Support',
};

export default function ChatRoute() {
  redirect('/agents');
}











