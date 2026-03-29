import HistoryList from './_component/HistoryList';
import DoctorAgentList from './_component/DoctorAgentList';
import {
  AddNewSessionDialog2,
  AddNewSessionDialogPlusButton,
} from './_component/AddNewSessionDialog';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function Dashboard() {
  const session = await auth();
  let remainingCredits = 0;
  let currentPlan = 'free';

  if (session?.user?.id) {
    const u = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (u) {
      remainingCredits = u.credit;
      currentPlan = u.plan;
    }
  }

  return (
    <section className='relative w-full mx-auto max-w-7xl my-10'>
      <div className='w-full flex justify-between items-start mb-8 gap-4 sm:gap-0 px-4'>
        <div>
          <h1 className='text-3xl font-bold'>My Dashboard</h1>
          {currentPlan === 'free' ? (
            <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
              <span className="font-semibold text-foreground">{remainingCredits} Free Consultations Remaining</span>
              {remainingCredits <= 0 && (
                <Link href="/pricing" className="text-primary hover:underline">Upgrade Plan</Link>
              )}
            </div>
          ) : (
            <div className="mt-2 text-sm text-primary font-semibold capitalize flex items-center gap-2">
              Current Plan: {currentPlan}
            </div>
          )}
        </div>
        
        <AddNewSessionDialog2 />
        <div className='sm:hidden '>
          <AddNewSessionDialogPlusButton />
        </div>
      </div>
      <HistoryList />
      <DoctorAgentList />
    </section>
  );
}
