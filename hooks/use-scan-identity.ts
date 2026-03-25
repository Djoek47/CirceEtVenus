'use client'

import { useCallback, useEffect, useState } from 'react'

export type ScanIdentityHandleRow = {
  value: string
  source: string
  label: string
}

export type ScanContentTitleRow = {
  id: string
  title: string
}

export function useScanIdentity() {
  const [handles, setHandles] = useState<ScanIdentityHandleRow[]>([])
  const [contentTitles, setContentTitles] = useState<ScanContentTitleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/user/scan-identity')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to load identity')
        setHandles([])
        setContentTitles([])
        return
      }
      setHandles(Array.isArray(data.handles) ? data.handles : [])
      setContentTitles(Array.isArray(data.contentTitles) ? data.contentTitles : [])
    } catch {
      setError('Failed to load identity')
      setHandles([])
      setContentTitles([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { handles, contentTitles, loading, error, reload }
}
