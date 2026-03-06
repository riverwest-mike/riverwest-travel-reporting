'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { HelpCircle } from 'lucide-react'
import { HelpDialog, derivePageKey } from './help-dialog'

const STORAGE_KEY = 'rw-help-seen'

export function FloatingHelpButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [pageKey, setPageKey] = useState('overview')

  // First-time auto-open
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, '1')
      setPageKey('overview')
      setOpen(true)
    }
  }, [])

  // Listen for sidebar "Quick Guide" trigger
  useEffect(() => {
    function handleOpenHelp(e: Event) {
      const key = (e as CustomEvent<{ pageKey?: string }>).detail?.pageKey ?? 'overview'
      setPageKey(key)
      setOpen(true)
    }
    window.addEventListener('openHelp', handleOpenHelp)
    return () => window.removeEventListener('openHelp', handleOpenHelp)
  }, [])

  function openPageHelp() {
    setPageKey(derivePageKey(pathname))
    setOpen(true)
  }

  return (
    <>
      <button
        onClick={openPageHelp}
        aria-label="Help for this page"
        className="fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full bg-navy-600 text-white shadow-lg hover:bg-navy-700 transition-colors flex items-center justify-center"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      <HelpDialog open={open} onOpenChange={setOpen} pageKey={pageKey} />
    </>
  )
}
