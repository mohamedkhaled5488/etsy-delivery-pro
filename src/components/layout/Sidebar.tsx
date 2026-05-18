'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Upload,
  Settings,
  FileText,
  Package,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'New Upload', icon: Upload },
  { href: '/settings', label: 'Shop Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-stone-200 flex flex-col z-30">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800 leading-none">EtsyDelivery</p>
            <p className="text-[10px] text-stone-400 mt-0.5">PDF Generator Pro</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-800'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-brand-600' : 'text-stone-400')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Quick action */}
      <div className="px-4 py-4 border-t border-stone-100">
        <Link
          href="/upload"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg
                     bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Create New PDF
        </Link>
      </div>
    </aside>
  )
}
