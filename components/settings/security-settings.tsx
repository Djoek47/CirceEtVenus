'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Shield, Key, Smartphone, Loader2, Trash2, Copy, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ApiKeyRow {
  id: string
  key_prefix: string
  name: string | null
  created_at: string
}

export function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [keysLoading, setKeysLoading] = useState(true)
  const [createName, setCreateName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  const loadKeys = useCallback(async () => {
    setKeysLoading(true)
    const res = await fetch('/api/user/api-keys')
    const data = await res.json().catch(() => ({}))
    if (res.ok && Array.isArray(data.keys)) setKeys(data.keys)
    setKeysLoading(false)
  }, [])

  useEffect(() => {
    loadKeys()
  }, [loadKeys])

  async function handlePasswordUpdate() {
    if (!currentPassword.trim() || !newPassword.trim()) {
      setPasswordMessage({ type: 'error', text: 'Enter current and new password.' })
      return
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters.' })
      return
    }
    setPasswordLoading(true)
    setPasswordMessage(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      setPasswordMessage({ type: 'error', text: 'No email on account.' })
      setPasswordLoading(false)
      return
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (signInError) {
      setPasswordMessage({ type: 'error', text: signInError.message || 'Current password is wrong.' })
      setPasswordLoading(false)
      return
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) {
      setPasswordMessage({ type: 'error', text: updateError.message || 'Failed to update password.' })
      setPasswordLoading(false)
      return
    }
    setPasswordMessage({ type: 'success', text: 'Password updated.' })
    setCurrentPassword('')
    setNewPassword('')
    setPasswordLoading(false)
  }

  async function handleCreateKey() {
    setCreateLoading(true)
    setNewKey(null)
    const res = await fetch('/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: createName.trim() || null }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.key) {
      setNewKey(data.key)
      setCreateName('')
      loadKeys()
    } else {
      setPasswordMessage({ type: 'error', text: data.error || 'Failed to create key.' })
    }
    setCreateLoading(false)
  }

  async function handleRevoke(id: string) {
    const res = await fetch(`/api/user/api-keys/${id}`, { method: 'DELETE' })
    if (res.ok) loadKeys()
  }

  function copyKey() {
    if (newKey) {
      navigator.clipboard.writeText(newKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-semibold">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>Manage your account security and authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Change Password</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                type="password"
                placeholder="Current password"
                className="bg-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="New password"
                className="bg-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            {passwordMessage && (
              <p className={passwordMessage.type === 'success' ? 'text-sm text-green-600' : 'text-sm text-destructive'}>
                {passwordMessage.text}
              </p>
            )}
            <Button variant="outline" className="mt-2" onClick={handlePasswordUpdate} disabled={passwordLoading}>
              {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Update Password
            </Button>
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
            <Button variant="outline" disabled>Coming soon</Button>
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">API Keys</p>
                <p className="text-sm text-muted-foreground">For third-party integrations</p>
              </div>
            </div>
            {newKey && (
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
                <p className="mb-2 font-medium">Copy your new key now. It won&apos;t be shown again.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{newKey}</code>
                  <Button variant="outline" size="sm" onClick={copyKey}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Key name (optional)"
                className="bg-input max-w-[200px]"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
              <Button variant="outline" onClick={handleCreateKey} disabled={createLoading}>
                {createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create key'}
              </Button>
            </div>
            {keysLoading ? (
              <p className="text-sm text-muted-foreground">Loading keys…</p>
            ) : keys.length === 0 ? (
              <p className="text-sm text-muted-foreground">No API keys yet.</p>
            ) : (
              <ul className="space-y-2">
                {keys.map((k) => (
                  <li key={k.id} className="flex items-center justify-between rounded border border-border p-2">
                    <span className="font-mono text-sm text-muted-foreground">{k.key_prefix}</span>
                    <span className="text-sm">{k.name || 'Unnamed'}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleRevoke(k.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
