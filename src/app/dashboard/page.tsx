'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { LogOut, Book } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@/firebase';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';


export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p>Loading...</p>
        </div>
    );
  }

  const handleSignOut = () => {
    if(auth) {
        auth.signOut();
    }
    router.push('/');
  };

  const getInitials = (email: string) => {
    return email ? email.charAt(0).toUpperCase() : '';
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
            <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold text-sidebar-primary">
                <Book className="h-6 w-6" />
                <span>NEU Library</span>
            </Link>
        </SidebarHeader>
        <SidebarContent>
            {/* Navigation items can be added here in the future */}
        </SidebarContent>
        <SidebarFooter>
            <div className="flex items-center gap-3 p-2">
                <Avatar>
                    {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || user.email!} />}
                    <AvatarFallback>{getInitials(user.email!)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-sm overflow-hidden">
                    <span className="text-muted-foreground">Logged in as:</span>
                    <span className="font-medium truncate">{user.email}</span>
                </div>
            </div>
            <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start">
                <LogOut className="mr-2" />
                Logout
            </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <main className="flex flex-1 items-center justify-center p-4">
            <div className="text-center">
                <h1 className="text-5xl font-bold mb-6">Welcome to NEU Library!</h1>
            </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
