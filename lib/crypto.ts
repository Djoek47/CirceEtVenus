'use client'

/**
 * Client-Side Encryption for Sensitive Personal Data
 * 
 * This module provides end-to-end encryption for sensitive user data like birthdays.
 * The encryption key is derived from the user's ID combined with a user-provided passphrase.
 * This means:
 * - The server only stores encrypted data
 * - Even database admins cannot decrypt the data
 * - Only the user with their passphrase can access the original data
 */

// Convert string to ArrayBuffer
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder()
  return encoder.encode(str).buffer
}

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Derive a cryptographic key from user ID and passphrase
async function deriveKey(userId: string, passphrase: string): Promise<CryptoKey> {
  // Create a unique salt by combining user ID with a static app salt
  const salt = stringToArrayBuffer(`circe-venus-${userId}-cosmic-vault`)
  
  // Import the passphrase as a key
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(passphrase),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )
  
  // Derive a 256-bit AES key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000, // High iteration count for security
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Encrypt data
export async function encryptData(
  data: string,
  userId: string,
  passphrase: string
): Promise<string> {
  try {
    const key = await deriveKey(userId, passphrase)
    
    // Generate a random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      stringToArrayBuffer(data)
    )
    
    // Combine IV and encrypted data, then encode as base64
    const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encrypted), iv.length)
    
    return arrayBufferToBase64(combined.buffer)
  } catch (error) {
    console.error('Encryption failed:', error)
    throw new Error('Failed to encrypt data')
  }
}

// Decrypt data
export async function decryptData(
  encryptedData: string,
  userId: string,
  passphrase: string
): Promise<string> {
  try {
    const key = await deriveKey(userId, passphrase)
    
    // Decode the base64 and extract IV and encrypted data
    const combined = new Uint8Array(base64ToArrayBuffer(encryptedData))
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)
    
    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    )
    
    // Convert back to string
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    console.error('Decryption failed:', error)
    throw new Error('Failed to decrypt data - incorrect passphrase or corrupted data')
  }
}

// Hash the passphrase for verification (so we can check if user enters correct one)
export async function hashPassphrase(passphrase: string, userId: string): Promise<string> {
  const data = stringToArrayBuffer(`${userId}-${passphrase}-verification`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return arrayBufferToBase64(hash)
}

// Birthday data structure with time precision
export interface BirthdayData {
  date: string // ISO date string
  time?: string // Optional time in HH:MM format
  includesTime: boolean
}

// Comprehensive zodiac information
export interface ZodiacInfo {
  sign: string
  symbol: string
  element: string
  elementSymbol: string
  modality: string
  rulingPlanet: string
  planetSymbol: string
  dates: string
  traits: string[]
  compatibleSigns: string[]
  luckyNumbers: number[]
  luckyDay: string
  color: string
  gemstone: string
}

// Full birth chart reading
export interface BirthChartReading {
  sunSign: ZodiacInfo
  birthTime: 'day' | 'night' | 'unknown'
  dayOrNightBorn: string
  lifePathNumber: number
  lifePathMeaning: string
  personalYear: number
  personalYearMeaning: string
  chineseZodiac: { animal: string; element: string; symbol: string }
  birthstone: string
  birthFlower: string
  dayOfWeek: string
  dayMeaning: string
  seasonBorn: string
  moonPhaseAtBirth: string
  cosmicAdvice: string[]
  contentTiming: ContentTimingAdvice
}

export interface ContentTimingAdvice {
  bestPostingDays: string[]
  luckyHours: string[]
  avoidDays: string[]
  monthlyPowerDays: number[]
  retrogradeWarning: string
}

// Zodiac sign calculator with full info
export function calculateZodiacSign(birthDate: Date): ZodiacInfo {
  const month = birthDate.getMonth() + 1
  const day = birthDate.getDate()
  
  const zodiacSigns: ZodiacInfo[] = [
    { 
      sign: 'Capricorn', symbol: '\u2651', element: 'Earth', elementSymbol: '\u{1F30D}',
      modality: 'Cardinal', rulingPlanet: 'Saturn', planetSymbol: '\u2644',
      dates: 'Dec 22 - Jan 19',
      traits: ['Ambitious', 'Disciplined', 'Patient', 'Practical'],
      compatibleSigns: ['Taurus', 'Virgo', 'Scorpio', 'Pisces'],
      luckyNumbers: [4, 8, 13, 22], luckyDay: 'Saturday',
      color: 'Brown', gemstone: 'Garnet'
    },
    { 
      sign: 'Aquarius', symbol: '\u2652', element: 'Air', elementSymbol: '\u{1F4A8}',
      modality: 'Fixed', rulingPlanet: 'Uranus', planetSymbol: '\u2645',
      dates: 'Jan 20 - Feb 18',
      traits: ['Innovative', 'Independent', 'Humanitarian', 'Original'],
      compatibleSigns: ['Gemini', 'Libra', 'Aries', 'Sagittarius'],
      luckyNumbers: [4, 7, 11, 22], luckyDay: 'Saturday',
      color: 'Electric Blue', gemstone: 'Amethyst'
    },
    { 
      sign: 'Pisces', symbol: '\u2653', element: 'Water', elementSymbol: '\u{1F30A}',
      modality: 'Mutable', rulingPlanet: 'Neptune', planetSymbol: '\u2646',
      dates: 'Feb 19 - Mar 20',
      traits: ['Intuitive', 'Compassionate', 'Artistic', 'Dreamy'],
      compatibleSigns: ['Cancer', 'Scorpio', 'Taurus', 'Capricorn'],
      luckyNumbers: [3, 9, 12, 15], luckyDay: 'Thursday',
      color: 'Sea Green', gemstone: 'Aquamarine'
    },
    { 
      sign: 'Aries', symbol: '\u2648', element: 'Fire', elementSymbol: '\u{1F525}',
      modality: 'Cardinal', rulingPlanet: 'Mars', planetSymbol: '\u2642',
      dates: 'Mar 21 - Apr 19',
      traits: ['Confident', 'Courageous', 'Enthusiastic', 'Passionate'],
      compatibleSigns: ['Leo', 'Sagittarius', 'Gemini', 'Aquarius'],
      luckyNumbers: [1, 8, 17], luckyDay: 'Tuesday',
      color: 'Red', gemstone: 'Diamond'
    },
    { 
      sign: 'Taurus', symbol: '\u2649', element: 'Earth', elementSymbol: '\u{1F30D}',
      modality: 'Fixed', rulingPlanet: 'Venus', planetSymbol: '\u2640',
      dates: 'Apr 20 - May 20',
      traits: ['Reliable', 'Patient', 'Sensual', 'Determined'],
      compatibleSigns: ['Virgo', 'Capricorn', 'Cancer', 'Pisces'],
      luckyNumbers: [2, 6, 9, 12], luckyDay: 'Friday',
      color: 'Green', gemstone: 'Emerald'
    },
    { 
      sign: 'Gemini', symbol: '\u264A', element: 'Air', elementSymbol: '\u{1F4A8}',
      modality: 'Mutable', rulingPlanet: 'Mercury', planetSymbol: '\u263F',
      dates: 'May 21 - Jun 20',
      traits: ['Versatile', 'Curious', 'Communicative', 'Witty'],
      compatibleSigns: ['Libra', 'Aquarius', 'Aries', 'Leo'],
      luckyNumbers: [5, 7, 14, 23], luckyDay: 'Wednesday',
      color: 'Yellow', gemstone: 'Pearl'
    },
    { 
      sign: 'Cancer', symbol: '\u264B', element: 'Water', elementSymbol: '\u{1F30A}',
      modality: 'Cardinal', rulingPlanet: 'Moon', planetSymbol: '\u263D',
      dates: 'Jun 21 - Jul 22',
      traits: ['Nurturing', 'Protective', 'Intuitive', 'Emotional'],
      compatibleSigns: ['Scorpio', 'Pisces', 'Taurus', 'Virgo'],
      luckyNumbers: [2, 3, 15, 20], luckyDay: 'Monday',
      color: 'Silver', gemstone: 'Ruby'
    },
    { 
      sign: 'Leo', symbol: '\u264C', element: 'Fire', elementSymbol: '\u{1F525}',
      modality: 'Fixed', rulingPlanet: 'Sun', planetSymbol: '\u2609',
      dates: 'Jul 23 - Aug 22',
      traits: ['Charismatic', 'Generous', 'Creative', 'Dramatic'],
      compatibleSigns: ['Aries', 'Sagittarius', 'Gemini', 'Libra'],
      luckyNumbers: [1, 3, 10, 19], luckyDay: 'Sunday',
      color: 'Gold', gemstone: 'Peridot'
    },
    { 
      sign: 'Virgo', symbol: '\u264D', element: 'Earth', elementSymbol: '\u{1F30D}',
      modality: 'Mutable', rulingPlanet: 'Mercury', planetSymbol: '\u263F',
      dates: 'Aug 23 - Sep 22',
      traits: ['Analytical', 'Practical', 'Helpful', 'Perfectionist'],
      compatibleSigns: ['Taurus', 'Capricorn', 'Cancer', 'Scorpio'],
      luckyNumbers: [5, 14, 15, 23], luckyDay: 'Wednesday',
      color: 'Navy Blue', gemstone: 'Sapphire'
    },
    { 
      sign: 'Libra', symbol: '\u264E', element: 'Air', elementSymbol: '\u{1F4A8}',
      modality: 'Cardinal', rulingPlanet: 'Venus', planetSymbol: '\u2640',
      dates: 'Sep 23 - Oct 22',
      traits: ['Diplomatic', 'Harmonious', 'Charming', 'Fair'],
      compatibleSigns: ['Gemini', 'Aquarius', 'Leo', 'Sagittarius'],
      luckyNumbers: [4, 6, 13, 15], luckyDay: 'Friday',
      color: 'Pink', gemstone: 'Opal'
    },
    { 
      sign: 'Scorpio', symbol: '\u264F', element: 'Water', elementSymbol: '\u{1F30A}',
      modality: 'Fixed', rulingPlanet: 'Pluto', planetSymbol: '\u2647',
      dates: 'Oct 23 - Nov 21',
      traits: ['Intense', 'Passionate', 'Resourceful', 'Magnetic'],
      compatibleSigns: ['Cancer', 'Pisces', 'Virgo', 'Capricorn'],
      luckyNumbers: [8, 11, 18, 22], luckyDay: 'Tuesday',
      color: 'Burgundy', gemstone: 'Topaz'
    },
    { 
      sign: 'Sagittarius', symbol: '\u2650', element: 'Fire', elementSymbol: '\u{1F525}',
      modality: 'Mutable', rulingPlanet: 'Jupiter', planetSymbol: '\u2643',
      dates: 'Nov 22 - Dec 21',
      traits: ['Adventurous', 'Optimistic', 'Philosophical', 'Free-spirited'],
      compatibleSigns: ['Aries', 'Leo', 'Libra', 'Aquarius'],
      luckyNumbers: [3, 7, 9, 12], luckyDay: 'Thursday',
      color: 'Purple', gemstone: 'Turquoise'
    },
  ]
  
  for (const zodiac of zodiacSigns) {
    const [startPart, endPart] = zodiac.dates.split(' - ')
    const startMonth = getMonthNumber(startPart.split(' ')[0])
    const startDay = parseInt(startPart.split(' ')[1])
    const endMonth = getMonthNumber(endPart.split(' ')[0])
    const endDay = parseInt(endPart.split(' ')[1])
    
    if (startMonth > endMonth) {
      // Handles Capricorn (Dec-Jan)
      if ((month === startMonth && day >= startDay) ||
          (month === endMonth && day <= endDay)) {
        return zodiac
      }
    } else {
      if ((month === startMonth && day >= startDay) ||
          (month === endMonth && day <= endDay) ||
          (month > startMonth && month < endMonth)) {
        return zodiac
      }
    }
  }
  
  return zodiacSigns[0]
}

function getMonthNumber(monthName: string): number {
  const months: Record<string, number> = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
  }
  return months[monthName] || 1
}

// Determine if birth was during day or night
export function determineDayOrNight(birthTime?: string): 'day' | 'night' | 'unknown' {
  if (!birthTime) return 'unknown'
  
  const [hours] = birthTime.split(':').map(Number)
  
  // Sunrise ~6am, Sunset ~6pm (simplified)
  if (hours >= 6 && hours < 18) {
    return 'day'
  } else {
    return 'night'
  }
}

// Get day/night born description
export function getDayNightDescription(dayOrNight: 'day' | 'night' | 'unknown'): string {
  switch (dayOrNight) {
    case 'day':
      return 'Day-born soul - Solar energy dominant. You thrive in the spotlight and radiate warmth. Best for bold, confident content. Venus favors your visibility.'
    case 'night':
      return 'Night-born soul - Lunar energy dominant. You possess mysterious allure and depth. Best for intimate, mystical content. Circe enhances your enchantment powers.'
    default:
      return 'Birth time unknown - General cosmic guidance applies. Add your birth time for precise day/night readings.'
  }
}

// Calculate numerology life path number
export function calculateLifePathNumber(birthDate: Date): {
  number: number
  meaning: string
} {
  const year = birthDate.getFullYear()
  const month = birthDate.getMonth() + 1
  const day = birthDate.getDate()
  
  // Reduce each component
  const reduceToSingle = (num: number): number => {
    while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
      num = num.toString().split('').reduce((a, b) => a + parseInt(b), 0)
    }
    return num
  }
  
  const reducedYear = reduceToSingle(year)
  const reducedMonth = reduceToSingle(month)
  const reducedDay = reduceToSingle(day)
  
  let sum = reducedYear + reducedMonth + reducedDay
  sum = reduceToSingle(sum)
  
  const meanings: Record<number, string> = {
    1: 'The Leader - Independent, ambitious, pioneering spirit. You attract followers naturally.',
    2: 'The Mediator - Diplomatic, intuitive, partnership-oriented. You create harmony.',
    3: 'The Communicator - Creative, expressive, joyful. You captivate through words and art.',
    4: 'The Builder - Reliable, disciplined, grounded. You create lasting foundations.',
    5: 'The Adventurer - Dynamic, versatile, freedom-loving. You inspire through experience.',
    6: 'The Nurturer - Caring, responsible, harmonious. You attract through warmth.',
    7: 'The Seeker - Mystical, analytical, introspective. You draw others to your wisdom.',
    8: 'The Powerhouse - Ambitious, authoritative, abundant. You manifest success.',
    9: 'The Humanitarian - Compassionate, idealistic, worldly. You inspire transformation.',
    11: 'Master Intuitive - Visionary, inspirational, highly sensitive. You channel divine messages.',
    22: 'Master Builder - Powerful manifestor, practical visionary. You create empires.',
    33: 'Master Teacher - Spiritual guide, selfless leader. You elevate humanity.',
  }
  
  return {
    number: sum,
    meaning: meanings[sum] || 'Unknown',
  }
}

// Calculate personal year number
export function calculatePersonalYear(birthDate: Date): {
  year: number
  meaning: string
} {
  const currentYear = new Date().getFullYear()
  const month = birthDate.getMonth() + 1
  const day = birthDate.getDate()
  
  const reduceToSingle = (num: number): number => {
    while (num > 9) {
      num = num.toString().split('').reduce((a, b) => a + parseInt(b), 0)
    }
    return num
  }
  
  const yearNum = reduceToSingle(currentYear) + reduceToSingle(month) + reduceToSingle(day)
  const personalYear = reduceToSingle(yearNum)
  
  const meanings: Record<number, string> = {
    1: 'New Beginnings - Launch new projects, rebrand, start fresh. High energy for bold moves.',
    2: 'Patience & Partnership - Collaborate, nurture relationships, build slowly. Focus on connections.',
    3: 'Creativity & Expression - Create, communicate, expand your reach. Joy attracts abundance.',
    4: 'Foundation Building - Structure, organize, work hard. Build systems that last.',
    5: 'Change & Freedom - Embrace transformation, travel, try new things. Exciting opportunities.',
    6: 'Home & Harmony - Focus on beauty, relationships, self-care. Nurture your space.',
    7: 'Reflection & Wisdom - Go inward, study, develop spiritually. Quality over quantity.',
    8: 'Power & Abundance - Manifest wealth, take charge, claim authority. Financial growth.',
    9: 'Completion & Release - Let go of what no longer serves, prepare for new cycle. Endings lead to beginnings.',
  }
  
  return {
    year: personalYear,
    meaning: meanings[personalYear] || 'Unknown',
  }
}

// Calculate Chinese Zodiac
export function calculateChineseZodiac(birthDate: Date): {
  animal: string
  element: string
  symbol: string
  traits: string[]
} {
  const year = birthDate.getFullYear()
  
  const animals = [
    { animal: 'Rat', symbol: '\u{1F400}', traits: ['Quick-witted', 'Resourceful', 'Charming'] },
    { animal: 'Ox', symbol: '\u{1F402}', traits: ['Dependable', 'Strong', 'Determined'] },
    { animal: 'Tiger', symbol: '\u{1F405}', traits: ['Brave', 'Confident', 'Competitive'] },
    { animal: 'Rabbit', symbol: '\u{1F407}', traits: ['Gentle', 'Elegant', 'Alert'] },
    { animal: 'Dragon', symbol: '\u{1F409}', traits: ['Confident', 'Intelligent', 'Enthusiastic'] },
    { animal: 'Snake', symbol: '\u{1F40D}', traits: ['Enigmatic', 'Intelligent', 'Wise'] },
    { animal: 'Horse', symbol: '\u{1F40E}', traits: ['Animated', 'Active', 'Energetic'] },
    { animal: 'Goat', symbol: '\u{1F410}', traits: ['Calm', 'Creative', 'Thoughtful'] },
    { animal: 'Monkey', symbol: '\u{1F412}', traits: ['Sharp', 'Curious', 'Mischievous'] },
    { animal: 'Rooster', symbol: '\u{1F413}', traits: ['Observant', 'Hardworking', 'Confident'] },
    { animal: 'Dog', symbol: '\u{1F415}', traits: ['Loyal', 'Honest', 'Prudent'] },
    { animal: 'Pig', symbol: '\u{1F416}', traits: ['Compassionate', 'Generous', 'Diligent'] },
  ]
  
  const elements = ['Metal', 'Metal', 'Water', 'Water', 'Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth']
  
  const animalIndex = (year - 4) % 12
  const elementIndex = (year - 4) % 10
  
  return {
    ...animals[animalIndex],
    element: elements[elementIndex],
  }
}

// Get birthstone by month
export function getBirthstone(month: number): string {
  const birthstones = [
    'Garnet', 'Amethyst', 'Aquamarine', 'Diamond', 'Emerald', 'Pearl',
    'Ruby', 'Peridot', 'Sapphire', 'Opal', 'Topaz', 'Turquoise'
  ]
  return birthstones[month - 1] || 'Unknown'
}

// Get birth flower by month
export function getBirthFlower(month: number): string {
  const flowers = [
    'Carnation', 'Violet', 'Daffodil', 'Daisy', 'Lily of the Valley', 'Rose',
    'Larkspur', 'Gladiolus', 'Aster', 'Marigold', 'Chrysanthemum', 'Narcissus'
  ]
  return flowers[month - 1] || 'Unknown'
}

// Get day of week meaning
export function getDayOfWeekMeaning(dayOfWeek: number): { day: string; meaning: string } {
  const days = [
    { day: 'Sunday', meaning: 'Solar child - Natural performer, creative, meant to shine' },
    { day: 'Monday', meaning: 'Moon child - Intuitive, emotional, deeply connected to cycles' },
    { day: 'Tuesday', meaning: 'Mars child - Energetic, passionate, driven to action' },
    { day: 'Wednesday', meaning: 'Mercury child - Communicator, quick thinker, versatile' },
    { day: 'Thursday', meaning: 'Jupiter child - Lucky, expansive, philosophical' },
    { day: 'Friday', meaning: 'Venus child - Artistic, loving, destined for beauty' },
    { day: 'Saturday', meaning: 'Saturn child - Disciplined, wise, builds lasting legacy' },
  ]
  return days[dayOfWeek]
}

// Get season born
export function getSeasonBorn(month: number): string {
  if (month >= 3 && month <= 5) return 'Spring - Renewal energy, fresh starts, growth-oriented'
  if (month >= 6 && month <= 8) return 'Summer - Peak energy, visibility, boldness'
  if (month >= 9 && month <= 11) return 'Autumn - Harvest energy, reaping rewards, transformation'
  return 'Winter - Introspective energy, depth, mystery'
}

// Calculate approximate moon phase at birth (simplified)
export function getMoonPhaseAtBirth(birthDate: Date): string {
  const knownNewMoon = new Date('2000-01-06').getTime()
  const lunarCycle = 29.53059 * 24 * 60 * 60 * 1000 // in milliseconds
  
  const diff = birthDate.getTime() - knownNewMoon
  const dayInCycle = (diff % lunarCycle) / (24 * 60 * 60 * 1000)
  
  if (dayInCycle < 1.85) return 'New Moon - Hidden power, new beginnings, mystery'
  if (dayInCycle < 7.38) return 'Waxing Crescent - Growing potential, intention-setting'
  if (dayInCycle < 11.07) return 'First Quarter - Action-oriented, decisive, dynamic'
  if (dayInCycle < 14.76) return 'Waxing Gibbous - Refinement, almost there, perfectionist'
  if (dayInCycle < 16.61) return 'Full Moon - Maximum visibility, emotional, magnetic'
  if (dayInCycle < 22.14) return 'Waning Gibbous - Sharing wisdom, teaching, gratitude'
  if (dayInCycle < 25.83) return 'Last Quarter - Release, reflection, letting go'
  return 'Waning Crescent - Surrender, rest, preparing for rebirth'
}

// Generate cosmic content advice based on birth chart
export function generateCosmicAdvice(zodiac: ZodiacInfo, dayOrNight: 'day' | 'night' | 'unknown', lifePathNumber: number): string[] {
  const advice: string[] = []
  
  // Element-based advice
  switch (zodiac.element) {
    case 'Fire':
      advice.push('Your fiery nature thrives on bold, action-oriented content. Show your passionate side.')
      break
    case 'Earth':
      advice.push('Your grounded energy attracts through authenticity and sensuality. Focus on quality and luxury.')
      break
    case 'Air':
      advice.push('Your intellectual charm shines through witty captions and engaging conversations.')
      break
    case 'Water':
      advice.push('Your emotional depth creates intimate connections. Use mood and atmosphere.')
      break
  }
  
  // Day/Night advice
  if (dayOrNight === 'day') {
    advice.push('As a day-born soul, post during daylight hours for maximum engagement. Your solar energy attracts visibility.')
  } else if (dayOrNight === 'night') {
    advice.push('As a night-born soul, evening posts resonate with your energy. Your lunar mystery captivates after dark.')
  }
  
  // Life path advice
  if (lifePathNumber === 1 || lifePathNumber === 8) {
    advice.push('Your leadership energy commands premium pricing. Confidence is your currency.')
  } else if (lifePathNumber === 3 || lifePathNumber === 5) {
    advice.push('Variety and creativity boost your engagement. Keep content fresh and playful.')
  } else if (lifePathNumber === 6 || lifePathNumber === 2) {
    advice.push('Relationship-focused content builds your loyal following. Nurture your connections.')
  }
  
  // Ruling planet advice
  if (zodiac.rulingPlanet === 'Venus') {
    advice.push('Venus blesses you with natural allure. Aesthetic beauty is your superpower.')
  } else if (zodiac.rulingPlanet === 'Mars') {
    advice.push('Mars gives you magnetic intensity. Channel your passion into compelling content.')
  } else if (zodiac.rulingPlanet === 'Moon') {
    advice.push('The Moon enhances your intuition. Trust your instincts on content timing.')
  }
  
  return advice
}

// Generate content timing advice
export function generateContentTimingAdvice(zodiac: ZodiacInfo): ContentTimingAdvice {
  const luckyDay = zodiac.luckyDay
  const luckyNumbers = zodiac.luckyNumbers
  
  // Map lucky day to posting schedule
  const dayMap: Record<string, string[]> = {
    'Sunday': ['Sunday', 'Tuesday', 'Thursday'],
    'Monday': ['Monday', 'Wednesday', 'Friday'],
    'Tuesday': ['Tuesday', 'Thursday', 'Saturday'],
    'Wednesday': ['Wednesday', 'Friday', 'Sunday'],
    'Thursday': ['Thursday', 'Saturday', 'Monday'],
    'Friday': ['Friday', 'Sunday', 'Tuesday'],
    'Saturday': ['Saturday', 'Monday', 'Wednesday'],
  }
  
  // Challenging days (opposite energy)
  const avoidMap: Record<string, string[]> = {
    'Sunday': ['Saturday'],
    'Monday': ['Sunday'],
    'Tuesday': ['Monday'],
    'Wednesday': ['Tuesday'],
    'Thursday': ['Wednesday'],
    'Friday': ['Thursday'],
    'Saturday': ['Friday'],
  }
  
  return {
    bestPostingDays: dayMap[luckyDay] || ['Friday', 'Sunday'],
    luckyHours: ['10:00 AM', '3:00 PM', '9:00 PM'],
    avoidDays: avoidMap[luckyDay] || [],
    monthlyPowerDays: luckyNumbers.filter(n => n <= 28),
    retrogradeWarning: 'During Mercury retrograde, avoid launching new content. Focus on connection with existing fans.',
  }
}

// Generate full birth chart reading
export function generateBirthChartReading(birthDate: Date, birthTime?: string): BirthChartReading {
  const zodiac = calculateZodiacSign(birthDate)
  const dayOrNight = determineDayOrNight(birthTime)
  const lifePath = calculateLifePathNumber(birthDate)
  const personalYear = calculatePersonalYear(birthDate)
  const chineseZodiac = calculateChineseZodiac(birthDate)
  const month = birthDate.getMonth() + 1
  const dayOfWeek = birthDate.getDay()
  
  return {
    sunSign: zodiac,
    birthTime: dayOrNight,
    dayOrNightBorn: getDayNightDescription(dayOrNight),
    lifePathNumber: lifePath.number,
    lifePathMeaning: lifePath.meaning,
    personalYear: personalYear.year,
    personalYearMeaning: personalYear.meaning,
    chineseZodiac,
    birthstone: getBirthstone(month),
    birthFlower: getBirthFlower(month),
    dayOfWeek: getDayOfWeekMeaning(dayOfWeek).day,
    dayMeaning: getDayOfWeekMeaning(dayOfWeek).meaning,
    seasonBorn: getSeasonBorn(month),
    moonPhaseAtBirth: getMoonPhaseAtBirth(birthDate),
    cosmicAdvice: generateCosmicAdvice(zodiac, dayOrNight, lifePath.number),
    contentTiming: generateContentTimingAdvice(zodiac),
  }
}

// Check if crypto API is available
export function isCryptoSupported(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.crypto !== 'undefined' && 
         typeof window.crypto.subtle !== 'undefined'
}
