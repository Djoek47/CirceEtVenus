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
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

interface SidebarProps {
  user: User
  profile: Profile | null
}

// Circe's domain - Retention, Analytics, Protection (Purple)
const circeNavigation = [
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Protection', href: '/dashboard/protection', icon: Shield },
]

// Venus's domain - Growth, Attraction, Reputation (White)
const venusNavigation = [
  { name: 'Fans', href: '/dashboard/fans', icon: Users },
  { name: 'Mentions', href: '/dashboard/mentions', icon: TrendingUp },
]

// Silver themed navigation
const silverNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Content', href: '/dashboard/content', icon: Calendar },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
]

// AI Studio - Rainbow animated
const aiStudioNavigation = [
  { name: 'AI Studio', href: '/dashboard/ai-studio', icon: Star },
]

const bottomNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function DashboardSidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const NavLink = ({ item, variant = 'silver' }: { item: typeof silverNavigation[0], variant?: 'silver' | 'circe' | 'venus' | 'ai-studio' }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    
    const variantStyles = {
      silver: {
        active: 'bg-slate-400/20 text-slate-300',
        inactive: 'text-slate-400/70 hover:bg-slate-400/10 hover:text-slate-300',
        icon: 'text-slate-300'
      },
      circe: {
        active: 'bg-circe/20 text-circe-light',
        inactive: 'text-sidebar-foreground/70 hover:bg-circe/10 hover:text-circe-light',
        icon: 'text-circe-light'
      },
      venus: {
        active: 'bg-amber-500/20 text-amber-400',
        inactive: 'text-amber-500/70 hover:bg-amber-500/10 hover:text-amber-400',
        icon: 'text-amber-400'
      },
      'ai-studio': {
        active: 'bg-circe/20 text-circe-light',
        inactive: 'text-sidebar-foreground/70 hover:bg-circe/10 hover:text-circe-light',
        icon: 'text-circe-light'
      }
    }
    
    const styles = variantStyles[variant]
    const isAiStudio = variant === 'ai-studio'
    
    return (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive ? styles.active : styles.inactive
        )}
      >
        <item.icon className={cn(
          'h-5 w-5 flex-shrink-0', 
          isActive && styles.icon
        )} />
        {!collapsed && (
          <span>{item.name}</span>
        )}
      </Link>
    )
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <ThemedLogo 
          width={32} 
          height={32} 
          className="flex-shrink-0 rounded-full"
          priority
        />
        {!collapsed && (
          <span className="font-serif text-sm font-semibold tracking-wider text-primary dark:text-circe-light">
            CIRCE ET VENUS
          </span>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto p-2">
        {/* Silver - Dashboard, Content, Messages */}
        <div className="space-y-1">
          {silverNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="silver" />
          ))}
        </div>

        {/* AI Studio - Rainbow Hue */}
        <div className="space-y-1">
          {aiStudioNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="ai-studio" />
          ))}
        </div>

        {/* Circe's Domain */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="flex items-center gap-2 px-3 py-2">
              <Moon className="h-4 w-4 text-circe-light" />
              <span className="text-xs font-medium uppercase tracking-wider text-circe-light/70">
                Circe
              </span>
            </div>
          )}
          {circeNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="circe" />
          ))}
        </div>

        {/* Venus's Domain - Silver (like Analytics/Protection) */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="flex items-center gap-2 px-3 py-2">
              <Sun className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400/70">
                Venus
              </span>
            </div>
          )}
          {venusNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="silver" />
          ))}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-sidebar-border p-2">
        {bottomNavigation.map((item) => (
          <NavLink key={item.name} item={item} variant="silver" />
        ))}

        {/* User info */}
        {!collapsed && profile && (
          <div className="mt-2 rounded-lg bg-sidebar-accent/30 p-3">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profile.full_name || 'Divine Creator'}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {profile.email}
            </p>
          </div>
        )}
      </div>

      {/* Collapse Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </aside>
  )
}
