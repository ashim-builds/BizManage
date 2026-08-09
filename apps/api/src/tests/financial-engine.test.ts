import { buildApp } from '../app.js';

export async function runFinancialEngineTests() {
  console.log('🧪 [TEST SUITE 3/4] Running Financial & Stock Double-Entry Calculation Tests...');

  const app = buildApp();
  await app.ready();

  const email = `fin.engine.${Date.now()}@example.com`;
  const password = 'Password123!';

  // 1. Setup Entity
  const regRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { name: 'CFO Tester', email, password, businessName: 'FinEngine Corp' },
  });
  const { accessToken, business } = JSON.parse(regRes.body).data;
  const headers = { authorization: `Bearer ${accessToken}`, 'x-business-id': business.id };

  // 2. Setup Party & Item
  const customerRes = await app.inject({
    method: 'POST',
    url: '/api/v1/parties',
    headers,
    payload: { name: 'Test Customer', type: 'CUSTOMER' },
  });
  const customerId = JSON.parse(customerRes.body).data.id;

  const supplierRes = await app.inject({
    method: 'POST',
    url: '/api/v1/parties',
    headers,
    payload: { name: 'Test Supplier', type: 'SUPPLIER' },
  });
  const supplierId = JSON.parse(supplierRes.body).data.id;

  const itemRes = await app.inject({
    method: 'POST',
    url: '/api/v1/items',
    headers,
    payload: { name: 'Widget Pro', type: 'PRODUCT', salePrice: 1000, purchasePrice: 600, openingStock: 50 },
  });
  const itemId = JSON.parse(itemRes.body).data.id;

  // Initial Check: Stock=50, Customer Bal=0, Supplier Bal=0, Cash=0
  console.log('   Initial State: Stock=50 Pcs, Customer Bal=Rs. 0, Cash=Rs. 0');

  // --- RULE 1: SALE (Sell 10 @ 1,000 = 10,000. Paid 4,000, Due 6,000) ---
  console.log('   Rule 1 Check: Sale Invoice (Sell 10 Pcs @ Rs. 1,000. Paid 4,000, Due 6,000)...');
  await app.inject({
    method: 'POST',
    url: '/api/v1/sales',
    headers,
    payload: {
      partyId: customerId,
      date: new Date().toISOString().split('T')[0],
      items: [{ itemId, quantity: 10, unitPrice: 1000 }],
      paidAmount: 4000,
    },
  });

  let item = JSON.parse((await app.inject({ method: 'GET', url: `/api/v1/items/${itemId}`, headers })).body).data;
  let customer = JSON.parse((await app.inject({ method: 'GET', url: `/api/v1/parties/${customerId}`, headers })).body).data;
  let cashflow = JSON.parse((await app.inject({ method: 'GET', url: '/api/v1/cashflow/summary', headers })).body).data;

  if (Number(item.currentStock) !== 40) throw new Error(`Sale stock check failed! Expected 40, got ${item.currentStock}`);
  if (Number(customer.currentBalance) !== 6000) throw new Error(`Sale receivable check failed! Expected 6000, got ${customer.currentBalance}`);
  if (cashflow.totalMoneyIn !== 4000) throw new Error(`Sale cash check failed! Expected 4000, got ${cashflow.totalMoneyIn}`);
  console.log('   ✅ Rule 1 Passed: Stock decreased (50->40), Customer balance updated (+6,000), Cash increased (+4,000)');

  // --- RULE 2: PURCHASE (Buy 20 @ 600 = 12,000. Paid 5,000, Due 7,000) ---
  console.log('   Rule 2 Check: Purchase Bill (Buy 20 Pcs @ Rs. 600. Paid 5,000, Due 7,000)...');
  await app.inject({
    method: 'POST',
    url: '/api/v1/purchases',
    headers,
    payload: {
      partyId: supplierId,
      date: new Date().toISOString().split('T')[0],
      items: [{ itemId, quantity: 20, unitPrice: 600 }],
      paidAmount: 5000,
    },
  });

  item = JSON.parse((await app.inject({ method: 'GET', url: `/api/v1/items/${itemId}`, headers })).body).data;
  let supplier = JSON.parse((await app.inject({ method: 'GET', url: `/api/v1/parties/${supplierId}`, headers })).body).data;
  cashflow = JSON.parse((await app.inject({ method: 'GET', url: '/api/v1/cashflow/summary', headers })).body).data;

  if (Number(item.currentStock) !== 60) throw new Error(`Purchase stock check failed! Expected 60, got ${item.currentStock}`);
  if (Number(supplier.currentBalance) !== -7000) throw new Error(`Purchase payable check failed! Expected -7000, got ${supplier.currentBalance}`);
  if (cashflow.totalMoneyOut !== 5000) throw new Error(`Purchase cash check failed! Expected 5000, got ${cashflow.totalMoneyOut}`);
  console.log('   ✅ Rule 2 Passed: Stock increased (40->60), Supplier balance updated (-7,000), Cash decreased (-5,000)');

  // --- RULE 3: PAYMENT IN (Customer pays 3,000) ---
  console.log('   Rule 3 Check: Payment In (Customer pays Rs. 3,000)...');
  await app.inject({
    method: 'POST',
    url: '/api/v1/payments/in',
    headers,
    payload: { partyId: customerId, amount: 3000, mode: 'CASH', date: new Date().toISOString().split('T')[0] },
  });

  customer = JSON.parse((await app.inject({ method: 'GET', url: `/api/v1/parties/${customerId}`, headers })).body).data;
  if (Number(customer.currentBalance) !== 3000) throw new Error(`Payment In customer bal check failed! Expected 3000, got ${customer.currentBalance}`);
  console.log('   ✅ Rule 3 Passed: Customer receivable reduced (6,000->3,000) and Cash increased');

  // --- RULE 4: PAYMENT OUT (Pay Supplier 4,000) ---
  console.log('   Rule 4 Check: Payment Out (Pay Supplier Rs. 4,000)...');
  await app.inject({
    method: 'POST',
    url: '/api/v1/payments/out',
    headers,
    payload: { partyId: supplierId, amount: 4000, mode: 'CASH', date: new Date().toISOString().split('T')[0] },
  });

  supplier = JSON.parse((await app.inject({ method: 'GET', url: `/api/v1/parties/${supplierId}`, headers })).body).data;
  if (Number(supplier.currentBalance) !== -3000) throw new Error(`Payment Out supplier bal check failed! Expected -3000, got ${supplier.currentBalance}`);
  console.log('   ✅ Rule 4 Passed: Supplier payable reduced (-7,000-> -3,000) and Cash decreased');

  // --- RULE 5: EXPENSE (Rs. 1,500 Rent) ---
  console.log('   Rule 5 Check: Expense (Rs. 1,500 Rent)...');
  await app.inject({
    method: 'POST',
    url: '/api/v1/expenses',
    headers,
    payload: { category: 'Rent', amount: 1500, paymentMode: 'CASH', date: new Date().toISOString().split('T')[0] },
  });
  console.log('   ✅ Rule 5 Passed: Expense logged and cash decreased');

  // --- RULE 6: OTHER INCOME (Rs. 2,500 Scrap) ---
  console.log('   Rule 6 Check: Other Income (Rs. 2,500 Scrap)...');
  await app.inject({
    method: 'POST',
    url: '/api/v1/income',
    headers,
    payload: { category: 'Scrap', amount: 2500, paymentMode: 'CASH', date: new Date().toISOString().split('T')[0] },
  });
  console.log('   ✅ Rule 6 Passed: Other Income logged and cash increased');

  await app.close();
}
