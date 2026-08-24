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
    items,
    subTotal,
    discount = 0,
    taxAmount = 0,
    totalAmount,
    paidAmount,
    dueAmount,
    isVatBill,
  } = params;

  let msg = `*🧾 ${isVatBill ? 'TAX INVOICE' : 'SALES INVOICE'}*\n`;
  msg += `*${businessName}*\n`;
  if (businessPhone) msg += `📞 Contact: ${businessPhone}\n`;
  msg += `─────────────────────────\n`;
  msg += `📄 *Invoice #:* ${invoiceNumber}\n`;
  msg += `📅 *Date:* ${invoiceDate}\n`;
  msg += `👤 *Customer:* ${customerName}\n`;
  msg += `─────────────────────────\n`;
  msg += `*ITEMS:*\n`;

  items.slice(0, 10).forEach((it, idx) => {
    const itemTotal = it.total !== undefined && it.total !== null && Number(it.total) > 0
      ? Number(it.total)
      : (it.quantity * it.price);
    msg += `${idx + 1}. ${it.name}\n`;
    msg += `   ${it.quantity} ${it.unit || 'pcs'} × Rs. ${it.price.toLocaleString()} = *Rs. ${itemTotal.toLocaleString()}*\n`;
  });

  if (items.length > 10) {
    msg += `   ... and ${items.length - 10} more item(s)\n`;
  }

  msg += `─────────────────────────\n`;
  msg += `Subtotal: Rs. ${subTotal.toLocaleString()}\n`;
  if (discount > 0) msg += `Discount: -Rs. ${discount.toLocaleString()}\n`;
  if (taxAmount > 0) msg += `VAT (13%): Rs. ${taxAmount.toLocaleString()}\n`;
  msg += `*Grand Total: Rs. ${totalAmount.toLocaleString()}*\n`;
  msg += `Amount Paid: Rs. ${paidAmount.toLocaleString()}\n`;
  if (dueAmount > 0) {
    msg += `*⚠️ Balance Due: Rs. ${dueAmount.toLocaleString()}*\n`;
  } else {
    msg += `*✅ Status: Fully Paid*\n`;
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
    amountReceived,
    paymentMode,
    currentBalance,
  } = params;

  let msg = `*💰 PAYMENT RECEIPT VOUCHER*\n`;
  msg += `*${businessName}*\n`;
  if (businessPhone) msg += `📞 Contact: ${businessPhone}\n`;
  msg += `─────────────────────────\n`;
  msg += `📅 *Date:* ${date}\n`;
  msg += `👤 *Received From:* ${customerName}\n`;
  msg += `💳 *Payment Method:* ${paymentMode}\n`;
  msg += `💵 *Amount Received:* *Rs. ${amountReceived.toLocaleString()}*\n`;
  if (currentBalance !== undefined && currentBalance !== null) {
    msg += `📊 *Remaining Due:* Rs. ${currentBalance.toLocaleString()}\n`;
  }
  msg += `─────────────────────────\n`;
  msg += `_Payment confirmed with thanks!_\n`;
  msg += `_Powered by BizManage ERP_`;

  return msg;
}

export function generateCustomerDueReminderMessage(params: {
  businessName: string;
  businessPhone?: string | null;
  customerName: string;
  totalDue: number;
  oldestInvoiceDate?: string;
  agingStatus?: string;
}): string {
  const {
    businessName,
    businessPhone,
    customerName,
    totalDue,
    oldestInvoiceDate,
    agingStatus,
  } = params;

  let msg = `*🔔 PAYMENT DUE REMINDER (भुक्तानी सम्झाउनी)*\n`;
  msg += `*${businessName}*\n`;
  if (businessPhone) msg += `📞 Contact: ${businessPhone}\n`;
  msg += `─────────────────────────\n`;
  msg += `Namaste ${customerName} ji 🙏,\n\n`;
  msg += `This is a gentle reminder regarding your outstanding account balance with *${businessName}*.\n\n`;
  msg += `💵 *Total Outstanding Balance:* *Rs. ${totalDue.toLocaleString()}*\n`;
  if (agingStatus) {
    msg += `⏳ *Aging Status:* ${agingStatus}\n`;
  }
  if (oldestInvoiceDate) {
    msg += `📅 *Oldest Pending Bill:* ${oldestInvoiceDate}\n`;
  }
  msg += `─────────────────────────\n`;
  msg += `Kindly arrange for the settlement of this pending amount at your earliest convenience via Cash, Bank Transfer, or FONEPAY QR.\n\n`;
  msg += `If you have already made this payment, please disregard this notice or share the payment slip.\n\n`;
  msg += `_Thank you for your cooperation!_\n`;
  msg += `_BizManage ERP Account Statement_`;

  return msg;
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
