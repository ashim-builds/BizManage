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
import { 
  sendVerificationEmail, 
  sendPasswordResetEmail, 
  sendPasswordChangedEmail,
  sendNewLoginEmail,
  sendGoogleConnectedEmail,
  sendGoogleDisconnectedEmail,
  sendSuspiciousLoginEmail
} from '../../services/emailService.js';
import { AuditService } from '../../services/audit.service.js';
import { z } from 'zod';
import { UAParser } from 'ua-parser-js';

const verifyEmailSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

const resendOtpSchema = z.object({
  email: z.string().email(),
});

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getSessionMetadata(request: any) {
  const userAgent = request.headers['user-agent'];
  const parser = new UAParser(userAgent || '');
  const result = parser.getResult();
  return {
    device: result.device.type ? `${result.device.vendor || ''} ${result.device.model || result.device.type}`.trim() : 'Desktop',
    browser: result.browser.name ? `${result.browser.name} ${result.browser.version || ''}`.trim() : 'Unknown Browser',
    os: result.os.name ? `${result.os.name} ${result.os.version || ''}`.trim() : 'Unknown OS',
    ipAddress: request.ip || request.headers['x-forwarded-for'] || 'Unknown IP',
  };
}

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
      if (!existingUser.isVerified) {
        // Automatically resend OTP and pretend registration succeeded.
        const rawOtp = generateOtp();
        const otpHash = await argon2.hash(rawOtp);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        
        // Delete old OTP if exists
        await globalPrisma.otpVerification.deleteMany({ where: { userId: existingUser.id } });

        await globalPrisma.otpVerification.create({
          data: {
            userId: existingUser.id,
            otpHash,
            expiresAt,
          },
        });

        try {
          await sendVerificationEmail(existingUser.email, rawOtp);
        } catch (error) {
          console.error('Registration email failed to send, but user was already created:', error);
        }

        return reply.status(200).send({
          success: true,
          message: 'Account exists but is unverified. New OTP sent. Redirecting to verification.',
          data: {
            user: {
              id: existingUser.id,
              email: existingUser.email,
              name: existingUser.name,
              isVerified: false,
            }
          },
        });
      }
      throw new AppError('Email address is already registered', 409, 'CONFLICT');
    }

    const passwordHash = await argon2.hash(body.password);

    const result = await globalPrisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: body.email,
          name: body.name,
          passwordHash,
          isVerified: false,
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

    const rawOtp = generateOtp();
    const otpHash = await argon2.hash(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await globalPrisma.otpVerification.create({
      data: {
        userId: result.user.id,
        otpHash,
        expiresAt,
      },
    });

    try {
      await sendVerificationEmail(result.user.email, rawOtp);
    } catch (error) {
      console.error('Registration email failed to send, but user was created:', error);
      // We don't throw here because the user is already created in the database.
      // They can still request a new OTP later from the verify-email page.
    }

    AuditService.logEvent({
      action: 'REGISTER_USER',
      module: 'Auth',
      ipAddress: request.ip,
      newValue: { email: result.user.email, name: result.user.name }
    });

    return reply.status(201).send({
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          isVerified: false,
        },
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

    // Check for account lockout
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new AppError('Account is temporarily locked due to too many failed login attempts. Please try again later.', 403, 'ACCOUNT_LOCKED');
    }

    if (!user.passwordHash) {
      throw new AppError('Please use Google to sign in to this account.', 401, 'INVALID_CREDENTIALS');
    }

    const validPassword = await argon2.verify(user.passwordHash, body.password);
    if (!validPassword) {
      // Increment failed attempts
      const newAttempts = user.failedLoginAttempts + 1;
      let newLockedUntil = null;
      if (newAttempts >= 5) {
        newLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 mins
      }
      
      await globalPrisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil: newLockedUntil,
        },
      });

      if (newLockedUntil) {
        sendSuspiciousLoginEmail(user.email).catch(console.error);
        AuditService.logEvent({ action: 'ACCOUNT_LOCKED', module: 'Auth', recordId: user.id, ipAddress: request.ip });
      }

      AuditService.logEvent({ action: 'LOGIN_FAILED', module: 'Auth', recordId: user.id, ipAddress: request.ip, newValue: { reason: 'Invalid Password' } });
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Reset failed attempts and track successful login
    await globalPrisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    if (!user.isVerified) {
      throw new AppError('Email not verified', 403, 'EMAIL_NOT_VERIFIED');
    }

    if (user.isSystemAdmin) {
      throw new AppError('Admin users must use the admin portal', 403, 'FORBIDDEN');
    }

    // Check if the user has any active businesses
    if (user.memberships.length > 0) {
      const hasActiveBusiness = user.memberships.some(m => m.business.isActive);
      if (!hasActiveBusiness) {
        throw new AppError('Your business account has been suspended. Please contact the administrator.', 403, 'FORBIDDEN');
      }
    }

    // Refresh Token Session
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sessionMeta = getSessionMetadata(request);

    await globalPrisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: sessionExpiresAt,
        ...sessionMeta,
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

    reply.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });

    AuditService.logEvent({ action: 'LOGIN_SUCCESS', module: 'Auth', userId: user.id, recordId: user.id, ipAddress: request.ip });
    sendNewLoginEmail(user.email, request.ip).catch(console.error);

    return reply.send({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
          isSystemAdmin: user.isSystemAdmin,
        },
        memberships: user.memberships.map((m) => ({
          business: { id: m.business.id, name: m.business.name },
          role: m.role,
        })),
      },
    });
  });

  fastify.post('/verify-email', async (request, reply) => {
    const body = verifyEmailSchema.parse(request.body);

    const user = await globalPrisma.user.findUnique({
      where: { email: body.email },
      include: { otpVerification: true },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    if (user.isVerified) {
      return reply.send({ success: true, message: 'Email already verified' });
    }

    if (!user.otpVerification) {
      throw new AppError('No OTP request found. Please resend the code.', 400, 'NO_OTP');
    }

    const { otpVerification } = user;

    if (otpVerification.attempts >= 5) {
      await globalPrisma.otpVerification.delete({ where: { userId: user.id } });
      throw new AppError('Too many failed attempts. Please request a new OTP.', 400, 'MAX_ATTEMPTS');
    }

    if (new Date() > otpVerification.expiresAt) {
      throw new AppError('OTP has expired. Please request a new one.', 400, 'EXPIRED_OTP');
    }

    const isValid = await argon2.verify(otpVerification.otpHash, body.otp);

    if (!isValid) {
      await globalPrisma.otpVerification.update({
        where: { userId: user.id },
        data: { attempts: { increment: 1 } },
      });
      throw new AppError('Invalid OTP', 400, 'INVALID_OTP');
    }

    // OTP Valid! Mark verified, delete OTP
    await globalPrisma.$transaction([
      globalPrisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      }),
      globalPrisma.otpVerification.delete({ where: { userId: user.id } }),
    ]);

    // Create session for auto-login
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sessionMeta = getSessionMetadata(request);

    await globalPrisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: sessionExpiresAt,
        ...sessionMeta,
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

    reply.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });

    AuditService.logEvent({ action: 'EMAIL_VERIFIED', module: 'Auth', userId: user.id, recordId: user.id, ipAddress: request.ip });

    return reply.send({
      success: true,
      message: 'Email verified successfully',
      data: { accessToken, user: { id: user.id, email: user.email, name: user.name, isVerified: true } },
    });
  });

  fastify.post('/resend-otp', {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '15 minutes',
      },
    },
  }, async (request, reply) => {
    const body = resendOtpSchema.parse(request.body);

    const user = await globalPrisma.user.findUnique({
      where: { email: body.email },
      include: { otpVerification: true },
    });

    if (!user) {
      return reply.send({ success: true, message: 'If registered, an OTP will be sent.' });
    }

    if (user.isVerified) {
      throw new AppError('Email already verified', 400, 'ALREADY_VERIFIED');
    }

    if (user.otpVerification) {
      const timeSinceLastOtp = Date.now() - user.otpVerification.createdAt.getTime();
      if (timeSinceLastOtp < 60000) { // 1 minute
        throw new AppError('Please wait before requesting a new OTP', 429, 'RATE_LIMIT');
      }
      
      // Delete old OTP
      await globalPrisma.otpVerification.delete({ where: { userId: user.id } });
    }

    const rawOtp = generateOtp();
    const otpHash = await argon2.hash(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await globalPrisma.otpVerification.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt,
      },
    });

    try {
      await sendVerificationEmail(user.email, rawOtp);
    } catch (error) {
      console.error('Resend OTP email failed to send, but OTP was generated:', error);
    }

    return reply.send({ success: true, message: 'New OTP sent successfully' });
  });


  // 2.5. ADMIN LOGIN: Verify Argon2 -> Create Session -> Return JWT Access Token
  fastify.post('/admin-login', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '15 minutes',
      },
    },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body);

    let user = await globalPrisma.user.findFirst({
      where: { email: body.email, isSystemAdmin: true },
    });

    if (user) {
      // Check for account lockout
      if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
        throw new AppError('Account is temporarily locked due to too many failed login attempts. Please try again later.', 403, 'ACCOUNT_LOCKED');
      }

      if (!user.passwordHash) {
        throw new AppError('Admin accounts without passwords cannot use this login method.', 401, 'INVALID_CREDENTIALS');
      }

      // User exists, verify against DB hash
      const isValid = await argon2.verify(user.passwordHash, body.password);
      if (!isValid) {
        // Increment failed attempts
        const newAttempts = (user.failedLoginAttempts || 0) + 1;
        let newLockedUntil = null;
        if (newAttempts >= 5) {
          newLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 mins
        }
        
        await globalPrisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newAttempts,
            lockedUntil: newLockedUntil,
          },
        });

        throw new AppError('Invalid admin credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Reset failed attempts
      await globalPrisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        },
      });
    } else {
      // First time login fallback: check against ENV
      const envAdminEmail = process.env.ADMIN_EMAIL;
      const envAdminPassword = process.env.ADMIN_PASSWORD;

      if (!envAdminEmail || !envAdminPassword || body.email !== envAdminEmail || body.password !== envAdminPassword) {
        throw new AppError('Invalid admin credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Check if user exists but isn't system admin
      user = await globalPrisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        const passwordHash = await argon2.hash(envAdminPassword);
        user = await globalPrisma.user.create({
          data: {
            email: envAdminEmail,
            name: 'System Admin',
            passwordHash,
            isVerified: true,
            isSystemAdmin: true,
          },
        });
      } else {
        user = await globalPrisma.user.update({
          where: { id: user.id },
          data: { isSystemAdmin: true },
        });
      }
    }

    // Refresh Token Session
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sessionMeta = getSessionMetadata(request);

    await globalPrisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: sessionExpiresAt,
        ...sessionMeta,
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

    reply.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(Date.now() + 15 * 60 * 1000),
    });

    AuditService.logEvent({ action: 'ADMIN_LOGIN', module: 'Auth', userId: user.id, recordId: user.id, ipAddress: request.ip });

    return reply.send({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isSystemAdmin: user.isSystemAdmin,
        },
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

    // Update last activity
    await globalPrisma.session.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    const accessToken = fastify.jwt.sign(
      { userId: session.user.id, email: session.user.email },
      { expiresIn: '15m' }
    );

    reply.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });

    return reply.send({
      success: true,
      data: {
        user: { id: session.user.id, email: session.user.email, name: session.user.name },
      },
    });
  });

  // 4. LOGOUT: Revoke Session -> Clear Cookie
  fastify.post('/logout', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;
    if (refreshToken) {
      const session = await globalPrisma.session.findUnique({ where: { token: refreshToken } });
      if (session) {
        AuditService.logEvent({ action: 'LOGOUT', module: 'Auth', userId: session.userId, recordId: session.userId, ipAddress: request.ip });
        await globalPrisma.session.deleteMany({ where: { token: refreshToken } });
      }
    }

    reply.clearCookie('refreshToken', { path: '/api/v1/auth' });
    reply.clearCookie('accessToken', { path: '/' });

    return reply.send({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  });

  // 5. GET CURRENT USER: Profile & Memberships
  fastify.get('/me', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      // Return gracefully instead of 401 to prevent console errors on initial load
      return reply.send({ success: true, data: null });
    }

    const payload = request.user as any;
    const userId = payload.userId || payload.id;

    const user = await globalPrisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        isVerified: true,
        readNotifications: true,
        activeBusinessId: true,
        isSystemAdmin: true,
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
                logoUrl: true,
                profileCompleted: true,
                setupCompleted: true,
                isActive: true,
                subscriptionStatus: true,
                planOverrides: true,
                subscriptionPackage: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const formattedUser = {
      ...user,
      readNotifications: user.readNotifications.map((n: any) => n.notificationId)
    };

    return reply.send({
      success: true,
      data: formattedUser,
    });
  });

  // 5b. PATCH CURRENT USER PREFERENCES
  fastify.patch('/me/preferences', { preHandler: [authenticateUser] }, async (request, reply) => {
    const { readNotifications, activeBusinessId } = request.body as { readNotifications?: string[], activeBusinessId?: string };
    
    if (activeBusinessId !== undefined) {
      await globalPrisma.user.update({
        where: { id: request.user.id },
        data: { activeBusinessId },
      });
    }

    if (readNotifications !== undefined) {
      await globalPrisma.$transaction([
        globalPrisma.notificationRead.deleteMany({
          where: { userId: request.user.id }
        }),
        globalPrisma.notificationRead.createMany({
          data: readNotifications.map(id => ({
            userId: request.user.id,
            notificationId: id
          }))
        })
      ]);
    }

    const updatedUser = await globalPrisma.user.findUnique({
      where: { id: request.user.id },
      include: { readNotifications: true }
    });

    return reply.send({
      success: true,
      data: {
        readNotifications: updatedUser?.readNotifications.map((n: any) => n.notificationId) || [],
        activeBusinessId: updatedUser?.activeBusinessId,
      },
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

    // Invalidate old tokens
    await globalPrisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await globalPrisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    });

    try {
      await sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
      console.error('Forgot password email failed to send, but token was generated:', error);
    }

    return reply.send({
      success: true,
      data: {
        message: 'If an account exists with this email, a reset token has been issued.',
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

    // Send security notification email
    const user = await globalPrisma.user.findUnique({ where: { id: resetRecord.userId } });
    if (user) {
      sendPasswordChangedEmail(user.email).catch(err => {
        console.error('Failed to send password changed notification email:', err);
      });
      AuditService.logEvent({ action: 'PASSWORD_RESET', module: 'Auth', recordId: user.id, userId: user.id, ipAddress: request.ip });
    }

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

    if (!user.passwordHash) {
      throw new AppError('Password not set for this account. Please use social login or set a password.', 400, 'INVALID_CREDENTIALS');
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

    // Send security notification email
    sendPasswordChangedEmail(user.email).catch(err => {
      console.error('Failed to send password changed notification email:', err);
    });

    AuditService.logEvent({ action: 'PASSWORD_CHANGED', module: 'Auth', recordId: user.id, userId: user.id, ipAddress: request.ip });

    return reply.send({
      success: true,
      data: { message: 'Password changed successfully. Please log in again.' },
    });
  });

  // 9. GOOGLE OAUTH: Initiate flow
  fastify.get('/google', async (request, reply) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new AppError('Google OAuth is not configured', 500, 'SERVER_ERROR');
    }

    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    // Store state and code_verifier in cookies
    reply.setCookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/google/callback',
      maxAge: 10 * 60, // 10 minutes
    });

    reply.setCookie('oauth_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/google/callback',
      maxAge: 10 * 60,
    });

    const defaultCallback = `${request.protocol}://${request.headers.host || request.hostname}/api/v1/auth/google/callback`;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || defaultCallback;

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return reply.redirect(url);
  });

  // 10. GOOGLE OAUTH: Callback
  fastify.get('/google/callback', async (request, reply) => {
    const { code, state, error } = request.query as any;
    const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';

    if (error) {
      return reply.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error)}`);
    }

    const storedState = request.cookies.oauth_state;
    const storedCodeVerifier = request.cookies.oauth_code_verifier;

    if (!state || state !== storedState || !storedCodeVerifier) {
      return reply.redirect(`${frontendUrl}/login?error=Invalid_OAuth_State`);
    }

    // Clear OAuth cookies
    reply.clearCookie('oauth_state', { path: '/api/v1/auth/google/callback' });
    reply.clearCookie('oauth_code_verifier', { path: '/api/v1/auth/google/callback' });

    try {
      const defaultCallback = `${request.protocol}://${request.headers.host || request.hostname}/api/v1/auth/google/callback`;
      const redirectUri = process.env.GOOGLE_CALLBACK_URL || defaultCallback;

      // Exchange code for token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code_verifier: storedCodeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const tokenData = await tokenResponse.json() as { access_token: string };

      // Fetch user profile
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const profileData = await profileResponse.json() as { id: string; email: string; name: string; picture: string; };
      const { id: googleId, email, name, picture: avatarUrl } = profileData;

      if (!email) {
        throw new Error('Google account has no email associated');
      }

      // Check if user exists
      let user = await globalPrisma.user.findUnique({ where: { email } });

      if (user) {
        // Link account and auto-verify email
        user = await globalPrisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            avatarUrl: user.avatarUrl || avatarUrl,
            isVerified: true, // Google emails are already verified by Google
          },
        });
      } else {
        // Create new account
        user = await globalPrisma.user.create({
          data: {
            email,
            name,
            googleId,
            avatarUrl,
            isVerified: true,
          },
        });
      }

      // Create session
      const refreshToken = crypto.randomBytes(40).toString('hex');
      const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const sessionMeta = getSessionMetadata(request);

      await globalPrisma.session.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt: sessionExpiresAt,
          ...sessionMeta,
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

      reply.setCookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60,
      });

      AuditService.logEvent({ action: 'LOGIN_SUCCESS', module: 'Auth', userId: user.id, recordId: user.id, ipAddress: request.ip });

      // Redirect to dashboard
      return reply.redirect(`${frontendUrl}/dashboard`);
    } catch (err: any) {
      console.error('Google OAuth Error:', err);
      return reply.redirect(`${frontendUrl}/login?error=OAuth_Failed`);
    }
  });
  // --- SESSION MANAGEMENT ROUTES ---

  fastify.get('/sessions', { preHandler: [authenticateUser] }, async (request, reply) => {
    const sessions = await globalPrisma.session.findMany({
      where: { userId: request.user.id },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        device: true,
        browser: true,
        os: true,
        ipAddress: true,
        lastActiveAt: true,
        createdAt: true,
        token: true, // we need token locally to match current session, but don't expose it to client
      },
    });

    const currentToken = request.cookies.refreshToken;

    const safeSessions = sessions.map(session => {
      const isCurrent = session.token === currentToken;
      return {
        id: session.id,
        device: session.device,
        browser: session.browser,
        os: session.os,
        ipAddress: session.ipAddress,
        lastActiveAt: session.lastActiveAt,
        createdAt: session.createdAt,
        isCurrent,
      };
    });

    return reply.send({ success: true, data: safeSessions });
  });

  fastify.delete('/sessions/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = await globalPrisma.session.findUnique({ where: { id } });

    if (!session || session.userId !== request.user.id) {
      throw new AppError('Session not found', 404, 'NOT_FOUND');
    }

    if (session.token === request.cookies.refreshToken) {
      throw new AppError('Cannot delete current session here. Use logout instead.', 400, 'BAD_REQUEST');
    }

    await globalPrisma.session.delete({
      where: { id: session.id },
    });

    AuditService.logEvent({ action: 'REVOKE_SESSION', module: 'Auth', userId: session.userId, recordId: id, ipAddress: request.ip });

    return reply.send({ success: true, message: 'Session revoked' });
  });

  fastify.delete('/sessions', { preHandler: [authenticateUser] }, async (request, reply) => {
    const currentToken = request.cookies.refreshToken;
    if (!currentToken) {
      throw new AppError('No active session', 400, 'BAD_REQUEST');
    }

    await globalPrisma.session.deleteMany({
      where: {
        userId: request.user.id,
        token: { not: currentToken },
      },
    });

    return reply.send({ success: true, message: 'All other sessions revoked' });
  });
}
