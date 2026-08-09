export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  BILLER = 'BILLER',
  ACCOUNTANT = 'ACCOUNTANT',
}

export enum PartyType {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
  BOTH = 'BOTH',
}

export enum ItemType {
  PRODUCT = 'PRODUCT',
  SERVICE = 'SERVICE',
}

export enum PaymentMode {
  CASH = 'CASH',
  BANK = 'BANK',
  CHEQUE = 'CHEQUE',
  ONLINE = 'ONLINE',
}

export enum StockMovementType {
  INITIAL = 'INITIAL',
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  SALE_RETURN = 'SALE_RETURN',
  PURCHASE_RETURN = 'PURCHASE_RETURN',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum QuotationStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CONVERTED = 'CONVERTED',
}

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
  role: Role;
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
