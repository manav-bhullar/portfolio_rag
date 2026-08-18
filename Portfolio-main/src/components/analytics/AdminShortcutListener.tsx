'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export const ADMIN_AUTH_KEY = 'admin_secret_unlocked';

export default function AdminShortcutListener() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd + Shift + A (Mac) or Ctrl + Shift + A (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (typeof window !== 'undefined') {
          localStorage.setItem(ADMIN_AUTH_KEY, 'true');
          toast.success('Admin Analytics Unlocked', {
            description: 'Redirecting to your dashboard...',
          });
          router.push('/analytics');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return null;
}
