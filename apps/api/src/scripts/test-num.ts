import { PrismaClient, Prisma } from '@bizmanage/database';

const prisma = new PrismaClient();

async function test() {
  const d = new Prisma.Decimal(132000);
  console.log('Number(d):', Number(d));
  console.log('d.toNumber():', d.toNumber());
}
test();
