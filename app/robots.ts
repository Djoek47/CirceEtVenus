import type { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/features', '/pricing', '/how-it-works', '/auth/login', '/auth/sign-up', '/auth/sign-up-success', '/about', '/contact', '/privacy', '/cookies', '/terms'],
        disallow: ['/dashboard', '/api'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}

