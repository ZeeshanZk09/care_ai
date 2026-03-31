'use client';

import { useEffect, useMemo, useState } from 'react';
import Script from 'next/script';

const CONSENT_KEY = 'cookie_consent';
const CONSENT_EVENT = 'cookie-consent-change';

const hasConsent = () => {
  if (typeof window === 'undefined') return false;

  return window.localStorage.getItem(CONSENT_KEY) === 'true';
};

export default function GoogleTagManager() {
  const gtmId = useMemo(() => process.env.NEXT_PUBLIC_GTM_ID ?? '', []);
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

  if (!gtmId || !isEnabled) {
    return null;
  }

  return (
    <>
      <Script id='google-tag-manager' strategy='afterInteractive'>
        {`
          (function(w,d,s,l,i){
            w[l]=w[l]||[];
            w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
            var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
            j.async=true;
            j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
            f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${gtmId}');
        `}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          title='Google Tag Manager'
          height='0'
          width='0'
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  );
}
