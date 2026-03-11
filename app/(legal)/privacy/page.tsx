'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'

export default function PrivacyPolicyPage() {
  const router = useRouter()

  const handleBack = () => {
    // Try to go back in history, or go to home if no history
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <ThemedLogo width={32} height={32} className="rounded-full" priority />
            <span className="font-serif text-lg font-semibold text-primary">CIRCE ET VENUS</span>
          </Link>
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-serif text-2xl font-bold sm:text-3xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">Last updated: March 9, 2026</p>

        <div className="prose prose-invert mt-8 max-w-full space-y-8">
          <section>
            <h2 className="text-xl font-semibold">1. Introduction</h2>
            <p className="text-muted-foreground">
              Circe et Venus Inc. (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy and is committed to protecting
              your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use our Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Information We Collect</h2>
            <h3 className="mt-4 text-lg font-medium">Personal Information</h3>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Account information (name, email, password)</li>
              <li>Profile information (avatar, timezone, preferences)</li>
              <li>Payment information (processed securely via Stripe)</li>
              <li>Communication data (messages sent through our platform)</li>
            </ul>
            
            <h3 className="mt-4 text-lg font-medium">Automatically Collected Information</h3>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Device information (browser type, operating system)</li>
              <li>Usage data (pages visited, features used, time spent)</li>
              <li>IP address and approximate location</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>To provide and maintain our services</li>
              <li>To process transactions and send related information</li>
              <li>To personalize your experience with AI recommendations</li>
              <li>To send administrative notifications</li>
              <li>To improve our Platform and develop new features</li>
              <li>To detect and prevent fraud or security threats</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. AI Data Processing</h2>
            <p className="text-muted-foreground">
              Our AI systems (Circe and Venus) process your data to provide personalized recommendations.
              This includes analyzing content patterns, engagement metrics, and scheduling preferences.
              AI processing is performed securely, and we do not sell your data to third parties.
              You can opt out of AI personalization in your settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Data Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell your personal information. We may share data with:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Service providers (hosting, payment processing, analytics)</li>
              <li>Legal authorities when required by law</li>
              <li>Business partners with your explicit consent</li>
              <li>In connection with a merger or acquisition</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures including encryption in transit and at rest,
              regular security audits, access controls, and secure data centers. However, no method of
              transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your personal data for as long as your account is active or as needed to provide
              services. You may request deletion of your data at any time through your account settings
              or by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Your Rights</h2>
            <p className="text-muted-foreground">Depending on your location, you may have rights to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your data</li>
              <li>Port your data to another service</li>
              <li>Opt out of marketing communications</li>
              <li>Restrict or object to processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. International Transfers</h2>
            <p className="text-muted-foreground">
              Your information may be transferred to and processed in countries other than your own.
              We ensure appropriate safeguards are in place, including Standard Contractual Clauses
              for transfers from the EEA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground">
              Our Platform is not intended for individuals under 18 years of age. We do not knowingly
              collect personal information from children. If we learn we have collected such information,
              we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">11. Updates to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any material
              changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">12. Contact Us</h2>
            <p className="text-muted-foreground">
              For privacy-related inquiries, please contact our Data Protection Officer:
            </p>
            <ul className="mt-2 list-none space-y-1 text-muted-foreground">
              <li>Email: privacy@circeetvenus.com</li>
              <li>Address: 123 Creator Way, Suite 400, Los Angeles, CA 90001</li>
            </ul>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-6 px-4 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
          <Link href="/cookies" className="hover:text-primary">Cookie Policy</Link>
          <Link href="/contact" className="hover:text-primary">Contact Us</Link>
          <Link href="/about" className="hover:text-primary">About Us</Link>
        </div>
      </footer>
    </div>
  )
}
