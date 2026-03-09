'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { VoiceInputButton } from '@/components/voice-input-button'
import {
  Moon,
  Sun,
  Star,
  Sparkles,
  Calendar,
  Heart,
  Flame,
  Droplets,
  Wind,
  Mountain,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Camera,
  PartyPopper,
  Globe,
  Navigation,
  Loader2,
  CalendarDays,
  Landmark,
  TreePine,
  Building2,
  Waves,
  Sunset,
  Search,
  Mic,
  Send,
  Coffee,
  Home,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Zodiac data with elements and optimal content types
const zodiacSigns = [
  { name: 'Aries', symbol: '♈', element: 'fire', dates: 'Mar 21 - Apr 19', energy: 'Bold, passionate, direct' },
  { name: 'Taurus', symbol: '♉', element: 'earth', dates: 'Apr 20 - May 20', energy: 'Sensual, luxurious, steady' },
  { name: 'Gemini', symbol: '♊', element: 'air', dates: 'May 21 - Jun 20', energy: 'Playful, curious, versatile' },
  { name: 'Cancer', symbol: '♋', element: 'water', dates: 'Jun 21 - Jul 22', energy: 'Intimate, nurturing, emotional' },
  { name: 'Leo', symbol: '♌', element: 'fire', dates: 'Jul 23 - Aug 22', energy: 'Dramatic, confident, glamorous' },
  { name: 'Virgo', symbol: '♍', element: 'earth', dates: 'Aug 23 - Sep 22', energy: 'Refined, detailed, elegant' },
  { name: 'Libra', symbol: '♎', element: 'air', dates: 'Sep 23 - Oct 22', energy: 'Romantic, aesthetic, balanced' },
  { name: 'Scorpio', symbol: '♏', element: 'water', dates: 'Oct 23 - Nov 21', energy: 'Intense, mysterious, magnetic' },
  { name: 'Sagittarius', symbol: '♐', element: 'fire', dates: 'Nov 22 - Dec 21', energy: 'Adventurous, free, exciting' },
  { name: 'Capricorn', symbol: '♑', element: 'earth', dates: 'Dec 22 - Jan 19', energy: 'Sophisticated, ambitious, classy' },
  { name: 'Aquarius', symbol: '♒', element: 'air', dates: 'Jan 20 - Feb 18', energy: 'Unique, innovative, eccentric' },
  { name: 'Pisces', symbol: '♓', element: 'water', dates: 'Feb 19 - Mar 20', energy: 'Dreamy, artistic, ethereal' },
]

const moonPhases = [
  { name: 'New Moon', icon: '🌑', energy: 'New beginnings, set intentions', contentTip: 'Tease upcoming content, build anticipation' },
  { name: 'Waxing Crescent', icon: '🌒', energy: 'Growth, momentum', contentTip: 'Reveal sneak peeks, grow engagement' },
  { name: 'First Quarter', icon: '🌓', energy: 'Action, decisions', contentTip: 'Launch PPV, push for conversions' },
  { name: 'Waxing Gibbous', icon: '🌔', energy: 'Refinement, patience', contentTip: 'Premium content, detailed reveals' },
  { name: 'Full Moon', icon: '🌕', energy: 'Peak energy, manifestation', contentTip: 'Your BEST content, maximum engagement' },
  { name: 'Waning Gibbous', icon: '🌖', energy: 'Gratitude, sharing', contentTip: 'Behind the scenes, fan appreciation' },
  { name: 'Last Quarter', icon: '🌗', energy: 'Release, reflection', contentTip: 'Throwbacks, reflective content' },
  { name: 'Waning Crescent', icon: '🌘', energy: 'Rest, introspection', contentTip: 'Soft content, intimate moments' },
]

// Global holidays and events for content creators
const globalHolidays: Record<string, { name: string; type: 'holiday' | 'event' | 'awareness'; contentIdea: string; icon: string }[]> = {
  '1-1': [{ name: "New Year's Day", type: 'holiday', contentIdea: 'Fresh start content, resolution-themed shoots', icon: '🎆' }],
  '2-14': [{ name: "Valentine's Day", type: 'holiday', contentIdea: 'Romantic, lingerie, couple themes', icon: '💕' }],
  '2-15': [{ name: "Singles Awareness Day", type: 'event', contentIdea: 'Self-love, independent, empowering content', icon: '💪' }],
  '3-8': [{ name: "International Women's Day", type: 'awareness', contentIdea: 'Empowerment, strength, beauty content', icon: '👑' }],
  '3-17': [{ name: "St. Patrick's Day", type: 'holiday', contentIdea: 'Green themed, lucky charm content', icon: '🍀' }],
  '3-20': [{ name: 'Spring Equinox', type: 'event', contentIdea: 'Rebirth, flower themes, outdoor shoots', icon: '🌸' }],
  '4-1': [{ name: "April Fools' Day", type: 'event', contentIdea: 'Playful, teasing, surprise content', icon: '🃏' }],
  '4-20': [{ name: '420 Day', type: 'event', contentIdea: 'Chill vibes, relaxed aesthetic', icon: '🌿' }],
  '4-22': [{ name: 'Earth Day', type: 'awareness', contentIdea: 'Nature shoots, outdoor content', icon: '🌍' }],
  '5-1': [{ name: 'May Day', type: 'event', contentIdea: 'Spring goddess, floral crowns', icon: '🌺' }],
  '5-4': [{ name: 'Star Wars Day', type: 'event', contentIdea: 'Sci-fi cosplay, space themes', icon: '⭐' }],
  '5-5': [{ name: 'Cinco de Mayo', type: 'holiday', contentIdea: 'Vibrant colors, festive themes', icon: '🎉' }],
  '5-12': [{ name: "Mother's Day (US)", type: 'holiday', contentIdea: 'Nurturing, soft, elegant content', icon: '💐' }],
  '6-1': [{ name: 'Pride Month Starts', type: 'awareness', contentIdea: 'Rainbow themes, inclusive content', icon: '🏳️‍🌈' }],
  '6-21': [{ name: 'Summer Solstice', type: 'event', contentIdea: 'Golden hour shoots, beach content', icon: '☀️' }],
  '7-4': [{ name: 'Independence Day (US)', type: 'holiday', contentIdea: 'Patriotic themes, fireworks, red/white/blue', icon: '🇺🇸' }],
  '7-14': [{ name: 'Bastille Day', type: 'holiday', contentIdea: 'French aesthetic, elegant, romantic', icon: '🇫🇷' }],
  '8-1': [{ name: 'Summer Peak', type: 'event', contentIdea: 'Beach, pool, bikini content', icon: '🏖️' }],
  '9-22': [{ name: 'Autumn Equinox', type: 'event', contentIdea: 'Fall colors, cozy aesthetic', icon: '🍂' }],
  '10-1': [{ name: 'Spooky Season Starts', type: 'event', contentIdea: 'Halloween prep, mysterious vibes', icon: '🎃' }],
  '10-31': [{ name: 'Halloween', type: 'holiday', contentIdea: 'Costumes, spooky sexy, themed shoots', icon: '👻' }],
  '11-1': [{ name: 'Day of the Dead', type: 'holiday', contentIdea: 'Sugar skull makeup, Mexican aesthetic', icon: '💀' }],
  '11-11': [{ name: 'Singles Day', type: 'event', contentIdea: 'Self-care, solo content, special deals', icon: '1️⃣' }],
  '11-28': [{ name: 'Thanksgiving (US)', type: 'holiday', contentIdea: 'Gratitude posts, cozy content', icon: '🦃' }],
  '11-29': [{ name: 'Black Friday', type: 'event', contentIdea: 'SALE content, special PPV deals', icon: '🛍️' }],
  '12-21': [{ name: 'Winter Solstice', type: 'event', contentIdea: 'Mystical, cozy, candlelight content', icon: '❄️' }],
  '12-25': [{ name: 'Christmas', type: 'holiday', contentIdea: 'Festive, gift themes, Santa aesthetic', icon: '🎄' }],
  '12-31': [{ name: "New Year's Eve", type: 'holiday', contentIdea: 'Glamorous, champagne, sparkles', icon: '🥂' }],
}

const locationTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  beach: Waves,
  park: TreePine,
  urban: Building2,
  landmark: Landmark,
  scenic: Sunset,
  indoor: Home,
  rooftop: Building2,
  cafe: Coffee,
  studio: Camera,
}

const elementIcons = {
  fire: Flame,
  earth: Mountain,
  air: Wind,
  water: Droplets,
}

const elementColors = {
  fire: 'text-orange-500',
  earth: 'text-emerald-500',
  air: 'text-sky-400',
  water: 'text-blue-500',
}

// Calculate current zodiac sign based on date
function getCurrentZodiac(date: Date) {
  const month = date.getMonth() + 1
  const day = date.getDate()
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return zodiacSigns[0]
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return zodiacSigns[1]
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return zodiacSigns[2]
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return zodiacSigns[3]
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return zodiacSigns[4]
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return zodiacSigns[5]
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return zodiacSigns[6]
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return zodiacSigns[7]
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return zodiacSigns[8]
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return zodiacSigns[9]
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return zodiacSigns[10]
  return zodiacSigns[11]
}

// Calculate moon phase (simplified)
function getMoonPhase(date: Date) {
  const knownNewMoon = new Date('2024-01-11')
  const lunarCycle = 29.53
  const daysSinceNew = Math.floor((date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24))
  const daysIntoPhase = daysSinceNew % lunarCycle
  const phaseIndex = Math.floor((daysIntoPhase / lunarCycle) * 8) % 8
  return moonPhases[phaseIndex]
}

// Get holidays for a specific date
function getHolidays(date: Date) {
  const key = `${date.getMonth() + 1}-${date.getDate()}`
  return globalHolidays[key] || []
}

// Generate calendar days with cosmic data
function generateCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days = []
  
  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(null)
  }
  
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    const holidays = getHolidays(date)
    days.push({
      day,
      date,
      zodiac: getCurrentZodiac(date),
      moonPhase: getMoonPhase(date),
      holidays,
      isToday: new Date().toDateString() === date.toDateString(),
      cosmicScore: Math.floor(50 + Math.sin(day * 0.5) * 30 + Math.cos(day * 0.3) * 20),
    })
  }
  
  return days
}

// Local events generator
function generateLocalEvents(city: string, month: number) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December']
  
  const events = [
    { name: `${city} Fashion Week`, date: `${monthNames[month]} 15-20`, type: 'fashion', description: 'Great for networking and stylish content', promo: true },
    { name: `${city} Music Festival`, date: `${monthNames[month]} 8-10`, type: 'music', description: 'Festival outfits, crowd energy', promo: true },
    { name: `${city} Art Walk`, date: `Every Saturday`, type: 'art', description: 'Artistic backdrops, creative content', promo: false },
    { name: `${city} Night Market`, date: `Fridays 6-11 PM`, type: 'food', description: 'Colorful lights, street food aesthetic', promo: true },
    { name: `${city} Fitness Expo`, date: `${monthNames[month]} 22-24`, type: 'fitness', description: 'Activewear content, healthy lifestyle', promo: true },
    { name: `${city} Beach Party Series`, date: `Sundays`, type: 'party', description: 'Beach vibes, pool party content', promo: true },
  ]
  
  return events
}

interface GeoLocation {
  lat: number
  lng: number
  city: string
  country: string
}

interface AIPhotoSpot {
  name: string
  type: string
  distance: string
  rating: number
  bestTime: string
  contentIdeas: string[]
  aesthetic: string
  tips: string
  seasonalNote: string | null
}

interface AIPhotoResponse {
  spots: AIPhotoSpot[]
  generalAdvice: string
  weatherTip: string
}

export function CosmicCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<ReturnType<typeof generateCalendarDays>[0] | null>(null)
  const [location, setLocation] = useState<GeoLocation | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('calendar')
  
  // AI Photo Spots state
  const [photoSpotsQuery, setPhotoSpotsQuery] = useState('')
  const [contentType, setContentType] = useState('general')
  const [aiPhotoSpots, setAiPhotoSpots] = useState<AIPhotoResponse | null>(null)
  const [loadingPhotoSpots, setLoadingPhotoSpots] = useState(false)
  const [photoSpotsError, setPhotoSpotsError] = useState<string | null>(null)
  
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const calendarDays = generateCalendarDays(year, month)
  
  const currentZodiac = getCurrentZodiac(new Date())
  const currentMoon = getMoonPhase(new Date())
  const ElementIcon = elementIcons[currentZodiac.element as keyof typeof elementIcons]
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December']
  
  // Get location
  const requestLocation = useCallback(() => {
    setLoadingLocation(true)
    setLocationError(null)
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setLoadingLocation(false)
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        // Reverse geocoding to get city name
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          )
          const data = await response.json()
          const city = data.address?.city || data.address?.town || data.address?.village || 'Your Area'
          const country = data.address?.country || ''
          
          setLocation({
            lat: latitude,
            lng: longitude,
            city,
            country,
          })
        } catch {
          setLocation({
            lat: latitude,
            lng: longitude,
            city: 'Your Area',
            country: '',
          })
        }
        
        setLoadingLocation(false)
      },
      (error) => {
        setLocationError(
          error.code === 1 ? 'Location access denied. Please enable location services.' :
          error.code === 2 ? 'Location unavailable. Please try again.' :
          'Location request timed out. Please try again.'
        )
        setLoadingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }, [])
  
  // Fetch AI photo spots
  const fetchAIPhotoSpots = useCallback(async (query?: string) => {
    if (!location) {
      setPhotoSpotsError('Please enable location first')
      return
    }
    
    setLoadingPhotoSpots(true)
    setPhotoSpotsError(null)
    
    try {
      const response = await fetch('/api/ai/photo-spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: location.lat,
          lng: location.lng,
          city: location.city,
          country: location.country,
          userRequest: query || photoSpotsQuery,
          contentType,
          zodiacSign: currentZodiac.name,
          moonPhase: currentMoon.name,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to fetch recommendations')
      
      const data = await response.json()
      setAiPhotoSpots(data)
    } catch (error) {
      setPhotoSpotsError('Failed to get AI recommendations. Please try again.')
    } finally {
      setLoadingPhotoSpots(false)
    }
  }, [location, photoSpotsQuery, contentType, currentZodiac.name, currentMoon.name])
  
  // Handle voice input for photo spots
  const handleVoiceInput = useCallback((transcript: string) => {
    setPhotoSpotsQuery(transcript)
    // Auto-search after voice input
    if (location && transcript.trim()) {
      fetchAIPhotoSpots(transcript)
    }
  }, [location, fetchAIPhotoSpots])
  
  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(year, month + direction, 1))
    setSelectedDay(null)
  }
  
  const localEvents = location ? generateLocalEvents(location.city, month) : []
  
  // Get upcoming holidays this month
  const upcomingHolidays = calendarDays
    .filter(day => day && day.holidays.length > 0 && day.date >= new Date())
    .slice(0, 5)
  
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
          <TabsTrigger value="calendar" className="gap-1.5 text-xs sm:gap-2 sm:text-sm">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Cosmic</span> Calendar
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5 text-xs sm:gap-2 sm:text-sm">
            <PartyPopper className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Holidays &</span> Events
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-1.5 text-xs sm:gap-2 sm:text-sm">
            <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Photo Spots
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="mt-4 space-y-4 sm:mt-6 sm:space-y-6">
          {/* Current Cosmic Energy */}
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <Card className="border-venus/30 bg-gradient-to-br from-venus/5 to-transparent">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Sun className="h-4 w-4 text-venus sm:h-5 sm:w-5" />
                  Current Zodiac Season
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-venus/20 text-2xl sm:h-16 sm:w-16 sm:text-3xl">
                    {currentZodiac.symbol}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-venus sm:text-xl">{currentZodiac.name}</h3>
                    <p className="text-xs text-muted-foreground sm:text-sm">{currentZodiac.dates}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <ElementIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${elementColors[currentZodiac.element as keyof typeof elementColors]}`} />
                      <span className="text-xs capitalize sm:text-sm">{currentZodiac.element} sign</span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground sm:mt-3 sm:text-sm">
                  <span className="font-medium text-foreground">Energy:</span> {currentZodiac.energy}
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-circe/30 bg-gradient-to-br from-circe/5 to-transparent">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Moon className="h-4 w-4 text-circe sm:h-5 sm:w-5" />
                  Moon Phase
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-circe/20 text-2xl sm:h-16 sm:w-16 sm:text-3xl">
                    {currentMoon.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-circe sm:text-xl">{currentMoon.name}</h3>
                    <p className="text-xs text-muted-foreground sm:text-sm">{currentMoon.energy}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground sm:mt-3 sm:text-sm">
                  <span className="font-medium text-foreground">Content Tip:</span> {currentMoon.contentTip}
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Calendar */}
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">{monthNames[month]} {year}</CardTitle>
                <div className="flex gap-1 sm:gap-2">
                  <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)} className="h-8 w-8 sm:h-9 sm:w-9">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => navigateMonth(1)} className="h-8 w-8 sm:h-9 sm:w-9">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="p-1 text-center text-xs font-medium text-muted-foreground sm:p-2 sm:text-sm">
                    {day}
                  </div>
                ))}
                
                {calendarDays.map((day, i) => (
                  <TooltipProvider key={i}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => day && setSelectedDay(day)}
                          disabled={!day}
                          className={`
                            relative aspect-square rounded p-0.5 text-xs transition-all sm:p-1 sm:text-sm
                            ${!day ? 'cursor-default' : 'hover:bg-muted cursor-pointer'}
                            ${day?.isToday ? 'ring-2 ring-primary' : ''}
                            ${day?.holidays.length ? 'bg-venus/10' : ''}
                            ${selectedDay?.day === day?.day ? 'bg-primary/20' : ''}
                          `}
                        >
                          {day && (
                            <>
                              <span className={day.isToday ? 'font-bold text-primary' : ''}>{day.day}</span>
                              {day.holidays.length > 0 && (
                                <span className="absolute bottom-0 right-0 text-[8px] sm:text-[10px]">
                                  {day.holidays[0].icon}
                                </span>
                              )}
                            </>
                          )}
                        </button>
                      </TooltipTrigger>
                      {day && (
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-medium">{monthNames[month]} {day.day}</p>
                            <p className="text-xs">{day.moonPhase.icon} {day.moonPhase.name}</p>
                            <p className="text-xs">Cosmic Score: {day.cosmicScore}/100</p>
                            {day.holidays.map((h, i) => (
                              <p key={i} className="text-xs text-venus">{h.icon} {h.name}</p>
                            ))}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Selected Day Details */}
          {selectedDay && (
            <Card className="border-primary/30">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-base sm:text-lg">
                  {monthNames[month]} {selectedDay.day} - Cosmic Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground sm:text-sm">Zodiac</p>
                    <p className="text-sm font-semibold sm:text-base">{selectedDay.zodiac.symbol} {selectedDay.zodiac.name}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground sm:text-sm">Moon Phase</p>
                    <p className="text-sm font-semibold sm:text-base">{selectedDay.moonPhase.icon} {selectedDay.moonPhase.name}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground sm:text-sm">Cosmic Score</p>
                    <p className="text-sm font-semibold sm:text-base">{selectedDay.cosmicScore}/100</p>
                  </div>
                </div>
                
                <div className="rounded-lg border border-circe/30 bg-circe/5 p-3 sm:p-4">
                  <h4 className="text-sm font-semibold text-circe sm:text-base">Content Strategy</h4>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{selectedDay.moonPhase.contentTip}</p>
                  <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                    <span className="font-medium text-foreground">Energy to channel:</span> {selectedDay.zodiac.energy}
                  </p>
                </div>
                
                {selectedDay.holidays.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold sm:text-base">Events & Holidays</h4>
                    {selectedDay.holidays.map((holiday, i) => (
                      <div key={i} className="rounded-lg border border-venus/30 bg-venus/5 p-3 sm:p-4">
                        <p className="text-sm font-medium sm:text-base">{holiday.icon} {holiday.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{holiday.contentIdea}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="events" className="mt-4 space-y-4 sm:mt-6 sm:space-y-6">
          {/* Upcoming Holidays */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CalendarDays className="h-4 w-4 text-venus sm:h-5 sm:w-5" />
                Upcoming Events This Month
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Plan your content around these dates</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] sm:h-[400px]">
                <div className="space-y-3 sm:space-y-4">
                  {upcomingHolidays.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">No major events this month</p>
                  ) : (
                    upcomingHolidays.map((day, i) => (
                      <div key={i}>
                        {day?.holidays.map((holiday, j) => (
                          <div key={j} className="rounded-lg border p-3 sm:p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold sm:text-base">{holiday.icon} {holiday.name}</p>
                                <p className="text-xs text-muted-foreground sm:text-sm">
                                  {monthNames[month]} {day?.day}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-[10px] sm:text-xs">
                                {holiday.type}
                              </Badge>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground sm:text-sm">{holiday.contentIdea}</p>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* Local Events (requires location) */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Globe className="h-4 w-4 text-circe sm:h-5 sm:w-5" />
                Local Events Near You
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Promotion opportunities in your area</CardDescription>
            </CardHeader>
            <CardContent>
              {!location ? (
                <div className="flex flex-col items-center gap-3 py-6 sm:gap-4 sm:py-8">
                  <MapPin className="h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" />
                  <p className="text-center text-sm text-muted-foreground sm:text-base">Enable location to see local events</p>
                  <Button onClick={requestLocation} disabled={loadingLocation} size="sm">
                    {loadingLocation ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Getting location...
                      </>
                    ) : (
                      <>
                        <Navigation className="mr-2 h-4 w-4" />
                        Enable Location
                      </>
                    )}
                  </Button>
                  {locationError && (
                    <p className="text-xs text-destructive sm:text-sm">{locationError}</p>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[300px] sm:h-[350px]">
                  <div className="space-y-3 sm:space-y-4">
                    {localEvents.map((event, i) => (
                      <div key={i} className="rounded-lg border p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold sm:text-base">{event.name}</p>
                            <p className="text-xs text-muted-foreground sm:text-sm">{event.date}</p>
                          </div>
                          {event.promo && (
                            <Badge className="bg-venus text-venus-foreground text-[10px] sm:text-xs">
                              Promo Opportunity
                            </Badge>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground sm:text-sm">{event.description}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="locations" className="mt-4 space-y-4 sm:mt-6 sm:space-y-6">
          {/* AI Photo Spots with Voice Input */}
          <Card className="border-venus/30">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Sparkles className="h-4 w-4 text-venus sm:h-5 sm:w-5" />
                AI Photo Spot Finder
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Tell Venus what kind of content you want to create - speak or type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!location ? (
                <div className="flex flex-col items-center gap-3 py-6 sm:gap-4 sm:py-8">
                  <MapPin className="h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" />
                  <p className="text-center text-sm text-muted-foreground sm:text-base">Enable location to find photo spots near you</p>
                  <Button onClick={requestLocation} disabled={loadingLocation} size="sm">
                    {loadingLocation ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Getting location...
                      </>
                    ) : (
                      <>
                        <Navigation className="mr-2 h-4 w-4" />
                        Enable Location
                      </>
                    )}
                  </Button>
                  {locationError && (
                    <p className="text-xs text-destructive sm:text-sm">{locationError}</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-venus" />
                    <span>{location.city}, {location.country}</span>
                  </div>
                  
                  {/* Voice/Text Input */}
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder="Describe what you want... (e.g., 'sexy beach shots for sunset')"
                          value={photoSpotsQuery}
                          onChange={(e) => setPhotoSpotsQuery(e.target.value)}
                          className="pr-10"
                          onKeyDown={(e) => e.key === 'Enter' && fetchAIPhotoSpots()}
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2">
                          <VoiceInputButton
                            onTranscript={handleVoiceInput}
                            size="sm"
                            variant="ghost"
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={() => fetchAIPhotoSpots()} 
                        disabled={loadingPhotoSpots}
                        className="bg-venus text-venus-foreground hover:bg-venus/90"
                      >
                        {loadingPhotoSpots ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Select value={contentType} onValueChange={setContentType}>
                        <SelectTrigger className="w-[140px] sm:w-[180px]">
                          <SelectValue placeholder="Content type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General/Lifestyle</SelectItem>
                          <SelectItem value="glamour">Glamour/Sexy</SelectItem>
                          <SelectItem value="fitness">Fitness/Active</SelectItem>
                          <SelectItem value="elegant">Elegant/Classy</SelectItem>
                          <SelectItem value="casual">Casual/Everyday</SelectItem>
                          <SelectItem value="artistic">Artistic/Editorial</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Badge variant="outline" className="text-xs">
                        {currentZodiac.symbol} {currentZodiac.name} Season
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {currentMoon.icon} {currentMoon.name}
                      </Badge>
                    </div>
                    
                    {/* Quick voice prompts */}
                    <div className="flex flex-wrap gap-2">
                      <p className="w-full text-xs text-muted-foreground">Quick prompts (tap to search):</p>
                      {[
                        'Beach vibes for bikini content',
                        'Urban rooftop for city shots',
                        'Nature spots for artistic photos',
                        'Cafe aesthetic for casual content',
                      ].map((prompt) => (
                        <Button
                          key={prompt}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setPhotoSpotsQuery(prompt)
                            fetchAIPhotoSpots(prompt)
                          }}
                        >
                          {prompt}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {photoSpotsError && (
                    <p className="text-sm text-destructive">{photoSpotsError}</p>
                  )}
                  
                  {/* AI Results */}
                  {aiPhotoSpots && (
                    <div className="space-y-4">
                      {/* General Advice */}
                      <div className="rounded-lg border border-venus/30 bg-venus/5 p-3 sm:p-4">
                        <p className="text-sm font-medium text-venus">Venus says:</p>
                        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{aiPhotoSpots.generalAdvice}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          <span className="font-medium">Weather tip:</span> {aiPhotoSpots.weatherTip}
                        </p>
                      </div>
                      
                      {/* Spots Grid */}
                      <ScrollArea className="h-[400px] sm:h-[500px]">
                        <div className="space-y-3 sm:space-y-4 pr-4">
                          {aiPhotoSpots.spots.map((spot, i) => {
                            const IconComponent = locationTypeIcons[spot.type] || Camera
                            return (
                              <Card key={i} className="overflow-hidden">
                                <CardHeader className="pb-2 sm:pb-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 sm:h-10 sm:w-10">
                                        <IconComponent className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                                      </div>
                                      <div>
                                        <CardTitle className="text-sm sm:text-base">{spot.name}</CardTitle>
                                        <CardDescription className="text-xs">
                                          {spot.distance} away
                                        </CardDescription>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-primary text-primary sm:h-4 sm:w-4" />
                                      <span className="text-xs font-medium sm:text-sm">{spot.rating}</span>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-0">
                                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                                      {spot.type}
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px] sm:text-xs">
                                      Best: {spot.bestTime}
                                    </Badge>
                                  </div>
                                  
                                  <div>
                                    <p className="text-xs font-medium sm:text-sm">Aesthetic: <span className="font-normal text-muted-foreground">{spot.aesthetic}</span></p>
                                  </div>
                                  
                                  <div>
                                    <p className="text-xs font-medium sm:text-sm">Content Ideas:</p>
                                    <ul className="mt-1 space-y-0.5">
                                      {spot.contentIdeas.map((idea, j) => (
                                        <li key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                          <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-venus" />
                                          {idea}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  
                                  <div className="rounded-lg bg-muted/50 p-2 sm:p-3">
                                    <p className="text-xs">
                                      <span className="font-medium">Pro Tip:</span> {spot.tips}
                                    </p>
                                  </div>
                                  
                                  {spot.seasonalNote && (
                                    <p className="text-xs text-venus">
                                      <span className="font-medium">Seasonal:</span> {spot.seasonalNote}
                                    </p>
                                  )}
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                  
                  {/* No results yet */}
                  {!aiPhotoSpots && !loadingPhotoSpots && (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <Camera className="h-12 w-12 text-muted-foreground/50" />
                      <div>
                        <p className="text-sm font-medium">Ask Venus for photo spot recommendations</p>
                        <p className="text-xs text-muted-foreground">
                          Use voice or type to describe what kind of content you want to create
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
