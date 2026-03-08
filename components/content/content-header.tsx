'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, Filter } from 'lucide-react'
import Link from 'next/link'

export function ContentHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Content Calendar</h2>
        <p className="text-muted-foreground">
          Schedule and manage your content across platforms
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            className="w-full bg-input pl-9 sm:w-64"
          />
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>All Content</DropdownMenuItem>
              <DropdownMenuItem>Scheduled</DropdownMenuItem>
              <DropdownMenuItem>Published</DropdownMenuItem>
              <DropdownMenuItem>Drafts</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/dashboard/content/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Content
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
