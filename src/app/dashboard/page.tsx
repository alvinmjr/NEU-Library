'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@/firebase';

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
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
    );
  }

  const handleSignOut = () => {
    if(auth) {
        auth.signOut();
    }
    router.push('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-5xl font-bold mb-6">Welcome to NEU Library!</h1>
      <p className="text-muted-foreground mb-8">You are signed in as: {user.email}</p>
      <Button onClick={handleSignOut}>Logout</Button>
    </div>
  );
}
