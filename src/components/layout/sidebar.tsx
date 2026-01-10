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
  Layers,
  Monitor,
  Languages,
  Tag,
  Globe,
  ShieldCheck,
  Clapperboard,
  Send,
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
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Movies',
    href: '/movies',
    icon: Film,
    permission: 'movies:read',
  },
  {
    title: 'Cinemas',
    href: '/cinemas',
    icon: Building2,
    permission: 'cinemas:read',
  },
  {
    title: 'Sessions',
    href: '/sessions',
    icon: Calendar,
    permission: 'sessions:read',
  },
  {
    title: 'Import',
    href: '/import',
    icon: FileInput,
    permission: 'movies:create',
  },
  {
    title: 'Export',
    href: '/export',
    icon: FileOutput,
    permission: 'export_clients:read',
  },
  {
    title: 'Administration',
    icon: Settings,
    children: [
      { title: 'Users', href: '/admin/users', permission: 'users:read', globalAdminOnly: true },
      { title: 'Cinema Groups', href: '/admin/cinema-groups', permission: 'cinema_groups:read' },
      { title: 'Formats', href: '/admin/formats', permission: 'reference:read' },
      { title: 'Technologies', href: '/admin/technologies', permission: 'reference:read' },
      { title: 'Languages', href: '/admin/languages', permission: 'reference:read' },
      { title: 'Genres', href: '/admin/genres', permission: 'reference:read' },
      { title: 'Age Ratings', href: '/admin/age-ratings', permission: 'reference:read' },
      { title: 'Tags', href: '/admin/tags', permission: 'reference:read' },
      { title: 'Countries', href: '/admin/countries', permission: 'countries:read' },
      { title: 'Export Clients', href: '/admin/export-clients', permission: 'export_clients:read' },
    ],
  },
];

interface SidebarProps {
  userRole?: UserRole;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Administration']);

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  // Filter navigation based on permissions
  const filteredNavigation = navigation.filter(item => {
    // If item requires globalAdminOnly and user is not global admin, hide it
    if (item.globalAdminOnly && !isGlobalAdmin(userRole)) {
      return false;
    }
    // If no permission required, show it
    if (!item.permission) return true;
    // Check if user has permission
    return hasPermission(userRole, item.permission);
  }).map(item => {
    // Filter children if present
    if (item.children) {
      const filteredChildren = item.children.filter(child => {
        if (child.globalAdminOnly && !isGlobalAdmin(userRole)) {
          return false;
        }
        if (!child.permission) return true;
        return hasPermission(userRole, child.permission);
      });
      return { ...item, children: filteredChildren };
    }
    return item;
  }).filter(item => {
    // Remove parent items with no visible children
    if (item.children && item.children.length === 0) {
      return false;
    }
    return true;
  });

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-slate-200 bg-white px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
              <Clapperboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900">CAT</span>
              <span className="ml-1 text-xs text-slate-500">miir.concepts</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-1">
            {filteredNavigation.map(item => (
              <li key={item.title}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className={cn(
                      'group flex gap-x-3 rounded-lg p-2.5 text-sm font-medium leading-6 transition-all',
                      pathname === item.href || pathname.startsWith(item.href + '/')
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                        'group flex w-full items-center gap-x-3 rounded-lg p-2.5 text-sm font-medium leading-6 transition-all',
                        expandedItems.includes(item.title)
                          ? 'text-slate-900'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                      <ul className="mt-1 space-y-0.5 pl-10">
                        {item.children.map(child => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={cn(
                                'block rounded-md px-3 py-2 text-sm transition-all',
                                pathname === child.href
                                  ? 'bg-slate-100 text-slate-900 font-medium'
                                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
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

          {/* Role badge at bottom */}
          {userRole && (
            <div className="mt-auto pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-slate-50">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-medium text-slate-500 capitalize">
                  {userRole.replace('_', ' ')}
                </span>
              </div>
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
}
