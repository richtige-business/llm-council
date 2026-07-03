'use client';

import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Wrench, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useModuleRegistry } from '@/lib/modules';
import type { Tool } from '@/types';

export default function ToolPage() {
  const params = useParams();
  const moduleId = params.moduleId as string;
  const toolId = params.toolId as string;

  const module = useModuleRegistry((state) =>
    state.modules.find((m) => m.id === moduleId)
  );
  
  const tool = module?.tools.find((t: Tool) => t.id === toolId);

  // Tool not found
  if (!module || !tool) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <motion.div
          className="max-w-md rounded-3xl p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10">
            <Wrench className="h-10 w-10 text-white/60" />
          </div>
          
          <h1 className="mb-2 text-2xl font-semibold text-white">
            Tool nicht gefunden
          </h1>
          
          <p className="mb-8 text-white/60">
            Das Tool &ldquo;{toolId}&rdquo; existiert nicht in diesem Modul.
          </p>
          
          <Link
            href={module ? `/${moduleId}` : '/'}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20 border border-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Link>
        </motion.div>
      </div>
    );
  }

  // Tool View
  return (
    // h-full für volle verfügbare Höhe (Shell kümmert sich um Chatbar-Freiraum)
    <div className="flex h-full items-start justify-center overflow-y-auto p-8 pt-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          <Link
            href={`/${moduleId}`}
            className="text-white/60 hover:text-white transition-colors"
          >
            {module.name}
          </Link>
          <span className="text-white/40">/</span>
          <span className="text-white">{tool.name}</span>
        </div>

        {/* Tool Header */}
        <div 
          className="mb-6 rounded-3xl p-6"
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                }}
              >
                <Wrench className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-sm">
                  {tool.name}
                </h1>
                <p className="text-white/60">
                  {tool.description}
                </p>
              </div>
            </div>
            
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60 border border-white/10">
              v{tool.version}
            </span>
          </div>
        </div>

        {/* Tool Content Placeholder */}
        <div 
          className="rounded-3xl p-12 text-center"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Wrench className="mx-auto mb-4 h-12 w-12 text-white/40" />
          <h2 className="mb-2 text-lg font-medium text-white">
            Tool-Oberfläche
          </h2>
          <p className="text-white/60">
            Hier wird die Tool-Komponente gerendert sobald sie implementiert ist.
          </p>
        </div>

        {/* Tool Info */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {/* Capabilities */}
          <div 
            className="rounded-3xl p-6"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <h3 className="mb-4 font-medium text-white">Fähigkeiten</h3>
            <div className="flex flex-wrap gap-2">
              {tool.capabilities.length > 0 ? (
                tool.capabilities.map((cap: string) => (
                  <span
                    key={cap}
                    className="rounded-full bg-sky-500/20 px-3 py-1 text-sm text-sky-300 border border-sky-500/30"
                  >
                    {cap}
                  </span>
                ))
              ) : (
                <span className="text-sm text-white/40">
                  Keine Fähigkeiten definiert
                </span>
              )}
            </div>
          </div>

          {/* Events */}
          <div 
            className="rounded-3xl p-6"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <h3 className="mb-4 font-medium text-white">Events</h3>
            {tool.events.length > 0 ? (
              <ul className="space-y-2">
                {tool.events.map((event: { name: string; description: string }) => (
                  <li key={event.name} className="text-sm">
                    <span className="font-mono text-purple-300">
                      {event.name}
                    </span>
                    <p className="text-white/40">
                      {event.description}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-sm text-white/40">
                Keine Events definiert
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
