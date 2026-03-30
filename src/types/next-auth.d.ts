import { type DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role?: 'USER' | 'ADMIN';
      status?: 'ACTIVE' | 'RESTRICTED' | 'BLOCKED';
      planTier?: 'FREE' | 'BASIC' | 'PRO';
      premiumAccessGrantedAt?: Date | null;
    } & DefaultSession['user'];
  }

  interface User {
    role?: 'USER' | 'ADMIN';
    status?: 'ACTIVE' | 'RESTRICTED' | 'BLOCKED';
    planTier?: 'FREE' | 'BASIC' | 'PRO';
    premiumAccessGrantedAt?: Date | null;
  }
}
