'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import {
  FileText,
  PlusCircle,
  CheckSquare,
  LayoutDashboard,
  Settings,
  Users,
  Building2,
  ClipboardList,
  ChevronRight,
} from 'lucide-react'
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
}

export function Sidebar({ role, employeeName, pendingCount }: SidebarProps) {
  const pathname = usePathname()

  const employeeNav: NavItem[] = [
    { href: '/reports', label: 'My Reports', icon: FileText },
    { href: '/reports/new', label: 'New Report', icon: PlusCircle },
  ]

  const managerNav: NavItem[] = [
    { href: '/approvals', label: 'Approvals', icon: CheckSquare, badge: pendingCount },
  ]

  const adminNav: NavItem[] = [
    { href: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard },
    { href: '/admin/reports', label: 'All Reports', icon: ClipboardList },
    { href: '/admin/employees', label: 'Employees', icon: Users },
    { href: '/admin/properties', label: 'Properties', icon: Building2 },
  ]

  const isActive = (href: string) => {
    if (href === '/reports' && pathname === '/reports') return true
    if (href !== '/reports' && pathname.startsWith(href)) return true
    return false
  }

  return (
    <aside className="w-64 min-h-screen bg-navy-600 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-navy-500">
        <h1 className="text-white font-bold text-lg leading-tight">RiverWest</h1>
        <p className="text-navy-300 text-xs mt-0.5">Travel Reporting</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavSection label="My Work" items={employeeNav} isActive={isActive} />

        {(role === Role.MANAGER || role === Role.ADMIN) && (
          <NavSection label="Manager" items={managerNav} isActive={isActive} />
        )}

        {role === Role.ADMIN && (
          <NavSection label="Administration" items={adminNav} isActive={isActive} />
        )}
      </nav>

      {/* Bottom: settings + user */}
      <div className="px-3 pb-4 space-y-1">
        <NavItem
          href="/settings"
          label="Profile & Settings"
          icon={Settings}
          active={isActive('/settings')}
        />
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-md">
          <UserButton afterSignOutUrl="/sign-in" />
          <span className="text-navy-200 text-sm truncate">{employeeName}</span>
        </div>
      </div>
    </aside>
  )
}

function NavSection({
  label,
  items,
  isActive,
}: {
  label: string
  items: NavItem[]
  isActive: (href: string) => boolean
}) {
  return (
    <div className="mb-4">
      <p className="text-navy-400 text-xs font-semibold uppercase tracking-wider px-3 mb-1">
        {label}
      </p>
      {items.map((item) => (
        <NavItem
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          badge={item.badge}
          active={isActive(item.href)}
        />
      ))}
    </div>
  )
}

function NavItem({
  href,
  label,
  icon: Icon,
  badge,
  active,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  active: boolean
}) {
  return (
    <Link
      href={href}
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
