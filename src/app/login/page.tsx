'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore, useUser, initiateEmailSignIn } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = React.useState(false);

  const backgroundImage = PlaceHolderImages.find(
    (p) => p.id === 'library-background'
  );

  const studentForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const adminForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  React.useEffect(() => {
    if (user && !isUserLoading) {
      setIsSubmitting(true);
      const adminRoleRef = doc(firestore, 'roles_libraryAdmins', user.uid);
      getDoc(adminRoleRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            toast({ title: 'Admin Login Successful' });
            router.push('/admin/dashboard');
          } else {
            toast({ title: 'Login Successful' });
            router.push('/dashboard');
          }
        })
        .catch((error) => {
          console.error('Error checking admin role:', error);
          toast({
            variant: 'destructive',
            title: 'Role Check Failed',
            description: 'Defaulting to student dashboard.',
          });
          router.push('/dashboard');
        });
    }
  }, [user, isUserLoading, router, firestore, toast]);

  async function handleLogin(values: z.infer<typeof loginSchema>) {
    setIsSubmitting(true);
    try {
      initiateEmailSignIn(auth, values.email, values.password);
      // The useEffect will handle redirection.
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'An unknown error occurred.',
      });
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full min-h-screen">
      {backgroundImage && (
        <Image
          src={backgroundImage.imageUrl}
          alt={backgroundImage.description}
          data-ai-hint={backgroundImage.imageHint}
          fill
          priority
          className="object-cover z-0"
        />
      )}
      <div className="absolute inset-0 bg-background/80 z-10" />

      <div className="relative z-20 flex flex-col min-h-screen items-center justify-center p-4">
        <div className="absolute top-4 left-4">
            <Button asChild variant="outline">
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                </Link>
            </Button>
        </div>

        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Student Login
            </CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...studentForm}>
              <form
                onSubmit={studentForm.handleSubmit(handleLogin)}
                className="space-y-4"
              >
                <FormField
                  control={studentForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institutional Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="your.name@institution.edu"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={studentForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Logging In...' : 'Login'}
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => setIsAdminLoginOpen(true)}
              >
                Admin Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAdminLoginOpen} onOpenChange={setIsAdminLoginOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Admin Login</DialogTitle>
            <DialogDescription>
              Enter administrator credentials to continue.
            </DialogDescription>
          </DialogHeader>
          <Form {...adminForm}>
            <form
              onSubmit={adminForm.handleSubmit(handleLogin)}
              className="space-y-4"
            >
              <FormField
                control={adminForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="admin@institution.edu"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={adminForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Logging In...' : 'Login as Admin'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
