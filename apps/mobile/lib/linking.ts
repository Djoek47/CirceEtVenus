import * as Linking from 'expo-linking'

/** Same scheme as `app.config.ts` — register paths in Supabase Auth if using OAuth. */
export const linkingPrefix = Linking.createURL('/')

export const creatixDeepLinks = {
  prefixes: [Linking.createURL('/'), 'creatix://'],
  config: {
    screens: {
      index: '',
      login: 'login',
      '(main)': {
        path: 'app',
        screens: {
          index: 'dashboard',
          community: 'community',
          messages: 'messages',
          'ai-studio': {
            path: 'ai-studio',
            screens: {
              index: '',
              tool: {
                path: 'tool/:toolId',
              },
            },
          },
          'divine-manager': 'divine',
          content: 'content',
          social: 'social',
          'content-library': 'library',
          analytics: 'analytics',
          protection: 'protection',
          fans: 'fans',
          mentions: 'mentions',
          settings: 'settings',
        },
      },
    },
  },
}
