import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemedLogo } from '@/components/themed-logo'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowRight, Moon, Sun, Star, Shield, TrendingUp, 
  Users, Link2, Calendar, MessageSquare, BarChart3,
  Sparkles, Check, Zap, Eye, Bell, Brain, Lock,
  Palette, Clock, Target, Heart, Crown, Wand2,
  Camera, Gift, Globe, Search, FileText, PieChart,
  AlertTriangle, UserPlus, MessageCircle, Megaphone
} from 'lucide-react'

export const metadata = {
  title: 'Features | Circe et Venus',
  description: 'Explore all the divine features that Circe et Venus offers to content creators',
}

export default function FeaturesPage() {
  const circeFeatres = [
    {
      icon: Shield,
      title: 'Aegis Protection',
      description: 'Divine shield against content leaks with automated DMCA takedowns and continuous monitoring across the web.',
      badge: 'Pro',
    },
    {
      icon: Eye,
      title: 'Leak Detection Scanner',
      description: 'Advanced AI scans thousands of sites daily to find unauthorized copies of your content.',
      badge: null,
    },
    {
      icon: AlertTriangle,
      title: 'Churn Risk Alerts',
      description: 'Predict which fans are about to leave and get actionable strategies to retain them.',
      badge: null,
    },
    {
      icon: Brain,
      title: 'Retention Analytics',
      description: 'Deep insights into what keeps your fans engaged and paying month after month.',
      badge: null,
    },
    {
      icon: Lock,
      title: 'Content Watermarking',
      description: 'Invisible watermarks on your content to track leaks back to the source.',
      badge: 'Pro',
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      description: 'Intelligent alerts for fan milestones, renewals, and engagement opportunities.',
      badge: null,
    },
  ]

  const venusFeatures = [
    {
      icon: TrendingUp,
      title: 'Growth Analytics',
      description: 'Track your audience growth across all platforms with predictive modeling.',
      badge: null,
    },
    {
      icon: UserPlus,
      title: 'Fan Acquisition',
      description: 'AI-powered strategies to attract new subscribers to your creator platforms.',
      badge: null,
    },
    {
      icon: Search,
      title: 'Reputation Monitor',
      description: 'Track mentions and sentiment across social media and review sites.',
      badge: 'Pro',
    },
    {
      icon: Target,
      title: 'Audience Insights',
      description: 'Understand your ideal fan demographics and optimize your content strategy.',
      badge: null,
    },
    {
      icon: Megaphone,
      title: 'Promotion Optimizer',
      description: 'Find the best times and platforms to promote your content for maximum reach.',
      badge: null,
    },
    {
      icon: Globe,
      title: 'Cross-Platform Sync',
      description: 'Manage your presence across OnlyFans, Fansly, and other platforms from one dashboard.',
      badge: null,
    },
  ]

  const aiToolsFeatures = [
    {
      icon: MessageCircle,
      title: 'AI Chatter',
      description: 'Automated fan responses that sound authentically like you, available 24/7.',
      badge: null,
    },
    {
      icon: Wand2,
      title: 'Caption Generator',
      description: 'Create engaging captions for your posts with AI that matches your voice.',
      badge: null,
    },
    {
      icon: FileText,
      title: 'Bio Optimizer',
      description: 'Craft the perfect bio that attracts and converts potential fans.',
      badge: null,
    },
    {
      icon: Palette,
      title: 'Content Ideas',
      description: 'Never run out of ideas with AI-generated content suggestions based on trends.',
      badge: null,
    },
    {
      icon: Heart,
      title: 'PPV Pricing',
      description: 'AI-optimized pricing for your pay-per-view content to maximize revenue.',
      badge: 'Pro',
    },
    {
      icon: Gift,
      title: 'Tip Menu Creator',
      description: 'Design appealing tip menus that encourage fan spending.',
      badge: null,
    },
  ]

  const cosmicFeatures = [
    {
      icon: Calendar,
      title: 'Cosmic Content Calendar',
      description: 'Schedule posts aligned with zodiac cycles and planetary alignments for optimal engagement.',
      badge: null,
    },
    {
      icon: Star,
      title: 'Personal Astro Profile',
      description: 'Unlock personalized insights based on your birth chart for strategic decisions.',
      badge: null,
    },
    {
      icon: Moon,
      title: 'Moon Phase Timing',
      description: 'Post during optimal moon phases for different content types.',
      badge: null,
    },
    {
      icon: Sun,
      title: 'Zodiac Audience Analysis',
      description: 'Understand your fan base by their astrological signs for targeted content.',
      badge: 'Pro',
    },
  ]

  const analyticsFeatures = [
    {
      icon: BarChart3,
      title: 'Revenue Dashboard',
      description: 'Track earnings across all platforms with detailed breakdowns and trends.',
      badge: null,
    },
    {
      icon: PieChart,
      title: 'Fan Segmentation',
      description: 'Categorize fans by spending, engagement, and lifetime value.',
      badge: null,
    },
    {
      icon: Clock,
      title: 'Best Time to Post',
      description: 'AI-analyzed optimal posting times based on your audience activity.',
      badge: null,
    },
    {
      icon: Crown,
      title: 'Whale Identification',
      description: 'Identify and nurture your highest-value fans with special attention.',
      badge: null,
    },
  ]

  const managementFeatures = [
    {
      icon: Users,
      title: 'Fan CRM',
      description: 'Comprehensive fan relationship management with notes, tags, and history.',
      badge: null,
    },
    {
      icon: Link2,
      title: 'Platform Integrations',
      description: 'Connect OnlyFans, Fansly, MYM, Instagram, TikTok, Twitter, and more.',
      badge: null,
    },
    {
      icon: Camera,
      title: 'Content Library',
      description: 'Organize and manage all your content in one secure location.',
      badge: 'Pro',
    },
    {
      icon: Zap,
      title: 'Automation Rules',
      description: 'Set up automated workflows for common tasks and responses.',
      badge: 'Pro',
    },
  ]

  const FeatureSection = ({ 
    title, 
    description, 
    features, 
    color 
  }: { 
    title: string
    description: string
    features: typeof circeFeatres
    color: 'circe' | 'venus' | 'primary'
  }) => (
    <div className="mb-16">
      <div className="mb-8">
        <h2 className={`text-2xl font-semibold ${
          color === 'circe' ? 'text-circe-light' : color === 'venus' ? 'text-amber-400' : 'text-primary'
        }`}>{title}</h2>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className={`rounded-xl border p-6 transition-all hover:shadow-lg ${
              color === 'circe' 
                ? 'border-circe/20 bg-circe/5 hover:border-circe/40' 
                : color === 'venus'
                ? 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40'
                : 'border-primary/20 bg-primary/5 hover:border-primary/40'
            }`}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className={`inline-flex rounded-lg p-3 ${
                color === 'circe' 
                  ? 'bg-circe/20 text-circe-light' 
                  : color === 'venus'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-primary/20 text-primary'
              }`}>
                <feature.icon className="h-6 w-6" />
              </div>
              {feature.badge && (
                <Badge variant="outline" className={`text-xs ${
                  color === 'circe' 
                    ? 'border-circe/50 text-circe-light' 
                    : color === 'venus'
                    ? 'border-amber-500/50 text-amber-400'
                    : 'border-primary/50 text-primary'
                }`}>
                  {feature.badge}
                </Badge>
              )}
            </div>
            <h3 className="mb-2 font-semibold">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background constellation-bg">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <ThemedLogo 
              width={36} 
              height={36} 
              className="rounded-full sm:h-10 sm:w-10"
              priority
            />
            <span className="hidden font-serif text-lg font-semibold tracking-wider text-primary sm:inline sm:text-xl">CIRCE ET VENUS</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-foreground/80 hover:text-foreground">
                Pricing
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="pt-14 sm:pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
            <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-circe/5 blur-3xl" />
            <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
          </div>
          
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-4 gap-1">
              <Sparkles className="h-3 w-3" />
              30+ Divine Features
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              Every Tool a <span className="text-primary">Creator</span> Needs
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Explore our complete suite of AI-powered features designed to help you 
              grow, retain, and protect your creator business.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Badge variant="outline" className="gap-1 border-circe/50 px-3 py-1">
                <Moon className="h-3 w-3 text-circe-light" />
                <span className="text-circe-light">Circe - Retention</span>
              </Badge>
              <Badge variant="outline" className="gap-1 border-amber-500/50 px-3 py-1">
                <Sun className="h-3 w-3 text-amber-400" />
                <span className="text-amber-400">Venus - Growth</span>
              </Badge>
              <Badge variant="outline" className="gap-1 border-primary/50 px-3 py-1">
                <Star className="h-3 w-3 text-primary" />
                <span className="text-primary">AI Studio</span>
              </Badge>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-4 py-8 sm:px-6 sm:py-12">
          <div className="mx-auto max-w-6xl">
            <FeatureSection
              title="Circe - Retention & Protection"
              description="The enchantress who keeps your fans captivated and your content safe."
              features={circeFeatres}
              color="circe"
            />

            <FeatureSection
              title="Venus - Growth & Attraction"
              description="The goddess of attraction who draws new admirers to your realm."
              features={venusFeatures}
              color="venus"
            />

            <FeatureSection
              title="AI Studio Tools"
              description="Powerful AI tools to create content and engage with fans effortlessly."
              features={aiToolsFeatures}
              color="circe"
            />

            <FeatureSection
              title="Cosmic Calendar"
              description="Align your content strategy with celestial energies for optimal timing."
              features={cosmicFeatures}
              color="primary"
            />

            <FeatureSection
              title="Analytics & Insights"
              description="Deep data analysis to understand your business and optimize growth."
              features={analyticsFeatures}
              color="primary"
            />

            <FeatureSection
              title="Platform Management"
              description="Centralized tools to manage your entire creator business."
              features={managementFeatures}
              color="primary"
            />
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border/30 bg-card/30 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-circe/5 via-card to-amber-500/5 p-8 text-center sm:p-12">
            <div className="mb-6 flex justify-center gap-4">
              <div className="rounded-full bg-circe/20 p-3">
                <Moon className="h-8 w-8 text-circe-light" />
              </div>
              <div className="rounded-full bg-amber-500/20 p-3">
                <Sun className="h-8 w-8 text-amber-400" />
              </div>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to Experience Divine Features?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Start your 14-day free trial today. No credit card required.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2 bg-primary px-8 text-primary-foreground hover:bg-primary/90">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="px-8">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-card/30 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <ThemedLogo width={32} height={32} className="rounded-full" />
              <span className="font-serif font-semibold tracking-wider text-primary">CIRCE ET VENUS</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-4 text-sm sm:gap-6">
              <Link href="/" className="text-muted-foreground hover:text-foreground">Home</Link>
              <Link href="/features" className="text-muted-foreground hover:text-foreground">Features</Link>
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
              <Link href="/how-it-works" className="text-muted-foreground hover:text-foreground">How It Works</Link>
            </nav>
          </div>
          <div className="mt-6 border-t border-border/30 pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              MMXXVI Circe et Venus Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
