"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { Button } from '@/components/ui/button'
import {
  Home,
  Upload,
  Cpu,
  History,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  requiresAuth?: boolean
  authRedirect?: boolean
}

const navigation: NavigationItem[] = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Upload', href: '/upload', icon: Upload, authRedirect: true },
  { name: 'Models', href: '/models', icon: Cpu, requiresAuth: true },
  { name: 'History', href: '/history', icon: History, requiresAuth: true },
]

export default function Navigation() {
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuth()
  const { handleAuthRedirect } = useAuthRedirect()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isCurrentPath = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const filteredNavigation = navigation.filter(
    (item) => !item.requiresAuth || isAuthenticated
  )

  const Logo = ({ compact = false }: { compact?: boolean }) => (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-gradient text-primary-foreground glow-primary">
        <Cpu className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <span className="block text-sm font-semibold text-foreground">Klaro</span>
        {!compact && <span className="block text-xs text-muted-foreground">Mini AI Analyst</span>}
      </div>
    </Link>
  )

  return (
    <>
      {/* Desktop */}
      <nav className="fixed inset-x-0 top-0 z-50 hidden border-b border-border bg-background/80 backdrop-blur md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />

          <div className="flex items-center gap-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon
              const active = isCurrentPath(item.href)
              const classes = cn(
                'relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:bg-elevated hover:text-foreground'
              )
              const inner = (
                <>
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  {active && (
                    <span className="absolute inset-x-2 -bottom-px h-px bg-primary" />
                  )}
                </>
              )
              return item.authRedirect ? (
                <button key={item.name} onClick={() => handleAuthRedirect(item.href)} className={classes}>
                  {inner}
                </button>
              ) : (
                <Link key={item.name} href={item.href} className={classes}>
                  {inner}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="hidden text-right lg:block">
                  <p className="text-sm font-medium text-foreground">{user?.full_name || user?.username}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Logo compact />
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen((v) => !v)} aria-label="Menu">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-border bg-background px-3 pb-4 pt-2">
            <div className="space-y-1">
              {filteredNavigation.map((item) => {
                const Icon = item.icon
                const active = isCurrentPath(item.href)
                const classes = cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors',
                  active ? 'bg-elevated text-primary' : 'text-muted-foreground hover:bg-elevated hover:text-foreground'
                )
                const inner = (
                  <>
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </>
                )
                return item.authRedirect ? (
                  <button
                    key={item.name}
                    onClick={() => { setMobileMenuOpen(false); handleAuthRedirect(item.href) }}
                    className={classes}
                  >
                    {inner}
                  </button>
                ) : (
                  <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)} className={classes}>
                    {inner}
                  </Link>
                )
              })}
            </div>

            <div className="mt-4 border-t border-border pt-4">
              {isAuthenticated ? (
                <div className="space-y-3">
                  <div className="rounded-md border border-border bg-card px-3 py-2">
                    <p className="text-sm font-medium text-foreground">{user?.full_name || user?.username}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { logout(); setMobileMenuOpen(false) }}>
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
                  </Button>
                  <Button asChild size="sm" className="w-full">
                    <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>Sign up</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Spacer for fixed nav */}
      <div className="h-16" />
    </>
  )
}
