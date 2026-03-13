import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://circe-venus.vercel.app'
  const now = new Date().toISOString()

  const publicPaths = [
    '/',
    '/features',
    '/pricing',
    '/how-it-works',
    '/auth/login',
    '/auth/sign-up',
    '/auth/sign-up-success',
    '/(legal)/about',
    '/(legal)/contact',
    '/(legal)/privacy',
    '/(legal)/cookies',
    '/(legal)/terms',
  ]

  return publicPaths.map((path): MetadataRoute.Sitemap[number] => ({
    url: `${baseUrl}${path === '/' ? '' : path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }))
}

