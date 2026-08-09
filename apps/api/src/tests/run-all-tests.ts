import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/bizmanage?schema=public';
}

import { runAuthTests } from './auth.test.js';
import { runMultiTenantTests } from './multi-tenant.test.js';
import { runFinancialEngineTests } from './financial-engine.test.js';
import { runEmailOtpTests } from './email-otp.test.js';
import { runGoogleOAuthTests } from './google-oauth.test.js';
import { runSecurityHardeningTests } from './security-hardening.test.js';
import { runFinalSecurityAuditTests } from './final-security-audit.test.js';

async function executeCompleteTestSuite() {
  console.log('============ BIZMANAGE FULL MONOREPO INTEGRATION SUITE ============');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    await runAuthTests();
    console.log('');
    await runMultiTenantTests();
    console.log('');
    await runFinancialEngineTests();
    console.log('');
    await runEmailOtpTests();
    console.log('');
    await runGoogleOAuthTests();
    console.log('');
    await runSecurityHardeningTests();
    console.log('');
    await runFinalSecurityAuditTests();

    console.log('\n================================================================');
    console.log('🎉 ALL 7 INTEGRATION & SECURITY TEST SUITES PASSED (100%)!');
    console.log('================================================================\n');
  } catch (err: any) {
    console.error('\n❌ TEST SUITE FAILURE DETECTED:');
    console.error(err);
    process.exit(1);
  }
}

executeCompleteTestSuite();
