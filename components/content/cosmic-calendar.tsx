'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Moon,
  Sun,
  Star,
  Sparkles,
  Calendar,
  TrendingUp,
  Heart,
  Flame,
  Droplets,
  Wind,
  Mountain,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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

// Generate calendar days with cosmic data
function generateCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days = []
  
  // Add empty slots for days before the first of the month
  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(null)
  }
  
  // Add all days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    days.push({
      day,
      date,
      zodiac: getCurrentZodiac(date),
      moonPhase: getMoonPhase(date),
      isToday: new Date().toDateString() === date.toDateString(),
      // Cosmic score for content posting (0-100)
      cosmicScore: Math.floor(50 + Math.sin(day * 0.5) * 30 + Math.cos(day * 0.3) * 20),
    })
  }
  
  return days
}

export function CosmicCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<typeof calendarDays[0] | null>(null)
  
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const calendarDays = generateCalendarDays(year, month)
  
  const currentZodiac = getCurrentZodiac(new Date())
  const currentMoon = getMoonPhase(new Date())
  const ElementIcon = elementIcons[currentZodiac.element as keyof typeof elementIcons]
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December']
  
  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(year, month + direction, 1))
  }
  
  return (
    <div className="space-y-6">
      {/* Current Cosmic Energy */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-venus/30 bg-gradient-to-br from-venus/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sun className="h-5 w-5 text-venus" />
              Current Zodiac Season
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-venus/20 text-3xl">
                {currentZodiac.symbol}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-venus">{currentZodiac.name}</h3>
                <p className="text-sm text-muted-foreground">{currentZodiac.dates}</p>
                <div className="mt-1 flex items-center gap-2">
                  <ElementIcon className={`h-4 w-4 ${elementColors[currentZodiac.element as keyof typeof elementColors]}`} />
                  <span className="text-sm capitalize">{currentZodiac.element} sign</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Energy:</span> {currentZodiac.energy}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-circe/30 bg-gradient-to-br from-circe/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Moon className="h-5 w-5 text-circe" />
              Moon Phase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-circe/20 text-3xl">
                {currentMoon.icon}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-circe">{currentMoon.name}</h3>
                <p className="text-sm text-muted-foreground">{currentMoon.energy}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Content Tip:</span> {currentMoon.contentTip}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gold" />
              Cosmic Content Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[140px] text-center font-medium">
                {monthNames[month]} {year}
              </span>
              <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            Align your content with cosmic energies for maximum engagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dayData, index) => (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={`relative flex min-h-[80px] flex-col items-center justify-start rounded-lg border p-1 text-sm transition-colors ${
                        dayData === null
                          ? 'cursor-default border-transparent'
                          : dayData.isToday
                          ? 'border-gold bg-gold/10'
                          : dayData.cosmicScore > 70
                          ? 'border-venus/30 bg-venus/5 hover:bg-venus/10'
                          : 'border-border/50 hover:bg-muted/50'
                      }`}
                      onClick={() => dayData && setSelectedDay(dayData)}
                      disabled={!dayData}
                    >
                      {dayData && (
                        <>
                          <span className={`font-medium ${dayData.isToday ? 'text-gold' : ''}`}>
                            {dayData.day}
                          </span>
                          <span className="text-lg">{dayData.moonPhase.icon}</span>
                          {dayData.cosmicScore > 70 && (
                            <Sparkles className="absolute right-1 top-1 h-3 w-3 text-venus" />
                          )}
                          <div className="mt-auto">
                            <div 
                              className={`h-1 w-8 rounded-full ${
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
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-venus" />
              <span>High cosmic energy</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-4 rounded-full bg-venus" />
              <span>Best posting days</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-4 rounded-full bg-gold" />
              <span>Good days</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Selected Day Details */}
      {selectedDay && (
        <Card className="border-gold/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-gold" />
              {monthNames[month]} {selectedDay.day} - Cosmic Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <h4 className="text-sm font-medium text-venus">Zodiac Energy</h4>
                <p className="mt-1 text-lg">{selectedDay.zodiac.symbol} {selectedDay.zodiac.name}</p>
                <p className="text-sm text-muted-foreground">{selectedDay.zodiac.energy}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <h4 className="text-sm font-medium text-circe">Moon Phase</h4>
                <p className="mt-1 text-lg">{selectedDay.moonPhase.icon} {selectedDay.moonPhase.name}</p>
                <p className="text-sm text-muted-foreground">{selectedDay.moonPhase.contentTip}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <h4 className="text-sm font-medium text-gold">Cosmic Score</h4>
                <p className="mt-1 text-lg">{selectedDay.cosmicScore}%</p>
                <p className="text-sm text-muted-foreground">
                  {selectedDay.cosmicScore > 70 ? 'Excellent day for content!' : 
                   selectedDay.cosmicScore > 50 ? 'Good energy for posting' : 
                   'Consider lighter content'}
                </p>
              </div>
            </div>
            
            <div className="rounded-lg border border-venus/30 bg-venus/5 p-4">
              <h4 className="flex items-center gap-2 font-medium text-venus">
                <Heart className="h-4 w-4" />
                Content Recommendations
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
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
    </div>
  )
}
