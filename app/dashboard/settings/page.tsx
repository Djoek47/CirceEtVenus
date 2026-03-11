'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  User, Bell, Shield, CreditCard, Upload, Loader2, Check, Moon, Sun,
  Link2, Database, Settings2, Globe, Download, Trash2, Key, Smartphone,
  Mail, AlertTriangle, ExternalLink, Zap, RefreshCw, Eye, EyeOff
} from 'lucide-react'

// Social Media Logos
const TwitterXLogo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const InstagramLogo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 1.802c-2.67 0-2.986.01-4.04.058-.976.045-1.505.207-1.858.344-.466.182-.8.398-1.15.748-.35.35-.566.684-.748 1.15-.137.353-.3.882-.344 1.857-.048 1.055-.058 1.37-.058 4.041 0 2.67.01 2.986.058 4.04.045.976.207 1.505.344 1.858.182.466.399.8.748 1.15.35.35.684.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058 2.67 0 2.987-.01 4.04-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.684.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041 0-2.67-.01-2.986-.058-4.04-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 0 0-.748-1.15 3.098 3.098 0 0 0-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.055-.048-1.37-.058-4.041-.058zm0 3.063a5.135 5.135 0 1 1 0 10.27 5.135 5.135 0 0 1 0-10.27zm0 8.468a3.333 3.333 0 1 0 0-6.666 3.333 3.333 0 0 0 0 6.666zm6.538-8.671a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z"/>
  </svg>
)

const TikTokLogo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
)
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import { BirthdaySettings } from '@/components/settings/birthday-settings'
import { BillingSection } from '@/components/settings/billing-section'
import { SecuritySettings } from '@/components/settings/security-settings'
import { PlatformConnector } from '@/components/platform/platform-connector'
import type { User as SupabaseUser } from '@supabase/supabase-js'

type SettingsTab = 'profile' | 'notifications' | 'security' | 'billing' | 'integrations' | 'data' | 'preferences'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<{
    full_name: string
    avatar_url: string
    timezone?: string
    has_birthday_set?: boolean
    gender_identity?: string | null
    pronouns?: string | null
    pronouns_custom?: string | null
  } | null>(null)
  const [hasBirthdaySet, setHasBirthdaySet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fullName, setFullName] = useState('')
  const [timezone, setTimezone] = useState('America/Los_Angeles')
  const [genderIdentity, setGenderIdentity] = useState<string>('unspecified')
  const [pronouns, setPronouns] = useState<string>('unspecified')
  const [customPronouns, setCustomPronouns] = useState<string>('')
  const [notifications, setNotifications] = useState({
    email: true,
    leakAlerts: true,
    reputationAlerts: true,
    dailyDigest: false,
    weeklyReport: true,
    newFeatures: true,
    marketingEmails: false,
  })
  const [platformNotifPrefs, setPlatformNotifPrefs] = useState({
    notify_new_message: true,
    notify_new_subscriber: true,
    notify_new_tip: true,
    notify_subscription_expired: true,
    notify_subscription_renewed: false,
  })
  const [preferences, setPreferences] = useState({
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    autoSave: true,
    soundEffects: false,
    cosmicGuidance: true,
  })
  const [integrations, setIntegrations] = useState({
    onlyfans: false,
    fansly: false,
    mym: false,
    twitter: false,
    instagram: false,
    tiktok: false,
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme, setTheme } = useTheme()

  // Handle tab from URL query param
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['profile', 'notifications', 'security', 'billing', 'integrations', 'data', 'preferences'].includes(tabParam)) {
      setActiveTab(tabParam as SettingsTab)
    }
  }, [searchParams])

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      setUser(user)
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setProfile(profile)
        setFullName(profile.full_name || '')
        setTimezone((profile as any).timezone || 'America/Los_Angeles')
        setGenderIdentity(((profile as any).gender_identity as string) || 'unspecified')
        const storedPronouns = ((profile as any).pronouns as string) || 'unspecified'
        setPronouns(storedPronouns)
        setCustomPronouns(((profile as any).pronouns_custom as string) || '')
        setHasBirthdaySet(profile.has_birthday_set || false)
      }

      const prefsRes = await fetch('/api/user/notification-preferences')
      if (prefsRes.ok) {
        const prefs = await prefsRes.json()
        setPlatformNotifPrefs({
          notify_new_message: prefs.notify_new_message ?? true,
          notify_new_subscriber: prefs.notify_new_subscriber ?? true,
          notify_new_tip: prefs.notify_new_tip ?? true,
          notify_subscription_expired: prefs.notify_subscription_expired ?? true,
          notify_subscription_renewed: prefs.notify_subscription_renewed ?? false,
        })
      }
      
      setLoading(false)
    }
    
    loadUser()
  }, [router])

  async function handleSaveProfile() {
    if (!user) return
    
    setSaving(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        timezone: timezone,
        gender_identity: genderIdentity === 'unspecified' ? null : genderIdentity,
        pronouns: pronouns === 'unspecified' ? null : pronouns,
        pronouns_custom: customPronouns || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    
    setSaving(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleDeleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0].toUpperCase() || 'U'

  const tabs = [
    { id: 'profile' as const, icon: User, label: 'Profile' },
    { id: 'notifications' as const, icon: Bell, label: 'Notifications' },
    { id: 'security' as const, icon: Shield, label: 'Security' },
    { id: 'billing' as const, icon: CreditCard, label: 'Billing' },
    { id: 'integrations' as const, icon: Link2, label: 'Integrations' },
    { id: 'data' as const, icon: Database, label: 'Data & Privacy' },
    { id: 'preferences' as const, icon: Settings2, label: 'Preferences' },
  ]

  const timezones = [
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  ]

  const platformIntegrations = [
    { key: 'onlyfans', name: 'OnlyFans', color: 'bg-blue-500', connected: integrations.onlyfans },
    { key: 'fansly', name: 'Fansly', color: 'bg-cyan-500', connected: integrations.fansly },
    { key: 'mym', name: 'MYM', color: 'bg-pink-500', connected: integrations.mym },
  ]

  const socialIntegrations = [
    { key: 'twitter', name: 'Twitter/X', color: 'bg-slate-900', connected: integrations.twitter, icon: TwitterXLogo },
    { key: 'instagram', name: 'Instagram', color: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400', connected: integrations.instagram, icon: InstagramLogo },
    { key: 'tiktok', name: 'TikTok', color: 'bg-black', connected: integrations.tiktok, icon: TikTokLogo },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account, preferences, and integrations
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4 min-w-0">
        {/* Sidebar Navigation */}
        <Card className="h-fit border-border bg-card lg:col-span-1 min-w-0">
          <CardContent className="p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  }`}
                >
                  <tab.icon className="h-4 w-4 flex-shrink-0" />
                  {tab.label}
                </button>
              ))}
            </nav>
            <Separator className="my-4" />
            <div className="space-y-1 text-sm">
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 min-h-[44px] px-3 py-2 text-muted-foreground hover:text-foreground rounded-lg">
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                Terms of Service
              </a>
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 min-h-[44px] px-3 py-2 text-muted-foreground hover:text-foreground rounded-lg">
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                Privacy Policy
              </a>
              <a href="/contact" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 min-h-[44px] px-3 py-2 text-muted-foreground hover:text-foreground rounded-lg">
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                Contact Support
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="space-y-6 lg:col-span-3 min-w-0 overflow-x-hidden">
          {/* Profile Section */}
          {activeTab === 'profile' && (
            <>
            <Card className="border-border bg-card">
              <CardHeader>
<CardTitle className="flex items-center gap-2 font-semibold">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
                <CardDescription>
                  Update your personal details and public profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border-2 border-border">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Upload className="h-4 w-4" />
                      Change Avatar
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      JPG, PNG or GIF. Max 2MB.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Form Fields */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      className="bg-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      defaultValue={user?.email || ''}
                      disabled
                      className="bg-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender identity (optional)</Label>
                    <Select value={genderIdentity} onValueChange={setGenderIdentity}>
                      <SelectTrigger id="gender" className="bg-input">
                        <SelectValue placeholder="Select gender identity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unspecified">Prefer not to say</SelectItem>
                        <SelectItem value="woman">Woman</SelectItem>
                        <SelectItem value="man">Man</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                        <SelectItem value="trans-woman">Trans woman</SelectItem>
                        <SelectItem value="trans-man">Trans man</SelectItem>
                        <SelectItem value="agender">Agender</SelectItem>
                        <SelectItem value="other">Other / describe in bio</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Used only so Circe, Venus, and Flirt speak about you correctly.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pronouns">Pronouns</Label>
                    <Select value={pronouns} onValueChange={setPronouns}>
                      <SelectTrigger id="pronouns" className="bg-input">
                        <SelectValue placeholder="Select pronouns" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unspecified">Prefer not to say</SelectItem>
                        <SelectItem value="she/her">She / Her</SelectItem>
                        <SelectItem value="he/him">He / Him</SelectItem>
                        <SelectItem value="they/them">They / Them</SelectItem>
                        <SelectItem value="she/they">She / They</SelectItem>
                        <SelectItem value="he/they">He / They</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    {pronouns === 'custom' && (
                      <Input
                        className="mt-2 bg-input"
                        placeholder="Enter your pronouns (e.g. fae/faer)"
                        value={customPronouns}
                        onChange={(e) => setCustomPronouns(e.target.value)}
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll use these everywhere in the app and in AI responses.
                    </p>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="bg-input">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Theme Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? (
                      <Moon className="h-5 w-5 text-circe" />
                    ) : (
                      <Sun className="h-5 w-5 text-venus" />
                    )}
                    <div>
                      <p className="font-medium">Theme</p>
                      <p className="text-sm text-muted-foreground">
                        {theme === 'dark' ? 'Circe (Night Mode)' : 'Venus (Day Mode)'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  >
                    Switch to {theme === 'dark' ? 'Venus' : 'Circe'}
                  </Button>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : saved ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Saved
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Cosmic Birthday Section */}
            {user && (
              <BirthdaySettings userId={user.id} hasBirthdaySet={hasBirthdaySet} />
            )}
          </>
          )}

          {/* Notifications Section */}
          {activeTab === 'notifications' && (
            <Card className="border-border bg-card">
              <CardHeader>
<CardTitle className="flex items-center gap-2 font-semibold">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="mb-4 font-medium">Alerts</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-muted-foreground">Receive email updates about your account</p>
                      </div>
                      <Switch 
                        checked={notifications.email}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Leak Alerts</p>
                        <Badge variant="outline" className="text-circe">Circe</Badge>
                      </div>
                      <Switch 
                        checked={notifications.leakAlerts}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, leakAlerts: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Reputation Alerts</p>
                        <Badge variant="outline" className="text-venus">Venus</Badge>
                      </div>
                      <Switch 
                        checked={notifications.reputationAlerts}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, reputationAlerts: checked })}
                      />
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="mb-2 font-medium">Platform activity (OnlyFans & Fansly)</h4>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Choose which in-app notifications you get when something happens on your connected platforms—like using OnlyFans or Fansly directly.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Every new message</p>
                        <p className="text-sm text-muted-foreground">Notify me for each new DM received</p>
                      </div>
                      <Switch
                        checked={platformNotifPrefs.notify_new_message}
                        onCheckedChange={async (checked) => {
                          setPlatformNotifPrefs((p) => ({ ...p, notify_new_message: checked }))
                          await fetch('/api/user/notification-preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notify_new_message: checked }) })
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Every new subscriber</p>
                        <p className="text-sm text-muted-foreground">Notify me when someone subscribes</p>
                      </div>
                      <Switch
                        checked={platformNotifPrefs.notify_new_subscriber}
                        onCheckedChange={async (checked) => {
                          setPlatformNotifPrefs((p) => ({ ...p, notify_new_subscriber: checked }))
                          await fetch('/api/user/notification-preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notify_new_subscriber: checked }) })
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">New tips</p>
                        <p className="text-sm text-muted-foreground">Notify me for tips (e.g. $50+)</p>
                      </div>
                      <Switch
                        checked={platformNotifPrefs.notify_new_tip}
                        onCheckedChange={async (checked) => {
                          setPlatformNotifPrefs((p) => ({ ...p, notify_new_tip: checked }))
                          await fetch('/api/user/notification-preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notify_new_tip: checked }) })
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Subscription expired</p>
                        <p className="text-sm text-muted-foreground">Notify me when a fan’s subscription lapses</p>
                      </div>
                      <Switch
                        checked={platformNotifPrefs.notify_subscription_expired}
                        onCheckedChange={async (checked) => {
                          setPlatformNotifPrefs((p) => ({ ...p, notify_subscription_expired: checked }))
                          await fetch('/api/user/notification-preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notify_subscription_expired: checked }) })
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Subscription renewed</p>
                        <p className="text-sm text-muted-foreground">Notify me when a fan renews</p>
                      </div>
                      <Switch
                        checked={platformNotifPrefs.notify_subscription_renewed}
                        onCheckedChange={async (checked) => {
                          setPlatformNotifPrefs((p) => ({ ...p, notify_subscription_renewed: checked }))
                          await fetch('/api/user/notification-preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notify_subscription_renewed: checked }) })
                        }}
                      />
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="mb-4 font-medium">Reports & Updates</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Daily Digest</p>
                        <p className="text-sm text-muted-foreground">Daily summary of your activity</p>
                      </div>
                      <Switch 
                        checked={notifications.dailyDigest}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, dailyDigest: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Weekly Report</p>
                        <p className="text-sm text-muted-foreground">Weekly analytics and insights</p>
                      </div>
                      <Switch 
                        checked={notifications.weeklyReport}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyReport: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">New Features</p>
                        <p className="text-sm text-muted-foreground">Get notified about new platform features</p>
                      </div>
                      <Switch 
                        checked={notifications.newFeatures}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, newFeatures: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Marketing Emails</p>
                        <p className="text-sm text-muted-foreground">Promotions and special offers</p>
                      </div>
                      <Switch 
                        checked={notifications.marketingEmails}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, marketingEmails: checked })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Section */}
          {activeTab === 'security' && (
            <>
              <SecuritySettings />

              <Card className="border-border bg-card">
                <CardHeader>
<CardTitle className="flex items-center gap-2 font-semibold">
                <Globe className="h-5 w-5" />
                Active Sessions
              </CardTitle>
                  <CardDescription>
                    Devices where you are currently logged in
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Globe className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Current Session</p>
                        <p className="text-sm text-muted-foreground">Chrome on MacOS - Los Angeles, CA</p>
                      </div>
                    </div>
                    <Badge>Active</Badge>
                  </div>
                  <Button variant="outline" className="w-full">Sign Out All Other Sessions</Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Billing Section */}
          {activeTab === 'billing' && (
            <BillingSection userId={user?.id} userEmail={user?.email} />
          )}

          {/* Integrations Section */}
          {activeTab === 'integrations' && (
            <>
              <PlatformConnector />

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="font-semibold">Social Media</CardTitle>
                  <CardDescription>
                    Connect social accounts for reputation monitoring
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {socialIntegrations.map((social) => (
                    <div key={social.key} className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${social.color} text-white`}>
                          <social.icon />
                        </div>
                        <div>
                          <p className="font-medium">{social.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {social.connected ? 'Connected' : 'Not connected'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant={social.connected ? 'outline' : 'default'} 
                        size="sm"
                        onClick={() => {
                          if (social.connected) {
                            // Disconnect
                            fetch(`/api/${social.key}/disconnect`, { method: 'POST' })
                              .then(() => {
                                setIntegrations(prev => ({ ...prev, [social.key]: false }))
                              })
                          } else {
                            // Redirect to OAuth
                            window.location.href = `/api/${social.key}/auth`
                          }
                        }}
                      >
                        {social.connected ? 'Disconnect' : 'Connect'}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {/* Data & Privacy Section */}
          {activeTab === 'data' && (
            <>
              <Card className="border-border bg-card">
                <CardHeader>
<CardTitle className="flex items-center gap-2 font-semibold">
                <Database className="h-5 w-5" />
                Your Data
              </CardTitle>
                  <CardDescription>
                    Manage and export your data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Download className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Export All Data</p>
                        <p className="text-sm text-muted-foreground">Download a copy of your data</p>
                      </div>
                    </div>
                    <Button variant="outline">Request Export</Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Sync Data</p>
                        <p className="text-sm text-muted-foreground">Last synced: 2 hours ago</p>
                      </div>
                    </div>
                    <Button variant="outline">Sync Now</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="font-semibold">Privacy Settings</CardTitle>
                  <CardDescription>Control how your data is used</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Analytics & Improvements</p>
                      <p className="text-sm text-muted-foreground">Help us improve with anonymous usage data</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Personalized AI</p>
                      <p className="text-sm text-muted-foreground">Allow AI to learn from your preferences</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/50 bg-card">
                <CardHeader>
<CardTitle className="flex items-center gap-2 font-semibold text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete All Data</p>
                      <p className="text-sm text-muted-foreground">Remove all your data (keeps account)</p>
                    </div>
                    <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                      Delete Data
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete Account</p>
                      <p className="text-sm text-muted-foreground">Permanently delete account and data</p>
                    </div>
                    <Button variant="destructive" onClick={handleDeleteAccount}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Preferences Section */}
          {activeTab === 'preferences' && (
            <Card className="border-border bg-card">
              <CardHeader>
<CardTitle className="flex items-center gap-2 font-semibold">
                <Settings2 className="h-5 w-5" />
                Preferences
              </CardTitle>
                <CardDescription>
                  Customize your experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={preferences.language} onValueChange={(v) => setPreferences({...preferences, language: v})}>
                      <SelectTrigger className="bg-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="pt">Português</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Select value={preferences.dateFormat} onValueChange={(v) => setPreferences({...preferences, dateFormat: v})}>
                      <SelectTrigger className="bg-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={preferences.currency} onValueChange={(v) => setPreferences({...preferences, currency: v})}>
                      <SelectTrigger className="bg-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CAD">CAD ($)</SelectItem>
                        <SelectItem value="AUD">AUD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-Save Drafts</p>
                      <p className="text-sm text-muted-foreground">Automatically save content as you type</p>
                    </div>
                    <Switch 
                      checked={preferences.autoSave}
                      onCheckedChange={(checked) => setPreferences({...preferences, autoSave: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Sound Effects</p>
                      <p className="text-sm text-muted-foreground">Play sounds for notifications</p>
                    </div>
                    <Switch 
                      checked={preferences.soundEffects}
                      onCheckedChange={(checked) => setPreferences({...preferences, soundEffects: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Cosmic Guidance</p>
                      <Badge variant="outline" className="text-primary">AI</Badge>
                    </div>
                    <Switch 
                      checked={preferences.cosmicGuidance}
                      onCheckedChange={(checked) => setPreferences({...preferences, cosmicGuidance: checked})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
