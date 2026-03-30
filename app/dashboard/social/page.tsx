import { SocialDashboard } from '@/components/social/social-dashboard'
import { CommunityLinksManager } from '@/components/community/community-links-manager'

export default function SocialPage() {
  return (
    <div className="space-y-12 p-4 pb-10 sm:p-6">
      <SocialDashboard />
      <CommunityLinksManager />
    </div>
  )
}
