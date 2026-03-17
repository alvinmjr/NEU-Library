import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
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

      <div className="relative z-20 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <h1 className="font-headline text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6">
            Welcome to NEU Library!
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground mb-10">
            Your gateway to knowledge and discovery. Access a world of information, right at your fingertips.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button asChild size="lg">
              <Link href="/signup">Sign Up</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}
