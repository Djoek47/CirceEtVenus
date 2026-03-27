import type { RuntimePlatform } from '@/lib/divine/platform-connection-status'

export const CONNECTION_ERROR_CODES = {
  onlyfansNotConnected: 'ONLYFANS_NOT_CONNECTED',
  fanslyNotConnected: 'FANSLY_NOT_CONNECTED',
  onlyfansCredentialMissing: 'ONLYFANS_CONNECTION_INCOMPLETE',
  fanslyCredentialMissing: 'FANSLY_CONNECTION_INCOMPLETE',
} as const

type ConnectionErrorCode =
  | typeof CONNECTION_ERROR_CODES.onlyfansNotConnected
  | typeof CONNECTION_ERROR_CODES.fanslyNotConnected
  | typeof CONNECTION_ERROR_CODES.onlyfansCredentialMissing
  | typeof CONNECTION_ERROR_CODES.fanslyCredentialMissing

export type PlatformConnectionError = {
  code: ConnectionErrorCode
  message: string
  actionPath: '/dashboard/settings?tab=integrations'
}

export function buildPlatformNotConnectedError(platform: RuntimePlatform): PlatformConnectionError {
  if (platform === 'onlyfans') {
    return {
      code: CONNECTION_ERROR_CODES.onlyfansNotConnected,
      message: 'OnlyFans is not connected. Open Settings → Integrations and reconnect OnlyFans.',
      actionPath: '/dashboard/settings?tab=integrations',
    }
  }
  return {
    code: CONNECTION_ERROR_CODES.fanslyNotConnected,
    message: 'Fansly is not connected. Open Settings → Integrations and reconnect Fansly.',
    actionPath: '/dashboard/settings?tab=integrations',
  }
}

export function buildPlatformCredentialMissingError(platform: RuntimePlatform): PlatformConnectionError {
  if (platform === 'onlyfans') {
    return {
      code: CONNECTION_ERROR_CODES.onlyfansCredentialMissing,
      message:
        'OnlyFans connection is incomplete (missing account reference). Reconnect in Settings → Integrations.',
      actionPath: '/dashboard/settings?tab=integrations',
    }
  }
  return {
    code: CONNECTION_ERROR_CODES.fanslyCredentialMissing,
    message:
      'Fansly connection is incomplete (missing account reference). Reconnect in Settings → Integrations.',
    actionPath: '/dashboard/settings?tab=integrations',
  }
}

