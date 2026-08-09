export enum SystemRole {
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

export enum TransactionType {
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  PAYMENT_IN = 'PAYMENT_IN',
  PAYMENT_OUT = 'PAYMENT_OUT',
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
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
