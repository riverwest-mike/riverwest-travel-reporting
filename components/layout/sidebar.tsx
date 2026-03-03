'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, SignOutButton } from '@clerk/nextjs'
import {
  FileText,
  PlusCircle,
  CheckSquare,
  LayoutDashboard,
  Settings,
  Users,
  Building2,
  ClipboardList,
  LogOut,
  BarChart3,
  DollarSign,
  Trash2,
  UserCheck,
  Menu,
  X,
  ChevronDown,
  TrendingUp,
  MapPin,
  Clock,
} from 'lucide-react'
import { NotificationBell } from '@/components/layout/notification-bell'
import { cn } from '@/lib/utils'
import { Role } from '@prisma/client'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

interface SidebarProps {
  role: Role
  employeeName: string
  pendingCount?: number
  employeeActionCount?: number
  pendingUsersCount?: number
}

export function Sidebar({
  role,
  employeeName,
  pendingCount,
  employeeActionCount,
  pendingUsersCount,
}: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const employeeNav: NavItem[] = [
    { href: '/reports', label: 'My Reports', icon: FileText, badge: employeeActionCount },
    { href: '/reports/new', label: 'New Report', icon: PlusCircle },
  ]

  const managerNav: NavItem[] = [
    { href: '/approvals', label: 'Approvals', icon: CheckSquare, badge: pendingCount },
    { href: '/admin/accounting', label: 'Sent to Accounting', icon: FileText },
  ]

  const adminNav: NavItem[] = [
    { href: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard },
    { href: '/admin/reports', label: 'All Reports', icon: ClipboardList },
    { href: '/admin/employees', label: 'Employees', icon: Users },
    { href: '/admin/properties', label: 'Properties', icon: Building2 },
    { href: '/ao/pending-users', label: 'Pending Users', icon: UserCheck, badge: pendingUsersCount },
    { href: '/ao/mileage-rates', label: 'Mileage Rates', icon: DollarSign },
    { href: '/ao/deleted-reports', label: 'Deleted Reports', icon: Trash2 },
  ]

  const analyticsNav: NavItem[] = [
    { href: '/analytics', label: 'Overview', icon: BarChart3 },
    { href: '/analytics/employees', label: 'Employee Miles', icon: Users },
    { href: '/analytics/properties', label: 'Properties', icon: MapPin },
    { href: '/analytics/trends', label: 'Monthly Trends', icon: TrendingUp },
    { href: '/analytics/approvals', label: 'Approval Metrics', icon: Clock },
  ]

  const isActive = (href: string) => {
    if (href === '/reports' && pathname === '/reports') return true
    if (href === '/analytics' && pathname === '/analytics') return true
    if (href !== '/reports' && href !== '/analytics' && pathname.startsWith(href)) return true
    return false
  }

  const isManagerOrAbove =
    role === Role.MANAGER || role === Role.ADMIN || role === Role.APPLICATION_OWNER
  const isAdminOrAbove = role === Role.ADMIN || role === Role.APPLICATION_OWNER

  const totalBadge =
    (pendingCount ?? 0) + (employeeActionCount ?? 0) + (pendingUsersCount ?? 0)

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-navy-500">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 border border-gold-500/70 flex items-center justify-center">
            <span className="font-playfair text-gold-400 text-lg font-bold leading-none tracking-tight select-none">
              RW
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold tracking-[0.2em] uppercase leading-tight">
              RiverWest
            </p>
            <p className="text-gold-400/80 text-[9px] tracking-[0.18em] uppercase leading-tight mt-0.5">
              Properties
            </p>
            <p className="text-navy-300 text-[9px] tracking-widest uppercase leading-tight mt-1 border-t border-navy-500 pt-1">
              Travel Reporting
            </p>
          </div>
          <NotificationBell />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavSection
          label="My Work"
          items={employeeNav}
          isActive={isActive}
          onNav={() => setMobileOpen(false)}
        />

        {isManagerOrAbove && (
          <NavSection
            label="Manager"
            items={managerNav}
            isActive={isActive}
            onNav={() => setMobileOpen(false)}
          />
        )}

        {isAdminOrAbove && (
          <>
            <CollapsibleNavSection
              label="Administration"
              items={adminNav}
              isActive={isActive}
              onNav={() => setMobileOpen(false)}
              defaultOpen={adminNav.some(item => isActive(item.href))}
            />
            <CollapsibleNavSection
              label="Analytics"
              items={analyticsNav}
              isActive={isActive}
              onNav={() => setMobileOpen(false)}
              defaultOpen={analyticsNav.some(item => isActive(item.href))}
            />
          </>
        )}
      </nav>

      {/* Bottom: settings + user */}
      <div className="px-3 pb-4 space-y-1 border-t border-navy-500 pt-3">
        <SidebarNavItem
          href="/settings"
          label="Profile & Settings"
          icon={Settings}
          active={isActive('/settings')}
          onNav={() => setMobileOpen(false)}
        />
        <div className="flex items-center gap-3 px-3 py-2 rounded-md">
          <UserButton afterSignOutUrl="/sign-in" />
          <span className="text-navy-200 text-sm truncate flex-1">{employeeName}</span>
        </div>
        <SignOutButton redirectUrl="/sign-in">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-navy-300 hover:bg-white/10 hover:text-white w-full transition-colors">
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </SignOutButton>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile header bar — visible below lg breakpoint */}
      <div className="lg:hidden flex items-center justify-between bg-navy-600 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 border border-gold-500/70 flex items-center justify-center">
            <span className="text-gold-400 text-sm font-bold leading-none">RW</span>
          </div>
          <span className="text-white text-sm font-semibold tracking-wide">Travel Reporting</span>
        </div>
        <div className="flex items-center gap-2">
          {totalBadge > 0 && (
            <span className="bg-gold-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {totalBadge}
            </span>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-navy-200 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar + mobile slide-out drawer */}
      <aside
        className={cn(
          'bg-navy-600 flex flex-col z-40 transition-transform duration-200',
          'lg:w-64 lg:min-h-screen lg:static lg:translate-x-0',
          'fixed inset-y-0 left-0 w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}

function CollapsibleNavSection({
  label,
  items,
  isActive,
  onNav,
  defaultOpen,
}: {
  label: string
  items: NavItem[]
  isActive: (href: string) => boolean
  onNav: () => void
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 mb-1 group"
      >
        <p className="text-navy-400 text-xs font-semibold uppercase tracking-wider group-hover:text-navy-300 transition-colors">
          {label}
        </p>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-navy-500 group-hover:text-navy-400 transition-all',
            open ? 'rotate-0' : '-rotate-90',
          )}
        />
      </button>
      {open && items.map((item) => (
        <SidebarNavItem
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          badge={item.badge}
          active={isActive(item.href)}
          onNav={onNav}
        />
      ))}
    </div>
  )
}

function NavSection({
  label,
  items,
  isActive,
  onNav,
}: {
  label: string
  items: NavItem[]
  isActive: (href: string) => boolean
  onNav: () => void
}) {
  return (
    <div className="mb-4">
      <p className="text-navy-400 text-xs font-semibold uppercase tracking-wider px-3 mb-1">
        {label}
      </p>
      {items.map((item) => (
        <SidebarNavItem
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          badge={item.badge}
          active={isActive(item.href)}
          onNav={onNav}
        />
      ))}
    </div>
  )
}

function SidebarNavItem({
  href,
  label,
  icon: Icon,
  badge,
  active,
  onNav,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  active: boolean
  onNav: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNav}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
        active
          ? 'bg-white/15 text-white font-medium'
          : 'text-navy-200 hover:bg-white/10 hover:text-white'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-gold-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {badge}
        </span>
      )}
    </Link>
  )
}
