import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

export async function GET() {
  // Redirect /favicon.ico to the existing SVG app icon
  return NextResponse.redirect('/icon.svg')
}

