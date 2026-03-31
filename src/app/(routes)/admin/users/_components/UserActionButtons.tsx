'use client';

import { Button } from '@/components/ui/button';
import { PlanTier, UserStatus } from '@/lib/generated/prisma/client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

type UserActionButtonsProps = {
  userId: string;
  disabledPremiumActivation: boolean;
  user: {
    email: string;
    id: string;
    status: UserStatus;
    name: string | null;
    createdAt: Date;
    lastActiveAt: Date | null;
    planTier: PlanTier;
    consultationsUsed: number;
    premiumAccessGrantedAt: Date | null;
  };
};

type UserAction = 'RESTRICT' | 'UNBLOCK' | 'BLOCK' | 'REVOKE_SESSIONS' | 'ACTIVATE_PREMIUM_MODELS';

const actionLabels: Record<UserAction, string> = {
  RESTRICT: 'Restrict',
  UNBLOCK: 'Unblock',
  BLOCK: 'Block',
  REVOKE_SESSIONS: 'Revoke Sessions',
  ACTIVATE_PREMIUM_MODELS: 'Activate Premium',
};

export default function UserActionButtons({
  userId,
  disabledPremiumActivation,
  user,
}: Readonly<UserActionButtonsProps>) {
  const [loadingAction, setLoadingAction] = useState<UserAction | null>(null);
  const router = useRouter();
  const currentUser = useSession().data?.user;
  const isCurrentUser = currentUser?.id === userId;
  const superAdmins = [
    'mzeeshankhan0988@gmail.com',
    'zebotix@gmail.com',
    'apnacampus.it@gmail.com',
    'dr5269139@gmail.com',
  ];
  const isSuperAdmins = superAdmins.includes(user.email || '');

  const runAction = async (action: UserAction) => {
    let reason: string | undefined;
    let expiresAt: string | undefined;

    if (action === 'RESTRICT') {
      reason = window.prompt('Enter restriction reason:')?.trim() || undefined;
      const expiryInput = window.prompt(
        'Optional expiry (ISO or YYYY-MM-DD). Leave empty for no expiry:'
      );
      expiresAt = expiryInput?.trim() || undefined;
    }

    if (action === 'BLOCK') {
      reason = window.prompt('Enter block reason:')?.trim() || undefined;
    }

    if (action === 'UNBLOCK') {
      reason = window.prompt('Optional unblock note:')?.trim() || undefined;
    }

    try {
      setLoadingAction(action);

      const response = await fetch(`/api/admin/users/${userId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          reason,
          expiresAt,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to apply admin action.');
      }

      toast.success(`${actionLabels[action]} applied.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Admin action failed.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className='flex flex-wrap gap-2'>
      {!isCurrentUser && !isSuperAdmins && (
        <Button
          variant='outline'
          size='sm'
          disabled={loadingAction !== null}
          onClick={() => runAction('RESTRICT')}
        >
          {loadingAction === 'RESTRICT' ? 'Working...' : actionLabels.RESTRICT}
        </Button>
      )}
      {!isCurrentUser && !isSuperAdmins && (
        <Button
          variant='outline'
          size='sm'
          disabled={loadingAction !== null}
          onClick={() => runAction('UNBLOCK')}
        >
          {loadingAction === 'UNBLOCK' ? 'Working...' : actionLabels.UNBLOCK}
        </Button>
      )}
      {!isCurrentUser && !isSuperAdmins && (
        <Button
          variant='outline'
          size='sm'
          disabled={loadingAction !== null}
          onClick={() => runAction('BLOCK')}
        >
          {loadingAction === 'BLOCK' ? 'Working...' : actionLabels.BLOCK}
        </Button>
      )}
      {!isCurrentUser && !isSuperAdmins && (
        <Button
          variant='outline'
          size='sm'
          disabled={loadingAction !== null}
          onClick={() => runAction('REVOKE_SESSIONS')}
        >
          {loadingAction === 'REVOKE_SESSIONS' ? 'Working...' : actionLabels.REVOKE_SESSIONS}
        </Button>
      )}
      <Button
        variant='outline'
        size='sm'
        disabled={loadingAction !== null || disabledPremiumActivation}
        onClick={() => runAction('ACTIVATE_PREMIUM_MODELS')}
      >
        {loadingAction === 'ACTIVATE_PREMIUM_MODELS'
          ? 'Working...'
          : actionLabels.ACTIVATE_PREMIUM_MODELS}
      </Button>
    </div>
  );
}
