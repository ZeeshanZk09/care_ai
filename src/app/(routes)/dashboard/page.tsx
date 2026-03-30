import HistoryList from './_component/HistoryList';
import DoctorAgentList from './_component/DoctorAgentList';

import Link from 'next/link';
import { auth } from '@/auth';

export default async function Dashboard() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className='w-full h-screen flex flex-col justify-center items-center gap-4'>
        <h1 className='text-2xl font-bold'>You are not signed in</h1>
        <Link
          href='/sign-in'
          className='px-4 py-2 bg-primary text-white rounded hover:bg-primary/90'
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <section className='relative w-full mx-auto max-w-7xl my-10'>
      <HistoryList />
      <DoctorAgentList />
    </section>
  );
}
