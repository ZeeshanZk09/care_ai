import Link from 'next/link';

export function Footer() {
  return (
    <footer className='border-t border-border mt-auto py-8'>
      <div className='section-container py-0! flex flex-col md:flex-row justify-between items-center gap-4'>
        <p className='text-sm text-muted-foreground'>© 2026 CareAI. All rights reserved.</p>
        <div className='flex flex-wrap justify-center gap-6 text-sm text-muted-foreground'>
          <Link href='/about' className='transition-colors hover:text-foreground'>
            About
          </Link>
          <Link href='/features' className='transition-colors hover:text-foreground'>
            Features
          </Link>
          <Link href='/pricing' className='transition-colors hover:text-foreground'>
            Pricing
          </Link>
          <Link href='/faq' className='transition-colors hover:text-foreground'>
            FAQ
          </Link>
          <Link href='/blog' className='transition-colors hover:text-foreground'>
            Blog
          </Link>
          <Link href='/contact' className='transition-colors hover:text-foreground'>
            Contact
          </Link>
          <Link href='/privacy' className='transition-colors hover:text-foreground'>
            Privacy Policy
          </Link>
          <Link href='/terms' className='transition-colors hover:text-foreground'>
            Terms
          </Link>
          <Link href='/cookie-policy' className='transition-colors hover:text-foreground'>
            Cookie Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
