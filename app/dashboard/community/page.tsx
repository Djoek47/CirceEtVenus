import { SocialDashboard } from '@/components/social/social-dashboard'
import { CommunityLinksManager } from '@/components/community/community-links-manager'

/** Same promotion hub as `/dashboard/social`, plus optional community link list. */
export default function CommunityPage() {
  return (
    <div className="space-y-12 p-4 pb-10 sm:p-6">
      <SocialDashboard />
      <CommunityLinksManager />
    </div>
  )
}
