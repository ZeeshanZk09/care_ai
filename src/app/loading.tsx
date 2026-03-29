export default function Loading() {
  return (
    <div className='flex h-[80vh] w-full items-center justify-center'>
      <div className='flex flex-col items-center gap-4'>
        {/* Simple CSS spinner, matching Tailwind's animate-spin */}
        <div className='h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-black dark:border-neutral-800 dark:border-t-white' />
        <p className='text-sm font-medium text-neutral-500 dark:text-neutral-400'>
          Loading CareAI...
        </p>
      </div>
    </div>
  );
}
