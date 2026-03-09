'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Trash2,
  Moon,
  Sun,
  Clock
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { 
  encryptData, 
  decryptData, 
  hashPassphrase,
  calculateZodiacSign,
  calculateLifePathNumber,
  calculatePersonalYear,
  calculateChineseZodiac,
  determineDayOrNight,
  getDayNightDescription,
  getBirthstone,
  getBirthFlower,
  getDayOfWeekMeaning,
  getSeasonBorn,
  getMoonPhaseAtBirth,
  generateBirthChartReading,
  isCryptoSupported,
  type BirthChartReading
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
  const [includeTime, setIncludeTime] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [showPassphrase, setShowPassphrase] = useState(false)
  
  // Unlock form state
  const [unlockPassphrase, setUnlockPassphrase] = useState('')
  const [showUnlockPassphrase, setShowUnlockPassphrase] = useState(false)
  
  // Decrypted data state
  const [decryptedBirthday, setDecryptedBirthday] = useState<{ date: string; time?: string } | null>(null)
  const [birthChart, setBirthChart] = useState<BirthChartReading | null>(null)
  const [isUnlocked, setIsUnlocked] = useState(false)
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  const supabase = createClient()

  // Calculate birth chart when birthday is entered in setup
  const previewBirthChart = birthDate ? generateBirthChartReading(
    new Date(birthDate), 
    includeTime && birthTime ? birthTime : undefined
  ) : null

  // Calculate birth chart when unlocked
  useEffect(() => {
    if (decryptedBirthday?.date) {
      const chart = generateBirthChartReading(
        new Date(decryptedBirthday.date),
        decryptedBirthday.time
      )
      setBirthChart(chart)
    }
  }, [decryptedBirthday])

  const handleSetupBirthday = async () => {
    setError('')
    setSuccess('')
    
    if (!isCryptoSupported()) {
      setError('Your browser does not support the required encryption features.')
      return
    }
    
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
      // Prepare birthday data
      const birthdayData = JSON.stringify({
        date: birthDate,
        time: includeTime && birthTime ? birthTime : undefined,
        includesTime: includeTime && !!birthTime
      })
      
      // Encrypt on client side
      const encrypted = await encryptData(birthdayData, userId, passphrase)
      const passphraseHash = await hashPassphrase(passphrase, userId)
      
      // Save to database (only encrypted data and hash)
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          encrypted_birthday: encrypted,
          birthday_passphrase_hash: passphraseHash,
          has_birthday_set: true
        })
        .eq('id', userId)
      
      if (dbError) throw dbError
      
      setSuccess('Your cosmic birthday has been securely stored!')
      setHasBirthdaySet(true)
      setShowSetupDialog(false)
      
      // Clear form
      setBirthDate('')
      setBirthTime('')
      setPassphrase('')
      setConfirmPassphrase('')
      setIncludeTime(false)
    } catch (err) {
      setError('Failed to save birthday. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlockBirthday = async () => {
    setError('')
    
    if (!unlockPassphrase) {
      setError('Please enter your passphrase')
      return
    }
    
    setIsLoading(true)
    
    try {
      // Get encrypted data from database
      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('encrypted_birthday, birthday_passphrase_hash')
        .eq('id', userId)
        .single()
      
      if (dbError || !data?.encrypted_birthday) {
        throw new Error('No birthday data found')
      }
      
      // Verify passphrase hash
      const enteredHash = await hashPassphrase(unlockPassphrase, userId)
      if (enteredHash !== data.birthday_passphrase_hash) {
        setError('Incorrect passphrase. Please try again.')
        setIsLoading(false)
        return
      }
      
      // Decrypt on client side
      const decrypted = await decryptData(data.encrypted_birthday, userId, unlockPassphrase)
      const birthdayData = JSON.parse(decrypted)
      
      setDecryptedBirthday(birthdayData)
      setIsUnlocked(true)
      setShowUnlockDialog(false)
      setUnlockPassphrase('')
    } catch (err) {
      setError('Failed to unlock. Check your passphrase.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLockBirthday = () => {
    setDecryptedBirthday(null)
    setBirthChart(null)
    setIsUnlocked(false)
    setActiveTab('overview')
  }

  const handleDeleteBirthday = async () => {
    setIsLoading(true)
    setError('')
    
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
      setBirthChart(null)
      setIsUnlocked(false)
      setShowDeleteDialog(false)
      setSuccess('Birthday data has been permanently deleted.')
    } catch (err) {
      setError('Failed to delete birthday data.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            <CardTitle className="font-semibold">Cosmic Birthday Vault</CardTitle>
          </div>
          {hasBirthdaySet && (
            <Badge variant="outline" className="border-primary/50 text-primary">
              <Shield className="mr-1 h-3 w-3" />
              Zero-Knowledge Encrypted
            </Badge>
          )}
        </div>
        <CardDescription>
          Your birth data powers personalized astrological insights. Encrypted so only you can access it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Security Notice */}
        <Alert className="border-primary/30 bg-primary/5">
          <Shield className="h-4 w-4 text-primary" />
          <AlertTitle className="font-semibold">Zero-Knowledge Security</AlertTitle>
          <AlertDescription className="text-sm">
            Your birthday is encrypted on your device before being stored. Even we cannot see it.
            Only you, with your passphrase, can decrypt and view your birth data.
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
            <AlertDescription className="text-green-600 dark:text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        {/* Not Set State */}
        {!hasBirthdaySet && (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-primary/30 p-6 text-center">
            <Sparkles className="h-10 w-10 text-primary/60" />
            <div>
              <p className="font-medium">Unlock Your Cosmic Potential</p>
              <p className="text-sm text-muted-foreground">
                Add your birthday for personalized astrological readings, timing advice, and cosmic insights.
              </p>
            </div>
            <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Set Up Cosmic Birthday
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 font-semibold">
                    <Star className="h-5 w-5 text-primary" />
                    Enter Your Birth Details
                  </DialogTitle>
                  <DialogDescription>
                    Your data will be encrypted with your passphrase before storage.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Birth Date *</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="border-primary/30"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="includeTime"
                        checked={includeTime}
                        onChange={(e) => setIncludeTime(e.target.checked)}
                        className="rounded border-primary/30"
                      />
                      <Label htmlFor="includeTime" className="text-sm cursor-pointer">
                        Include birth time for day/night precision
                      </Label>
                    </div>
                    {includeTime && (
                      <Input
                        id="birthTime"
                        type="time"
                        value={birthTime}
                        onChange={(e) => setBirthTime(e.target.value)}
                        className="border-primary/30"
                        placeholder="Birth time (optional)"
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      {includeTime 
                        ? 'Birth time enables day/night readings and more precise cosmic guidance.'
                        : 'Birth time is optional but provides more accurate readings.'}
                    </p>
                  </div>

                  {/* Preview */}
                  {previewBirthChart && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Preview: {previewBirthChart.sunSign.symbol} {previewBirthChart.sunSign.sign}
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Element: {previewBirthChart.sunSign.element} | Modality: {previewBirthChart.sunSign.modality}</p>
                        <p>Life Path: {previewBirthChart.lifePathNumber}</p>
                        {includeTime && birthTime && (
                          <p className="flex items-center gap-1">
                            {previewBirthChart.birthTime === 'day' ? (
                              <Sun className="h-3 w-3 text-amber-500" />
                            ) : (
                              <Moon className="h-3 w-3 text-blue-400" />
                            )}
                            {previewBirthChart.birthTime === 'day' ? 'Day-born (Solar energy)' : 'Night-born (Lunar energy)'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="passphrase">Encryption Passphrase *</Label>
                    <div className="relative">
                      <Input
                        id="passphrase"
                        type={showPassphrase ? 'text' : 'password'}
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        placeholder="Create a strong passphrase"
                        className="border-primary/30 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowPassphrase(!showPassphrase)}
                      >
                        {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassphrase">Confirm Passphrase *</Label>
                    <Input
                      id="confirmPassphrase"
                      type="password"
                      value={confirmPassphrase}
                      onChange={(e) => setConfirmPassphrase(e.target.value)}
                      placeholder="Confirm your passphrase"
                      className="border-primary/30"
                    />
                  </div>
                  
                  <Alert className="border-amber-500/30 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-xs text-amber-600 dark:text-amber-400">
                      <strong>Important:</strong> We cannot recover your passphrase. If you forget it, 
                      you will need to delete and re-enter your birthday data.
                    </AlertDescription>
                  </Alert>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSetupBirthday} disabled={isLoading} className="gap-2">
                    {isLoading ? 'Encrypting...' : (
                      <>
                        <Lock className="h-4 w-4" />
                        Encrypt & Save
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Has Birthday Set but Locked */}
        {hasBirthdaySet && !isUnlocked && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Birthday Data Locked</p>
                  <p className="text-sm text-muted-foreground">Enter your passphrase to unlock cosmic insights</p>
                </div>
              </div>
              <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Unlock
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-semibold">Unlock Your Cosmic Data</DialogTitle>
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
                          className="border-primary/30 pr-10"
                          onKeyDown={(e) => e.key === 'Enter' && handleUnlockBirthday()}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
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
                    <Button onClick={handleUnlockBirthday} disabled={isLoading}>
                      {isLoading ? 'Decrypting...' : 'Unlock'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Delete option for forgot passphrase */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Forgot your passphrase?</span>
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="link" className="h-auto p-0 text-destructive">
                    Delete & Start Over
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-semibold text-destructive">Delete Birthday Data</DialogTitle>
                    <DialogDescription>
                      This will permanently delete your encrypted birthday data. You can set it up again afterward.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteBirthday} disabled={isLoading}>
                      {isLoading ? 'Deleting...' : 'Delete Permanently'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {/* Unlocked State - Full Birth Chart */}
        {hasBirthdaySet && isUnlocked && birthChart && (
          <div className="space-y-4">
            {/* Header with Lock button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-3xl">{birthChart.sunSign.symbol}</div>
                <div>
                  <p className="font-semibold text-lg">{birthChart.sunSign.sign}</p>
                  <p className="text-sm text-muted-foreground">
                    {decryptedBirthday?.date && new Date(decryptedBirthday.date).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                    {decryptedBirthday?.time && ` at ${decryptedBirthday.time}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleLockBirthday} className="gap-1">
                  <Lock className="h-4 w-4" />
                  Lock
                </Button>
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-semibold text-destructive">Delete Birthday Data</DialogTitle>
                      <DialogDescription>
                        This will permanently delete your encrypted birthday data.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
                      <Button variant="destructive" onClick={handleDeleteBirthday} disabled={isLoading}>
                        {isLoading ? 'Deleting...' : 'Delete'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Tabs for different readings */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="numerology">Numerology</TabsTrigger>
                <TabsTrigger value="timing">Timing</TabsTrigger>
                <TabsTrigger value="cosmic">Cosmic</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Day/Night Born */}
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {birthChart.birthTime === 'day' ? (
                      <Sun className="h-5 w-5 text-amber-500" />
                    ) : birthChart.birthTime === 'night' ? (
                      <Moon className="h-5 w-5 text-blue-400" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-medium">
                      {birthChart.birthTime === 'day' ? 'Day-Born Soul' : 
                       birthChart.birthTime === 'night' ? 'Night-Born Soul' : 'Birth Time Unknown'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{birthChart.dayOrNightBorn}</p>
                </div>

                {/* Sun Sign Details */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Element</p>
                    <p className="font-medium">{birthChart.sunSign.elementSymbol} {birthChart.sunSign.element}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Modality</p>
                    <p className="font-medium">{birthChart.sunSign.modality}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Ruling Planet</p>
                    <p className="font-medium">{birthChart.sunSign.planetSymbol} {birthChart.sunSign.rulingPlanet}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Lucky Day</p>
                    <p className="font-medium">{birthChart.sunSign.luckyDay}</p>
                  </div>
                </div>

                {/* Traits */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Key Traits</p>
                  <div className="flex flex-wrap gap-2">
                    {birthChart.sunSign.traits.map((trait, i) => (
                      <Badge key={i} variant="outline">{trait}</Badge>
                    ))}
                  </div>
                </div>

                {/* Compatible Signs */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Compatible Signs</p>
                  <div className="flex flex-wrap gap-2">
                    {birthChart.sunSign.compatibleSigns.map((sign, i) => (
                      <Badge key={i} variant="secondary">{sign}</Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="numerology" className="space-y-4 mt-4">
                {/* Life Path */}
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Life Path Number</span>
                    <span className="text-2xl font-bold text-primary">{birthChart.lifePathNumber}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{birthChart.lifePathMeaning}</p>
                </div>

                {/* Personal Year */}
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Personal Year (2026)</span>
                    <span className="text-2xl font-bold text-venus">{birthChart.personalYear}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{birthChart.personalYearMeaning}</p>
                </div>

                {/* Chinese Zodiac */}
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{birthChart.chineseZodiac.symbol}</span>
                    <div>
                      <p className="font-medium">{birthChart.chineseZodiac.element} {birthChart.chineseZodiac.animal}</p>
                      <p className="text-xs text-muted-foreground">Chinese Zodiac</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {birthChart.chineseZodiac.traits.map((trait, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{trait}</Badge>
                    ))}
                  </div>
                </div>

                {/* Lucky Numbers */}
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="font-medium">Lucky Numbers</p>
                  <div className="flex gap-2">
                    {birthChart.sunSign.luckyNumbers.map((num, i) => (
                      <div key={i} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-medium">
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="timing" className="space-y-4 mt-4">
                {/* Best Posting Days */}
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="font-medium">Best Posting Days</p>
                  <div className="flex flex-wrap gap-2">
                    {birthChart.contentTiming.bestPostingDays.map((day, i) => (
                      <Badge key={i} className="bg-green-500/20 text-green-600 dark:text-green-400">{day}</Badge>
                    ))}
                  </div>
                </div>

                {/* Lucky Hours */}
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="font-medium">Lucky Posting Hours</p>
                  <div className="flex flex-wrap gap-2">
                    {birthChart.contentTiming.luckyHours.map((hour, i) => (
                      <Badge key={i} variant="outline">{hour}</Badge>
                    ))}
                  </div>
                </div>

                {/* Monthly Power Days */}
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="font-medium">Monthly Power Days</p>
                  <div className="flex flex-wrap gap-2">
                    {birthChart.contentTiming.monthlyPowerDays.map((day, i) => (
                      <div key={i} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-medium">
                        {day}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">These dates each month align with your cosmic energy</p>
                </div>

                {/* Retrograde Warning */}
                <Alert className="border-amber-500/30 bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertTitle className="font-semibold text-amber-600 dark:text-amber-400">Retrograde Advisory</AlertTitle>
                  <AlertDescription className="text-sm text-amber-600/80 dark:text-amber-400/80">
                    {birthChart.contentTiming.retrogradeWarning}
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="cosmic" className="space-y-4 mt-4">
                {/* Birth Details */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Day Born</p>
                    <p className="font-medium">{birthChart.dayOfWeek}</p>
                    <p className="text-xs text-muted-foreground mt-1">{birthChart.dayMeaning}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Season Born</p>
                    <p className="font-medium">{birthChart.seasonBorn.split(' - ')[0]}</p>
                    <p className="text-xs text-muted-foreground mt-1">{birthChart.seasonBorn.split(' - ')[1]}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Birthstone</p>
                    <p className="font-medium">{birthChart.birthstone}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Birth Flower</p>
                    <p className="font-medium">{birthChart.birthFlower}</p>
                  </div>
                </div>

                {/* Moon Phase */}
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="font-medium flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Moon Phase at Birth
                  </p>
                  <p className="text-sm">{birthChart.moonPhaseAtBirth.split(' - ')[0]}</p>
                  <p className="text-xs text-muted-foreground">{birthChart.moonPhaseAtBirth.split(' - ')[1]}</p>
                </div>

                {/* Cosmic Advice */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <p className="font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Personalized Cosmic Advice
                  </p>
                  <ul className="space-y-2">
                    {birthChart.cosmicAdvice.map((advice, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Star className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{advice}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
