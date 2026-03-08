import { createClient } from '@/lib/supabase/server'
import { ContentHeader } from '@/components/content/content-header'
import { ContentCalendar } from '@/components/content/content-calendar'
import { ContentList } from '@/components/content/content-list'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, List } from 'lucide-react'

export default async function ContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: content } = await supabase
    .from('content')
    .select('*')
    .eq('user_id', user.id)
    .order('scheduled_at', { ascending: true })

  return (
    <div className="space-y-6">
      <ContentHeader />
      
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="bg-secondary">
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
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
