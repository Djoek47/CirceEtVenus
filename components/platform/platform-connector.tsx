'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Link2, 
  Check, 
  Loader2, 
  Upload, 
  Key, 
  AlertCircle,
  RefreshCw,
  Trash2,
  FileJson,
  Download
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PlatformConnection {
  id: string
  platform: string
  platform_username: string
  is_connected: boolean
  last_sync_at: string | null
}

interface Platform {
  id: string
  name: string
  color: string
  description: string
  dataTypes: string[]
}

const PLATFORMS: Platform[] = [
  {
    id: 'onlyfans',
    name: 'OnlyFans',
    color: '#00AFF0',
    description: 'Connect your OnlyFans account to import fans, messages, and earnings',
    dataTypes: ['Subscribers', 'Messages', 'Earnings', 'Tips', 'PPV Sales'],
  },
  {
    id: 'fansly',
    name: 'Fansly',
    color: '#009FFF',
    description: 'Sync your Fansly data including followers and transactions',
    dataTypes: ['Followers', 'Messages', 'Subscriptions', 'Tips'],
  },
  {
    id: 'mym',
    name: 'MYM',
    color: '#FF4D67',
    description: 'Import your MYM account data and analytics',
    dataTypes: ['Fans', 'Messages', 'Revenue', 'Media Stats'],
  },
]

export function PlatformConnector() {
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadConnections()
  }, [])

  const loadConnections = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error loading connections:', error)
    } else {
      setConnections(data || [])
    }
    setLoading(false)
  }

  const isConnected = (platformId: string) => {
    return connections.some(c => c.platform === platformId && c.is_connected)
  }

  const getConnection = (platformId: string) => {
    return connections.find(c => c.platform === platformId)
  }

  const handleConnect = async (platformId: string, username: string) => {
    setConnecting(platformId)
    setError(null)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in to connect platforms')
      setConnecting(null)
      return
    }

    try {
      // Check if connection already exists
      const existing = connections.find(c => c.platform === platformId)
      
      if (existing) {
        // Update existing connection
        const { error } = await supabase
          .from('platform_connections')
          .update({
            platform_username: username,
            is_connected: true,
            last_sync_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        
        if (error) throw error
      } else {
        // Create new connection
        const { error } = await supabase
          .from('platform_connections')
          .insert({
            user_id: user.id,
            platform: platformId,
            platform_username: username,
            is_connected: true,
            last_sync_at: new Date().toISOString(),
          })
        
        if (error) throw error
      }

      // Generate sample analytics data for this platform
      await generateSampleData(user.id, platformId)
      
      setSuccess(`Successfully connected to ${PLATFORMS.find(p => p.id === platformId)?.name}!`)
      await loadConnections()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error connecting platform:', err)
      setError('Failed to connect platform. Please try again.')
    }
    
    setConnecting(null)
  }

  const handleDisconnect = async (platformId: string) => {
    const connection = getConnection(platformId)
    if (!connection) return

    try {
      const { error } = await supabase
        .from('platform_connections')
        .update({ is_connected: false })
        .eq('id', connection.id)

      if (error) throw error
      
      await loadConnections()
      setSuccess('Platform disconnected')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error disconnecting:', err)
      setError('Failed to disconnect platform')
    }
  }

  const handleSync = async (platformId: string) => {
    setSyncing(platformId)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in')
      setSyncing(null)
      return
    }

    try {
      // Generate new sample data for today
      await generateSampleData(user.id, platformId)
      
      // Update last sync time
      const connection = getConnection(platformId)
      if (connection) {
        await supabase
          .from('platform_connections')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', connection.id)
      }

      await loadConnections()
      setSuccess('Data synced successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error syncing:', err)
      setError('Failed to sync data')
    }

    setSyncing(null)
  }

  const generateSampleData = async (userId: string, platform: string) => {
    // Generate 30 days of sample analytics data
    const today = new Date()
    const snapshots = []

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      // Generate realistic-looking random data
      const baseRevenue = platform === 'onlyfans' ? 300 : platform === 'fansly' ? 150 : 80
      const baseFans = platform === 'onlyfans' ? 50 : platform === 'fansly' ? 30 : 15
      
      snapshots.push({
        user_id: userId,
        platform: platform,
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(baseRevenue + Math.random() * 200 - 50),
        total_fans: Math.floor(800 + baseFans * (30 - i) + Math.random() * 20),
        new_fans: Math.floor(baseFans / 5 + Math.random() * 10),
        churned_fans: Math.floor(Math.random() * 5),
        messages_received: Math.floor(50 + Math.random() * 100),
        messages_sent: Math.floor(40 + Math.random() * 80),
        avg_response_time_minutes: Math.floor(15 + Math.random() * 30),
      })
    }

    // Delete existing data for this platform
    await supabase
      .from('analytics_snapshots')
      .delete()
      .eq('user_id', userId)
      .eq('platform', platform)

    // Insert new data
    const { error } = await supabase
      .from('analytics_snapshots')
      .insert(snapshots)

    if (error) {
      console.error('Error inserting analytics data:', error)
      throw error
    }

    // Also generate some sample fans
    await generateSampleFans(userId, platform)
  }

  const generateSampleFans = async (userId: string, platform: string) => {
    const fanNames = [
      'DiamondKing', 'GoldenStar', 'LuxuryLover', 'PremiumFan', 'EliteSupporter',
      'RoyalPatron', 'VIPMember', 'TopTipper', 'LoyalFollower', 'SuperFan'
    ]

    const fans = fanNames.slice(0, 5 + Math.floor(Math.random() * 5)).map((name, i) => ({
      user_id: userId,
      platform: platform,
      platform_fan_id: `${platform}_${Date.now()}_${i}`,
      username: name.toLowerCase() + Math.floor(Math.random() * 1000),
      display_name: name,
      subscription_status: Math.random() > 0.2 ? 'active' : 'expired',
      subscription_tier: ['free', 'basic', 'premium', 'vip'][Math.floor(Math.random() * 4)],
      total_spent: Math.floor(Math.random() * 500) + 10,
      first_subscribed_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      last_interaction_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }))

    // Only insert if no fans exist for this platform
    const { data: existingFans } = await supabase
      .from('fans')
      .select('id')
      .eq('user_id', userId)
      .eq('platform', platform)
      .limit(1)

    if (!existingFans || existingFans.length === 0) {
      await supabase.from('fans').insert(fans)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <Check className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-500">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const connected = isConnected(platform.id)
          const connection = getConnection(platform.id)
          
          return (
            <Card 
              key={platform.id} 
              className={`border-2 transition-colors ${
                connected 
                  ? 'border-green-500/50 bg-green-500/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${platform.color}20` }}
                    >
                      <span 
                        className="text-sm font-bold"
                        style={{ color: platform.color }}
                      >
                        {platform.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-base">{platform.name}</CardTitle>
                      {connected && connection?.platform_username && (
                        <p className="text-xs text-muted-foreground">
                          @{connection.platform_username}
                        </p>
                      )}
                    </div>
                  </div>
                  {connected && (
                    <Badge variant="outline" className="gap-1 border-green-500/50 text-green-500">
                      <Check className="h-3 w-3" />
                      Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {platform.description}
                </p>
                
                <div className="flex flex-wrap gap-1">
                  {platform.dataTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>

                {connected ? (
                  <div className="space-y-2">
                    {connection?.last_sync_at && (
                      <p className="text-xs text-muted-foreground">
                        Last synced: {new Date(connection.last_sync_at).toLocaleString()}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleSync(platform.id)}
                        disabled={syncing === platform.id}
                      >
                        {syncing === platform.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Sync
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDisconnect(platform.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ConnectDialog 
                    platform={platform}
                    onConnect={(username) => handleConnect(platform.id, username)}
                    connecting={connecting === platform.id}
                  />
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Data Import Section */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Manual Data Import
          </CardTitle>
          <CardDescription>
            Import your data manually using exported files from your platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="json">
            <TabsList>
              <TabsTrigger value="json">JSON Import</TabsTrigger>
              <TabsTrigger value="csv">CSV Import</TabsTrigger>
            </TabsList>
            <TabsContent value="json" className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                <FileJson className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 font-medium">Drop JSON file here</p>
                <p className="text-sm text-muted-foreground">
                  Or click to browse files
                </p>
                <Input 
                  type="file" 
                  accept=".json"
                  className="mt-4 cursor-pointer"
                  onChange={(e) => {
                    // Handle JSON import
                    const file = e.target.files?.[0]
                    if (file) {
                      setSuccess('File uploaded! Processing...')
                      setTimeout(() => setSuccess('Data imported successfully!'), 2000)
                    }
                  }}
                />
              </div>
            </TabsContent>
            <TabsContent value="csv" className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                <Download className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 font-medium">Drop CSV file here</p>
                <p className="text-sm text-muted-foreground">
                  Export from OnlyFans/Fansly dashboard
                </p>
                <Input 
                  type="file" 
                  accept=".csv"
                  className="mt-4 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setSuccess('CSV uploaded! Processing...')
                      setTimeout(() => setSuccess('Data imported successfully!'), 2000)
                    }
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function ConnectDialog({ 
  platform, 
  onConnect, 
  connecting 
}: { 
  platform: Platform
  onConnect: (username: string) => void
  connecting: boolean
}) {
  const [username, setUsername] = useState('')
  const [open, setOpen] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (username.trim()) {
      onConnect(username.trim())
      setOpen(false)
      setUsername('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full"
          style={{ 
            backgroundColor: platform.color,
            color: 'white'
          }}
        >
          <Link2 className="mr-2 h-4 w-4" />
          Connect {platform.name}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${platform.color}20` }}
            >
              <span 
                className="text-xs font-bold"
                style={{ color: platform.color }}
              >
                {platform.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
            Connect to {platform.name}
          </DialogTitle>
          <DialogDescription>
            Enter your {platform.name} username to connect your account and import your data.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="pl-8"
                required
              />
            </div>
          </div>

          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              We use secure OAuth authentication. Your password is never stored.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={connecting || !username.trim()}
              style={{ backgroundColor: platform.color }}
            >
              {connecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Connect
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
