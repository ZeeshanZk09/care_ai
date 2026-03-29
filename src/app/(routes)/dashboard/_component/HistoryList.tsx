import React from 'react';
import Image from 'next/image';
import { AddNewSessionDialog } from './AddNewSessionDialog';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function HistoryList() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return <div>Please login to view history.</div>;
  }

  const history = await prisma.chatSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className='px-4 mb-10'>
      <h2 className="heading-3 mb-6">Recent Consultations</h2>
      {history.length === 0 ? (
        <div className='w-full border-2 border-dashed border-gray-300 rounded-2xl flex flex-col justify-center items-center p-10 text-center bg-card'>
          <Image src='/medical-assistance.png' alt='Medical Assistance' width={200} height={200} />
          <h2 className='font-bold text-xl mt-4 text-foreground'>No Recent Consultations</h2>
          <p className="text-muted-foreground mb-4">It looks you haven't consulted with any doctor yet.</p>
          <AddNewSessionDialog />
        </div>
      ) : (
        <div className="grid-cards">
          {history.map((item) => (
             <div key={item.id} className="card-responsive p-6 flex flex-col justify-between">
                <div>
                   <h3 className="font-semibold text-lg max-w-full truncate">
                     {(item.selectedDoctor as any)?.specialist || 'Consultation'}
                   </h3>
                   <div className="text-xs text-muted-foreground mb-4">
                     {new Date(item.createdAt).toLocaleDateString()}
                   </div>
                   <p className="text-sm text-foreground line-clamp-3 mb-4">
                     {item.notes || 'No initial notes provided.'}
                   </p>
                </div>
                <Link 
                  href={`/dashboard/medical-agent/${item.sessionId}`}
                  className="text-primary text-sm font-medium hover:underline mt-auto"
                >
                  View Details &rarr;
                </Link>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}
