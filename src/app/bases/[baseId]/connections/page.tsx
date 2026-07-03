'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useBaseStore } from '@/lib/bases/store';
import { useModuleRegistry } from '@/lib/modules/registry';
import { WorkflowEditor } from '@/components/automation/WorkflowEditor';

export default function BaseConnectionsPage() {
  const params = useParams();
  const baseId = params.baseId as string;

  const base = useBaseStore((state) => state.bases.find((entry) => entry.id === baseId));
  const allModules = useModuleRegistry((state) => state.modules);
  const modules = useMemo(() => {
    if (!base) return [];
    const ids = new Set(base.moduleIds);
    return allModules.filter((module) => ids.has(module.id));
  }, [allModules, base]);

  if (!base) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center text-slate-100">
          <h1 className="mb-2 text-xl font-semibold">Base nicht gefunden</h1>
          <Link href="/library" className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-white">
            Zur Bibliothek
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full space-y-4 px-5 py-5">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/bases/${base.id}`}
            className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-slate-300/85 hover:text-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Zurück zum Base-Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-slate-100">{base.name} Connections</h1>
          <p className="text-sm text-slate-300/75">
            Node-Workflows für modulübergreifende Abläufe in dieser Base.
          </p>
        </div>
      </div>
      <WorkflowEditor baseId={base.id} modules={modules} />
    </div>
  );
}
