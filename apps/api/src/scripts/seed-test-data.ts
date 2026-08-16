import { PrismaClient, PartyType, AccountType, PaymentMode, InvoiceStatus, TransactionCategory, StockMovementType, Prisma } from '@bizmanage/database';
import { calculateInvoiceTotals, NEPAL_VAT_RATE } from '../services/accounting.service.js';

const prisma = new PrismaClient();

async function runSeed() {
  console.log('--- BizManage Comprehensive Verification Seed ---');

  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: This script cannot be run in production.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  if (!args.includes('--confirm')) {
    console.error('SAFETY CHECK: This script will WIPE all transactions, parties, and inventory.');
    console.error('You must explicitly pass the --confirm flag to proceed.');
    console.error('Example: npx tsx apps/api/src/scripts/seed-test-data.ts --confirm');
    process.exit(1);
  }

  console.log('SAFETY CHECK PASSED: Proceeding with wipe...');

  const userId = '1'; // Placeholder or find existing
  const allUsers = await prisma.user.findMany();

  if (allUsers.length === 0) {
    console.error('No users found in database to attach business to. Run standard seed first.');
    process.exit(1);
  }

  console.log('Wiping old test data...');
  
  // Wipe everything EXCEPT users
  await prisma.transaction.deleteMany();
  await prisma.paymentIn.deleteMany();
  await prisma.paymentOut.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.income.deleteMany();
  await prisma.accountTransfer.deleteMany();
  await prisma.saleReturnItem.deleteMany();
  await prisma.saleReturn.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseReturnItem.deleteMany();
  await prisma.purchaseReturn.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.item.deleteMany();
  await prisma.itemCategory.deleteMany();
  await prisma.party.deleteMany();
  await prisma.partyCategory.deleteMany();
  await prisma.account.deleteMany();
  await prisma.businessSetting.deleteMany();
  await prisma.userBusinessRole.deleteMany();
  await prisma.business.deleteMany();

  console.log('Setting up RB Hardware & Sanitary House...');

  const business = await prisma.business.create({
    data: {
      name: 'RB Hardware & Sanitary House',
      currency: 'NPR',
      setupCompleted: true,
      profileCompleted: true,
      settings: {
        create: {
          enableTax: true,
          taxRate: NEPAL_VAT_RATE,
        }
      },
      memberships: {
        create: allUsers.map(u => ({
          userId: u.id,
          role: 'ADMIN',
        }))
      }
    }
  });

  const bId = business.id;
  await prisma.user.updateMany({
    data: { activeBusinessId: bId }
  });

  // Create Accounts
  const cashAcc = await prisma.account.create({
    data: { businessId: bId, accountName: 'Main Cash', accountType: AccountType.CASH, balance: 100000 }
  });
  const bankAcc = await prisma.account.create({
    data: { businessId: bId, accountName: 'Nabil Bank', accountType: AccountType.BANK, balance: 500000 }
  });

  // Create Parties
  const supplier = await prisma.party.create({
    data: { businessId: bId, name: 'Pashupati Hardware Suppliers', type: PartyType.SUPPLIER, currentBalance: 0 }
  });
  const customer = await prisma.party.create({
    data: { businessId: bId, name: 'Ram Builders', type: PartyType.CUSTOMER, currentBalance: 0 }
  });

  // Create Items
  const cement = await prisma.item.create({
    data: { businessId: bId, name: 'OPC Cement', type: 'PRODUCT', unit: 'Sack', salePrice: 850, purchasePrice: 750, currentStock: 0 }
  });
  const pipe = await prisma.item.create({
    data: { businessId: bId, name: 'PVC Pipe 1"', type: 'PRODUCT', unit: 'Pcs', salePrice: 150, purchasePrice: 120, currentStock: 0 }
  });

  console.log('Executing Complex Scenario 1: VAT Purchase with partial payment');
  
  // Create Purchase
  const purItems = [
    { itemId: cement.id, quantity: 100, unitPrice: 750, discountPercent: 0 },
    { itemId: pipe.id, quantity: 500, unitPrice: 120, discountPercent: 5 } // 5% discount on pipes
  ];

  const purTotals = calculateInvoiceTotals(purItems, true, 0, NEPAL_VAT_RATE);
  // Expected logic: Gross -> Discount -> Net -> Taxable -> VAT -> Total
  // Cement: 100 * 750 = 75,000
  // Pipe: 500 * 120 = 60,000. Disc = 3,000. Net = 57,000
  // Subtotal = 135,000. Discount = 3,000. Net = 132,000
  // Taxable = 132000 / 1.13 = 116814.16
  // VAT = 15185.84
  // Total = 132,000
  
  // Paid 50,000 from Bank
  const paidAmt = new Prisma.Decimal(50000);
  const dueAmt = purTotals.totalAmount.sub(paidAmt);

  await prisma.purchase.create({
    data: {
      businessId: bId,
      partyId: supplier.id,
      billNumber: 'PUR-0001',
      date: new Date(),
      status: InvoiceStatus.PARTIAL,
      isVatBill: true,
      subTotal: purTotals.subTotal,
      taxAmount: purTotals.taxAmount,
      discount: purTotals.discount,
      totalAmount: purTotals.totalAmount,
      paidAmount: paidAmt,
      dueAmount: dueAmt,
      items: {
        create: purItems.map((pi, idx) => ({
          itemId: pi.itemId,
          quantity: pi.quantity,
          unitPrice: pi.unitPrice,
          discountPercent: pi.discountPercent,
          discount: purTotals.items[idx].discountAmount,
          taxAmount: purTotals.items[idx].taxAmount,
          total: purTotals.items[idx].total,
        }))
      }
    }
  });

  // Update Supplier Balance (They are owed dueAmt)
  await prisma.party.update({
    where: { id: supplier.id },
    data: { currentBalance: { decrement: dueAmt } } // Negative means we owe them
  });

  // Update Bank Balance
  await prisma.account.update({
    where: { id: bankAcc.id },
    data: { balance: { decrement: paidAmt } }
  });

  // Update Stock
  await prisma.item.update({ where: { id: cement.id }, data: { currentStock: { increment: 100 } } });
  await prisma.item.update({ where: { id: pipe.id }, data: { currentStock: { increment: 500 } } });


  console.log('Executing Complex Scenario 2: VAT Sale');
  
  const saleItems = [
    { itemId: cement.id, quantity: 20, unitPrice: 850, discountPercent: 0 },
    { itemId: pipe.id, quantity: 100, unitPrice: 150, discountPercent: 10 } // 10% discount sale
  ];
  const saleTotals = calculateInvoiceTotals(saleItems, true, 0, NEPAL_VAT_RATE);
  const salePaidAmt = new Prisma.Decimal(15000);
  const saleDueAmt = saleTotals.totalAmount.sub(salePaidAmt);

  const sale = await prisma.sale.create({
    data: {
      businessId: bId,
      partyId: customer.id,
      invoiceNumber: 'INV-0001',
      date: new Date(),
      status: InvoiceStatus.PARTIAL,
      isVatBill: true,
      subTotal: saleTotals.subTotal,
      taxAmount: saleTotals.taxAmount,
      discount: saleTotals.discount,
      totalAmount: saleTotals.totalAmount,
      paidAmount: salePaidAmt,
      dueAmount: saleDueAmt,
      items: {
        create: saleItems.map((si, idx) => ({
          itemId: si.itemId,
          quantity: si.quantity,
          unitPrice: si.unitPrice,
          discountPercent: si.discountPercent,
          discount: saleTotals.items[idx].discountAmount,
          taxAmount: saleTotals.items[idx].taxAmount,
          total: saleTotals.items[idx].total,
        }))
      }
    }
  });

  await prisma.party.update({
    where: { id: customer.id },
    data: { currentBalance: { increment: saleDueAmt } }
  });
  await prisma.account.update({
    where: { id: cashAcc.id },
    data: { balance: { increment: salePaidAmt } }
  });
  await prisma.item.update({ where: { id: cement.id }, data: { currentStock: { decrement: 20 } } });
  await prisma.item.update({ where: { id: pipe.id }, data: { currentStock: { decrement: 100 } } });

  console.log('Executing Scenario 5: Sale Return (Discounted Product)');
  
  // Returning 2 Cements and 10 PVC Pipes
  const returnItems = [
    { itemId: cement.id, quantity: 2, unitPrice: 850, discountPercent: 0 },
    { itemId: pipe.id, quantity: 10, unitPrice: 150, discountPercent: 10 }
  ];
  const returnTotals = calculateInvoiceTotals(returnItems, true, 0, NEPAL_VAT_RATE);

  const saleReturn = await prisma.saleReturn.create({
    data: {
      businessId: bId,
      saleId: sale.id, // Link to original sale
      partyId: customer.id,
      returnNumber: 'SR-0001',
      date: new Date(),
      subTotal: returnTotals.subTotal,
      taxAmount: returnTotals.taxAmount,
      discount: returnTotals.discount,
      totalAmount: returnTotals.totalAmount,
      items: {
        create: returnItems.map((ri, idx) => ({
          itemId: ri.itemId,
          quantity: ri.quantity,
          unitPrice: ri.unitPrice,
          discountPercent: ri.discountPercent,
          discount: returnTotals.items[idx].discountAmount,
          taxAmount: returnTotals.items[idx].taxAmount,
          total: returnTotals.items[idx].total,
        }))
      }
    }
  });

  // When a customer returns goods, they owe us LESS money.
  await prisma.party.update({
    where: { id: customer.id },
    data: { currentBalance: { decrement: returnTotals.totalAmount } }
  });

  // Restock the returned items
  await prisma.item.update({ where: { id: cement.id }, data: { currentStock: { increment: 2 } } });
  await prisma.item.update({ where: { id: pipe.id }, data: { currentStock: { increment: 10 } } });

  console.log('Executing Scenario 3: Expense');
  await prisma.expense.create({
    data: {
      businessId: bId,
      accountId: cashAcc.id,
      category: 'Rent',
      amount: 15000,
      paymentMode: PaymentMode.CASH,
      date: new Date(),
    }
  });
  await prisma.account.update({
    where: { id: cashAcc.id },
    data: { balance: { decrement: 15000 } }
  });

  console.log('Executing Scenario 4: Account Transfer');
  await prisma.accountTransfer.create({
    data: {
      businessId: bId,
      fromAccountId: cashAcc.id,
      toAccountId: bankAcc.id,
      amount: 5000,
      date: new Date(),
    }
  });
  await prisma.account.update({
    where: { id: cashAcc.id },
    data: { balance: { decrement: 5000 } }
  });
  await prisma.account.update({
    where: { id: bankAcc.id },
    data: { balance: { increment: 5000 } }
  });

  console.log('Verification Logic Completed...');
  const s = await prisma.party.findUnique({ where: { id: supplier.id } });
  const c = await prisma.party.findUnique({ where: { id: customer.id } });
  const b = await prisma.account.findUnique({ where: { id: bankAcc.id } });
  const cash = await prisma.account.findUnique({ where: { id: cashAcc.id } });
  
  console.log(`Supplier Balance (Expect negative): ${s?.currentBalance}`);
  console.log(`Customer Balance (Expect positive): ${c?.currentBalance}`);
  console.log(`Bank Balance: ${b?.balance}`);
  console.log(`Cash Balance: ${cash?.balance}`);

  console.log('Seed executed successfully!');
}

runSeed().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
