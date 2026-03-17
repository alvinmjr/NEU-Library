import Image from 'next/image';
import Link from 'next/link';
import { SignUpForm } from '@/components/signup-form';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SignUpPage() {
  const backgroundImage = PlaceHolderImages.find(p => p.id === 'library-background');

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
        <div className="w-full max-w-md">
            <h1 className="text-4xl font-bold mb-4 text-center">Sign Up</h1>
            <p className="text-muted-foreground mb-8 text-center">Create your NEU Library account.</p>
            <SignUpForm />
        </div>
      </div>
    </div>
  );
}
