import { NextRequest, NextResponse } from 'next/server'

/** Used for unsigned OF CDN URLs only. Signed CloudFront URLs are IP-bound; clients must load those directly (see lib/proxy-image-url.ts). */

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  
  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
  }

  try {
    let referer = 'https://onlyfans.com/'
    let origin: string | undefined
    try {
      const u = new URL(url)
      const host = u.hostname.toLowerCase()
      if (host.includes('fansly')) {
        referer = 'https://fansly.com/'
        origin = 'https://fansly.com'
      } else if (host.includes('onlyfans')) {
        referer = 'https://onlyfans.com/'
        origin = 'https://onlyfans.com'
      } else {
        referer = `${u.protocol}//${u.host}/`
        origin = `${u.protocol}//${u.host}`
      }
    } catch {
      const lower = url.toLowerCase()
      referer = lower.includes('fansly') ? 'https://fansly.com/' : 'https://onlyfans.com/'
      origin = lower.includes('fansly') ? 'https://fansly.com' : 'https://onlyfans.com'
    }

    const response = await fetch(url, {
      headers: {
        // Some CDNs check for a valid user agent
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: referer,
        ...(origin ? { Origin: origin } : {}),
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` }, 
        { status: response.status }
      )
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Image proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy image' }, 
      { status: 500 }
    )
  }
}
