import { CommunityTipsFeed } from '@/components/community/community-tips-feed'
import { CirceDailyPromo } from '@/components/community/circe-daily-promo'

/** Creator tips & workflows about Creatix—reviewed before appearing in the feed (admin portal TBD). */
export default function CommunityPage() {
  return (
    <div className="space-y-8 p-4 pb-12 sm:p-6">
      <h1 className="sr-only">Community</h1>
      <CirceDailyPromo />
      <CommunityTipsFeed />
    </div>
  )
}
