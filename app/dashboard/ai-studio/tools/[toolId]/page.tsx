'use client'

import { useParams } from 'next/navigation'
import { AIToolsSelector } from '@/components/ai/ai-tools-selector'

export default function ToolRunnerPage() {
  const params = useParams()
  const toolId = typeof params?.toolId === 'string' ? params.toolId : ''

  return (
    <div className="space-y-6">
      <AIToolsSelector
        initialToolId={toolId || undefined}
        backHref="/dashboard/ai-studio/tools"
      />
    </div>
  )
}
