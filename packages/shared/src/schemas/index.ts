import { z } from 'zod';
import { PartyType, ItemType, PaymentMode, InvoiceStatus } from '../enums/index.js';

// Auth Schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Business Schemas
export const createBusinessSchema = z.object({
  name: z.string().min(2, 'Business name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxNumber: z.string().optional(),
  currency: z.string().default('NPR'),
});

// Party Schemas
export const partySchema = z.object({
  name: z.string().min(1, 'Party name is required'),
  type: z.nativeEnum(PartyType),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  openingBalance: z.number().default(0),
});

// Item Schemas
export const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  code: z.string().optional(),
  type: z.nativeEnum(ItemType).default(ItemType.PRODUCT),
  unit: z.string().default('Pcs'),
  salePrice: z.number().min(0, 'Sale price cannot be negative'),
  purchasePrice: z.number().min(0, 'Purchase price cannot be negative'),
  minStockAlert: z.number().min(0).default(0),
  openingStock: z.number().min(0).default(0),
});

// Invoice Line Item Schema
export const invoiceItemSchema = z.object({
  itemId: z.string().min(1, 'Item selection is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  discount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
});

// Sale Invoice Schema
export const createSaleSchema = z.object({
  partyId: z.string().min(1, 'Customer selection is required'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  date: z.string().or(z.date()),
  dueDate: z.string().or(z.date()).optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  paidAmount: z.number().min(0).default(0),
  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.CASH),
  notes: z.string().optional(),
});

// Purchase Bill Schema
export const createPurchaseSchema = z.object({
  partyId: z.string().min(1, 'Supplier selection is required'),
  billNumber: z.string().min(1, 'Bill number is required'),
  date: z.string().or(z.date()),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  paidAmount: z.number().min(0).default(0),
  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.CASH),
  notes: z.string().optional(),
});

// Payment Schema (Payment In / Payment Out)
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
  category: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMode: z.nativeEnum(PaymentMode),
  date: z.string().or(z.date()),
  description: z.string().optional(),
});

// Income Schema
export const createIncomeSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMode: z.nativeEnum(PaymentMode),
  date: z.string().or(z.date()),
  description: z.string().optional(),
});

// Infer types
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type PartyInput = z.infer<typeof partySchema>;
export type ItemInput = z.infer<typeof itemSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
