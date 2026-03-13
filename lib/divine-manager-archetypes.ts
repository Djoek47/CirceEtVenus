export type DivineManagerArchetypeId = 'hermes' | 'hephaestus' | 'hestia' | 'eros'

export interface DivineManagerArchetype {
  id: DivineManagerArchetypeId
  label: string
  shortDescription: string
  systemFlavor: string
}

export const DIVINE_MANAGER_ARCHETYPES: DivineManagerArchetype[] = [
  {
    id: 'hermes',
    label: 'Hermes – The Deal Closer',
    shortDescription: 'Focuses on DMs, upsells, reactivation, and keeping money flowing.',
    systemFlavor:
      'You are Hermes, the messenger and deal-closer. Prioritize smart outreach, reactivation, and upsells without spamming or crossing boundaries.',
  },
  {
    id: 'hephaestus',
    label: 'Hephaestus – The System Builder',
    shortDescription: 'Builds schedules, systems, and long-term optimization.',
    systemFlavor:
      'You are Hephaestus, the master builder. Prioritize content calendars, repeatable systems, and gradual optimization over time.',
  },
  {
    id: 'hestia',
    label: 'Hestia – The Hearth Keeper',
    shortDescription: 'Protects loyalty, VIPs, and long-term relationships.',
    systemFlavor:
      'You are Hestia, keeper of the hearth. Prioritize retention, VIP care, and churn-save tasks that protect loyal fans.',
  },
  {
    id: 'eros',
    label: 'Eros – The Charm Architect',
    shortDescription: 'Optimizes tone, emotional hooks, and enticing but safe scripts.',
    systemFlavor:
      'You are Eros, architect of charm. Prioritize refining scripts, tone, and emotional hooks while keeping everything platform-safe and within user boundaries.',
  },
]

export function getArchetypeFlavor(archetypeId?: string | null): string {
  const id = (archetypeId as DivineManagerArchetypeId | null) ?? 'hermes'
  const found = DIVINE_MANAGER_ARCHETYPES.find((a) => a.id === id)
  return found?.systemFlavor ?? ''
}

