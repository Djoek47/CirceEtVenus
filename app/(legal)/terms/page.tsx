'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <ThemedLogo width={32} height={32} className="rounded-full" priority />
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
        <h1 className="font-serif text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-muted-foreground">Last updated: March 9, 2026</p>

        <div className="prose prose-invert mt-8 max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using Circe et Venus (&quot;the Platform&quot;), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our services. The Platform is operated by
              Circe et Venus Inc. (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Eligibility</h2>
            <p className="text-muted-foreground">
              You must be at least 18 years old to use this Platform. By using our services, you represent and
              warrant that you meet this age requirement and have the legal capacity to enter into these terms.
              The Platform is designed for content creators and their management teams.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Account Registration</h2>
            <p className="text-muted-foreground">
              To access certain features, you must create an account. You agree to provide accurate, current,
              and complete information during registration and to update such information to keep it accurate.
              You are responsible for maintaining the confidentiality of your account credentials and for all
              activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Permitted Use</h2>
            <p className="text-muted-foreground">
              The Platform provides tools for content creators including fan management, content scheduling,
              analytics, AI-powered assistance, and reputation monitoring. You agree to use these services
              only for lawful purposes and in accordance with these Terms.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>You must own or have rights to content you upload</li>
              <li>You must comply with all applicable laws and platform terms</li>
              <li>You must not use our services for illegal activities</li>
              <li>You must not attempt to reverse engineer our AI systems</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. AI Services</h2>
            <p className="text-muted-foreground">
              Our AI assistants (Circe and Venus) provide suggestions and analytics. While we strive for accuracy,
              AI-generated content and recommendations are provided &quot;as is&quot; without warranties. You are responsible
              for reviewing and approving any AI-generated content before use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Content Ownership</h2>
            <p className="text-muted-foreground">
              You retain all ownership rights to content you create and upload to the Platform. By using our
              services, you grant us a limited license to process your content solely for providing our services.
              We do not claim ownership of your content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Subscription and Payments</h2>
            <p className="text-muted-foreground">
              Certain features require a paid subscription. Subscription fees are billed in advance on a monthly
              or annual basis. You may cancel your subscription at any time, with access continuing until the
              end of the current billing period. Refunds are provided in accordance with our refund policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Termination</h2>
            <p className="text-muted-foreground">
              We reserve the right to suspend or terminate your account for violations of these Terms. You may
              terminate your account at any time through the settings page. Upon termination, your data will be
              handled in accordance with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, Circe et Venus shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of the Platform.
              Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware,
              United States, without regard to its conflict of law provisions. Any disputes shall be resolved
              through binding arbitration in accordance with AAA rules.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">11. Contact Information</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, please contact us at:
            </p>
            <ul className="mt-2 list-none space-y-1 text-muted-foreground">
              <li>Email: legal@circeetvenus.com</li>
              <li>Address: 123 Creator Way, Suite 400, Los Angeles, CA 90001</li>
            </ul>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-6 px-4 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          <Link href="/cookies" className="hover:text-primary">Cookie Policy</Link>
          <Link href="/contact" className="hover:text-primary">Contact Us</Link>
          <Link href="/about" className="hover:text-primary">About Us</Link>
        </div>
      </footer>
    </div>
  )
}
