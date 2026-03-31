import Link from 'next/link';

type RelatedLink = {
  href: string;
  label: string;
  description?: string;
};

type RelatedLinksProps = {
  title?: string;
  links: RelatedLink[];
};

export default function RelatedLinks({
  title = 'Related Resources',
  links,
}: Readonly<RelatedLinksProps>) {
  if (links.length === 0) {
    return null;
  }

  return (
    <section className='mt-12 rounded-xl border bg-card p-6'>
      <h2 className='text-2xl font-semibold'>{title}</h2>
      <div className='mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className='rounded-lg border bg-background p-4 transition-colors hover:bg-muted/50'
          >
            <h3 className='text-base font-semibold'>{link.label}</h3>
            {link.description && (
              <p className='mt-2 text-sm text-muted-foreground'>{link.description}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
