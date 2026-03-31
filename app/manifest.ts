import type { MetadataRoute } from 'next'

/**
 * Web app manifest — enables "Add to Home Screen" / installable PWA shell.
 * Icons: dedicated 192 / 512 assets in public/ for install prompts and maskable use.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Circe et Venus — Creatix',
    short_name: 'Creatix',
    description:
      'Divine creator management: Circe for retention & protection, Venus for growth. Fans, messages, AI tools, and more.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    categories: ['business', 'productivity', 'lifestyle'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
