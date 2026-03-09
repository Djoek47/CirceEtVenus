import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Circe et Venus - Legal',
  description: 'Legal information and policies for Circe et Venus',
}

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
