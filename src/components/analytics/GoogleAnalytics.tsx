'use client';

import { useEffect, useMemo, useState } from 'react';
import Script from 'next/script';

const CONSENT_KEY = 'cookie_consent';
const CONSENT_EVENT = 'cookie-consent-change';

const hasConsent = () => {
  if (typeof window === 'undefined') return false;

  return window.localStorage.getItem(CONSENT_KEY) === 'true';
};

export default function GoogleAnalytics() {
  const measurementId = useMemo(() => process.env.NEXT_PUBLIC_GA_ID ?? '', []);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    setIsEnabled(hasConsent());

    const onConsentChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ consent?: boolean }>;
      setIsEnabled(Boolean(customEvent.detail?.consent));
    };

    window.addEventListener(CONSENT_EVENT, onConsentChange);
    return () => window.removeEventListener(CONSENT_EVENT, onConsentChange);
  }, []);

  if (!measurementId || !isEnabled) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy='afterInteractive'
      />
      <Script id='google-analytics' strategy='afterInteractive'>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
