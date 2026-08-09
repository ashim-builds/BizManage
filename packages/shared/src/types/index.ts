import { SystemRole } from '../enums/index.js';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface UserContext {
  id: string;
  email: string;
  name: string;
}

export interface TenantContext {
  businessId: string;
}

export interface MembershipContext {
  role: SystemRole;
}

export interface RequestContext {
  user: UserContext;
  tenant: TenantContext;
  membership: MembershipContext;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
