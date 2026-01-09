'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Film,
  Building2,
  Calendar,
  Users,
  Settings,
  FileInput,
  FileOutput,
  LayoutDashboard,
  Tag,
  Globe,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { title: string; href: string }[];
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Movies',
    href: '/movies',
    icon: Film,
  },
  {
    title: 'Cinemas',
    href: '/cinemas',
    icon: Building2,
  },
  {
    title: 'Sessions',
    href: '/sessions',
    icon: Calendar,
  },
  {
    title: 'Import',
    href: '/import',
    icon: FileInput,
  },
  {
    title: 'Export',
    href: '/export',
    icon: FileOutput,
  },
  {
    title: 'Administration',
    icon: Settings,
    children: [
      { title: 'Users', href: '/admin/users' },
      { title: 'Cinema Groups', href: '/admin/cinema-groups' },
      { title: 'Formats', href: '/admin/formats' },
      { title: 'Technologies', href: '/admin/technologies' },
      { title: 'Languages', href: '/admin/languages' },
      { title: 'Genres', href: '/admin/genres' },
      { title: 'Age Ratings', href: '/admin/age-ratings' },
      { title: 'Tags', href: '/admin/tags' },
      { title: 'Countries', href: '/admin/countries' },
      { title: 'Export Clients', href: '/admin/export-clients' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Administration']);

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-card px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Film className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">CAT</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-1">
            {navigation.map(item => (
              <li key={item.title}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className={cn(
                      'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors',
                      pathname === item.href || pathname.startsWith(item.href + '/')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.title}
                  </Link>
                ) : (
                  <div>
                    <button
                      onClick={() => toggleExpanded(item.title)}
                      className={cn(
                        'group flex w-full items-center gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors',
                        expandedItems.includes(item.title)
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {item.title}
                      <ChevronDown
                        className={cn(
                          'ml-auto h-4 w-4 transition-transform',
                          expandedItems.includes(item.title) && 'rotate-180'
                        )}
                      />
                    </button>
                    {expandedItems.includes(item.title) && item.children && (
                      <ul className="mt-1 space-y-1 pl-8">
                        {item.children.map(child => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={cn(
                                'block rounded-md px-2 py-1.5 text-sm transition-colors',
                                pathname === child.href
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              {child.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
