import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://circe-venus.vercel.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/','/features','/pricing','/how-it-works','/auth/login','/auth/sign-up','/auth/sign-up-success','/(legal)/about','/(legal)/contact','/(legal)/privacy','/(legal)/cookies','/(legal)/terms'],
        disallow: ['/dashboard', '/api'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}

