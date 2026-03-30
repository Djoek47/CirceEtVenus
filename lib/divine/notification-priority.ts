import type { DivineManagerAutomationRules } from '@/lib/divine-manager'
import type { FanNotifySnapshot } from '@/lib/divine/notification-fan-context'

function whaleMinFromRules(rules: DivineManagerAutomationRules | null | undefined): number {
  const n = rules?.alerts?.message_whale_min_dollars
  if (typeof n === 'number' && Number.isFinite(n) && n > 0) return n
  return 100
}

function tipWhaleMinFromRules(rules: DivineManagerAutomationRules | null | undefined): number {
  const n = rules?.alerts?.whale_tip_min_dollars
  if (typeof n === 'number' && Number.isFinite(n) && n > 0) return n
  return 100
}

function tipNotifyMinFromRules(rules: DivineManagerAutomationRules | null | undefined): number {
  const n = rules?.alerts?.tip_notify_min_dollars
  if (typeof n === 'number' && Number.isFinite(n) && n >= 0) return n
  return 50
}

/** OF housekeeping “whales” list sync aligns with tier whale/vip in DB — use as boost signal. */
export function isHousekeepingWhaleTier(tier: string | null | undefined): boolean {
  const t = (tier || '').toLowerCase()
  return t === 'whale' || t === 'vip'
}

export function resolveMessageNotificationTitle(opts: {
  displayName: string
  snap: FanNotifySnapshot | null
  rules: DivineManagerAutomationRules | null | undefined
}): { title: string; whaleBoost: boolean } {
  const { displayName, snap, rules } = opts
  const minSpend = whaleMinFromRules(rules)
  const spent = snap?.total_spent ?? 0
  const tierBoost = isHousekeepingWhaleTier(snap?.tier)
  const spendBoost = spent >= minSpend
  const whaleBoost = tierBoost || spendBoost

  if (snap?.creator_classification) {
    const label = snap.creator_classification.slice(0, 80)
    return {
      title: whaleBoost
        ? `Priority · ${label}: ${displayName}`
        : `${label}: message from ${displayName}`,
      whaleBoost,
    }
  }

  if (whaleBoost) {
    return { title: `Whale wrote back — ${displayName}`, whaleBoost: true }
  }

  return { title: `New message from ${displayName}`, whaleBoost: false }
}

export function resolveTipNotificationTitles(opts: {
  amount: number
  snap: FanNotifySnapshot | null
  rules: DivineManagerAutomationRules | null | undefined
}): { title: string; notify: boolean } {
  const minNotify = tipNotifyMinFromRules(opts.rules)
  if (opts.amount < minNotify) return { title: '', notify: false }

  const whaleMin = tipWhaleMinFromRules(opts.rules)
  const tierBoost = isHousekeepingWhaleTier(opts.snap?.tier)
  const amountWhale = opts.amount >= whaleMin
  const labelWhale = tierBoost || amountWhale

  if (opts.snap?.creator_classification) {
    const label = opts.snap.creator_classification.slice(0, 60)
    return {
      title: labelWhale ? `Priority tip · ${label} — $${opts.amount}` : `Tip · ${label} — $${opts.amount}`,
      notify: true,
    }
  }

  return {
    title: labelWhale ? 'Whale Alert!' : 'Big Tip Received',
    notify: true,
  }
}
