
'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
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
import { useAuth, useFirestore, useUser, initiateEmailSignIn, initiateGoogleSignIn } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { createLibraryMember } from '@/lib/user-actions';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }).or(z.string().min(1)),
  password: z.string().min(1, { message: 'Password is required.' }),
});

const GoogleIcon = () => (
    <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
        <path
        fill="currentColor"
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.67-4.66 1.67-3.86 0-6.99-3.14-6.99-7s3.13-7 6.99-7c2.08 0 3.26.84 4.13 1.65l2.73-2.73C18.72 1.96 15.96 1 12.48 1 5.88 1 1 5.92 1 12.5s4.88 11.5 11.48 11.5c3.54 0 6.3-1.23 8.35-3.37 2.13-2.13 2.8-5.22 2.8-7.78v-1.65h-9.15z"
        />
    </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = React.useState(false);
  const [isProcessingAdminLogin, setIsProcessingAdminLogin] = React.useState(false);


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
    if (!firestore || isProcessingAdminLogin) return; // Defer to admin-specific logic if it's running

    if (user && !isUserLoading) {
      // Check for professor's email first for admin access
      if (user.email === 'jcesperanza@neu.edu.ph') {
        // No toast here, as the admin login function will show one.
        // This just handles the case where the admin is already logged in and revisits the page.
        router.push('/admin/dashboard');
        return; // Stop further checks
      }

      // If not the professor, check for admin role in Firestore
      const adminRoleRef = doc(firestore, 'roles_libraryAdmins', user.uid);
      getDoc(adminRoleRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            // User has an admin role
            router.push('/admin/dashboard');
          } else {
            // It's a regular user, ensure their profile exists
            const memberRef = doc(firestore, 'libraryMembers', user.uid);
            getDoc(memberRef).then((memberSnap) => {
              if (memberSnap.exists()) {
                toast({ title: 'Login Successful' });
                router.push('/dashboard');
              } else {
                // New user via Google Sign In. Create a profile.
                if (user.email) {
                  createLibraryMember(firestore, user, { email: user.email, studentId: '' });
                  toast({ title: 'Welcome!', description: 'Your account has been created.' });
                  router.push('/dashboard');
                } else {
                  // This case is unlikely with Google Sign-In but good to handle
                  toast({ variant: 'destructive', title: 'Login Error', description: 'Could not retrieve user email.' });
                  if (auth) auth.signOut();
                }
              }
            });
          }
        })
        .catch((error) => {
          console.error('Error checking user role:', error);
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: 'Could not verify your user role.',
          });
          if (auth) auth.signOut();
        });
    }
  }, [user, isUserLoading, router, firestore, toast, isProcessingAdminLogin, auth]);


  function handleStudentLogin(values: z.infer<typeof loginSchema>) {
    setIsSubmitting(true);
    if (!auth) {
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: "Authentication service is not available.",
        });
        setIsSubmitting(false);
        return;
    }
    initiateEmailSignIn(auth, values.email, values.password);
    // The useEffect will handle redirection.
  }

  function handleGoogleSignIn() {
    setIsSubmitting(true);
    if (!auth) {
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: "Authentication service is not available.",
        });
        setIsSubmitting(false);
        return;
    }
    initiateGoogleSignIn(auth);
    // The useEffect will handle redirection and profile creation.
  }

  async function handleAdminLogin(values: z.infer<typeof loginSchema>) {
    setIsProcessingAdminLogin(true);
    setIsSubmitting(true);
    const { email, password } = values;

    // Define admin credentials
    const professorEmail = 'jcesperanza@neu.edu.ph';
    const hardcodedAdminUsername = 'admin';
    const hardcodedAdminPassword = 'admin123';

    let loginEmail = email;
    let loginPassword = password;

    // If the user enters the hardcoded alias, map it to the professor's email.
    // This requires that the professor's account in Firebase Auth has 'admin123' as its password.
    if (email === hardcodedAdminUsername && password === hardcodedAdminPassword) {
      loginEmail = professorEmail;
      loginPassword = hardcodedAdminPassword;
    }

    try {
      if (!auth || !firestore) throw new Error("Firebase services not available");

      // Step 1: Attempt to sign in with the resolved credentials
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const user = userCredential.user;

      // Step 2: Verify if the successfully logged-in user is an administrator
      const isProfessor = user.email === professorEmail;
      
      const adminRoleRef = doc(firestore, 'roles_libraryAdmins', user.uid);
      const adminDoc = await getDoc(adminRoleRef);
      const hasAdminRole = adminDoc.exists();

      if (isProfessor || hasAdminRole) {
        // Step 3: User is a verified admin, proceed to dashboard
        toast({ title: 'Admin Login Successful' });
        router.push('/admin/dashboard');
      } else {
        // Step 3b: User logged in but is not an admin. Sign them out.
        await auth.signOut();
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have administrative privileges.',
        });
      }
    } catch (error: any) {
      // This catch block handles Firebase authentication errors (e.g., wrong password)
      toast({
        variant: 'destructive',
        title: 'Admin Login Failed',
        description: 'Invalid email or password.',
      });
    } finally {
      setIsSubmitting(false);
      setIsProcessingAdminLogin(false);
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
                onSubmit={studentForm.handleSubmit(handleStudentLogin)}
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
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
            >
              <GoogleIcon />
              Sign in with Google
            </Button>

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
              onSubmit={adminForm.handleSubmit(handleAdminLogin)}
              className="space-y-4"
            >
              <FormField
                control={adminForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Email or Username</FormLabel>
                    <FormControl>
                      <Input
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
