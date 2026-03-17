import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Book } from 'lucide-react';

export function Header() {
  return (
    <header className="p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Book className="h-6 w-6" />
          <span>NEU Library</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
