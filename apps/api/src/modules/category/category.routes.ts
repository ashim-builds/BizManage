import { FastifyInstance } from 'fastify';
import { requireBusinessTenant } from '../../middleware/auth.js';
import { categorySchema } from '@bizmanage/validation';
import { AppError } from '../../plugins/error-handler.js';

export async function categoryRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireBusinessTenant);

  // ----------------------------------------------------
  // PARTY CATEGORIES
  // ----------------------------------------------------

  // List Party Categories with search
  fastify.get('/party', async (request, reply) => {
    const { search } = request.query as { search?: string };
    const businessId = request.tenant!.businessId;

    const categories = await request.db!.partyCategory.findMany({
      where: search
        ? {
            businessId,
            name: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : { businessId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { parties: true },
        },
      },
    });

    return reply.send({
      success: true,
      data: categories,
    });
  });

  // Create Party Category
  fastify.post('/party', async (request, reply) => {
    const body = categorySchema.parse(request.body);
    const businessId = request.tenant!.businessId;

    const existing = await request.db!.partyCategory.findFirst({
      where: { businessId, name: body.name },
    });
    if (existing) {
      throw new AppError('Party category with this name already exists', 409, 'CONFLICT');
    }

    const category = await request.db!.partyCategory.create({
      data: {
        businessId,
        name: body.name,
      },
    });

    return reply.status(201).send({
      success: true,
      data: category,
    });
  });

  // Update Party Category
  fastify.put('/party/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = categorySchema.parse(request.body);
    const businessId = request.tenant!.businessId;

    const existing = await request.db!.partyCategory.findFirst({
      where: { id, businessId },
    });
    if (!existing) {
      throw new AppError('Party category not found', 404, 'NOT_FOUND');
    }

    const updated = await request.db!.partyCategory.update({
      where: { id },
      data: { name: body.name },
    });

    return reply.send({
      success: true,
      data: updated,
    });
  });

  // Delete Party Category
  fastify.delete('/party/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const businessId = request.tenant!.businessId;

    const existing = await request.db!.partyCategory.findFirst({
      where: { id, businessId },
    });
    if (!existing) {
      throw new AppError('Party category not found', 404, 'NOT_FOUND');
    }

    await request.db!.partyCategory.delete({
      where: { id },
    });

    return reply.send({
      success: true,
      data: { message: 'Party category deleted successfully' },
    });
  });

  // ----------------------------------------------------
  // ITEM CATEGORIES
  // ----------------------------------------------------

  // List Item Categories with search
  fastify.get('/item', async (request, reply) => {
    const { search } = request.query as { search?: string };
    const businessId = request.tenant!.businessId;

    const categories = await request.db!.itemCategory.findMany({
      where: search
        ? {
            businessId,
            name: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : { businessId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    return reply.send({
      success: true,
      data: categories,
    });
  });

  // Create Item Category
  fastify.post('/item', async (request, reply) => {
    const body = categorySchema.parse(request.body);
    const businessId = request.tenant!.businessId;

    const existing = await request.db!.itemCategory.findFirst({
      where: { businessId, name: body.name },
    });
    if (existing) {
      throw new AppError('Item category with this name already exists', 409, 'CONFLICT');
    }

    const category = await request.db!.itemCategory.create({
      data: {
        businessId,
        name: body.name,
      },
    });

    return reply.status(201).send({
      success: true,
      data: category,
    });
  });

  // Update Item Category
  fastify.put('/item/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = categorySchema.parse(request.body);
    const businessId = request.tenant!.businessId;

    const existing = await request.db!.itemCategory.findFirst({
      where: { id, businessId },
    });
    if (!existing) {
      throw new AppError('Item category not found', 404, 'NOT_FOUND');
    }

    const updated = await request.db!.itemCategory.update({
      where: { id },
      data: { name: body.name },
    });

    return reply.send({
      success: true,
      data: updated,
    });
  });

  // Delete Item Category
  fastify.delete('/item/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const businessId = request.tenant!.businessId;

    const existing = await request.db!.itemCategory.findFirst({
      where: { id, businessId },
    });
    if (!existing) {
      throw new AppError('Item category not found', 404, 'NOT_FOUND');
    }

    await request.db!.itemCategory.delete({
      where: { id },
    });

    return reply.send({
      success: true,
      data: { message: 'Item category deleted successfully' },
    });
  });

  // ----------------------------------------------------
  // EXPENSE CATEGORIES
  // ----------------------------------------------------

  fastify.get('/expense', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const expenses = await request.db!.expense.findMany({
      where: { businessId },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    const defaultCategories = ['Rent', 'Utilities', 'Salaries', 'Marketing', 'Office Supplies', 'Maintenance', 'Travel'];
    const usedCategories = expenses.map((e) => e.category);
    const combined = Array.from(new Set([...defaultCategories, ...usedCategories]));

    return reply.send({
      success: true,
      data: combined.map((cat) => ({ name: cat })),
    });
  });

  // ----------------------------------------------------
  // INCOME CATEGORIES
  // ----------------------------------------------------

  fastify.get('/income', async (request, reply) => {
    const businessId = request.tenant!.businessId;
    const incomes = await request.db!.income.findMany({
      where: { businessId },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    const defaultCategories = ['Interest Income', 'Asset Sale', 'Consulting Revenue', 'Commission', 'Miscellaneous'];
    const usedCategories = incomes.map((i) => i.category);
    const combined = Array.from(new Set([...defaultCategories, ...usedCategories]));

    return reply.send({
      success: true,
      data: combined.map((cat) => ({ name: cat })),
    });
  });
}
