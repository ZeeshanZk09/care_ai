'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const CONSENT_KEY = 'cookie_consent';
const CONSENT_EVENT = 'cookie-consent-change';

const setConsent = (value: 'true' | 'false') => {
  window.localStorage.setItem(CONSENT_KEY, value);
  window.dispatchEvent(
    new CustomEvent(CONSENT_EVENT, {
      detail: { consent: value === 'true' },
    })
  );
};

const getConsent = () => {
  if (typeof window === 'undefined') return null;

  const stored = window.localStorage.getItem(CONSENT_KEY);
  if (stored === 'true' || stored === 'false') {
    return stored;
  }

  return null;
};

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getConsent();
    setVisible(consent === null);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <aside className='fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur'>
      <div className='mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between'>
        <p className='text-sm text-muted-foreground'>
          We use cookies to improve your experience and for analytics. By continuing, you agree to
          our{' '}
          <Link href='/privacy' className='font-medium text-foreground underline'>
            Privacy Policy
          </Link>
          .
        </p>
        <div className='flex shrink-0 items-center gap-2'>
          <Button
            variant='outline'
            onClick={() => {
              setConsent('false');
              setVisible(false);
            }}
          >
            Manage Preferences
          </Button>
          <Button
            onClick={() => {
              setConsent('true');
              setVisible(false);
            }}
          >
            Accept All
          </Button>
        </div>
      </div>
    </aside>
  );
}
