'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, LogOut, User, Settings, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { ThemeToggle } from '@/components/theme-toggle'
import { Notifications } from '@/components/notifications'
import { StartTourButton } from '@/components/tour/start-tour-button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { MobileSidebar } from '@/components/dashboard/mobile-sidebar'

interface HeaderProps {
  user: SupabaseUser
  profile: Profile | null
}

const pageNames: Record<string, string> = {
  '/dashboard': 'Divine Dashboard',
  '/dashboard/divine-manager': 'Divine Manager',
  '/dashboard/ai-studio': 'AI Oracle Chamber',
  '/dashboard/fans': 'Fan Management',
  '/dashboard/content': 'Cosmic Content Calendar',
  '/dashboard/messages': 'Messages',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/protection': "Circe's Protection",
  '/dashboard/mentions': "Venus' Watch",
  '/dashboard/settings': 'Settings',
}

export function DashboardHeader({ user, profile }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  const getPageName = () => {
    for (const [path, name] of Object.entries(pageNames)) {
      if (pathname === path || pathname.startsWith(path + '/')) {
        return name
      }
    }
    return 'Dashboard'
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || user.email?.[0].toUpperCase() || 'U'

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 sm:h-16 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        {mounted ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 min-h-[44px] min-w-[44px] md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <MobileSidebar user={user} profile={profile} />
            </SheetContent>
          </Sheet>
        ) : (
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        )}
        
        <h1 className="text-lg font-semibold text-foreground dark:text-circe sm:text-xl">{getPageName()}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search - hidden on mobile */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search fans, content..."
            className="w-48 bg-input pl-9 xl:w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const q = searchQuery.trim()
                if (!q) return
                // For now, global search lands on Messages with the query,
                // where the conversation list will pre-filter by ?search=
                router.push(`/dashboard/messages?search=${encodeURIComponent(q)}`)
              }
            }}
          />
        </div>

        {/* Page tutorial */}
        <StartTourButton className="hidden sm:flex" />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <Notifications />

        {/* User Menu */}
        {mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-11 w-11 min-h-[44px] min-w-[44px] rounded-full sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0">
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                  <AvatarFallback className="bg-primary dark:bg-circe text-primary-foreground dark:text-circe-foreground text-xs sm:text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {profile?.full_name || 'Creator'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/dashboard/settings" className="flex cursor-pointer items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/dashboard/settings" className="flex cursor-pointer items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="ghost" className="relative h-11 w-11 min-h-[44px] min-w-[44px] rounded-full sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0">
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
              <AvatarFallback className="bg-primary dark:bg-circe text-primary-foreground dark:text-circe-foreground text-xs sm:text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        )}
      </div>
    </header>
  )
}
