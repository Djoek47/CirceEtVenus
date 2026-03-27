import type { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/site-url'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getAppUrl()
  const now = new Date().toISOString()

  const publicPaths = [
    '/',
    '/features',
    '/pricing',
    '/how-it-works',
    '/auth/login',
    '/auth/sign-up',
    '/auth/sign-up-success',
    '/about',
    '/contact',
    '/privacy',
    '/cookies',
    '/terms',
  ]

  return publicPaths.map((path): MetadataRoute.Sitemap[number] => ({
    url: `${baseUrl}${path === '/' ? '' : path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }))
}

