import { z } from 'zod';
import { PartyType, ItemType, PaymentMode } from '@bizmanage/types';

// Auth Schemas
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  businessName: z.string().trim().min(2, 'Business name must be at least 2 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

// Business Profile Schemas
export const createBusinessSchema = z.object({
  name: z.string().min(2, 'Business name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxNumber: z.string().optional(),
  currency: z.string().default('NPR'),
});

export const updateBusinessSchema = z.object({
  name: z.string().min(2, 'Business name is required'),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
  currency: z.string().default('NPR'),
  logoUrl: z.string().optional().nullable(),
});

export const updateBusinessSettingsSchema = z.object({
  enableTax: z.boolean().default(false),
  taxRate: z.number().min(0).max(100).default(0),
  invoicePrefix: z.string().min(1).default('INV-'),
  purchasePrefix: z.string().min(1).default('PUR-'),
  quotationPrefix: z.string().min(1).default('QT-'),
  saleReturnPrefix: z.string().min(1).default('CN-'),
  purchaseReturnPrefix: z.string().min(1).default('DN-'),
  lowStockAlert: z.boolean().default(true),
});

// Category Schemas
export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
});

// Party Schemas
export const partySchema = z.object({
  name: z.string().min(1, 'Party name is required'),
  type: z.nativeEnum(PartyType).default(PartyType.CUSTOMER),
  categoryId: z.string().optional().nullable(),
  phone: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .refine(
      (val) => !val || /^(97|98)\d{8}$/.test(val),
      'Phone number must start with 97 or 98 and be exactly 10 digits (e.g. 9841234567)'
    ),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
  openingBalance: z.number().default(0),
  openingBalanceType: z.enum(['RECEIVABLE', 'PAYABLE']).default('RECEIVABLE'),
});

export const updatePartySchema = partySchema.partial();

// Item Schemas
export const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  code: z.string().optional().nullable(),
  type: z.nativeEnum(ItemType).default(ItemType.PRODUCT),
  categoryId: z.string().optional().nullable(),
  unit: z.string().min(1, 'Unit is required').default('Pcs'),
  salePrice: z.number().min(0, 'Sale price cannot be negative').default(0),
  purchasePrice: z.number().min(0, 'Purchase price cannot be negative').default(0),
  minStockAlert: z.number().min(0).default(0),
  openingStock: z.number().default(0),
});

export const updateItemSchema = itemSchema.partial();

export const stockAdjustmentSchema = z.object({
  quantity: z.number().positive('Quantity must be greater than 0'),
  adjustmentType: z.enum(['ADD', 'REDUCE']),
  notes: z.string().optional().nullable(),
});

// Invoice Line Item Schema
export const invoiceItemSchema = z.object({
  itemId: z.string().min(1, 'Item selection is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  discount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
});

// Purchase Bill Schema
export const createPurchaseSchema = z.object({
  partyId: z.string().min(1, 'Supplier selection is required'),
  billNumber: z.string().optional(),
  date: z.string().or(z.date()),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  paidAmount: z.number().min(0).default(0),
  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.CASH),
  accountId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Purchase Return Schema
export const createPurchaseReturnSchema = z.object({
  partyId: z.string().min(1, 'Supplier selection is required'),
  purchaseId: z.string().optional().nullable(),
  returnNumber: z.string().optional(),
  date: z.string().or(z.date()),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  refundAmount: z.number().min(0).default(0),
  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.CASH),
  accountId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Sale Invoice Schema
export const createSaleSchema = z.object({
  partyId: z.string().optional().nullable().or(z.literal('')),
  invoiceNumber: z.string().optional(),
  date: z.string().or(z.date()),
  dueDate: z.string().or(z.date()).optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  paidAmount: z.number().min(0).default(0),
  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.CASH),
  accountId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Sale Return Schema
export const createSaleReturnSchema = z.object({
  partyId: z.string().min(1, 'Customer selection is required'),
  saleId: z.string().optional().nullable(),
  returnNumber: z.string().optional(),
  date: z.string().or(z.date()),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  refundAmount: z.number().min(0).default(0),
  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.CASH),
  accountId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Quotation Schema
export const createQuotationSchema = z.object({
  partyId: z.string().min(1, 'Customer selection is required'),
  quotationNumber: z.string().optional(),
  date: z.string().or(z.date()),
  validUntil: z.string().or(z.date()).optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional().nullable(),
});

// Payment In Schema
export const createPaymentInSchema = z.object({
  partyId: z.string().min(1, 'Customer selection is required'),
  accountId: z.string().optional().nullable(),
  amount: z.number().positive('Amount must be greater than 0'),
  mode: z.nativeEnum(PaymentMode).default(PaymentMode.CASH),
  date: z.string().or(z.date()),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Payment Out Schema
export const createPaymentOutSchema = z.object({
  partyId: z.string().min(1, 'Supplier selection is required'),
  accountId: z.string().optional().nullable(),
  amount: z.number().positive('Amount must be greater than 0'),
  mode: z.nativeEnum(PaymentMode).default(PaymentMode.CASH),
  date: z.string().or(z.date()),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Legacy / General Payment Schema
export const createPaymentSchema = z.object({
  partyId: z.string().min(1, 'Party selection is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  mode: z.nativeEnum(PaymentMode),
  date: z.string().or(z.date()),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

// Expense Schema
export const createExpenseSchema = z.object({
  category: z.string().min(1, 'Expense category is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.CASH),
  accountId: z.string().optional().nullable(),
  date: z.string().or(z.date()),
  description: z.string().optional().nullable(),
});

// Income Schema
export const createIncomeSchema = z.object({
  category: z.string().min(1, 'Income category is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.CASH),
  accountId: z.string().optional().nullable(),
  date: z.string().or(z.date()),
  description: z.string().optional().nullable(),
});

// Infer Zod DTO types
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type UpdateBusinessSettingsInput = z.infer<typeof updateBusinessSettingsSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type PartyInput = z.infer<typeof partySchema>;
export type UpdatePartyInput = z.infer<typeof updatePartySchema>;
export type ItemInput = z.infer<typeof itemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type CreatePurchaseReturnInput = z.infer<typeof createPurchaseReturnSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type CreateSaleReturnInput = z.infer<typeof createSaleReturnSchema>;
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type CreatePaymentInInput = z.infer<typeof createPaymentInSchema>;
export type CreatePaymentOutInput = z.infer<typeof createPaymentOutSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
