'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, Book } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useAuth, useUser, useFirestore, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const colleges = [
  'College of Engineering and Architecture',
  'College of Informatics and Computing Studies',
  'College of Arts and Sciences',
  'Other',
];

const visitReasons = [
  'Studying',
  'Borrowing Books',
  'Research',
  'Events',
  'Other',
];

const visitSchema = z.object({
  reason: z.string().min(1, { message: 'Please select a reason for your visit.' }),
  college: z.string().min(1, { message: 'Please select your college.' }),
  isEmployee: z.boolean(),
});

export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visitsCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'visits') : null),
    [firestore]
  );

  const visitForm = useForm<z.infer<typeof visitSchema>>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      reason: '',
      college: '',
      isEmployee: false,
    },
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
    if (!isUserLoading && user) {
      // ✅ Only show questionnaire once per session
      const hasAnswered = sessionStorage.getItem('visitLogged');
      if (!hasAnswered) {
        setIsQuestionnaireOpen(true);
      }
    }
  }, [user, isUserLoading, router]);

  async function onVisitSubmit(values: z.infer<typeof visitSchema>) {
    if (!visitsCollectionRef) return;
    setIsSubmitting(true);
    try {
      await addDocumentNonBlocking(visitsCollectionRef, {
        ...values,
        visitorName: user?.displayName || user?.email || 'Anonymous',
        visitTimestamp: new Date(),
      });
      toast({ title: 'Welcome!', description: 'Your visit has been logged.' });
      setIsQuestionnaireOpen(false);
      // ✅ Mark questionnaire as answered for this session
      sessionStorage.setItem('visitLogged', 'true');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not log your visit. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const handleSignOut = () => {
    if (auth) auth.signOut();
    // ✅ Clear session flag on logout so questionnaire shows on next login
    sessionStorage.removeItem('visitLogged');
    router.push('/');
  };

  const getInitials = (email: string) => {
    return email ? email.charAt(0).toUpperCase() : '';
  };

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

      {/* Mandatory Visit Questionnaire Modal */}
      <Dialog
        open={isQuestionnaireOpen}
        onOpenChange={() => {}}
      >
        <DialogContent
          className="sm:max-w-[425px]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Welcome! 👋</DialogTitle>
            <DialogDescription>
              Please fill out this quick form before accessing the library dashboard.
            </DialogDescription>
          </DialogHeader>

          <Form {...visitForm}>
            <form onSubmit={visitForm.handleSubmit(onVisitSubmit)} className="space-y-4">
              <FormField
                control={visitForm.control}
                name="college"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>College</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your college" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {colleges.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={visitForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Visit</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {visitReasons.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={visitForm.control}
                name="isEmployee"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Are you an employee?</FormLabel>
                      <p className="text-xs text-muted-foreground">Toggle on if you are a teacher or staff</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Enter Library Dashboard'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

    </SidebarProvider>
  );
}