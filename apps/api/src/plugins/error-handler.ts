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

export function globalErrorHandler(error: FastifyError | AppError | ZodError | any, _request: FastifyRequest, reply: FastifyReply) {
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

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    },
  };
  return reply.status(500).send(response);
}
