'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Calendar, 
  Lock, 
  Shield, 
  Eye, 
  EyeOff, 
  Star, 
  Sparkles,
  AlertTriangle,
  Check,
  Info,
  Trash2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { 
  encryptBirthday, 
  decryptBirthday, 
  hashPassphrase, 
  verifyPassphrase,
  getZodiacSign,
  getZodiacElement,
  getZodiacModality
} from '@/lib/crypto'

interface BirthdaySettingsProps {
  userId: string
  hasBirthdaySet: boolean
}

export function BirthdaySettings({ userId, hasBirthdaySet: initialHasBirthday }: BirthdaySettingsProps) {
  const [hasBirthdaySet, setHasBirthdaySet] = useState(initialHasBirthday)
  const [showSetupDialog, setShowSetupDialog] = useState(false)
  const [showUnlockDialog, setShowUnlockDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // Setup form state
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [showPassphrase, setShowPassphrase] = useState(false)
  
  // Unlock form state
  const [unlockPassphrase, setUnlockPassphrase] = useState('')
  const [showUnlockPassphrase, setShowUnlockPassphrase] = useState(false)
  
  // Decrypted data state
  const [decryptedBirthday, setDecryptedBirthday] = useState<{ date: string; time?: string } | null>(null)
  const [zodiacInfo, setZodiacInfo] = useState<{ sign: string; element: string; modality: string } | null>(null)
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()

  // Calculate zodiac when birthday is entered
  useEffect(() => {
    if (birthDate) {
      const date = new Date(birthDate)
      const sign = getZodiacSign(date)
      const element = getZodiacElement(sign)
      const modality = getZodiacModality(sign)
      setZodiacInfo({ sign, element, modality })
    } else {
      setZodiacInfo(null)
    }
  }, [birthDate])

  // Calculate zodiac for decrypted birthday
  useEffect(() => {
    if (decryptedBirthday?.date) {
      const date = new Date(decryptedBirthday.date)
      const sign = getZodiacSign(date)
      const element = getZodiacElement(sign)
      const modality = getZodiacModality(sign)
      setZodiacInfo({ sign, element, modality })
    }
  }, [decryptedBirthday])

  const handleSetupBirthday = async () => {
    setError('')
    setSuccess('')
    
    if (!birthDate) {
      setError('Please enter your birth date')
      return
    }
    
    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters')
      return
    }
    
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match')
      return
    }

    setIsLoading(true)
    
    try {
      // Encrypt the birthday data client-side
      const birthdayData = { date: birthDate, time: birthTime || undefined }
      const encryptedData = await encryptBirthday(birthdayData, passphrase, userId)
      const passphraseHash = await hashPassphrase(passphrase, userId)
      
      // Store encrypted data in database
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          encrypted_birthday: encryptedData,
          birthday_passphrase_hash: passphraseHash,
          has_birthday_set: true
        })
        .eq('id', userId)
      
      if (dbError) throw dbError
      
      setHasBirthdaySet(true)
      setDecryptedBirthday(birthdayData)
      setShowSetupDialog(false)
      setSuccess('Your cosmic birthday has been securely encrypted and saved!')
      
      // Clear sensitive form data
      setPassphrase('')
      setConfirmPassphrase('')
    } catch (err) {
      setError('Failed to save birthday. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlockBirthday = async () => {
    setError('')
    setIsLoading(true)
    
    try {
      // Get encrypted data from database
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('encrypted_birthday, birthday_passphrase_hash')
        .eq('id', userId)
        .single()
      
      if (fetchError || !profile?.encrypted_birthday) {
        throw new Error('Could not retrieve encrypted birthday data')
      }
      
      // Verify passphrase
      const isValid = await verifyPassphrase(
        unlockPassphrase, 
        profile.birthday_passphrase_hash, 
        userId
      )
      
      if (!isValid) {
        setError('Incorrect passphrase. Please try again.')
        setIsLoading(false)
        return
      }
      
      // Decrypt the birthday
      const decrypted = await decryptBirthday(
        profile.encrypted_birthday, 
        unlockPassphrase, 
        userId
      )
      
      setDecryptedBirthday(decrypted)
      setShowUnlockDialog(false)
      setUnlockPassphrase('')
    } catch (err) {
      setError('Failed to decrypt birthday. Please check your passphrase.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteBirthday = async () => {
    setIsLoading(true)
    
    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          encrypted_birthday: null,
          birthday_passphrase_hash: null,
          has_birthday_set: false
        })
        .eq('id', userId)
      
      if (dbError) throw dbError
      
      setHasBirthdaySet(false)
      setDecryptedBirthday(null)
      setZodiacInfo(null)
      setShowDeleteDialog(false)
      setSuccess('Your birthday data has been permanently deleted.')
    } catch (err) {
      setError('Failed to delete birthday data.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const lockBirthday = () => {
    setDecryptedBirthday(null)
    setZodiacInfo(null)
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            <CardTitle>Cosmic Birthday</CardTitle>
          </div>
          <Badge variant="outline" className="gap-1 border-primary/50 text-primary">
            <Shield className="h-3 w-3" />
            End-to-End Encrypted
          </Badge>
        </div>
        <CardDescription>
          Your birthday powers personalized astrological insights and cosmic timing recommendations.
          This data is encrypted with your personal passphrase - even we cannot access it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Security Notice */}
        <Alert className="border-primary/30 bg-primary/5">
          <Lock className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">Zero-Knowledge Encryption</AlertTitle>
          <AlertDescription className="text-sm">
            Your birthday is encrypted locally on your device before being stored. 
            Only you can decrypt it with your personal passphrase. We never see or store 
            your actual birthday - just the encrypted data that only you can unlock.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500/30 bg-green-500/10">
            <Check className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-500">{success}</AlertDescription>
          </Alert>
        )}

        {!hasBirthdaySet ? (
          /* No birthday set yet */
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-medium">No Cosmic Birthday Set</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add your birthday to unlock personalized zodiac insights, optimal posting times, 
              and cosmic energy readings tailored to your astrological profile.
            </p>
            <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
              <DialogTrigger asChild>
                <Button className="mt-4 gap-2">
                  <Sparkles className="h-4 w-4" />
                  Set Your Cosmic Birthday
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    Set Your Cosmic Birthday
                  </DialogTitle>
                  <DialogDescription>
                    Your birthday will be encrypted with a passphrase only you know. 
                    This passphrase cannot be recovered - please remember it!
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Birth Date</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="birthTime">Birth Time (Optional)</Label>
                    <Input
                      id="birthTime"
                      type="time"
                      value={birthTime}
                      onChange={(e) => setBirthTime(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Adding your birth time enables more precise astrological readings
                    </p>
                  </div>

                  {zodiacInfo && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Sparkles className="h-4 w-4" />
                        Your Zodiac: {zodiacInfo.sign}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {zodiacInfo.element} Element | {zodiacInfo.modality} Modality
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="passphrase">Encryption Passphrase</Label>
                    <div className="relative">
                      <Input
                        id="passphrase"
                        type={showPassphrase ? 'text' : 'password'}
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        placeholder="Create a strong passphrase"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassphrase(!showPassphrase)}
                      >
                        {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Minimum 8 characters. This passphrase encrypts your birthday locally.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassphrase">Confirm Passphrase</Label>
                    <Input
                      id="confirmPassphrase"
                      type={showPassphrase ? 'text' : 'password'}
                      value={confirmPassphrase}
                      onChange={(e) => setConfirmPassphrase(e.target.value)}
                      placeholder="Confirm your passphrase"
                    />
                  </div>

                  <Alert className="border-amber-500/30 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-xs text-amber-500">
                      If you forget your passphrase, your birthday data cannot be recovered. 
                      We do not have access to decrypt it.
                    </AlertDescription>
                  </Alert>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSetupBirthday} disabled={isLoading}>
                    {isLoading ? 'Encrypting...' : 'Encrypt & Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : decryptedBirthday ? (
          /* Birthday is unlocked */
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Birthday</p>
                    <p className="font-medium">
                      {new Date(decryptedBirthday.date).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                      {decryptedBirthday.time && ` at ${decryptedBirthday.time}`}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={lockBirthday} className="gap-2">
                  <Lock className="h-4 w-4" />
                  Lock
                </Button>
              </div>

              {zodiacInfo && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md bg-background/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Zodiac Sign</p>
                    <p className="font-medium text-primary">{zodiacInfo.sign}</p>
                  </div>
                  <div className="rounded-md bg-background/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Element</p>
                    <p className="font-medium">{zodiacInfo.element}</p>
                  </div>
                  <div className="rounded-md bg-background/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Modality</p>
                    <p className="font-medium">{zodiacInfo.modality}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                    Delete Birthday
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Birthday Data?</DialogTitle>
                    <DialogDescription>
                      This will permanently delete your encrypted birthday data. 
                      This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteBirthday} disabled={isLoading}>
                      {isLoading ? 'Deleting...' : 'Delete Forever'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ) : (
          /* Birthday is set but locked */
          <div className="rounded-lg border border-border p-6 text-center">
            <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-medium">Birthday Data Locked</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your cosmic birthday is securely encrypted. Enter your passphrase to unlock 
              personalized astrological insights.
            </p>
            <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
              <DialogTrigger asChild>
                <Button className="mt-4 gap-2" variant="outline">
                  <Sparkles className="h-4 w-4" />
                  Unlock Birthday
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    Unlock Your Birthday
                  </DialogTitle>
                  <DialogDescription>
                    Enter your passphrase to decrypt and view your birthday data.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="unlockPassphrase">Passphrase</Label>
                    <div className="relative">
                      <Input
                        id="unlockPassphrase"
                        type={showUnlockPassphrase ? 'text' : 'password'}
                        value={unlockPassphrase}
                        onChange={(e) => setUnlockPassphrase(e.target.value)}
                        placeholder="Enter your passphrase"
                        className="pr-10"
                        onKeyDown={(e) => e.key === 'Enter' && handleUnlockBirthday()}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowUnlockPassphrase(!showUnlockPassphrase)}
                      >
                        {showUnlockPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowUnlockDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUnlockBirthday} disabled={isLoading || !unlockPassphrase}>
                    {isLoading ? 'Decrypting...' : 'Unlock'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2 text-xs text-muted-foreground hover:text-destructive">
                  Forgot passphrase? Delete and start over
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Birthday Data?</DialogTitle>
                  <DialogDescription>
                    Since we cannot recover your passphrase, the only option is to delete 
                    your encrypted birthday data and set it up again with a new passphrase.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteBirthday} disabled={isLoading}>
                    {isLoading ? 'Deleting...' : 'Delete & Start Over'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Info about what birthday enables */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4 text-muted-foreground" />
            What your birthday unlocks
          </h4>
          <ul className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <Check className="h-3 w-3 text-primary" />
              Personalized zodiac energy readings
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-3 w-3 text-primary" />
              Optimal content posting times
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-3 w-3 text-primary" />
              Birthday-aware AI recommendations
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-3 w-3 text-primary" />
              Cosmic alignment notifications
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
