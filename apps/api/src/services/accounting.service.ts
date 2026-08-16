import { Prisma, PrismaClient } from '@bizmanage/database';

// Use a transaction client or the main client
type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export const NEPAL_VAT_RATE = 13;

interface InvoiceItemInput {
  unitPrice: number | string | Prisma.Decimal;
  quantity: number | string | Prisma.Decimal;
  discountPercent?: number | string | Prisma.Decimal;
}

export interface InvoiceTotals {
  subTotal: Prisma.Decimal; // Sum of (unitPrice * quantity)
  discount: Prisma.Decimal; // Sum of (item discounts) + invoice discount
  taxableAmount: Prisma.Decimal; // Amount subject to tax
  taxAmount: Prisma.Decimal; // VAT amount
  totalAmount: Prisma.Decimal; // Grand total (payable)
  items: {
    total: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
  }[];
}

/**
 * Calculates VAT inclusive / exclusive totals.
 * For VAT bills in Nepal, the item price typically includes VAT.
 * Therefore, we extract the Taxable Amount and VAT from the total after discount.
 */
export function calculateInvoiceTotals(
  items: InvoiceItemInput[],
  isVatBill: boolean,
  globalDiscountPercent: number | Prisma.Decimal = 0,
  vatRate: number | Prisma.Decimal = NEPAL_VAT_RATE
): InvoiceTotals {
  let subTotal = new Prisma.Decimal(0);
  let totalItemDiscount = new Prisma.Decimal(0);
  
  const processedItems = items.map((item) => {
    const qty = new Prisma.Decimal(item.quantity);
    const price = new Prisma.Decimal(item.unitPrice);
    const itemSubTotal = qty.mul(price);
    
    // Item-level discount
    const itemDiscPct = new Prisma.Decimal(item.discountPercent || 0);
    const itemDiscAmount = itemSubTotal.mul(itemDiscPct).div(100);
    const itemTotalAfterDisc = itemSubTotal.sub(itemDiscAmount);

    subTotal = subTotal.add(itemSubTotal);
    totalItemDiscount = totalItemDiscount.add(itemDiscAmount);

    return {
      grossTotal: itemSubTotal,
      discountAmount: itemDiscAmount,
      totalAfterDisc: itemTotalAfterDisc,
    };
  });

  const subTotalAfterItemDiscounts = subTotal.sub(totalItemDiscount);

  // Global invoice discount
  const globalDiscPct = new Prisma.Decimal(globalDiscountPercent);
  const globalDiscAmount = subTotalAfterItemDiscounts.mul(globalDiscPct).div(100);
  const totalDiscountAmount = totalItemDiscount.add(globalDiscAmount);

  const netAmount = subTotal.sub(totalDiscountAmount); // This is what the customer pays for the items themselves

  let taxableAmount = netAmount;
  let taxAmount = new Prisma.Decimal(0);
  let grandTotal = netAmount;

  const rate = new Prisma.Decimal(vatRate);

  if (isVatBill) {
    // VAT Inclusive pricing model:
    // Net Amount = Taxable Amount + VAT
    // Taxable Amount = Net Amount / (1 + rate/100)
    // Example: 13% VAT. Net = 113. Taxable = 113 / 1.13 = 100. VAT = 13.
    const divisor = new Prisma.Decimal(1).add(rate.div(100));
    taxableAmount = netAmount.div(divisor);
    taxAmount = netAmount.sub(taxableAmount);
    grandTotal = netAmount; // The grand total remains the net amount in inclusive pricing
  }

  // Calculate item-level tax distributions if needed
  const finalItems = processedItems.map((pi) => {
    let itemTax = new Prisma.Decimal(0);
    if (isVatBill) {
      const divisor = new Prisma.Decimal(1).add(rate.div(100));
      const itemTaxable = pi.totalAfterDisc.div(divisor);
      itemTax = pi.totalAfterDisc.sub(itemTaxable);
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

/**
 * Updates a party's balance atomically within a transaction.
 * - For Customers: Positive balance means they owe us (Receivable). Negative means they overpaid/advance (Payable).
 * - For Suppliers: Positive balance means they owe us (Receivable). Negative means we owe them (Payable).
 * However, the schema uses signed decimal.
 * So: ADD_RECEIVABLE -> balance + amount
 *     REDUCE_RECEIVABLE -> balance - amount
 *     ADD_PAYABLE -> balance - amount
 *     REDUCE_PAYABLE -> balance + amount
 */
export async function updatePartyBalance(
  tx: TxClient,
  partyId: string,
  amount: Prisma.Decimal | number | string,
  action: 'ADD_RECEIVABLE' | 'REDUCE_RECEIVABLE' | 'ADD_PAYABLE' | 'REDUCE_PAYABLE'
) {
  const amt = new Prisma.Decimal(amount);
  
  let incrementValue = new Prisma.Decimal(0);
  
  switch (action) {
    case 'ADD_RECEIVABLE':
    case 'REDUCE_PAYABLE':
      incrementValue = amt;
      break;
    case 'REDUCE_RECEIVABLE':
    case 'ADD_PAYABLE':
      incrementValue = amt.negated();
      break;
  }

  await tx.party.update({
    where: { id: partyId },
    data: {
      currentBalance: { increment: incrementValue },
    },
  });
}

/**
 * Updates a financial account balance atomically.
 */
export async function updateAccountBalance(
  tx: TxClient,
  accountId: string,
  amount: Prisma.Decimal | number | string,
  action: 'ADD' | 'REDUCE'
) {
  const amt = new Prisma.Decimal(amount);
  const incrementValue = action === 'ADD' ? amt : amt.negated();

  const acc = await tx.account.update({
    where: { id: accountId },
    data: {
      balance: { increment: incrementValue },
    },
  });

  if (acc.balance.lessThan(0)) {
    // In a real strict environment we might throw, but bank accounts can be overdrawn.
    // For now we allow negative balances (overdraft).
  }
  return acc;
}

/**
 * Updates inventory stock atomically.
 */
export async function updateStock(
  tx: TxClient,
  itemId: string,
  quantity: Prisma.Decimal | number | string,
  action: 'ADD' | 'REDUCE'
) {
  const qty = new Prisma.Decimal(quantity);
  const incrementValue = action === 'ADD' ? qty : qty.negated();

  const item = await tx.item.update({
    where: { id: itemId },
    data: {
      currentStock: { increment: incrementValue },
    },
  });

  // Note: negative stock is allowed — some businesses sell before receiving stock.
  // If you want strict enforcement, add a business setting for it.
  return item;
}
