'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { ScanIdentityHandleRow } from '@/hooks/use-scan-identity'

type Props = {
  handles: ScanIdentityHandleRow[]
  useAll: boolean
  onUseAllChange: (v: boolean) => void
  selected: Set<string>
  onToggle: (value: string) => void
  idPrefix?: string
}

export function ScanHandlePicker({
  handles,
  useAll,
  onUseAllChange,
  selected,
  onToggle,
  idPrefix = 'scan-handle',
}: Props) {
  if (handles.length === 0) return null

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3 text-xs">
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${idPrefix}-all`}
          checked={useAll}
          onCheckedChange={(c) => onUseAllChange(c === true)}
        />
        <Label htmlFor={`${idPrefix}-all`} className="cursor-pointer font-medium">
          All identities
        </Label>
      </div>
      {!useAll && (
        <div className="max-h-48 space-y-2 overflow-y-auto pl-1">
          {handles.map((h) => (
            <div key={`${h.source}-${h.value}`} className="flex items-center gap-2">
              <Checkbox
                id={`${idPrefix}-${h.value}`}
                checked={selected.has(h.value)}
                onCheckedChange={() => onToggle(h.value)}
              />
              <Label
                htmlFor={`${idPrefix}-${h.value}`}
                className="cursor-pointer font-normal leading-tight"
              >
                {h.label}
              </Label>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
