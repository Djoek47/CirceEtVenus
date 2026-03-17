import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

export async function GET(request: Request) {
  // Redirect /favicon.ico to the existing SVG app icon using an absolute URL
  const url = new URL('/icon.png', request.url)
  return NextResponse.redirect(url)
}


