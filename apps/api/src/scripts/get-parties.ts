import { PrismaClient } from '@bizmanage/database';

async function main() {
  const db = new PrismaClient();
  const parties = await db.party.findMany();
  console.dir(parties, {depth: null});
}
main();
