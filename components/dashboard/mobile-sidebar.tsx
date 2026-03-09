'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
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

const sharedNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Content', href: '/dashboard/content', icon: Calendar },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'AI Studio', href: '/dashboard/ai-studio', icon: Star },
]

const bottomNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function MobileSidebar({ profile }: MobileSidebarProps) {
  const pathname = usePathname()

  const NavLink = ({ item, variant = 'default' }: { item: typeof sharedNavigation[0], variant?: 'default' | 'circe' | 'venus' }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    
    const variantStyles = {
      default: {
        active: 'bg-primary/20 text-primary',
        inactive: 'text-foreground/70 hover:bg-accent/50 hover:text-foreground',
        icon: 'text-primary'
      },
      circe: {
        active: 'bg-circe/20 text-circe-light',
        inactive: 'text-foreground/70 hover:bg-circe/10 hover:text-circe-light',
        icon: 'text-circe-light'
      },
      venus: {
        active: 'bg-venus/20 text-venus dark:text-venus',
        inactive: 'text-foreground/70 hover:bg-venus/10 hover:text-venus dark:hover:text-venus',
        icon: 'text-venus dark:text-venus'
      }
    }
    
    const styles = variantStyles[variant]
    
    return (
      <SheetClose asChild>
        <Link
          href={item.href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
            isActive ? styles.active : styles.inactive
          )}
        >
          <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && styles.icon)} />
          <span>{item.name}</span>
        </Link>
      </SheetClose>
    )
  }

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <Image 
          src="/logo.png" 
          alt="Circe et Venus" 
          width={36} 
          height={36} 
          className="flex-shrink-0 rounded-full"
        />
        <span className="font-serif text-sm font-semibold tracking-wider text-primary">
          CIRCE ET VENUS
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {/* Shared */}
        <div className="space-y-1">
          {sharedNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="default" />
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

        {/* Venus's Domain */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-3 py-2">
            <Sun className="h-4 w-4 text-venus dark:text-venus" />
            <span className="text-xs font-medium uppercase tracking-wider text-venus/70 dark:text-venus/70">
              Venus
            </span>
          </div>
          {venusNavigation.map((item) => (
            <NavLink key={item.name} item={item} variant="venus" />
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
            <p className="truncate text-sm font-medium">
              {profile.full_name || 'Divine Creator'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {profile.email}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
