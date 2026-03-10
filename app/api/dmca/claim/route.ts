import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DMCA claim template data
interface DMCAClaimData {
  // Claimant info (pre-filled from user profile)
  claimantName: string
  claimantEmail: string
  claimantAddress?: string
  claimantPhone?: string
  
  // Content owner info
  copyrightOwner: string // Usually same as claimant or platform username
  
  // Infringing content
  infringingUrl: string
  originalContentUrl?: string // Link to original on OnlyFans/Fansly
  contentDescription: string
  
  // Platform info
  platform: string // onlyfans, fansly, etc.
  platformUsername: string
  
  // Leak alert reference (if filing from detected leak)
  leakAlertId?: string
}

// POST: Generate a pre-filled DMCA claim
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: Partial<DMCAClaimData> = await request.json()
    
    // Get user profile for pre-filling
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()
    
    // Get connected platform info for pre-filling
    const { data: connections } = await supabase
      .from('platform_connections')
      .select('platform, platform_username')
      .eq('user_id', user.id)
      .eq('is_connected', true)
    
    // Build the pre-filled claim data
    const claimData: DMCAClaimData = {
      claimantName: body.claimantName || profile?.full_name || user.email?.split('@')[0] || '',
      claimantEmail: body.claimantEmail || profile?.email || user.email || '',
      claimantAddress: body.claimantAddress || '',
      claimantPhone: body.claimantPhone || '',
      copyrightOwner: body.copyrightOwner || connections?.[0]?.platform_username || profile?.full_name || '',
      infringingUrl: body.infringingUrl || '',
      originalContentUrl: body.originalContentUrl || '',
      contentDescription: body.contentDescription || 'Original adult content created exclusively for my subscribers on my official platform profile.',
      platform: body.platform || connections?.[0]?.platform || 'onlyfans',
      platformUsername: body.platformUsername || connections?.[0]?.platform_username || '',
      leakAlertId: body.leakAlertId,
    }
    
    // If this is from a leak alert, get that data
    if (body.leakAlertId) {
      const { data: leakAlert } = await supabase
        .from('leak_alerts')
        .select('*')
        .eq('id', body.leakAlertId)
        .eq('user_id', user.id)
        .single()
      
      if (leakAlert) {
        claimData.infringingUrl = leakAlert.source_url
        claimData.platform = leakAlert.platform || claimData.platform
      }
    }
    
    // Generate the DMCA notice text
    const dmcaNotice = generateDMCANotice(claimData)
    
    // Save the claim to database
    const { data: savedClaim, error: saveError } = await supabase
      .from('dmca_claims')
      .insert({
        user_id: user.id,
        leak_alert_id: claimData.leakAlertId || null,
        infringing_url: claimData.infringingUrl,
        platform: claimData.platform,
        platform_username: claimData.platformUsername,
        claimant_name: claimData.claimantName,
        claimant_email: claimData.claimantEmail,
        status: 'draft',
        notice_text: dmcaNotice,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
    
    if (saveError) {
      console.error('Failed to save DMCA claim:', saveError)
    }
    
    return NextResponse.json({
      success: true,
      claim: claimData,
      notice: dmcaNotice,
      claimId: savedClaim?.id,
      connectedPlatforms: connections?.map(c => ({
        platform: c.platform,
        username: c.platform_username
      })) || []
    })

  } catch (error) {
    console.error('DMCA claim error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate claim' 
    }, { status: 500 })
  }
}

// GET: Get user's DMCA claims history
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: claims } = await supabase
      .from('dmca_claims')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ claims: claims || [] })

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 })
  }
}

// Generate a proper DMCA takedown notice
function generateDMCANotice(data: DMCAClaimData): string {
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  return `DMCA TAKEDOWN NOTICE

Date: ${date}

To Whom It May Concern,

I am writing to notify you of copyright infringement occurring on your platform/website.

CLAIMANT INFORMATION:
Name: ${data.claimantName}
Email: ${data.claimantEmail}
${data.claimantAddress ? `Address: ${data.claimantAddress}` : ''}
${data.claimantPhone ? `Phone: ${data.claimantPhone}` : ''}

COPYRIGHT OWNER:
${data.copyrightOwner}
Official Platform: ${data.platform === 'onlyfans' ? 'OnlyFans' : data.platform === 'fansly' ? 'Fansly' : data.platform}
Profile: ${data.platformUsername ? `@${data.platformUsername}` : 'N/A'}
${data.originalContentUrl ? `Original Content URL: ${data.originalContentUrl}` : ''}

INFRINGING MATERIAL:
URL of infringing content: ${data.infringingUrl}

DESCRIPTION OF COPYRIGHTED WORK:
${data.contentDescription}

STATEMENT OF GOOD FAITH:
I have a good faith belief that the use of the copyrighted material described above is not authorized by the copyright owner, its agent, or the law.

STATEMENT OF ACCURACY:
I swear, under penalty of perjury, that the information in this notification is accurate and that I am the copyright owner or am authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.

SIGNATURE:
${data.claimantName}

---
This notice is being sent pursuant to the Digital Millennium Copyright Act (17 U.S.C. § 512).
`
}
