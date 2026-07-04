// ============================================
// skills-catalog.ts - Council-Skill-Katalog
//
// Zweck: Extensible Liste an Faehigkeiten, die einem einzelnen
//        Council-Mitglied zugewiesen werden koennen. Jeder Skill
//        mappt auf eine oder mehrere Tool-IDs der Tool Registry.
//        Neue Skills: ein Katalog-Eintrag + eine Tool-Implementierung.
// Verwendet von: CouncilSeatModalHost.tsx, store.ts, council-runtime.ts
// ============================================

export interface CouncilSkillDefinition {
  id: string;
  name: string;
  description: string;
  toolIds: string[];
}

export const COUNCIL_SKILL_CATALOG: CouncilSkillDefinition[] = [
  {
    id: 'web.search',
    name: 'Web Search',
    description:
      'Kann selbst entscheiden, das Web zu durchsuchen, wenn aktuelle oder faktische Informationen fehlen.',
    toolIds: ['web.search'],
  },
];

export function getCouncilSkillById(skillId: string): CouncilSkillDefinition | undefined {
  return COUNCIL_SKILL_CATALOG.find((skill) => skill.id === skillId);
}

export function resolveToolIdsForSkills(skillIds: string[] | undefined): string[] {
  if (!skillIds || skillIds.length === 0) {
    return [];
  }

  const toolIds = new Set<string>();
  for (const skillId of skillIds) {
    const skill = getCouncilSkillById(skillId);
    skill?.toolIds.forEach((toolId) => toolIds.add(toolId));
  }
  return Array.from(toolIds);
}
