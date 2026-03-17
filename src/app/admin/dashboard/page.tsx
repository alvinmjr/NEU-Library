'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useAuth, useFirestore, useUser } from '@/firebase';

export default function AdminDashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (isUserLoading) return; // Wait until user object is resolved

    if (!user) {
      router.push('/login');
      return;
    }

    const checkAdminStatus = async () => {
      const adminRoleRef = doc(firestore, 'roles_libraryAdmins', user.uid);
      const docSnap = await getDoc(adminRoleRef);
      if (docSnap.exists()) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        router.push('/dashboard'); // Not an admin, redirect to student dashboard
      }
    };

    checkAdminStatus();

  }, [user, isUserLoading, router, firestore]);

  if (isUserLoading || isAdmin === null || !isAdmin) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
    )
  }

  const handleSignOut = () => {
    if(auth) {
        auth.signOut();
    }
    router.push('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold mb-4">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-8">Welcome, Admin {user?.email}</p>
      <Button onClick={handleSignOut}>Sign Out</Button>
    </div>
  );
}
