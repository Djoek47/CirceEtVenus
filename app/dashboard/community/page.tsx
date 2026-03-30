import { CommunityTipsFeed } from '@/components/community/community-tips-feed'

/** Creator tips & workflows about Creatix—reviewed before appearing in the feed (admin portal TBD). */
export default function CommunityPage() {
  return (
    <div className="p-4 pb-12 sm:p-6">
      <CommunityTipsFeed />
    </div>
  )
}
