'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { X, Film } from 'lucide-react';

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  navigation: Array<{
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

export function MobileSidebar({ open, onClose, navigation }: MobileSidebarProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="relative z-50 lg:hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />

      {/* Sidebar */}
      <div className="fixed inset-0 flex">
        <div className="relative mr-16 flex w-full max-w-xs flex-1">
          {/* Close button */}
          <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
            <button type="button" className="-m-2.5 p-2.5" onClick={onClose}>
              <span className="sr-only">Close sidebar</span>
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Sidebar content */}
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
              <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
                <Film className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">CAT</span>
              </Link>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navigation.map(item => (
                      <li key={item.title}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6',
                            pathname === item.href
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <item.icon className="h-6 w-6 shrink-0" />
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
