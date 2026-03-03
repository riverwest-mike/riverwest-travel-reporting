'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotificationReport {
  id: string
  reportNumber: string
  employeeName: string
}

interface NotificationItem {
  type: string
  label: string
  href: string
  count: number
  reports?: NotificationReport[]
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<NotificationItem[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => {
        setItems(d.items ?? [])
        setTotal(d.total ?? 0)
      })
      .catch(() => {})
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-md transition-colors relative',
          open ? 'bg-white/20 text-white' : 'text-navy-300 hover:bg-white/10 hover:text-white',
        )}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-gold-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 bg-navy-600 flex items-center justify-between">
            <span className="text-white text-sm font-semibold">Notifications</span>
            {total > 0 && (
              <span className="bg-gold-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {total}
              </span>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No pending actions
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {items.map((item, i) => (
                <div key={i} className="py-2">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-1.5 hover:bg-navy-50 transition-colors"
                  >
                    <span
                      className={cn(
                        'text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[22px] text-center',
                        item.type === 'needs_revision'
                          ? 'bg-amber-100 text-amber-700'
                          : item.type === 'pending_users'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-navy-100 text-navy-700',
                      )}
                    >
                      {item.count}
                    </span>
                    <span className="text-sm text-gray-700 font-medium">{item.label}</span>
                  </Link>

                  {item.reports && item.reports.length > 0 && (
                    <div className="pl-10 pr-4 pb-1 space-y-0.5">
                      {item.reports.slice(0, 5).map(r => {
                        const href =
                          item.type === 'pending_approval'
                            ? `/approvals/${r.id}`
                            : `/reports/${r.id}`
                        return (
                          <Link
                            key={r.id}
                            href={href}
                            onClick={() => setOpen(false)}
                            className="flex items-center justify-between py-1 text-xs text-gray-600 hover:text-navy-600 transition-colors group"
                          >
                            <span className="truncate max-w-[160px]">{r.employeeName}</span>
                            <span className="text-gray-400 group-hover:text-navy-500 font-mono ml-2 shrink-0">
                              {r.reportNumber}
                            </span>
                          </Link>
                        )
                      })}
                      {item.reports.length > 5 && (
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="text-xs text-navy-500 hover:underline"
                        >
                          +{item.reports.length - 5} more →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
