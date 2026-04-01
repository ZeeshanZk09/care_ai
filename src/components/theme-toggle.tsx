'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type ThemeToggleProps = {
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
};

export default function ThemeToggle({
  size = 'icon-sm',
  variant = 'outline',
}: Readonly<ThemeToggleProps>) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';
  const nextTheme = isDark ? 'light' : 'dark';
  const label = `Switch to ${nextTheme} theme`;

  return (
    <Button
      type='button'
      variant={variant}
      size={size}
      onClick={() => setTheme(nextTheme)}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun className='size-4' /> : <Moon className='size-4' />}
    </Button>
  );
}
