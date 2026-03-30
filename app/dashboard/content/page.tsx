import { createClient } from '@/lib/supabase/server'
import { ContentHeader } from '@/components/content/content-header'
import { ContentCalendar } from '@/components/content/content-calendar'
import { ContentList } from '@/components/content/content-list'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, List, Heart } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function ContentPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: content } = await supabase
    .from('content')
    .select('*')
    .eq('user_id', user.id)
    .order('scheduled_at', { ascending: true })

  return (
    <div className="space-y-6">
      <ContentHeader />

      <Card className="border-gold/40 bg-gradient-to-r from-gold/10 via-amber-500/5 to-transparent">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-gold">
              <Heart className="h-5 w-5" />
              Standard of Attraction (Pro)
            </CardTitle>
            <CardDescription>
              Let Venus and Circe brutally rate which pieces of content will actually sell in your niche before you post.
            </CardDescription>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-gradient-to-r from-circe to-venus text-white hover:opacity-90"
          >
            <Link href="/dashboard/ai-studio/tools/standard-of-attraction">Open Pro Tool</Link>
          </Button>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Use this before scheduling big drops to compare old vs new photos and choose the highest-earning look.
        </CardContent>
      </Card>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="bg-secondary">
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            List View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <ContentCalendar content={content || []} />
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <ContentList content={content || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
