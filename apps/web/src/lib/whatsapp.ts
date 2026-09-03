export function formatNepaliPhone(phone?: string | null): string {
  if (!phone) return '';
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  if (digitsOnly.length === 10 && (digitsOnly.startsWith('98') || digitsOnly.startsWith('97') || digitsOnly.startsWith('96'))) {
    return `977${digitsOnly}`;
  }
  return digitsOnly;
}

export function generateInvoiceWhatsAppMessage(params: {
  businessName: string;
  businessPhone?: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; unit?: string; price: number; total: number }>;
  subTotal: number;
  discount?: number;
  taxAmount?: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  isVatBill?: boolean;
}): string {
  const {
    businessName,
    businessPhone,
    invoiceNumber,
    invoiceDate,
    customerName,
    items = [],
    subTotal = 0,
    discount = 0,
    taxAmount = 0,
    totalAmount = 0,
    paidAmount = 0,
    dueAmount = 0,
    isVatBill,
  } = params;

  let msg = `*${isVatBill ? 'TAX INVOICE' : 'SALES INVOICE'}*\n`;
  msg += `*${businessName}*\n`;
  if (businessPhone) msg += `Contact: ${businessPhone}\n`;
  msg += `─────────────────────────\n`;
  msg += `*Invoice #:* ${invoiceNumber}\n`;
  msg += `*Date:* ${invoiceDate}\n`;
  msg += `*Customer:* ${customerName}\n`;
  msg += `─────────────────────────\n`;
  msg += `*ITEMS:*\n`;

  items.slice(0, 10).forEach((it, idx) => {
    const itemTotal = it.total !== undefined && it.total !== null && Number(it.total) > 0
      ? Number(it.total)
      : (Number(it.quantity || 0) * Number(it.price || 0));
    msg += `${idx + 1}. ${it.name}\n`;
    msg += `   ${it.quantity} ${it.unit || 'pcs'} x Rs. ${(Number(it.price) || 0).toLocaleString()} = *Rs. ${itemTotal.toLocaleString()}*\n`;
  });

  if (items.length > 10) {
    msg += `   ... and ${items.length - 10} more item(s)\n`;
  }

  msg += `─────────────────────────\n`;
  msg += `Subtotal: Rs. ${(Number(subTotal) || 0).toLocaleString()}\n`;
  if (discount > 0) msg += `Discount: -Rs. ${(Number(discount) || 0).toLocaleString()}\n`;
  if (taxAmount > 0) msg += `VAT (13%): Rs. ${(Number(taxAmount) || 0).toLocaleString()}\n`;
  msg += `*Grand Total: Rs. ${(Number(totalAmount) || 0).toLocaleString()}*\n`;
  msg += `Amount Paid: Rs. ${(Number(paidAmount) || 0).toLocaleString()}\n`;
  if (Number(dueAmount) > 0) {
    msg += `*Balance Due: Rs. ${(Number(dueAmount) || 0).toLocaleString()}*\n`;
  } else {
    msg += `*Status: Fully Paid*\n`;
  }
  msg += `─────────────────────────\n`;
  msg += `_Thank you for your business!_\n`;
  msg += `_Powered by BizManage ERP_`;

  return msg;
}

export function generatePaymentReceiptWhatsAppMessage(params: {
  businessName: string;
  businessPhone?: string | null;
  voucherNumber?: string;
  date: string;
  customerName: string;
  amountReceived: number;
  paymentMode: string;
  currentBalance?: number;
}): string {
  const {
    businessName,
    businessPhone,
    date,
    customerName,
    amountReceived = 0,
    paymentMode,
    currentBalance,
  } = params;

  let msg = `*PAYMENT RECEIPT VOUCHER*\n`;
  msg += `*${businessName}*\n`;
  if (businessPhone) msg += `Contact: ${businessPhone}\n`;
  msg += `─────────────────────────\n`;
  msg += `*Date:* ${date}\n`;
  msg += `*Received From:* ${customerName}\n`;
  msg += `*Payment Method:* ${paymentMode}\n`;
  msg += `*Amount Received:* *Rs. ${(Number(amountReceived) || 0).toLocaleString()}*\n`;
  if (currentBalance !== undefined && currentBalance !== null) {
    msg += `*Remaining Due:* Rs. ${(Number(currentBalance) || 0).toLocaleString()}\n`;
  }
  msg += `─────────────────────────\n`;
  msg += `_Payment confirmed with thanks!_\n`;
  msg += `_Powered by BizManage ERP_`;

  return msg;
}

// 1. PAYMENT IN (Customer owes money / Receivable / लिन बाँकी)
export function generatePaymentInReminderMessage(params: {
  businessName: string;
  businessPhone?: string | null;
  customerName: string;
  dueAmount: number;
  oldestInvoiceDate?: string;
}): string {
  const { businessName, businessPhone, customerName, dueAmount = 0, oldestInvoiceDate } = params;
  const total = Math.abs(Number(dueAmount) || 0);

  let msg = `*PAYMENT DUE REMINDER (भुक्तानी सम्झाउनी)*\n`;
  msg += `*${businessName}*\n`;
  if (businessPhone) msg += `Contact: ${businessPhone}\n`;
  msg += `─────────────────────────\n`;
  msg += `Namaste ${customerName} ji,\n\n`;
  msg += `This is a reminder regarding your outstanding balance with *${businessName}*.\n\n`;
  msg += `*Total Balance Due (लिन बाँकी):* *Rs. ${total.toLocaleString()}*\n`;
  if (oldestInvoiceDate) {
    msg += `*Oldest Pending Bill:* ${oldestInvoiceDate}\n`;
  }
  msg += `─────────────────────────\n`;
  msg += `Please arrange payment at your earliest convenience via Cash, Bank Transfer, or FONEPAY QR.\n\n`;
  msg += `If you have already made this payment, please disregard this notice or reply with the transaction slip.\n\n`;
  msg += `_Thank you for your business!_\n`;
  msg += `_BizManage ERP Ledger Statement_`;

  return msg;
}

// 2. PAYMENT OUT (We owe supplier / Payable / दिन बाँकी)
export function generatePaymentOutNoticeMessage(params: {
  businessName: string;
  businessPhone?: string | null;
  vendorName: string;
  payableAmount: number;
  pendingBillsCount?: number;
}): string {
  const { businessName, businessPhone, vendorName, payableAmount = 0, pendingBillsCount } = params;
  const total = Math.abs(Number(payableAmount) || 0);

  let msg = `*VENDOR STATEMENT & PAYMENT NOTICE (हिसाब विवरण)*\n`;
  msg += `*${businessName}*\n`;
  if (businessPhone) msg += `Contact: ${businessPhone}\n`;
  msg += `─────────────────────────\n`;
  msg += `Dear ${vendorName},\n\n`;
  msg += `We have verified our accounts and confirmed the pending balance payable to your firm from *${businessName}*.\n\n`;
  msg += `*Total Amount Payable to You (दिन बाँकी):* *Rs. ${total.toLocaleString()}*\n`;
  if (pendingBillsCount) {
    msg += `*Pending Bills:* ${pendingBillsCount} bill(s)\n`;
  }
  msg += `─────────────────────────\n`;
  msg += `Payment disbursement is scheduled as per our credit cycle. Please let us know if you require bank transfer details or statement reconciliation.\n\n`;
  msg += `_Thank you for your valued partnership!_\n`;
  msg += `_BizManage ERP Vendor Accounts_`;

  return msg;
}

// 3. SETTLED ACCOUNT (Zero Balance / हिसाब चुक्ता)
export function generateSettledAccountMessage(params: {
  businessName: string;
  businessPhone?: string | null;
  partyName: string;
}): string {
  const { businessName, businessPhone, partyName } = params;

  let msg = `*ACCOUNT STATEMENT - FULLY SETTLED (हिसाब चुक्ता)*\n`;
  msg += `*${businessName}*\n`;
  if (businessPhone) msg += `Contact: ${businessPhone}\n`;
  msg += `─────────────────────────\n`;
  msg += `Namaste ${partyName} ji,\n\n`;
  msg += `This is to confirm that your account ledger with *${businessName}* is fully settled with zero pending balance.\n\n`;
  msg += `*Current Outstanding Balance:* *Rs. 0.00 (All Clear)*\n`;
  msg += `─────────────────────────\n`;
  msg += `Thank you for your continued trust, partnership, and prompt business settlements.\n\n`;
  msg += `_BizManage ERP Account Statement_`;

  return msg;
}

// Smart dispatcher that automatically picks message based on balance situation
export function generateSmartPartyWhatsAppMessage(params: {
  businessName: string;
  businessPhone?: string | null;
  partyName: string;
  balance: number;
  situation?: 'auto' | 'payment-in' | 'payment-out' | 'settled';
}): string {
  const { businessName, businessPhone, partyName, balance = 0, situation = 'auto' } = params;

  let target = situation;
  if (target === 'auto') {
    if (balance > 0) target = 'payment-in';
    else if (balance < 0) target = 'payment-out';
    else target = 'settled';
  }

  if (target === 'payment-in') {
    return generatePaymentInReminderMessage({
      businessName,
      businessPhone,
      customerName: partyName,
      dueAmount: balance,
    });
  }

  if (target === 'payment-out') {
    return generatePaymentOutNoticeMessage({
      businessName,
      businessPhone,
      vendorName: partyName,
      payableAmount: balance,
    });
  }

  return generateSettledAccountMessage({
    businessName,
    businessPhone,
    partyName,
  });
}

// Backward compatible alias
export function generateCustomerDueReminderMessage(params: {
  businessName: string;
  businessPhone?: string | null;
  customerName: string;
  totalDue?: number;
  dueAmount?: number;
  oldestInvoiceDate?: string;
  agingStatus?: string;
}): string {
  const total = Number(params.totalDue ?? params.dueAmount ?? 0);
  if (total < 0) {
    return generatePaymentOutNoticeMessage({
      businessName: params.businessName,
      businessPhone: params.businessPhone,
      vendorName: params.customerName,
      payableAmount: total,
    });
  }
  if (total === 0) {
    return generateSettledAccountMessage({
      businessName: params.businessName,
      businessPhone: params.businessPhone,
      partyName: params.customerName,
    });
  }
  return generatePaymentInReminderMessage({
    businessName: params.businessName,
    businessPhone: params.businessPhone,
    customerName: params.customerName,
    dueAmount: total,
    oldestInvoiceDate: params.oldestInvoiceDate,
  });
}

export function openWhatsAppChat(phone: string, text: string) {
  const formattedPhone = formatNepaliPhone(phone);
  const encodedText = encodeURIComponent(text);
  const url = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
  
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
