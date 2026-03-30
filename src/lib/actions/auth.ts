'use server';

import { auth } from '@/auth';
import { getClientIp, getUserAgent, writeAuditLog } from '@/lib/audit';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { sendEmail } from '@/lib/mail';
import { headers } from 'next/headers';

export const register = async (email: string, password: string, name?: string) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  // Generate verification token
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600 * 1000 * 24); // 24 hours
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  // Send verification email
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  await sendEmail(
    email,
    'Verify your email',
    `<p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`
  );

  return { success: true };
};

export const verifyEmail = async (token: string) => {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationToken) throw new Error('Invalid token');
  if (new Date() > verificationToken.expires) throw new Error('Token expired');

  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { emailVerified: new Date() },
  });

  await prisma.verificationToken.delete({
    where: { token },
  });

  return { success: true };
};

export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.password) return { success: true }; // Silently return if no user or oauth only

  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

  // delete old tokens
  await prisma.passwordResetToken.deleteMany({ where: { email } });

  await prisma.passwordResetToken.create({
    data: { email, token, expires },
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  await sendEmail(
    email,
    'Reset your password',
    `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`
  );

  return { success: true };
};

export const resetPassword = async (token: string, password: string) => {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) throw new Error('Invalid token');
  if (new Date() > resetToken.expires) throw new Error('Token expired');

  const hashedPassword = await bcrypt.hash(password, 10);

  // Update password and verify email just in case it wasn't
  await prisma.user.update({
    where: { email: resetToken.email },
    data: { password: hashedPassword, emailVerified: new Date() },
  });

  await prisma.passwordResetToken.delete({
    where: { token },
  });

  // Optional: Destroy all sessions of this user for security
  await prisma.session.deleteMany({
    where: { userId: (await prisma.user.findUnique({ where: { email: resetToken.email } }))!.id },
  });

  return { success: true };
};

export const revokeUserSessions = async (userId: string) => {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const requestHeaders = await headers();
  const ipAddress = getClientIp(requestHeaders);
  const userAgent = getUserAgent(requestHeaders);

  const deletedSessions = await prisma.session.deleteMany({
    where: { userId },
  });

  await prisma.adminAction.create({
    data: {
      adminUserId: session.user.id,
      targetUserId: userId,
      actionType: 'REVOKE_SESSIONS',
      ipAddress,
      metadata: {
        revokedSessions: deletedSessions.count,
      },
    },
  });

  await writeAuditLog({
    userId: session.user.id,
    action: 'admin.revoke_sessions',
    ipAddress,
    userAgent,
    metadata: {
      targetUserId: userId,
      revokedSessions: deletedSessions.count,
    },
  });

  return { success: true };
};
