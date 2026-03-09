'use client'

import Link from 'next/link'
import { ArrowLeft, Cookie } from 'lucide-react'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <ThemedLogo width={32} height={32} className="rounded-full" />
            <span className="font-serif text-lg font-semibold text-primary">CIRCE ET VENUS</span>
          </Link>
          <Button variant="ghost" asChild>
            <Link href="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="flex items-center gap-3">
          <Cookie className="h-8 w-8 text-primary" />
          <h1 className="font-serif text-3xl font-bold">Cookie Policy</h1>
        </div>
        <p className="mt-2 text-muted-foreground">Last updated: March 9, 2026</p>

        <div className="prose prose-invert mt-8 max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold">What Are Cookies</h2>
            <p className="text-muted-foreground">
              Cookies are small text files stored on your device when you visit a website. They help websites
              remember your preferences and improve your browsing experience. Circe et Venus uses cookies and
              similar technologies to provide, protect, and improve our Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Types of Cookies We Use</h2>
            
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-border p-4">
                <h3 className="font-medium text-primary">Essential Cookies</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Required for the Platform to function. These include authentication cookies, security
                  cookies, and session management. Cannot be disabled.
                </p>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h3 className="font-medium text-primary">Functional Cookies</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Remember your preferences such as theme (Venus/Circe mode), language, and timezone settings.
                  Help provide personalized features.
                </p>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h3 className="font-medium text-primary">Analytics Cookies</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Help us understand how visitors interact with our Platform. We use Vercel Analytics for
                  privacy-focused analytics that don&apos;t track individual users.
                </p>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h3 className="font-medium text-primary">Performance Cookies</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Monitor Platform performance and help us identify and fix issues. Data is aggregated and
                  anonymized.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Third-Party Cookies</h2>
            <p className="text-muted-foreground">
              We may use third-party services that set their own cookies:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li><strong>Supabase</strong> - Authentication and database services</li>
              <li><strong>Stripe</strong> - Payment processing (only on payment pages)</li>
              <li><strong>Vercel</strong> - Hosting and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Managing Cookies</h2>
            <p className="text-muted-foreground">
              You can control cookies through your browser settings. Most browsers allow you to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>View cookies stored on your device</li>
              <li>Delete all or specific cookies</li>
              <li>Block cookies from specific or all websites</li>
              <li>Set preferences for different types of cookies</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              Note: Blocking essential cookies may prevent the Platform from functioning correctly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Cookie Duration</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-medium">Cookie Type</th>
                    <th className="pb-2 text-left font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <td className="py-2">Session cookies</td>
                    <td className="py-2">Until browser is closed</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2">Authentication cookies</td>
                    <td className="py-2">7 days (or until logout)</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2">Preference cookies</td>
                    <td className="py-2">1 year</td>
                  </tr>
                  <tr>
                    <td className="py-2">Analytics cookies</td>
                    <td className="py-2">2 years</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Updates to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Cookie Policy periodically. Changes will be posted on this page with an
              updated revision date. Continued use of the Platform after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Contact Us</h2>
            <p className="text-muted-foreground">
              For questions about our use of cookies, contact us at privacy@circeetvenus.com.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-6 px-4 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          <Link href="/contact" className="hover:text-primary">Contact Us</Link>
          <Link href="/about" className="hover:text-primary">About Us</Link>
        </div>
      </footer>
    </div>
  )
}
