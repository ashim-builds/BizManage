import { FastifyInstance } from 'fastify';
import { globalPrisma } from '@bizmanage/database';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@bizmanage/validation';
import { AppError } from '../../plugins/error-handler.js';
import { authenticateUser } from '../../middleware/auth.js';
import argon2 from 'argon2';
import crypto from 'crypto';

export async function authRoutes(fastify: FastifyInstance) {
  // 1. REGISTER: User -> Business Creation -> Owner Role -> Session
  fastify.post('/register', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes',
      },
    },
  }, async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existingUser = await globalPrisma.user.findUnique({ where: { email: body.email } });
    if (existingUser) {
      throw new AppError('Email address is already registered', 409, 'CONFLICT');
    }

    const passwordHash = await argon2.hash(body.password);

    const result = await globalPrisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: body.email,
          name: body.name,
          passwordHash,
        },
      });

      const business = await tx.business.create({
        data: {
          name: body.businessName,
          email: body.email,
          settings: { create: {} },
        },
      });

      await tx.userBusinessRole.create({
        data: {
          userId: user.id,
          businessId: business.id,
          role: 'OWNER',
        },
      });

      await tx.account.create({
        data: {
          businessId: business.id,
          accountName: 'Cash In Hand',
          accountType: 'CASH',
        },
      });

      return { user, business };
    });

    // Create Refresh Token Session
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await globalPrisma.session.create({
      data: {
        userId: result.user.id,
        token: refreshToken,
        expiresAt: sessionExpiresAt,
      },
    });

    // Set HttpOnly Cookie
    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      expires: sessionExpiresAt,
    });

    // Generate short-lived Access Token (15m)
    const accessToken = fastify.jwt.sign(
      { userId: result.user.id, email: result.user.email },
      { expiresIn: '15m' }
    );

    return reply.status(201).send({
      success: true,
      data: {
        accessToken,
        user: { id: result.user.id, email: result.user.email, name: result.user.name },
        business: { id: result.business.id, name: result.business.name },
      },
    });
  });

  // 2. LOGIN: Verify Argon2 -> Create Session -> Return JWT Access Token
  fastify.post('/login', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '15 minutes',
      },
    },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await globalPrisma.user.findUnique({
      where: { email: body.email },
      include: {
        memberships: {
          include: { business: true },
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const validPassword = await argon2.verify(user.passwordHash, body.password);
    if (!validPassword) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Refresh Token Session
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await globalPrisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: sessionExpiresAt,
      },
    });

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      expires: sessionExpiresAt,
    });

    const accessToken = fastify.jwt.sign(
      { userId: user.id, email: user.email },
      { expiresIn: '15m' }
    );

    return reply.send({
      success: true,
      data: {
        accessToken,
        user: { id: user.id, email: user.email, name: user.name },
        businesses: user.memberships.map((m) => ({
          id: m.business.id,
          name: m.business.name,
          role: m.role,
        })),
      },
    });
  });

  // 3. REFRESH: Validate HttpOnly Session Cookie -> Issue New Access Token
  fastify.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;
    if (!refreshToken) {
      throw new AppError('Refresh token missing', 401, 'UNAUTHORIZED');
    }

    const session = await globalPrisma.session.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await globalPrisma.session.delete({ where: { id: session.id } });
      }
      reply.clearCookie('refreshToken', { path: '/api/v1/auth' });
      throw new AppError('Session expired or invalid', 401, 'UNAUTHORIZED');
    }

    const accessToken = fastify.jwt.sign(
      { userId: session.user.id, email: session.user.email },
      { expiresIn: '15m' }
    );

    return reply.send({
      success: true,
      data: {
        accessToken,
        user: { id: session.user.id, email: session.user.email, name: session.user.name },
      },
    });
  });

  // 4. LOGOUT: Revoke Session -> Clear Cookie
  fastify.post('/logout', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;
    if (refreshToken) {
      await globalPrisma.session.deleteMany({ where: { token: refreshToken } });
    }

    reply.clearCookie('refreshToken', { path: '/api/v1/auth' });

    return reply.send({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  });

  // 5. GET CURRENT USER: Profile & Memberships
  fastify.get('/me', { preHandler: [authenticateUser] }, async (request, reply) => {
    const user = await globalPrisma.user.findUnique({
      where: { id: request.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            business: {
              select: {
                id: true,
                name: true,
                currency: true,
                taxNumber: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return reply.send({
      success: true,
      data: user,
    });
  });

  // 6. FORGOT PASSWORD: Create reset token
  fastify.post('/forgot-password', {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '15 minutes',
      },
    },
  }, async (request, reply) => {
    const body = forgotPasswordSchema.parse(request.body);

    const user = await globalPrisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      // Do not reveal email existence
      return reply.send({
        success: true,
        data: { message: 'If an account exists with this email, a reset token has been issued.' },
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await globalPrisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    });

    return reply.send({
      success: true,
      data: {
        message: 'Password reset token generated successfully.',
        resetToken, // Returned for testing & dev email simulation
      },
    });
  });

  // 7. RESET PASSWORD: Validate token -> Update password
  fastify.post('/reset-password', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes',
      },
    },
  }, async (request, reply) => {
    const body = resetPasswordSchema.parse(request.body);

    const resetRecord = await globalPrisma.passwordResetToken.findUnique({
      where: { token: body.token },
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      throw new AppError('Invalid or expired password reset token', 400, 'VALIDATION_ERROR');
    }

    const newPasswordHash = await argon2.hash(body.newPassword);

    await globalPrisma.$transaction([
      globalPrisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newPasswordHash },
      }),
      globalPrisma.passwordResetToken.delete({
        where: { id: resetRecord.id },
      }),
      globalPrisma.session.deleteMany({
        where: { userId: resetRecord.userId },
      }),
    ]);

    return reply.send({
      success: true,
      data: { message: 'Password reset successfully. Please log in with your new password.' },
    });
  });

  // 8. CHANGE PASSWORD: Authenticated user changes their own password
  fastify.patch('/change-password', { preHandler: [authenticateUser] }, async (request, reply) => {
    const body = request.body as {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    };

    if (!body.currentPassword || !body.newPassword || !body.confirmPassword) {
      throw new AppError('All password fields are required', 400, 'VALIDATION_ERROR');
    }

    if (body.newPassword !== body.confirmPassword) {
      throw new AppError('New password and confirmation do not match', 400, 'VALIDATION_ERROR');
    }

    if (body.newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters long', 400, 'VALIDATION_ERROR');
    }

    if (body.newPassword === body.currentPassword) {
      throw new AppError('New password must be different from your current password', 400, 'VALIDATION_ERROR');
    }

    const user = await globalPrisma.user.findUnique({ where: { id: request.user.id } });
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const validPassword = await argon2.verify(user.passwordHash, body.currentPassword);
    if (!validPassword) {
      throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');
    }

    const newPasswordHash = await argon2.hash(body.newPassword);

    // Update password and revoke all sessions (force re-login)
    await globalPrisma.$transaction([
      globalPrisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      }),
      globalPrisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    // Clear the current session cookie
    reply.clearCookie('refreshToken', { path: '/api/v1/auth' });

    return reply.send({
      success: true,
      data: { message: 'Password changed successfully. Please log in again.' },
    });
  });
}
