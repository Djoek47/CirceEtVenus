'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import { BirthdaySettings } from '@/components/settings/birthday-settings'
import type { User as SupabaseUser } from '@supabase/supabase-js'

type SettingsTab = 'profile' | 'notifications' | 'security' | 'billing' | 'integrations' | 'data' | 'preferences'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string; timezone: string; has_birthday_set?: boolean } | null>(null)
  const [hasBirthdaySet, setHasBirthdaySet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fullName, setFullName] = useState('')
  const [timezone, setTimezone] = useState('America/Los_Angeles')
  const [showApiKey, setShowApiKey] = useState(false)
  const [notifications, setNotifications] = useState({
    email: true,
    leakAlerts: true,
    reputationAlerts: true,
    dailyDigest: false,
    weeklyReport: true,
    newFeatures: true,
    marketingEmails: false,
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
  const { theme, setTheme } = useTheme()

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
        setTimezone(profile.timezone || 'America/Los_Angeles')
        setHasBirthdaySet(profile.has_birthday_set || false)
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
    { key: 'twitter', name: 'Twitter/X', color: 'bg-slate-800', connected: integrations.twitter },
    { key: 'instagram', name: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500', connected: integrations.instagram },
    { key: 'tiktok', name: 'TikTok', color: 'bg-black', connected: integrations.tiktok },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account, preferences, and integrations
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar Navigation */}
        <Card className="h-fit border-border bg-card lg:col-span-1">
          <CardContent className="p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
            <Separator className="my-4" />
            <div className="space-y-1 text-sm">
              <Link href="/terms" className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3 w-3" />
                Terms of Service
              </Link>
              <Link href="/privacy" className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3 w-3" />
                Privacy Policy
              </Link>
              <Link href="/contact" className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3 w-3" />
                Contact Support
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="space-y-6 lg:col-span-3">
          {/* Profile Section */}
          {activeTab === 'profile' && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
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
          )}

          {/* Notifications Section */}
          {activeTab === 'notifications' && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
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
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>
                    Manage your account security and authentication
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Change Password</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input type="password" placeholder="Current password" className="bg-input" />
                      <Input type="password" placeholder="New password" className="bg-input" />
                    </div>
                    <Button variant="outline" className="mt-2">Update Password</Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                      </div>
                    </div>
                    <Button variant="outline">Enable 2FA</Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Key className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">API Key</p>
                        <p className="text-sm text-muted-foreground">For third-party integrations</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 text-xs">
                        {showApiKey ? 'cev_live_sk_xxxxxxxxxxx' : '••••••••••••••••'}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
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
            <>
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Current Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge className="mb-2 bg-primary/20 text-primary">FREE TRIAL</Badge>
                        <h3 className="text-xl font-semibold">Divine Trial</h3>
                        <p className="mt-1 text-sm text-muted-foreground">14-day free trial - 10 days remaining</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold">$0</p>
                        <p className="text-sm text-muted-foreground">/month</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <Button className="flex-1">Upgrade to Pro - $49/mo</Button>
                      <Button variant="outline">View All Plans</Button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-border p-4 text-center">
                      <Zap className="mx-auto h-6 w-6 text-primary" />
                      <p className="mt-2 font-medium">AI Credits</p>
                      <p className="text-2xl font-bold">47/100</p>
                      <p className="text-sm text-muted-foreground">this month</p>
                    </div>
                    <div className="rounded-lg border border-border p-4 text-center">
                      <Database className="mx-auto h-6 w-6 text-primary" />
                      <p className="mt-2 font-medium">Storage</p>
                      <p className="text-2xl font-bold">1.2/5</p>
                      <p className="text-sm text-muted-foreground">GB used</p>
                    </div>
                    <div className="rounded-lg border border-border p-4 text-center">
                      <Mail className="mx-auto h-6 w-6 text-primary" />
                      <p className="mt-2 font-medium">Messages</p>
                      <p className="text-2xl font-bold">234</p>
                      <p className="text-sm text-muted-foreground">this month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                  <CardDescription>Manage your payment methods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <CreditCard className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 font-medium">No payment method</p>
                    <p className="text-sm text-muted-foreground">Add a card to continue after your trial</p>
                    <Button className="mt-4">Add Payment Method</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription>View your past invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground py-8">No invoices yet</p>
                </CardContent>
              </Card>
            </>
          )}

          {/* Integrations Section */}
          {activeTab === 'integrations' && (
            <>
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Platform Integrations
                  </CardTitle>
                  <CardDescription>
                    Connect your creator platforms for unified management
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {platformIntegrations.map((platform) => (
                    <div key={platform.key} className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${platform.color}`}>
                          <span className="text-sm font-bold text-white">{platform.name[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium">{platform.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {platform.connected ? 'Connected' : 'Not connected'}
                          </p>
                        </div>
                      </div>
                      <Button variant={platform.connected ? 'outline' : 'default'}>
                        {platform.connected ? 'Disconnect' : 'Connect'}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Social Media</CardTitle>
                  <CardDescription>
                    Connect social accounts for reputation monitoring
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {socialIntegrations.map((social) => (
                    <div key={social.key} className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${social.color}`}>
                          <span className="text-sm font-bold text-white">{social.name[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium">{social.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {social.connected ? 'Connected' : 'Not connected'}
                          </p>
                        </div>
                      </div>
                      <Button variant={social.connected ? 'outline' : 'default'} size="sm">
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
                  <CardTitle className="flex items-center gap-2">
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
                  <CardTitle>Privacy Settings</CardTitle>
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
                  <CardTitle className="flex items-center gap-2 text-destructive">
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
                <CardTitle className="flex items-center gap-2">
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
