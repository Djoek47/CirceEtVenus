/**
 * Curated “daily” tips from Circe — one highlighted per calendar day (rotates by day-of-year).
 * Optional link per tip (in-app routes or https URLs).
 */

export type CirceDailyTip = {
  id: string
  title: string
  body: string
  /** Optional call-to-action link shown under the tip */
  link?: { label: string; href: string }
}

export const CIRCE_DAILY_TIPS: CirceDailyTip[] = [
  {
    id: 'sync-first',
    title: 'Sync before you strategize',
    body:
      'Run a platform sync from the dashboard or header refresh so churn, fans, and thread context match reality. Stale data makes even the best AI advice a guess.',
    link: { label: 'Open dashboard', href: '/dashboard' },
  },
  {
    id: 'vault-notes',
    title: 'Describe media for Divine',
    body:
      'In AI Studio → Media & Vault, add sales notes, teaser tags, and spoiler level. Divine Manager uses this for PPV timing and tone — not just storage.',
    link: { label: 'AI Studio', href: '/dashboard/ai-studio' },
  },
  {
    id: 'mass-segments',
    title: 'Mass DMs: segment before you blast',
    body:
      'Use Mass messages with AI-suggested segments (classification, spend, platform) so each group gets an angle that fits — whales vs casuals need different hooks.',
    link: { label: 'Mass messages', href: '/dashboard/messages/mass' },
  },
  {
    id: 'protection-rhythm',
    title: 'Protection is a habit',
    body:
      'Check Protection regularly for leaks and DMCA drafts. Approving or adjusting drafts trains the workflow; ignoring alerts lets small leaks compound.',
    link: { label: 'Protection', href: '/dashboard/protection' },
  },
  {
    id: 'mentions-reputation',
    title: 'Mentions feed your reputation brief',
    body:
      'Venus watches mentions; use them to spot narrative shifts early. Pair with Analytics to see whether buzz converts to subs.',
    link: { label: 'Mentions', href: '/dashboard/mentions' },
  },
  {
    id: 'divine-thread',
    title: 'Thread scan before a big reply',
    body:
      'In Messages, run Thread scan when stakes are high — renewals, disputes, or whales. It surfaces risks and angles without replacing your judgment.',
    link: { label: 'Messages', href: '/dashboard/messages' },
  },
  {
    id: 'circe-venus-reply',
    title: 'Circe vs Venus reply modes',
    body:
      'Circe leans retention and boundaries; Venus leans charm and growth. Try both on the same thread, then edit — you send the final message, always.',
    link: { label: 'Divine Manager', href: '/dashboard/divine-manager' },
  },
  {
    id: 'churn-context',
    title: 'Churn predictor needs context',
    body:
      'Feed the churn tool real fan signals: open the fan in Messages so thread excerpts and spend trends inform the playbook, not generic text.',
    link: { label: 'AI Studio tools', href: '/dashboard/ai-studio?tab=tools' },
  },
  {
    id: 'content-schedule',
    title: 'Schedule beats chaos',
    body:
      'Use Content for cadence; align drops with Analytics peaks. Consistency beats sporadic “viral” attempts for subscription businesses.',
    link: { label: 'Content', href: '/dashboard/content' },
  },
  {
    id: 'settings-integrations',
    title: 'Reconnect before panic',
    body:
      'If a platform session expires, reconnect in Settings → Integrations before filing bugs. Most “empty inbox” issues are expired sessions.',
    link: { label: 'Settings', href: '/dashboard/settings?tab=integrations' },
  },
  {
    id: 'safe-photo-edits',
    title: 'Safe photo touch-ups only',
    body:
      'Use blur, emoji, and lighting tools for creator-owned media. Skip “beautify everything” pipelines — authenticity plus polish wins.',
    link: { label: 'Content library', href: '/dashboard/content-library' },
  },
  {
    id: 'community-share',
    title: 'Share how you use Creatix',
    body:
      'Community tips are for workflows and wins — not spam. Good tips help everyone; we review before publishing.',
    link: { label: 'Community', href: '/dashboard/community' },
  },
  {
    id: 'analytics-loop',
    title: 'Close the loop with Analytics',
    body:
      'After a campaign or pricing change, check Analytics after the next sync. Compare platforms and content types to double down on what works.',
    link: { label: 'Analytics', href: '/dashboard/analytics' },
  },
  {
    id: 'fans-tiers',
    title: 'Fans list = prioritization',
    body:
      'Use classification and tiers to decide who gets personal attention vs automation. Divine can suggest, but your business rules stay in charge.',
    link: { label: 'Fans', href: '/dashboard/fans' },
  },
]

/** Stable index for “today” (UTC day-of-year). */
export function getCirceTipIndexForToday(): number {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 0))
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000)
  if (CIRCE_DAILY_TIPS.length === 0) return 0
  return dayOfYear % CIRCE_DAILY_TIPS.length
}

export function getTodayCirceTip(): CirceDailyTip {
  return CIRCE_DAILY_TIPS[getCirceTipIndexForToday()]!
}
