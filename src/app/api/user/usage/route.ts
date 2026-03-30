import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import { checkConsultationAccess } from '@/lib/billing/entitlements';
import {
  canAccessComprehensiveReports,
  canAccessPremiumModels,
  canAccessSpecialistRouting,
} from '@/lib/billing/plans';

const getHandler = async () => {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
  }

  try {
    const access = await checkConsultationAccess(userId);

    return NextResponse.json(
      {
        planTier: access.planTier,
        consultationAccessStatus: access.status,
        consultationsUsed: access.consultationsUsed,
        consultationsLimit: access.consultationsLimit,
        consultationsRemaining: access.consultationsRemaining,
        premiumAccessPending: access.premiumAccessPending,
        premiumAccessGrantedAt: access.premiumAccessGrantedAt,
        currentPeriodKey: access.currentPeriodKey,
        canAccessSpecialists: canAccessSpecialistRouting(access.planTier),
        canAccessPremiumModels: canAccessPremiumModels(access.planTier),
        canAccessComprehensiveReports: canAccessComprehensiveReports(access.planTier),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[user/usage] Failed to load usage:', error);
    return NextResponse.json({ error: 'Failed to load usage details.' }, { status: 500 });
  }
};

export const GET = withApiRequestAudit(async () => getHandler());
