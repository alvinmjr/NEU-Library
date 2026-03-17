'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
import { useRouter } from 'next/navigation';
import { useAuth, useUser, initiateEmailSignUp } from '@/firebase';
import { createLibraryMember } from '@/lib/user-actions';

const formSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email address.' }),
    studentId: z.string().regex(/^\d{2}-\d{5}-\d{3}$/, {
      message: 'Student ID must be in the format ##-#####-###.',
    }),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });

export function SignUpForm() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submittedValues, setSubmittedValues] =
    React.useState<z.infer<typeof formSchema> | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      studentId: '',
      password: '',
      confirmPassword: '',
    },
  });

  React.useEffect(() => {
    if (user && isSubmitting && submittedValues) {
      createLibraryMember(user, submittedValues)
        .then(() => {
          toast({
            title: 'Registration Successful!',
            description: 'You will be redirected to the login page.',
          });
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        })
        .catch((error) => {
          console.error('Failed to create library member:', error);
          toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: 'Could not save user profile. Please try again.',
          });
        })
        .finally(() => {
          setIsSubmitting(false);
          setSubmittedValues(null);
        });
    }
  }, [user, isSubmitting, submittedValues, router, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setSubmittedValues(values);
    try {
      initiateEmailSignUp(auth, values.email, values.password);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.message || 'An unknown error occurred.',
      });
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
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
          control={form.control}
          name="studentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student ID</FormLabel>
              <FormControl>
                <Input
                  placeholder="##-#####-###"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing Up...' : 'Sign Up'}
        </Button>
      </form>
    </Form>
  );
}
