import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { ApiErrorResponse } from '@bizmanage/types';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode = 400, code = 'VALIDATION_ERROR', details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function globalErrorHandler(error: FastifyError | AppError | ZodError | any, request: FastifyRequest, reply: FastifyReply) {
  // Always log error details in server logs for diagnostics
  console.error(`[API Error] ${request.method} ${request.url}:`, error);

  if (error instanceof ZodError || error?.name === 'ZodError') {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors?.map((e: any) => ({
          field: e.path?.join('.'),
          message: e.message,
        })),
      },
    };
    return reply.status(400).send(response);
  }

  if (error instanceof AppError || error?.name === 'AppError' || (typeof error?.statusCode === 'number' && error?.statusCode < 500)) {
    const statusCode = error.statusCode || 400;
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: error.code || 'APP_ERROR',
        message: error.message,
        details: error.details,
      },
    };
    return reply.status(statusCode).send(response);
  }

  // Handle Prisma Client Known Request Errors
  if (error?.code === 'P2002') {
    const target = (error.meta?.target as string[])?.join(', ') || 'field';
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'CONFLICT',
        message: `A record with this ${target} already exists.`,
      },
    };
    return reply.status(409).send(response);
  }

  if (error?.code === 'P2025') {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested record was not found.',
      },
    };
    return reply.status(404).send(response);
  }

  if (error?.code === 'P2003') {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Referenced entity does not exist or cannot be modified.',
      },
    };
    return reply.status(400).send(response);
  }

  if (error?.name === 'PrismaClientValidationError') {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data format provided to database.',
      },
    };
    return reply.status(400).send(response);
  }

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: error?.message || 'Internal server error',
    },
  };
  return reply.status(500).send(response);
}
