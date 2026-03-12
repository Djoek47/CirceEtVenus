/**
 * Per-page and per-tool tutorial steps. Each step is shown in a popup; user can Next / Back / Done.
 * Completion is stored in localStorage per tourId.
 */

export interface TourStep {
  id: string
  title: string
  description: string
}

export interface TourConfig {
  tourId: string
  steps: TourStep[]
}

const TOURS: Record<string, TourConfig> = {
  '/dashboard': {
    tourId: 'dashboard',
    steps: [
      { id: 'overview', title: 'Dashboard overview', description: 'Your command center: revenue, fans, and messages at a glance. Stats cards show totals; connect OnlyFans or Fansly to see real data.' },
      { id: 'platforms', title: 'Connected platforms', description: 'This widget shows which platforms are linked. Click "Manage" to connect or disconnect accounts in Settings.' },
      { id: 'revenue', title: 'Revenue chart', description: 'Revenue over time from your connected platforms. Sync your accounts to populate this chart.' },
      { id: 'quick-actions', title: 'Quick actions', description: 'Shortcuts to messages, content, fans, and AI tools. Use them to jump into the most common tasks.' },
    ],
  },
  '/dashboard/messages': {
    tourId: 'messages',
    steps: [
      { id: 'list', title: 'Conversations', description: 'All your OnlyFans and Fansly chats in one place. Select a conversation to open it.' },
      { id: 'chat', title: 'Chat window', description: 'Read and reply to fans here. You can send text, use AI suggestions, or schedule replies.' },
      { id: 'mass', title: 'Mass message', description: 'Use "Mass message" to send one message to multiple fans at once (e.g. a promo or announcement).' },
    ],
  },
  '/dashboard/fans': {
    tourId: 'fans',
    steps: [
      { id: 'list', title: 'Fans list', description: 'All subscribers and followers from your connected platforms. Filter by tier (whale, VIP, regular) or search by name.' },
      { id: 'tiers', title: 'Tiers', description: 'Fans are grouped by spending: whales (high spenders), VIPs, and regular. Focus engagement on your top supporters.' },
      { id: 'add', title: 'Add fan', description: 'You can manually add a fan (e.g. from another platform) via "Add fan" for notes and tracking.' },
    ],
  },
  '/dashboard/content': {
    tourId: 'content',
    steps: [
      { id: 'library', title: 'Content library', description: 'All your posts and scheduled content. Filter by status: draft, scheduled, published, archived.' },
      { id: 'new', title: 'New content', description: 'Create a new post from "New content". Write copy, add media, and publish to connected platforms or schedule for later.' },
    ],
  },
  '/dashboard/analytics': {
    tourId: 'analytics',
    steps: [
      { id: 'overview', title: 'Analytics', description: 'Revenue, fans, and engagement over time. Data comes from your connected platforms after sync.' },
      { id: 'breakdown', title: 'Breakdown', description: 'See performance by platform (OnlyFans, Fansly) and by content type to optimize your strategy.' },
    ],
  },
  '/dashboard/ai-studio': {
    tourId: 'ai-studio',
    steps: [
      { id: 'tools', title: 'AI Studio', description: 'Circe and Venus power these tools: captions, flirty replies, content ideas, mass DM composer, and more.' },
      { id: 'pick', title: 'Pick a tool', description: 'Choose a tool from the list or grid. Each tool has a short description and uses your connected data when relevant.' },
    ],
  },
  '/dashboard/ai-studio/tools': {
    tourId: 'ai-studio-tools',
    steps: [
      { id: 'list', title: 'AI tools', description: 'All available tools: Caption Generator, Flirt Assistant, Content Ideas, Viral Predictor, Revenue Optimizer, and others.' },
      { id: 'open', title: 'Open a tool', description: 'Click a tool to open it. You can run it from the workspace and use the output in your content or messages.' },
    ],
  },
  '/dashboard/settings': {
    tourId: 'settings',
    steps: [
      { id: 'tabs', title: 'Settings tabs', description: 'Profile, Integrations, Security, Billing, and more. Use Integrations to connect or disconnect OnlyFans and Fansly.' },
      { id: 'integrations', title: 'Integrations', description: 'Connect your creator accounts here. OnlyFans uses a secure popup; Fansly uses email/password in a dialog.' },
    ],
  },
  '/dashboard/guide': {
    tourId: 'guide',
    steps: [
      { id: 'welcome', title: 'Guide', description: 'This page summarizes how Circe et Venus works. Revisit it anytime. Use "Start Tour" on any page for a short walkthrough.' },
    ],
  },
  '/dashboard/protection': {
    tourId: 'protection',
    steps: [
      { id: 'leaks', title: 'Leak protection', description: 'Check for unauthorized use of your content. Paste URLs to scan and submit DMCA claims if needed.' },
    ],
  },
  '/dashboard/social': {
    tourId: 'social',
    steps: [
      { id: 'reputation', title: 'Social reputation', description: 'Monitor mentions and reputation across social platforms. Connect accounts to enable scanning.' },
    ],
  },
  '/dashboard/mentions': {
    tourId: 'mentions',
    steps: [
      { id: 'list', title: 'Mentions', description: 'See where you are mentioned online. Review and mark as reviewed from this list.' },
    ],
  },
}

/** Get tour config for a pathname; supports /dashboard/ai-studio/tools/[toolId] by stripping dynamic segment. */
export function getTourForPath(pathname: string, toolId?: string): TourConfig | null {
  const normalized = pathname.replace(/\/$/, '') || '/dashboard'
  if (toolId && normalized.includes('/ai-studio/tools')) {
    const base = '/dashboard/ai-studio/tools'
    return TOURS[base] ?? getTourForPath('/dashboard/ai-studio')
  }
  if (TOURS[normalized]) return TOURS[normalized]
  if (normalized.startsWith('/dashboard/ai-studio/tools/')) return TOURS['/dashboard/ai-studio/tools'] ?? TOURS['/dashboard/ai-studio']
  if (normalized.startsWith('/dashboard/content/new')) return TOURS['/dashboard/content']
  if (normalized.startsWith('/dashboard/fans/new')) return TOURS['/dashboard/fans']
  return TOURS['/dashboard'] ?? null
}

export { TOURS }
