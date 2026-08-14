export const NEPAL_VAT_RATE = 13;

export interface InvoiceItemInput {
  unitPrice: number;
  quantity: number;
  discountPercent?: number;
}

export interface InvoiceTotals {
  subTotal: number;
  discount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  items: {
    total: number;
    discountAmount: number;
    taxAmount: number;
  }[];
}

/**
 * Calculates VAT inclusive / exclusive totals for the frontend.
 * Mirrors the exact logic in apps/api/src/services/accounting.service.ts
 */
export function calculateInvoiceTotals(
  items: InvoiceItemInput[],
  isVatBill: boolean,
  globalDiscountPercent: number = 0,
  vatRate: number = NEPAL_VAT_RATE
): InvoiceTotals {
  let subTotal = 0;
  let totalItemDiscount = 0;
  
  const processedItems = items.map((item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const itemSubTotal = qty * price;
    
    // Item-level discount
    const itemDiscPct = Number(item.discountPercent) || 0;
    const itemDiscAmount = (itemSubTotal * itemDiscPct) / 100;
    const itemTotalAfterDisc = itemSubTotal - itemDiscAmount;

    subTotal += itemSubTotal;
    totalItemDiscount += itemDiscAmount;

    return {
      grossTotal: itemSubTotal,
      discountAmount: itemDiscAmount,
      totalAfterDisc: itemTotalAfterDisc,
    };
  });

  const subTotalAfterItemDiscounts = subTotal - totalItemDiscount;

  // Global invoice discount
  const globalDiscPct = Number(globalDiscountPercent) || 0;
  const globalDiscAmount = (subTotalAfterItemDiscounts * globalDiscPct) / 100;
  const totalDiscountAmount = totalItemDiscount + globalDiscAmount;

  const netAmount = Math.max(0, subTotal - totalDiscountAmount);

  let taxableAmount = netAmount;
  let taxAmount = 0;
  let grandTotal = netAmount;

  if (isVatBill) {
    const divisor = 1 + (vatRate / 100);
    taxableAmount = netAmount / divisor;
    taxAmount = netAmount - taxableAmount;
    grandTotal = netAmount;
  }

  const finalItems = processedItems.map((pi) => {
    let itemTax = 0;
    if (isVatBill) {
      const divisor = 1 + (vatRate / 100);
      const itemTaxable = pi.totalAfterDisc / divisor;
      itemTax = pi.totalAfterDisc - itemTaxable;
    }
    return {
      total: pi.totalAfterDisc,
      discountAmount: pi.discountAmount,
      taxAmount: itemTax,
    };
  });

  return {
    subTotal,
    discount: totalDiscountAmount,
    taxableAmount,
    taxAmount,
    totalAmount: grandTotal,
    items: finalItems,
  };
}

export function formatCurrency(amount: number | string): string {
  return Number(amount || 0).toLocaleString('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
