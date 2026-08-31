import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { partySchema, updatePartySchema } from '@bizmanage/validation';
import { PartyType, Prisma } from '@bizmanage/database';
import { AppError } from '../../plugins/error-handler.js';

export async function partyRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // ----------------------------------------------------
  // GET PARTIES SUMMARY (Total Receivables / Payables)
  // ----------------------------------------------------
  fastify.get('/summary', async (request, reply) => {
    const businessId = request.tenant!.businessId;

    const [receivableAgg, payableAgg, counts] = await Promise.all([
      request.db!.party.aggregate({
        where: { businessId, currentBalance: { gt: 0 } },
        _sum: { currentBalance: true },
      }),
      request.db!.party.aggregate({
        where: { businessId, currentBalance: { lt: 0 } },
        _sum: { currentBalance: true },
      }),
      request.db!.party.groupBy({
        by: ['type'],
        where: { businessId },
        _count: { id: true },
      }),
    ]);

    let customerCount = 0, supplierCount = 0, bothCount = 0;
    for (const g of counts) {
      if (g.type === 'CUSTOMER') customerCount = g._count.id;
      else if (g.type === 'SUPPLIER') supplierCount = g._count.id;
      else if (g.type === 'BOTH') bothCount = g._count.id;
    }

    const totalPayableRaw = Number(payableAgg._sum.currentBalance || 0);

    return reply.send({
      success: true,
      data: {
        totalParties: customerCount + supplierCount + bothCount,
        customerCount,
        supplierCount,
        bothCount,
        totalReceivable: Number(receivableAgg._sum.currentBalance || 0),
        totalPayable: totalPayableRaw < 0 ? Math.abs(totalPayableRaw) : totalPayableRaw,
      },
    });
  });

  // ----------------------------------------------------
  // LIST PARTIES WITH SEARCH & FILTERS
  // ----------------------------------------------------
  fastify.get('/', async (request, reply) => {
    const { search, categoryId, type, page = '1', limit = '50' } = request.query as {
      search?: string;
      categoryId?: string;
      type?: PartyType;
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const whereClause: Prisma.PartyWhereInput = {
      businessId: request.tenant!.businessId,
    };

    if (type) {
      whereClause.type = type;
    }

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { taxNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [parties, total] = await Promise.all([
      request.db!.party.findMany({
        where: whereClause,
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
      request.db!.party.count({ where: whereClause }),
    ]);

    return reply.send({
      success: true,
      data: parties,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  });

  // ----------------------------------------------------
  // GET PARTY DETAILS & TRANSACTION LEDGER
  // ----------------------------------------------------
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const party = await request.db!.party.findFirst({
      where: { id, businessId: request.tenant!.businessId },
      include: {
        category: true,
        sales: {
          take: 10,
          orderBy: { date: 'desc' },
          select: { id: true, invoiceNumber: true, date: true, totalAmount: true, status: true },
        },
        purchases: {
          take: 10,
          orderBy: { date: 'desc' },
          select: { id: true, billNumber: true, date: true, totalAmount: true, status: true },
        },
        paymentsIn: {
          take: 10,
          orderBy: { date: 'desc' },
          select: { id: true, amount: true, mode: true, date: true, referenceNumber: true },
        },
        paymentsOut: {
          take: 10,
          orderBy: { date: 'desc' },
          select: { id: true, amount: true, mode: true, date: true, referenceNumber: true },
        },
      },
    });

    if (!party) {
      throw new AppError('Party not found', 404, 'NOT_FOUND');
    }

    return reply.send({
      success: true,
      data: party,
    });
  });

  // ----------------------------------------------------
  // CREATE NEW PARTY
  // ----------------------------------------------------
  fastify.post('/', async (request, reply) => {
    if (!request.tenant!.features.includes('AUTO_LEDGER')) {
      throw new AppError('Feature Locked: Upgrade your plan to add parties.', 403, 'FEATURE_LOCKED');
    }

    const body = partySchema.parse(request.body);

    // Calculate signed opening balance
    // Positive = Customer owes us (RECEIVABLE)
    // Negative = We owe supplier (PAYABLE)
    let rawBalance = body.openingBalance || 0;
    if (body.openingBalanceType === 'PAYABLE' && rawBalance > 0) {
      rawBalance = -rawBalance;
    }

    const party = await request.db!.party.create({
      data: {
        businessId: request.tenant!.businessId,
        name: body.name,
        type: body.type,
        categoryId: body.categoryId || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        taxNumber: body.taxNumber || null,
        openingBalance: rawBalance,
        currentBalance: rawBalance,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    return reply.status(201).send({
      success: true,
      data: party,
    });
  });

  // ----------------------------------------------------
  // UPDATE PARTY
  // ----------------------------------------------------
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updatePartySchema.parse(request.body);

    const existing = await request.db!.party.findFirst({
      where: { id, businessId: request.tenant!.businessId },
    });

    if (!existing) {
      throw new AppError('Party not found', 404, 'NOT_FOUND');
    }

    const categoryId = body.categoryId === '' ? null : (body.categoryId !== undefined ? body.categoryId : existing.categoryId);

    const updated = await request.db!.party.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        type: body.type ?? existing.type,
        categoryId,
        phone: body.phone !== undefined ? body.phone : existing.phone,
        email: body.email !== undefined ? body.email : existing.email,
        address: body.address !== undefined ? body.address : existing.address,
        taxNumber: body.taxNumber !== undefined ? body.taxNumber : existing.taxNumber,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    return reply.send({
      success: true,
      data: updated,
    });
  });

  // ----------------------------------------------------
  // DELETE PARTY
  // ----------------------------------------------------
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const party = await request.db!.party.findFirst({
      where: { id, businessId: request.tenant!.businessId },
      include: {
        _count: {
          select: {
            sales: true,
            purchases: true,
            paymentsIn: true,
            paymentsOut: true,
          },
        },
      },
    });

    if (!party) {
      throw new AppError('Party not found', 404, 'NOT_FOUND');
    }

    const paymentCount = party._count.paymentsIn + party._count.paymentsOut;
    if (paymentCount > 0) {
      throw new AppError(
        `Cannot delete party "${party.name}" because they have ${paymentCount} linked payment records. Please delete payments first.`,
        400,
        'HAS_DEPENDENTS'
      );
    }

    // Safely delete party along with all unpaid transactions/returns/quotations in a single transaction
    await request.db!.$transaction(async (tx) => {
      // 1. Delete returns first (due to FK constraints)
      await tx.saleReturn.deleteMany({ where: { partyId: id } });
      await tx.purchaseReturn.deleteMany({ where: { partyId: id } });

      // 2. Delete sales, purchases, and quotations (due to FK constraints)
      await tx.sale.deleteMany({ where: { partyId: id } });
      await tx.purchase.deleteMany({ where: { partyId: id } });
      await tx.quotation.deleteMany({ where: { partyId: id } });

      // 3. Delete the party itself
      await tx.party.delete({
        where: { id },
      });
    });

    return reply.send({
      success: true,
      data: { message: 'Party and its unpaid transactions deleted successfully' },
    });
  });
}
