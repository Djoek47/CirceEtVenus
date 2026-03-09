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

// Zodiac sign calculator (runs entirely client-side with decrypted data)
export function calculateZodiacSign(birthDate: Date): {
  sign: string
  symbol: string
  element: string
  modality: string
  rulingPlanet: string
  dates: string
} {
  const month = birthDate.getMonth() + 1
  const day = birthDate.getDate()
  
  const zodiacSigns = [
    { sign: 'Capricorn', symbol: '\u2651', element: 'Earth', modality: 'Cardinal', rulingPlanet: 'Saturn', startMonth: 12, startDay: 22, endMonth: 1, endDay: 19, dates: 'Dec 22 - Jan 19' },
    { sign: 'Aquarius', symbol: '\u2652', element: 'Air', modality: 'Fixed', rulingPlanet: 'Uranus', startMonth: 1, startDay: 20, endMonth: 2, endDay: 18, dates: 'Jan 20 - Feb 18' },
    { sign: 'Pisces', symbol: '\u2653', element: 'Water', modality: 'Mutable', rulingPlanet: 'Neptune', startMonth: 2, startDay: 19, endMonth: 3, endDay: 20, dates: 'Feb 19 - Mar 20' },
    { sign: 'Aries', symbol: '\u2648', element: 'Fire', modality: 'Cardinal', rulingPlanet: 'Mars', startMonth: 3, startDay: 21, endMonth: 4, endDay: 19, dates: 'Mar 21 - Apr 19' },
    { sign: 'Taurus', symbol: '\u2649', element: 'Earth', modality: 'Fixed', rulingPlanet: 'Venus', startMonth: 4, startDay: 20, endMonth: 5, endDay: 20, dates: 'Apr 20 - May 20' },
    { sign: 'Gemini', symbol: '\u264A', element: 'Air', modality: 'Mutable', rulingPlanet: 'Mercury', startMonth: 5, startDay: 21, endMonth: 6, endDay: 20, dates: 'May 21 - Jun 20' },
    { sign: 'Cancer', symbol: '\u264B', element: 'Water', modality: 'Cardinal', rulingPlanet: 'Moon', startMonth: 6, startDay: 21, endMonth: 7, endDay: 22, dates: 'Jun 21 - Jul 22' },
    { sign: 'Leo', symbol: '\u264C', element: 'Fire', modality: 'Fixed', rulingPlanet: 'Sun', startMonth: 7, startDay: 23, endMonth: 8, endDay: 22, dates: 'Jul 23 - Aug 22' },
    { sign: 'Virgo', symbol: '\u264D', element: 'Earth', modality: 'Mutable', rulingPlanet: 'Mercury', startMonth: 8, startDay: 23, endMonth: 9, endDay: 22, dates: 'Aug 23 - Sep 22' },
    { sign: 'Libra', symbol: '\u264E', element: 'Air', modality: 'Cardinal', rulingPlanet: 'Venus', startMonth: 9, startDay: 23, endMonth: 10, endDay: 22, dates: 'Sep 23 - Oct 22' },
    { sign: 'Scorpio', symbol: '\u264F', element: 'Water', modality: 'Fixed', rulingPlanet: 'Pluto', startMonth: 10, startDay: 23, endMonth: 11, endDay: 21, dates: 'Oct 23 - Nov 21' },
    { sign: 'Sagittarius', symbol: '\u2650', element: 'Fire', modality: 'Mutable', rulingPlanet: 'Jupiter', startMonth: 11, startDay: 22, endMonth: 12, endDay: 21, dates: 'Nov 22 - Dec 21' },
  ]
  
  for (const zodiac of zodiacSigns) {
    if (zodiac.startMonth === zodiac.endMonth) {
      if (month === zodiac.startMonth && day >= zodiac.startDay && day <= zodiac.endDay) {
        return zodiac
      }
    } else if (zodiac.startMonth > zodiac.endMonth) {
      // Handles Capricorn (Dec-Jan)
      if ((month === zodiac.startMonth && day >= zodiac.startDay) ||
          (month === zodiac.endMonth && day <= zodiac.endDay)) {
        return zodiac
      }
    } else {
      if ((month === zodiac.startMonth && day >= zodiac.startDay) ||
          (month === zodiac.endMonth && day <= zodiac.endDay)) {
        return zodiac
      }
    }
  }
  
  // Default to Capricorn if something goes wrong
  return zodiacSigns[0]
}

// Calculate numerology life path number
export function calculateLifePathNumber(birthDate: Date): {
  number: number
  meaning: string
} {
  const dateStr = birthDate.toISOString().split('T')[0].replace(/-/g, '')
  let sum = dateStr.split('').reduce((acc, digit) => acc + parseInt(digit), 0)
  
  // Reduce to single digit (except master numbers 11, 22, 33)
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split('').reduce((acc, digit) => acc + parseInt(digit), 0)
  }
  
  const meanings: Record<number, string> = {
    1: 'The Leader - Independent, ambitious, innovative',
    2: 'The Mediator - Diplomatic, sensitive, cooperative',
    3: 'The Communicator - Creative, expressive, social',
    4: 'The Builder - Practical, hardworking, stable',
    5: 'The Adventurer - Dynamic, freedom-loving, versatile',
    6: 'The Nurturer - Responsible, caring, harmonious',
    7: 'The Seeker - Analytical, spiritual, introspective',
    8: 'The Achiever - Ambitious, authoritative, successful',
    9: 'The Humanitarian - Compassionate, generous, idealistic',
    11: 'Master Intuitive - Visionary, inspirational, sensitive',
    22: 'Master Builder - Practical visionary, powerful manifestor',
    33: 'Master Teacher - Compassionate leader, selfless service',
  }
  
  return {
    number: sum,
    meaning: meanings[sum] || 'Unknown',
  }
}

// Check if crypto API is available
export function isCryptoSupported(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.crypto !== 'undefined' && 
         typeof window.crypto.subtle !== 'undefined'
}
