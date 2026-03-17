'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemedLogo } from '@/components/themed-logo'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  BarChart3,
  Shield,
  TrendingUp,
  Settings,
  Moon,
  Sun,
  Star,
  Crown,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { SheetClose } from '@/components/ui/sheet'

interface MobileSidebarProps {
  user: User
  profile: Profile | null
}

const circeNavigation = [
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Protection', href: '/dashboard/protection', icon: Shield },
]

const venusNavigation = [
  { name: 'Fans', href: '/dashboard/fans', icon: Users },
  { name: 'Mentions', href: '/dashboard/mentions', icon: TrendingUp },
]

const silverNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Divine Manager', href: '/dashboard/divine-manager', icon: Crown },
  { name: 'Content', href: '/dashboard/content', icon: Calendar },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
]

const aiStudioNavigation = [
  { name: 'AI Studio', href: '/dashboard/ai-studio', icon: Star },
]

const bottomNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function MobileSidebar({ profile }: MobileSidebarProps) {
  const pathname = usePathname()

  const NavLink = ({ item, variant = 'default' }: { item: typeof silverNavigation[0], variant?: 'default' | 'circe' | 'venus' | 'ai-studio' }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    const isAiStudio = variant === 'ai-studio'
    
    const variantStyles = {
      default: {
        // Black in light mode, white/silver in dark mode
        active: 'bg-foreground/10 text-foreground',
        inactive: 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground',
        icon: 'text-foreground'
      },
      circe: {
        active: 'bg-circe/20 text-circe-light',
        inactive: 'text-foreground/70 hover:bg-circe/10 hover:text-circe-light',
        icon: 'text-circe-light'
      },
      venus: {
        // Gold for Venus
        active: 'bg-amber-500/20 text-amber-500 dark:text-amber-400',
        inactive: 'text-amber-600/70 dark:text-amber-500/70 hover:bg-amber-500/10 hover:text-amber-500 dark:hover:text-amber-400',
        icon: 'text-amber-500 dark:text-amber-400'
      },
      'ai-studio': {
        // Rainbow/multicolor animated
        active: 'bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 animate-gradient-x',
        inactive: 'text-foreground/70 hover:bg-gradient-to-r hover:from-pink-500/10 hover:via-purple-500/10 hover:to-cyan-500/10',
        icon: 'text-purple-500'
      }
    }
    
    const styles = variantStyles[variant]
    
    return (
      <SheetClose asChild>
        <Link
          href={item.href}
          className={cn(
            'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
            isActive ? styles.active : styles.inactive
          )}
        >
          <item.icon className={cn(
            'h-5 w-5 flex-shrink-0', 
            isActive && styles.icon,
            isAiStudio && 'animate-hue-rotate'
          )} />
          <span className={cn(
            isAiStudio && isActive && 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent'
          )}>{item.name}</span>
        </Link>
      </SheetClose>
    )
  }

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <ThemedLogo 
          width={36} 
          height={36} 
          className="flex-shrink-0 rounded-full"
          priority
        />
        <span className="font-serif text-sm font-semibold tracking-wider text-primary dark:text-circe-light">
          CIRCE ET VENUS
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {/* Dashboard, Content, Messages - Black light/White dark */}
        <div className="space-y-1">
          {silverNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="default" />
          ))}
        </div>

        {/* AI Studio - Rainbow/Multicolor */}
        <div className="space-y-1">
          {aiStudioNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="ai-studio" />
          ))}
        </div>

        {/* Circe's Domain */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-3 py-2">
            <Moon className="h-4 w-4 text-circe-light" />
            <span className="text-xs font-medium uppercase tracking-wider text-circe-light/70">
              Circe
            </span>
          </div>
          {circeNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="circe" />
          ))}
        </div>

        {/* Venus's Domain - Gold */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-3 py-2">
            <Sun className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            <span className="text-xs font-medium uppercase tracking-wider text-amber-600/70 dark:text-amber-500/70">
              Venus
            </span>
          </div>
          {venusNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="default" />
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-4">
        {bottomNavigation.map((item) => (
          <NavLink key={item.name} item={item} variant="default" />
        ))}

        {profile && (
          <div className="mt-4 rounded-lg bg-muted/50 p-3">
            <p className="truncate text-sm font-medium text-amber-600 dark:text-circe-light">
              {profile.full_name || 'Divine Creator'}
            </p>
            <p className="truncate text-xs text-amber-600/70 dark:text-circe-light/70">
              {profile.email}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
