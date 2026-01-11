'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { hasPermission, isGlobalAdmin, type Permission } from '@/lib/permissions';
import type { UserRole } from '@/types/database.types';
import {
  Film,
  Building2,
  Calendar,
  Users,
  Settings,
  FileInput,
  FileOutput,
  LayoutDashboard,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
  globalAdminOnly?: boolean;
  children?: {
    title: string;
    href: string;
    permission?: Permission;
    globalAdminOnly?: boolean;
  }[];
}

const navigation: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Movies', href: '/movies', icon: Film },
  { title: 'Cinemas', href: '/cinemas', icon: Building2 },
  { title: 'Sessions', href: '/sessions', icon: Calendar },
  { title: 'Import', href: '/import', icon: FileInput },
  { title: 'Export', href: '/export', icon: FileOutput },
  {
    title: 'Admin',
    icon: Settings,
    permission: 'reference:read',
    children: [
      { title: 'Settings', href: '/admin/settings' },
      { title: 'Users', href: '/admin/users' },
      { title: 'Roles', href: '/admin/roles' },
      { title: 'Cinema Groups', href: '/admin/cinema-groups' },
      { title: 'Formats', href: '/admin/formats' },
      { title: 'Technologies', href: '/admin/technologies' },
      { title: 'Languages', href: '/admin/languages' },
      { title: 'Genres', href: '/admin/genres' },
      { title: 'Age Ratings', href: '/admin/age-ratings' },
      { title: 'Tags', href: '/admin/tags' },
      { title: 'Countries', href: '/admin/countries' },
      { title: 'Flag Automation', href: '/admin/flag-automation' },
      { title: 'Export Clients', href: '/admin/export-clients' },
      { title: 'Parsers', href: '/admin/parsers' },
    ],
  },
];

interface SidebarProps {
  userRole?: UserRole;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Admin']);

  const toggleExpand = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const checkPermission = (item: { permission?: Permission; globalAdminOnly?: boolean }) => {
    if (item.globalAdminOnly && !isGlobalAdmin(userRole)) return false;
    if (item.permission && !hasPermission(userRole, item.permission)) return false;
    return true;
  };

  const filteredNavigation = navigation.filter(item => {
    if (!checkPermission(item)) return false;
    return true;
  });

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-56 lg:flex-col">
      <div className="flex grow flex-col overflow-y-auto border-r border-border">
        {/* Logo */}
        <div className="flex h-14 items-center px-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-foreground rounded flex items-center justify-center">
              <Film className="h-3.5 w-3.5 text-background" />
            </div>
            <span className="font-semibold text-sm">CAT</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3">
          <ul className="space-y-px">
            {filteredNavigation.map(item => (
              <li key={item.title}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleExpand(item.title)}
                      className={cn(
                        'flex w-full items-center justify-between px-2 py-1.5 text-[13px] rounded transition-colors',
                        'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 transition-transform',
                          expandedItems.includes(item.title) && 'rotate-180'
                        )}
                      />
                    </button>

                    {expandedItems.includes(item.title) && (
                      <ul className="mt-px ml-4 border-l border-border">
                        {item.children
                          .filter(child => checkPermission(child))
                          .map(child => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className={cn(
                                  'block px-3 py-1 text-[13px] transition-colors -ml-px border-l',
                                  isActive(child.href)
                                    ? 'border-foreground text-foreground font-medium'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                                )}
                              >
                                {child.title}
                              </Link>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href!}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 text-[13px] rounded transition-colors',
                      isActive(item.href!)
                        ? 'bg-foreground text-background font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
