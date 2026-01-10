import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { UserProvider } from '@/contexts/user-context';
import type { UserProfile } from '@/types/database.types';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // If no profile or not active, redirect
  if (!profile || !profile.is_active) {
    redirect('/login?error=account_disabled');
  }

  return (
    <UserProvider user={profile as UserProfile}>
      <div className="min-h-screen bg-slate-50">
        <Sidebar userRole={profile?.role} />
        <div className="lg:pl-64">
          <Header user={profile as UserProfile} />
          <main className="py-6">
            <div className="px-4 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </UserProvider>
  );
}
