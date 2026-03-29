'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { Button } from './ui/button';
import Link from 'next/link';
import { Bot, Home, LayoutDashboard, LogIn, LogOut } from 'lucide-react';

export default function HeroSectionOne() {
  const { data: session } = useSession();

  return (
    <>
      <div className='absolute inset-y-0 left-0 h-full w-px bg-neutral-200/80 dark:bg-neutral-800/80'>
        <div className='absolute top-0 h-40 w-px bg-linear-to-b from-transparent via-blue-500 to-transparent' />
      </div>
      <div className='absolute inset-y-0 right-0 h-full w-px bg-neutral-200/80 dark:bg-neutral-800/80'>
        <div className='absolute h-40 w-px bg-linear-to-b from-transparent via-blue-500 to-transparent' />
      </div>
      <div className='absolute inset-x-0 bottom-0 h-px w-full bg-neutral-200/80 dark:bg-neutral-800/80'>
        <div className='absolute mx-auto h-px w-40 bg-linear-to-r from-transparent via-blue-500 to-transparent' />
      </div>
      <div className='relative z-10 mx-auto max-w-7xl  flex items-center justify-between gap-8 '>
        <div className='px-4 py-10 md:py-20'>
          <h1 className='flex items-start'>
            <span className='text-2xl font-bold text-slate-700 md:text-4xl lg:text-7xl dark:text-slate-300'>
              {'Revolutionize Patient Care with AI voice Agents.'.split(' ').map((word, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, filter: 'blur(4px)', y: 10 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.1,
                    ease: 'easeInOut',
                  }}
                  className='mr-2 inline-block'
                >
                  {word}
                </motion.span>
              ))}
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.8 }}
            className='relative z-10 py-4 text-lg font-normal text-neutral-600 dark:text-neutral-400'
          >
            Deliver personalized, efficient, and compassionate care with our AI voice agents,
            designed to enhance patient engagement and streamline healthcare processes.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 1 }}
            className='relative z-10 mt-8 flex flex-wrap items-center gap-4'
          >
            {session?.user ? (
              <Link
                href={'/agents'}
                className='w-full sm:w-60 transform rounded-lg bg-black px-6 py-2 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-center'
              >
                Explore Agents
              </Link>
            ) : (
              <button
                onClick={() => signIn()}
                className='w-full sm:w-60 transform rounded-lg bg-black px-6 py-2 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200'
              >
                Get Started
              </button>
            )}
            <button className='w-full sm:w-60 transform rounded-lg border border-gray-300 bg-white px-6 py-2 font-medium text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 dark:border-gray-700 dark:bg-black dark:text-white dark:hover:bg-gray-900'>
              Contact Support
            </button>
          </motion.div>
        </div>
        <motion.img
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 1.2 }}
          src='/brain.png'
          alt='CareAI Logo'
          width={1000}
          height={1000}
          className='max-xl:hidden mb-4 rounded-full'
        />
      </div>
    </>
  );
}

export const Navbar = () => {
  const { data: session } = useSession();

  return (
    <nav className='flex w-full items-center justify-between border-t border-b border-neutral-200 px-4 py-1 dark:border-neutral-800'>
      <div className='flex items-end'>
        <Image
          src='/care_ai.png'
          alt='CareAI Logo'
          width={1000}
          height={1000}
          className='w-16 rounded-full'
        />
        <h1 className='relative -left-1 bottom-1 text-base md:text-2xl lg:text-3xl'>CareAI</h1>
      </div>
      <div className='sm:space-x-8'>
        {!session?.user ? (
          <div className='flex space-x-4'>
            <button
              onClick={() => signIn()}
              className='bg-transparent border border-black text-black rounded-lg font-medium text-sm sm:text-base py-2 px-4 sm:px-5 cursor-pointer dark:border-white dark:text-white'
            >
              Sign In
            </button>
            <button
              onClick={() => signIn()}
              className='hidden sm:block bg-black text-white rounded-lg font-medium text-sm sm:text-base py-2 px-4 sm:px-5 cursor-pointer dark:bg-white dark:text-black'
            >
              Sign Up
            </button>
          </div>
        ) : (
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-2'>
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt='User Avatar'
                  width={32}
                  height={32}
                  className='rounded-full'
                />
              )}
              <span className='max-sm:hidden'>{session.user.name ?? session.user.email}</span>
            </div>
            <Button variant='ghost' onClick={() => signOut()}>
              Sign Out
            </Button>
            <Button className='max-sm:hidden' asChild>
              <Link href='/dashboard'>Dashboard</Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export function MobileNav() {
  const { data: session } = useSession();
  const user = session?.user?.id;
  const mobLinks = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Agents', href: '/agents', icon: Bot },
  ];
  return (
    <div className='sm:hidden fixed bottom-0 w-full bg-background p-1 z-50 shadow-[0_0_10px_rgba(0,0,0,0.4)]'>
      <nav className='px-4 w-full'>
        <ul className='flex justify-between'>
          {mobLinks.map((link) => (
            <li key={link.name}>
              <Link href={link.href} className='flex flex-col items-center'>
                <link.icon className='size-6' />
                <span className='text-[8px] mt-1'>{link.name}</span>
              </Link>
            </li>
          ))}
          {user ? (
            <>
              <li>
                <Link href='/dashboard' className='flex flex-col items-center'>
                  <LayoutDashboard className='size-6' />
                  <span className='text-[8px] mt-1'>Dashboard</span>
                </Link>
              </li>
              <li>
                <button onClick={() => signOut()} className='flex flex-col items-center'>
                  <LogOut className='size-6' />
                  <span className='text-[8px] mt-1'>Logout</span>
                </button>
              </li>
            </>
          ) : (
            <li>
              <button onClick={() => signIn()} className='flex flex-col items-center'>
                <LogIn className='size-6' />
                <span className='text-[8px] mt-1'>Login</span>
              </button>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
