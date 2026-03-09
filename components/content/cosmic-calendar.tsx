'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Image as ImageIcon,
  CalendarDays,
  Landmark,
  TreePine,
  Building2,
  Waves,
  Sunset,
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

// Photo location types with content ideas
const photoLocationTypes = [
  { type: 'beach', icon: Waves, name: 'Beach/Waterfront', ideas: 'Bikini shoots, sunset silhouettes, wave shots' },
  { type: 'park', icon: TreePine, name: 'Parks/Nature', ideas: 'Natural lighting, dreamy backgrounds, outdoor glamour' },
  { type: 'urban', icon: Building2, name: 'Urban/City', ideas: 'Street style, rooftop, modern aesthetic' },
  { type: 'landmark', icon: Landmark, name: 'Landmarks', ideas: 'Iconic backdrops, tourist spots, architecture' },
  { type: 'scenic', icon: Sunset, name: 'Scenic Viewpoints', ideas: 'Golden hour, panoramic views, dramatic lighting' },
]

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

// Photo spots generator based on location
function generatePhotoSpots(lat: number, lng: number, city: string) {
  // In production, this would call a real Places API
  // For now, we generate contextual suggestions based on common photo spots
  const baseSpots = [
    { name: `${city} Waterfront`, type: 'beach', distance: '2.3 km', rating: 4.8, bestTime: 'Golden hour (6-7 PM)', ideas: 'Sunset silhouettes, water reflections, bikini content' },
    { name: `Downtown ${city}`, type: 'urban', distance: '1.5 km', rating: 4.5, bestTime: 'Blue hour (8-9 PM)', ideas: 'Neon lights, street style, urban glamour' },
    { name: `${city} Central Park`, type: 'park', distance: '3.1 km', rating: 4.7, bestTime: 'Morning (9-11 AM)', ideas: 'Natural light, greenery backdrop, dreamy aesthetic' },
    { name: `${city} Botanical Garden`, type: 'park', distance: '4.2 km', rating: 4.9, bestTime: 'Midday (11 AM-2 PM)', ideas: 'Flower backdrops, exotic plants, colorful content' },
    { name: `${city} Skyline View`, type: 'scenic', distance: '5.0 km', rating: 4.6, bestTime: 'Sunset (5-7 PM)', ideas: 'Panoramic shots, dramatic poses, city backdrop' },
    { name: `Historic ${city} District`, type: 'landmark', distance: '2.8 km', rating: 4.4, bestTime: 'Early morning (7-9 AM)', ideas: 'Architecture, European aesthetic, elegant vibes' },
    { name: `${city} Rooftop Bar`, type: 'urban', distance: '1.2 km', rating: 4.3, bestTime: 'Evening (7-10 PM)', ideas: 'Glamour shots, city lights, cocktail aesthetic' },
    { name: `${city} Beach Club`, type: 'beach', distance: '6.5 km', rating: 4.7, bestTime: 'Afternoon (2-5 PM)', ideas: 'Pool content, summer vibes, luxury aesthetic' },
  ]
  
  return baseSpots
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

export function CosmicCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<ReturnType<typeof generateCalendarDays>[0] | null>(null)
  const [location, setLocation] = useState<GeoLocation | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [activeTab, setActiveTab] = useState('calendar')
  
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const calendarDays = generateCalendarDays(year, month)
  
  const currentZodiac = getCurrentZodiac(new Date())
  const currentMoon = getMoonPhase(new Date())
  const ElementIcon = elementIcons[currentZodiac.element as keyof typeof elementIcons]
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December']
  
  // Get location
  const requestLocation = () => {
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
  }
  
  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(year, month + direction, 1))
    setSelectedDay(null)
  }
  
  const photoSpots = location ? generatePhotoSpots(location.lat, location.lng, location.city) : []
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
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Calendar className="h-4 w-4 text-gold sm:h-5 sm:w-5" />
                  Cosmic Content Calendar
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[120px] text-center text-sm font-medium sm:min-w-[140px]">
                    {monthNames[month]} {year}
                  </span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                Align your content with cosmic energies and global events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="mb-2 grid grid-cols-7 gap-0.5 sm:gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="py-1 text-center text-[10px] font-medium text-muted-foreground sm:py-2 sm:text-xs">
                    <span className="sm:hidden">{day}</span>
                    <span className="hidden sm:inline">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}</span>
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {calendarDays.map((dayData, index) => (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className={`relative flex min-h-[50px] flex-col items-center justify-start rounded-md border p-0.5 text-xs transition-colors sm:min-h-[80px] sm:rounded-lg sm:p-1 sm:text-sm ${
                            dayData === null
                              ? 'cursor-default border-transparent'
                              : dayData.isToday
                              ? 'border-gold bg-gold/10'
                              : dayData.holidays.length > 0
                              ? 'border-venus/50 bg-venus/10 hover:bg-venus/20'
                              : dayData.cosmicScore > 70
                              ? 'border-venus/30 bg-venus/5 hover:bg-venus/10'
                              : 'border-border/50 hover:bg-muted/50'
                          }`}
                          onClick={() => dayData && setSelectedDay(dayData)}
                          disabled={!dayData}
                        >
                          {dayData && (
                            <>
                              <span className={`text-[10px] font-medium sm:text-sm ${dayData.isToday ? 'text-gold' : ''}`}>
                                {dayData.day}
                              </span>
                              <span className="text-sm sm:text-lg">{dayData.moonPhase.icon}</span>
                              {dayData.holidays.length > 0 && (
                                <span className="absolute right-0.5 top-0.5 text-[10px] sm:right-1 sm:top-1 sm:text-xs">
                                  {dayData.holidays[0].icon}
                                </span>
                              )}
                              {dayData.cosmicScore > 70 && !dayData.holidays.length && (
                                <Sparkles className="absolute right-0.5 top-0.5 h-2.5 w-2.5 text-venus sm:right-1 sm:top-1 sm:h-3 sm:w-3" />
                              )}
                              <div className="mt-auto hidden sm:block">
                                <div 
                                  className={`h-1 w-6 rounded-full sm:w-8 ${
                                    dayData.holidays.length > 0 ? 'bg-venus' :
                                    dayData.cosmicScore > 70 ? 'bg-venus' :
                                    dayData.cosmicScore > 50 ? 'bg-gold' : 'bg-muted'
                                  }`}
                                  style={{ opacity: dayData.cosmicScore / 100 }}
                                />
                              </div>
                            </>
                          )}
                        </button>
                      </TooltipTrigger>
                      {dayData && (
                        <TooltipContent side="top" className="max-w-[200px]">
                          <p className="font-medium">{dayData.zodiac.name} {dayData.zodiac.symbol}</p>
                          <p className="text-xs">{dayData.moonPhase.name}</p>
                          {dayData.holidays.map((h, i) => (
                            <p key={i} className="mt-1 text-xs text-venus">{h.icon} {h.name}</p>
                          ))}
                          <p className="mt-1 text-xs text-muted-foreground">
                            Cosmic Score: {dayData.cosmicScore}%
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
              
              {/* Legend */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground sm:mt-4 sm:gap-4 sm:text-xs">
                <div className="flex items-center gap-1">
                  <PartyPopper className="h-3 w-3 text-venus" />
                  <span>Holiday/Event</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-venus" />
                  <span>High energy</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-3 rounded-full bg-gold sm:h-2 sm:w-4" />
                  <span>Good day</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Selected Day Details */}
          {selectedDay && (
            <Card className="border-gold/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Star className="h-4 w-4 text-gold sm:h-5 sm:w-5" />
                  {monthNames[month]} {selectedDay.day} - Cosmic Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Holidays for this day */}
                {selectedDay.holidays.length > 0 && (
                  <div className="space-y-2">
                    {selectedDay.holidays.map((holiday, i) => (
                      <div key={i} className="rounded-lg border border-venus/30 bg-venus/5 p-3 sm:p-4">
                        <h4 className="flex items-center gap-2 text-sm font-medium text-venus sm:text-base">
                          <span className="text-lg">{holiday.icon}</span>
                          {holiday.name}
                          <Badge variant="outline" className="ml-auto text-[10px] capitalize sm:text-xs">
                            {holiday.type}
                          </Badge>
                        </h4>
                        <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                          <span className="font-medium text-foreground">Content Idea:</span> {holiday.contentIdea}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-muted/50 p-2.5 sm:p-3">
                    <h4 className="text-xs font-medium text-venus sm:text-sm">Zodiac Energy</h4>
                    <p className="mt-1 text-sm sm:text-lg">{selectedDay.zodiac.symbol} {selectedDay.zodiac.name}</p>
                    <p className="text-[10px] text-muted-foreground sm:text-sm">{selectedDay.zodiac.energy}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5 sm:p-3">
                    <h4 className="text-xs font-medium text-circe sm:text-sm">Moon Phase</h4>
                    <p className="mt-1 text-sm sm:text-lg">{selectedDay.moonPhase.icon} {selectedDay.moonPhase.name}</p>
                    <p className="text-[10px] text-muted-foreground sm:text-sm">{selectedDay.moonPhase.contentTip}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5 sm:p-3">
                    <h4 className="text-xs font-medium text-gold sm:text-sm">Cosmic Score</h4>
                    <p className="mt-1 text-sm sm:text-lg">{selectedDay.cosmicScore}%</p>
                    <p className="text-[10px] text-muted-foreground sm:text-sm">
                      {selectedDay.cosmicScore > 70 ? 'Excellent!' : selectedDay.cosmicScore > 50 ? 'Good energy' : 'Lighter content'}
                    </p>
                  </div>
                </div>
                
                <div className="rounded-lg border border-venus/30 bg-venus/5 p-3 sm:p-4">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-venus sm:text-base">
                    <Heart className="h-4 w-4" />
                    Content Recommendations
                  </h4>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground sm:text-sm">
                    <li>• Post {selectedDay.zodiac.element === 'fire' ? 'bold, passionate' : 
                              selectedDay.zodiac.element === 'water' ? 'intimate, emotional' :
                              selectedDay.zodiac.element === 'earth' ? 'sensual, luxurious' :
                              'playful, creative'} content</li>
                    <li>• {selectedDay.moonPhase.contentTip}</li>
                    <li>• Best posting time: {selectedDay.cosmicScore > 70 ? '8-10 PM' : '6-8 PM'} in your timezone</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="events" className="mt-4 space-y-4 sm:mt-6 sm:space-y-6">
          {/* Upcoming Holidays This Month */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CalendarDays className="h-4 w-4 text-venus sm:h-5 sm:w-5" />
                Upcoming Events in {monthNames[month]}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Plan your content around these dates for maximum engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingHolidays.length > 0 ? (
                <div className="space-y-3">
                  {upcomingHolidays.map((day, i) => day && (
                    <div 
                      key={i} 
                      className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 sm:gap-4 sm:p-4"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-venus/10 sm:h-12 sm:w-12">
                        <span className="text-[10px] font-medium text-venus sm:text-xs">{monthNames[month].slice(0, 3)}</span>
                        <span className="text-base font-bold sm:text-lg">{day.day}</span>
                      </div>
                      <div className="flex-1">
                        {day.holidays.map((h, j) => (
                          <div key={j}>
                            <h4 className="flex items-center gap-2 text-sm font-medium sm:text-base">
                              <span>{h.icon}</span>
                              {h.name}
                              <Badge variant="outline" className="ml-auto text-[10px] capitalize sm:text-xs">
                                {h.type}
                              </Badge>
                            </h4>
                            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{h.contentIdea}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No major events remaining this month. Check next month!
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Local Events */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Globe className="h-4 w-4 text-gold sm:h-5 sm:w-5" />
                    Local Events Near You
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {location ? `Events in ${location.city}, ${location.country}` : 'Enable location to see local events'}
                  </CardDescription>
                </div>
                {!location && (
                  <Button 
                    onClick={requestLocation} 
                    disabled={loadingLocation}
                    size="sm"
                    className="gap-2"
                  >
                    {loadingLocation ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                    Enable Location
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {locationError && (
                <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {locationError}
                </div>
              )}
              
              {location ? (
                <div className="space-y-3">
                  {localEvents.map((event, i) => (
                    <div 
                      key={i}
                      className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 sm:gap-4 sm:p-4"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gold/10 sm:h-12 sm:w-12">
                        <PartyPopper className="h-5 w-5 text-gold sm:h-6 sm:w-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="flex flex-wrap items-center gap-2 text-sm font-medium sm:text-base">
                          {event.name}
                          {event.promo && (
                            <Badge className="bg-venus/20 text-venus">Promo Opportunity</Badge>
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground sm:text-sm">{event.date}</p>
                        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Enable location to discover events near you
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="locations" className="mt-4 space-y-4 sm:mt-6 sm:space-y-6">
          {/* Photo Spots */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Camera className="h-4 w-4 text-venus sm:h-5 sm:w-5" />
                    Photo & Content Spots
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {location ? `Beautiful locations near ${location.city}` : 'Enable location to find photo spots'}
                  </CardDescription>
                </div>
                {!location && (
                  <Button 
                    onClick={requestLocation} 
                    disabled={loadingLocation}
                    size="sm"
                    className="gap-2"
                  >
                    {loadingLocation ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                    Find Nearby Spots
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {locationError && (
                <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {locationError}
                </div>
              )}
              
              {location ? (
                <div className="space-y-3">
                  {photoSpots.map((spot, i) => {
                    const typeInfo = photoLocationTypes.find(t => t.type === spot.type)
                    const TypeIcon = typeInfo?.icon || Camera
                    
                    return (
                      <div 
                        key={i}
                        className="rounded-lg border p-3 transition-colors hover:bg-muted/50 sm:p-4"
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-venus/10 sm:h-12 sm:w-12">
                            <TypeIcon className="h-5 w-5 text-venus sm:h-6 sm:w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <h4 className="text-sm font-medium sm:text-base">{spot.name}</h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {spot.distance}
                              </div>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="text-[10px] capitalize sm:text-xs">
                                {spot.type}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground sm:text-xs">
                                Best time: {spot.bestTime}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                              <span className="font-medium text-foreground">Content Ideas:</span> {spot.ideas}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Enable location to discover photo spots nearby
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Find beaches, parks, urban spots, and scenic viewpoints
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Location Types Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Sparkles className="h-4 w-4 text-gold sm:h-5 sm:w-5" />
                Content Location Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {photoLocationTypes.map((type, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                    <type.icon className="h-5 w-5 text-venus" />
                    <div>
                      <h4 className="text-sm font-medium">{type.name}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{type.ideas}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
