import { createHash, randomBytes } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email/gmail';

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export function createEmailVerificationToken() {
  const token = randomBytes(32).toString('hex');

  return {
    token,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS),
  };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class EmailVerificationService {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async verify(token: unknown): Promise<{ success: boolean; role?: string; aprobado?: boolean }> {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      return { success: false };
    }

    const tokenHash = hashToken(token);
    const now = new Date();

    return this.prismaClient.$transaction(async (tx) => {
      const savedToken = await tx.emailVerificationToken.findUnique({
        where: { tokenHash },
      });

      if (!savedToken) return { success: false };

      if (savedToken.expiresAt <= now) {
        await tx.emailVerificationToken.delete({ where: { id: savedToken.id } });
        return { success: false };
      }

      const consumedToken = await tx.emailVerificationToken.deleteMany({
        where: { id: savedToken.id, expiresAt: { gt: now } },
      });
      if (consumedToken.count !== 1) return { success: false };

      const verifiedUser = await tx.user.updateMany({
        where: { id: savedToken.userId, emailVerified: null },
        data: { emailVerified: now },
      });

      if (verifiedUser.count !== 1) return { success: false };

      const user = await tx.user.findUnique({
        where: { id: savedToken.userId },
        select: { role: true, aprobado: true },
      });

      return {
        success: true,
        role: user?.role,
        aprobado: user?.aprobado,
      };
    });
  }

  async resend(email: string): Promise<void> {
    const user = await this.prismaClient.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user || user.emailVerified) return;

    const token = createEmailVerificationToken();
    const savedToken = await this.prismaClient.emailVerificationToken.findUnique({
      where: { userId: user.id },
    });

    if (savedToken) {
      const cooldownCutoff = new Date(Date.now() - RESEND_COOLDOWN_MS);
      const updated = await this.prismaClient.emailVerificationToken.updateMany({
        where: { userId: user.id, lastSentAt: { lte: cooldownCutoff } },
        data: {
          tokenHash: token.tokenHash,
          expiresAt: token.expiresAt,
          lastSentAt: new Date(),
        },
      });

      if (updated.count !== 1) return;
    } else {
      await this.prismaClient.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: token.tokenHash,
          expiresAt: token.expiresAt,
        },
      });
    }

    await sendVerificationEmail(user.email, token.token);
  }
}

export const emailVerificationService = new EmailVerificationService();
