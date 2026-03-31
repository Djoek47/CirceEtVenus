'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BookOpen,
  Link2,
  LayoutDashboard,
  Moon,
  Sun,
  MessageSquare,
  Users,
  Calendar,
  Shield,
  Settings,
  HelpCircle,
  ChevronRight,
  Zap,
  Star,
} from 'lucide-react'

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-12">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
          <BookOpen className="h-8 w-8 text-primary" />
          Help &amp; Guide
        </h1>
        <p className="mt-2 text-muted-foreground">
          Everything you need to get the most out of Circe et Venus. Use the links below to jump to any section.
        </p>
      </div>

      {/* Table of contents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">On this page</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a href="#getting-started" className="text-primary hover:underline">Getting started</a>
          <a href="#connecting-platforms" className="text-primary hover:underline">Connecting platforms</a>
          <a href="#onlyfans" className="text-primary hover:underline">OnlyFans (detailed)</a>
          <a href="#dashboard" className="text-primary hover:underline">Dashboard</a>
          <a href="#ai-guides" className="text-primary hover:underline">AI Guides (Circe & Venus)</a>
          <a href="#circe-daily-tips" className="text-primary hover:underline">Daily tips (Circe)</a>
          <a href="#messages-fans" className="text-primary hover:underline">Messages &amp; Fans</a>
          <a href="#content" className="text-primary hover:underline">Content</a>
          <a href="#protection" className="text-primary hover:underline">Protection</a>
          <a href="#settings" className="text-primary hover:underline">Settings</a>
          <a href="#troubleshooting" className="text-primary hover:underline">Troubleshooting</a>
        </CardContent>
      </Card>

      {/* Getting started */}
      <section id="getting-started">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Getting started
            </CardTitle>
            <CardDescription>Your first steps in Circe et Venus</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Circe et Venus gives you two divine AIs: <strong className="text-circe-light">Circe</strong> focuses on retention, analytics, and protection (keeping your fans and content safe). <strong className="text-amber-500">Venus</strong> focuses on growth, attraction, and reputation (bringing in new fans and opportunities).
            </p>
            <p>
              After sign-up you&apos;ll see a short tutorial. You can skip it or complete it, and reopen this Guide anytime from the sidebar. The most important step is connecting at least one platform (OnlyFans, Fansly, or MYM) so we can sync your data and give you personalized insights.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Connecting platforms */}
      <section id="connecting-platforms">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Connecting your platforms
            </CardTitle>
            <CardDescription>Link OnlyFans, Fansly, MYM, and more</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Go to <Link href="/dashboard/settings?tab=integrations" className="text-primary underline hover:no-underline">Settings → Integrations</Link> (or use the platform cards on the dashboard). We use secure, read-only connections: your login credentials are never stored on our servers; they are used only to establish a session with our trusted data partner.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>OnlyFans</strong> — Connect with your OnlyFans email and password. See the OnlyFans section below for tips (proxy, 2FA, face verification, session expiry).</li>
              <li><strong>Fansly</strong> — Connect with your Fansly username/email and password. You may be asked for 2FA; we&apos;ll prompt you in the dialog.</li>
              <li><strong>MYM</strong> — Connect from the same Integrations page when available.</li>
            </ul>
            <p>
              Once connected, use <strong>Sync</strong> to pull the latest fans, messages, and earnings. If a platform session expires (e.g. you changed your password or OnlyFans logged you out), we automatically disconnect that account for security. You can reconnect anytime with a fresh login.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* OnlyFans detailed */}
      <section id="onlyfans">
        <Card>
          <CardHeader>
            <CardTitle>OnlyFans connection (detailed)</CardTitle>
            <CardDescription>Login flow, proxy, 2FA, face verification, and session expiry</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="mb-1 font-medium text-foreground">Login can take up to a minute</h4>
              <p>OnlyFans authentication runs in the background. We keep polling until it completes. You may see steps like &quot;Filling out login&quot; or &quot;Submitting&quot; — that&apos;s normal. Don&apos;t close the dialog until you see success or a request for 2FA/face verification.</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">Proxy region (US / UK)</h4>
              <p>When you connect OnlyFans, you can choose a proxy region (US or UK). If login seems stuck at the form step for a long time, try <strong>Start fresh login</strong> and switch to the other region (e.g. from US to UK). This often resolves issues related to geography or VPN.</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">Start fresh login</h4>
              <p>If the connection dialog is stuck (e.g. still &quot;Filling out login&quot; after 45+ seconds), use the <strong>Start fresh login</strong> button. This abandons the current attempt and shows the form again so you can re-enter your credentials and optionally change the proxy. Never reuse a stuck attempt — always start fresh.</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">2FA (two-factor authentication)</h4>
              <p>If OnlyFans has 2FA enabled, you&apos;ll be asked for the code (from your email or authenticator app). Enter the 6-digit code in the dialog and click <strong>Verify &amp; Connect</strong>. We keep the same attempt so the code is applied correctly.</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">Face verification</h4>
              <p>Sometimes OnlyFans requires a quick face check. If so, we show a message and a link: <strong>Complete face verification</strong>. Open the link in your browser, complete the check, then return to the dialog. We keep polling and will complete the connection once OnlyFans confirms.</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">Session expired</h4>
              <p>If your OnlyFans session expires (e.g. you changed your password, or OnlyFans logged you out), our system detects it when you try to sync or load messages. We automatically disconnect the OnlyFans account in our database so your data stays consistent. You&apos;ll see a message like &quot;Your OnlyFans session expired. Please reconnect.&quot; Go to Settings → Integrations and connect OnlyFans again with a <strong>fresh login</strong> (don&apos;t reuse an old attempt).</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">Display name</h4>
              <p>The name shown for your account in our partner&apos;s console is your <strong>Circe et Venus identity</strong> (your profile name or the email you used to sign up with us), not your OnlyFans login email. This helps you and support identify your workspace without exposing your OnlyFans credentials.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Dashboard */}
      <section id="dashboard">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </CardTitle>
            <CardDescription>Your command center</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              The main <Link href="/dashboard" className="text-primary underline hover:no-underline">Dashboard</Link> shows an overview of revenue, fans, and messages. You get quick access to Circe and Venus, platform connection status, recent fans, and alerts (e.g. leak alerts, mentions). Use the sidebar to go deeper: Analytics (Circe), Fans and Mentions (Venus), Content, Messages, Protection, and AI Studio.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* AI Guides */}
      <section id="ai-guides">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              AI Guides: Circe &amp; Venus
            </CardTitle>
            <CardDescription>Two divine AIs at your service</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-lg border border-circe/30 bg-circe/5 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-circe-light">
                <Moon className="h-4 w-4" />
                Circe — Retention &amp; Protection
              </h4>
              <p>Circe helps you keep your audience captivated and your content safe. Use her for: retention analytics, churn prediction, leak detection and DMCA automation, fan engagement scoring, and alerts. Access her from the dashboard or via <Link href="/dashboard/analytics" className="text-primary underline hover:no-underline">Analytics</Link> and <Link href="/dashboard/protection" className="text-primary underline hover:no-underline">Protection</Link>.</p>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-amber-500">
                <Sun className="h-4 w-4" />
                Venus — Growth &amp; Attraction
              </h4>
              <p>Venus helps you attract new admirers and grow your reputation. Use her for: growth strategies, optimal posting times, content performance predictions, reputation and sentiment monitoring, and fan acquisition. Access her from the dashboard or via <Link href="/dashboard/fans" className="text-primary underline hover:no-underline">Fans</Link> and <Link href="/dashboard/mentions" className="text-primary underline hover:no-underline">Mentions</Link>.</p>
            </div>
            <p>
              <Link href="/dashboard/ai-studio" className="inline-flex items-center gap-1 text-primary underline hover:no-underline">AI Studio</Link> is your media vault (describe content for Divine), safe photo touch-ups, and the full AI tools library (captions, churn, growth, and more).
            </p>
            <div
              id="circe-daily-tips"
              className="scroll-mt-24 rounded-lg border border-circe/35 bg-circe/5 p-4"
            >
              <h4 className="mb-2 flex items-center gap-2 font-medium text-circe-light">
                <Moon className="h-4 w-4" />
                Daily AI tips from Circe
              </h4>
              <p className="mb-3 text-sm text-muted-foreground">
                Curated, rotating tips for using Circe et Venus well — sync habits, vault notes, mass segments, Protection,
                and more. Updated with a new &quot;tip of the day&quot; on the calendar; the full list lives on one page.
              </p>
              <Link
                href="/dashboard/community/circe-daily"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline hover:no-underline"
              >
                Open Daily AI tips from Circe (full page)
                <ChevronRight className="h-4 w-4" />
              </Link>
              <p className="mt-2 text-xs text-muted-foreground">
                Also linked from{' '}
                <Link href="/dashboard/community" className="text-primary underline hover:no-underline">
                  Community
                </Link>{' '}
                at the top of the screen.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Messages & Fans */}
      <section id="messages-fans">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages &amp; Fans
            </CardTitle>
            <CardDescription>Conversations and fan management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <Link href="/dashboard/messages" className="text-primary underline hover:no-underline">Messages</Link> shows your DMs from connected platforms. You can view conversations and use AI-powered reply suggestions. If OnlyFans session has expired, you&apos;ll see an error and need to reconnect OnlyFans from Settings → Integrations before messages load again.
            </p>
            <p>
              <Link href="/dashboard/fans" className="text-primary underline hover:no-underline">Fans</Link> lists your subscribers/fans synced from your platforms. You can see who&apos;s active, who might churn, and add manual fans if needed. Tags and notes help Circe et Venus tailor suggestions and respect your boundaries.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Content */}
      <section id="content">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Content
            </CardTitle>
            <CardDescription>Posts and calendar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <Link href="/dashboard/content" className="text-primary underline hover:no-underline">Content</Link> lets you view and manage posts. Connect platforms and sync to import existing content, or create new content. The content calendar helps you plan and schedule aligned with your strategy.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Protection */}
      <section id="protection">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Protection
            </CardTitle>
            <CardDescription>Leak detection and DMCA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <Link href="/dashboard/protection" className="text-primary underline hover:no-underline">Protection</Link> is Circe&apos;s domain. Here you get leak alerts and tools to issue DMCA takedowns. We help you find unauthorized use of your content and guide you through the process of protecting your work.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Settings */}
      <section id="settings">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </CardTitle>
            <CardDescription>Profile, notifications, integrations, billing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <Link href="/dashboard/settings" className="text-primary underline hover:no-underline">Settings</Link> is where you manage your profile (name, avatar), notifications, security (password), billing and subscription, and <strong>Integrations</strong> (connect/disconnect platforms). Use the Integrations tab to connect OnlyFans, Fansly, MYM, and to sync or disconnect.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Troubleshooting */}
      <section id="troubleshooting">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Troubleshooting
            </CardTitle>
            <CardDescription>Common issues and fixes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="mb-1 font-medium text-foreground">OnlyFans login stuck at &quot;Filling out login&quot;</h4>
              <p>Click <strong>Start fresh login</strong>, choose the other proxy (US or UK), and try again. Avoid reusing the same attempt.</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">OnlyFans session expired / &quot;Please reconnect&quot;</h4>
              <p>We disconnected your OnlyFans account for security. Go to Settings → Integrations and connect OnlyFans again with a fresh login (email + password, then 2FA or face verification if prompted).</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">Messages or sync fail with &quot;session expired&quot;</h4>
              <p>Same as above: reconnect the affected platform from Settings → Integrations.</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">2FA or face verification not showing</h4>
              <p>Make sure you completed the previous step (e.g. entered password and waited). If the dialog closed, open Connect again and start a new login — don&apos;t reuse an old attempt ID.</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">Need more help?</h4>
              <p>Contact support at <a href="mailto:support@circe-venus.com" className="text-primary underline hover:no-underline">support@circe-venus.com</a> or via the <Link href="/contact" className="text-primary underline hover:no-underline">Contact</Link> page.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="flex justify-end pt-4">
        <Link
          href="/dashboard/settings?tab=integrations"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Go to Integrations
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
