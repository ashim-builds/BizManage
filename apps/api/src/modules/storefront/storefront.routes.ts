import { FastifyInstance } from 'fastify';
import { requireBusinessTenant, authenticateUser } from '../../middleware/auth.js';
import { globalPrisma } from '@bizmanage/database';

export async function storefrontRoutes(app: FastifyInstance) {
  // ── Authenticated Routes (Business Owner Portal) ───────────────────────────

  // GET /api/v1/storefront/settings
  app.get('/settings', { preHandler: [authenticateUser, requireBusinessTenant] }, async (request, reply) => {
    const businessId = request.tenant?.businessId || (request as any).businessId;
    if (!businessId) {
      return reply.status(400).send({ success: false, error: 'NO_BUSINESS', message: 'Active business tenant is required' });
    }
    const setting = await globalPrisma.businessSetting.findUnique({
      where: { businessId },
    });

    const business = await globalPrisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, phone: true, email: true, logoUrl: true },
    });

    return reply.send({
      success: true,
      data: {
        enableStorefront: setting?.enableStorefront ?? false,
        storeSlug: setting?.storeSlug ?? '',
        showStorePrices: setting?.showStorePrices ?? true,
        storeTitle: setting?.storeTitle || business?.name || '',
        storeDescription: setting?.storeDescription || '',
        storeBannerUrl: setting?.storeBannerUrl || '',
        whatsappNumber: setting?.whatsappNumber || business?.phone || '',
        enableOnlineOrders: setting?.enableOnlineOrders ?? true,
        businessName: business?.name || '',
        businessLogo: business?.logoUrl || '',
      },
    });
  });

  // PUT /api/v1/storefront/settings
  app.put('/settings', { preHandler: [authenticateUser, requireBusinessTenant] }, async (request, reply) => {
    const businessId = request.tenant?.businessId || (request as any).businessId;
    if (!businessId) {
      return reply.status(400).send({ success: false, error: 'NO_BUSINESS', message: 'Active business tenant is required' });
    }
    const body = request.body as any;

    const {
      enableStorefront,
      storeSlug,
      showStorePrices,
      storeTitle,
      storeDescription,
      storeBannerUrl,
      whatsappNumber,
      enableOnlineOrders,
    } = body;

    // Validate slug if provided
    let cleanSlug = storeSlug ? String(storeSlug).trim().toLowerCase().replace(/[^a-z0-9-]/g, '') : null;

    if (cleanSlug) {
      const existing = await globalPrisma.businessSetting.findFirst({
        where: {
          storeSlug: cleanSlug,
          businessId: { not: businessId },
        },
      });

      if (existing) {
        return reply.status(400).send({
          success: false,
          error: 'SLUG_TAKEN',
          message: `Store URL handle "${cleanSlug}" is already taken by another business. Please choose a different handle.`,
        });
      }
    }

    const updated = await globalPrisma.businessSetting.upsert({
      where: { businessId },
      create: {
        businessId,
        enableStorefront: Boolean(enableStorefront),
        storeSlug: cleanSlug,
        showStorePrices: showStorePrices !== undefined ? Boolean(showStorePrices) : true,
        storeTitle: storeTitle ? String(storeTitle).trim() : null,
        storeDescription: storeDescription ? String(storeDescription).trim() : null,
        storeBannerUrl: storeBannerUrl || null,
        whatsappNumber: whatsappNumber ? String(whatsappNumber).trim() : null,
        enableOnlineOrders: enableOnlineOrders !== undefined ? Boolean(enableOnlineOrders) : true,
      },
      update: {
        enableStorefront: enableStorefront !== undefined ? Boolean(enableStorefront) : undefined,
        storeSlug: cleanSlug !== undefined ? cleanSlug : undefined,
        showStorePrices: showStorePrices !== undefined ? Boolean(showStorePrices) : undefined,
        storeTitle: storeTitle !== undefined ? (storeTitle ? String(storeTitle).trim() : null) : undefined,
        storeDescription: storeDescription !== undefined ? (storeDescription ? String(storeDescription).trim() : null) : undefined,
        storeBannerUrl: storeBannerUrl !== undefined ? (storeBannerUrl || null) : undefined,
        whatsappNumber: whatsappNumber !== undefined ? (whatsappNumber ? String(whatsappNumber).trim() : null) : undefined,
        enableOnlineOrders: enableOnlineOrders !== undefined ? Boolean(enableOnlineOrders) : undefined,
      },
    });

    return reply.send({
      success: true,
      data: updated,
      message: 'Storefront settings updated successfully',
    });
  });

  // GET /api/v1/storefront/orders (Online Orders Manager for Business Owners)
  app.get('/orders', { preHandler: [authenticateUser, requireBusinessTenant] }, async (request, reply) => {
    const businessId = request.tenant?.businessId || (request as any).businessId;
    if (!businessId) {
      return reply.status(400).send({ success: false, error: 'NO_BUSINESS', message: 'Active business tenant is required' });
    }

    const orders = await globalPrisma.sale.findMany({
      where: {
        businessId,
        OR: [
          { invoiceNumber: { startsWith: 'WEB-' } },
          { notes: { contains: '[Online Storefront Order]' } },
        ],
      },
      include: {
        party: { select: { id: true, name: true, phone: true, address: true } },
        items: { include: { item: { select: { id: true, name: true, unit: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return reply.send({
      success: true,
      data: orders.map((ord) => ({
        id: ord.id,
        invoiceNumber: ord.invoiceNumber,
        customerName: ord.party?.name || 'Online Customer',
        customerPhone: ord.party?.phone || '',
        deliveryAddress: ord.party?.address || '',
        totalAmount: Number(ord.totalAmount),
        paidAmount: Number(ord.paidAmount),
        dueAmount: Number(ord.dueAmount),
        status: ord.status,
        notes: ord.notes,
        createdAt: ord.createdAt,
        items: ord.items.map((it) => ({
          id: it.id,
          name: it.item?.name || 'Product',
          unit: it.item?.unit || 'Pcs',
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          total: Number(it.total),
        })),
      })),
    });
  });

  // PATCH /api/v1/storefront/orders/:id/status
  app.patch('/orders/:id/status', { preHandler: [authenticateUser, requireBusinessTenant] }, async (request, reply) => {
    const businessId = request.tenant?.businessId || (request as any).businessId;
    if (!businessId) {
      return reply.status(400).send({ success: false, error: 'NO_BUSINESS', message: 'Active business tenant is required' });
    }
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    const existing = await globalPrisma.sale.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      return reply.status(404).send({ success: false, error: 'NOT_FOUND', message: 'Order not found' });
    }

    const updated = await globalPrisma.sale.update({
      where: { id },
      data: { status: status as any },
    });

    return reply.send({
      success: true,
      data: updated,
      message: `Order status updated to ${status}`,
    });
  });

  // ── Public Routes (Customer Facing) ────────────────────────────────────────

  // GET /api/v1/storefront/public-stores (Directory of all published online stores)
  app.get('/public-stores', async (_request, reply) => {
    try {
      const settings = await globalPrisma.businessSetting.findMany({
        where: {
          enableStorefront: true,
          storeSlug: { not: null },
        },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              address: true,
              logoUrl: true,
            },
          },
        },
        take: 60,
      });

      const stores = settings
        .filter((s: any) => s.storeSlug && s.business)
        .map((s: any) => ({
          slug: s.storeSlug,
          title: s.storeTitle || s.business?.name || 'Online Store',
          description: s.storeDescription || '',
          bannerUrl: s.storeBannerUrl || '',
          logoUrl: s.business?.logoUrl || '',
          address: s.business?.address || '',
          phone: s.whatsappNumber || s.business?.phone || '',
          showPrices: s.showStorePrices,
        }));

      return reply.send({
        success: true,
        data: stores,
      });
    } catch (err: any) {
      return reply.send({ success: true, data: [] });
    }
  });

  // GET /api/v1/storefront/public/:storeSlug
  app.get('/public/:storeSlug', async (request, reply) => {
    try {
      const { storeSlug } = request.params as { storeSlug: string };
      const cleanSlug = String(storeSlug).trim().toLowerCase();

      const setting = await globalPrisma.businessSetting.findFirst({
        where: { storeSlug: cleanSlug, enableStorefront: true },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              address: true,
              logoUrl: true,
              currency: true,
            },
          },
        },
      });

      if (!setting || !setting.business) {
        return reply.status(404).send({
          success: false,
          error: 'STORE_NOT_FOUND',
          message: 'Online store not found or currently unavailable',
        });
      }

      const businessId = setting.businessId;

      // Fetch published categories & items
      const categories = await globalPrisma.itemCategory.findMany({
        where: { businessId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });

      const rawItems = await globalPrisma.item.findMany({
        where: { businessId, isPublishedToStore: true },
        select: {
          id: true,
          name: true,
          code: true,
          type: true,
          unit: true,
          salePrice: true,
          currentStock: true,
          storeDescription: true,
          imageUrl: true,
          category: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
      });

      // Format products with transparent selling price
      const formattedProducts = rawItems.map((item) => {
        return {
          id: item.id,
          name: item.name,
          code: item.code,
          type: item.type,
          unit: item.unit,
          category: item.category,
          currentStock: Number(item.currentStock),
          inStock: item.type === 'SERVICE' || Number(item.currentStock) > 0,
          price: Number(item.salePrice),
          description: item.storeDescription || null,
          imageUrl: item.imageUrl || null,
        };
      });

      return reply.send({
        success: true,
        data: {
          store: {
            id: setting.business.id,
            name: setting.storeTitle || setting.business.name,
            description: setting.storeDescription || '',
            logoUrl: setting.business.logoUrl || null,
            bannerUrl: setting.storeBannerUrl || null,
            phone: setting.business.phone || '',
            email: setting.business.email || '',
            address: setting.business.address || '',
            whatsappNumber: setting.whatsappNumber || setting.business.phone || '',
            currency: setting.business.currency || 'NPR',
            enableOnlineOrders: setting.enableOnlineOrders,
          },
          categories,
          products: formattedProducts,
        },
      });
    } catch (err: any) {
      request.log.error(err, 'Error serving public store catalog');
      return reply.status(500).send({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Failed to load online store catalog',
      });
    }
  });

  // POST /api/v1/storefront/public/:storeSlug/orders
  app.post('/public/:storeSlug/orders', async (request, reply) => {
    try {
      const { storeSlug } = request.params as { storeSlug: string };
      const body = request.body as any;

      const cleanSlug = String(storeSlug).trim().toLowerCase();
      const setting = await globalPrisma.businessSetting.findFirst({
        where: { storeSlug: cleanSlug, enableStorefront: true },
        include: { business: true },
      });

      if (!setting || !setting.business) {
        return reply.status(404).send({
          success: false,
          error: 'STORE_NOT_FOUND',
          message: 'Store not found',
        });
      }

      const { customerName, customerPhone, deliveryAddress, notes, items } = body;
      if (!customerName || !customerPhone || !Array.isArray(items) || items.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'INVALID_ORDER',
          message: 'Customer name, phone, and items are required',
        });
      }

      const businessId = setting.businessId;

      // Create or find customer party
      let party = await globalPrisma.party.findFirst({
        where: { businessId, phone: String(customerPhone).trim() },
      });

      if (!party) {
        party = await globalPrisma.party.create({
          data: {
            businessId,
            name: String(customerName).trim(),
            phone: String(customerPhone).trim(),
            type: 'CUSTOMER',
            address: deliveryAddress ? String(deliveryAddress).trim() : null,
          },
        });
      }

      // Build sale items & calculate total
      let totalAmt = 0;
      const saleItemsData: any[] = [];

      for (const line of items) {
        const dbItem = await globalPrisma.item.findFirst({
          where: { id: line.itemId, businessId },
        });
        if (dbItem) {
          const qty = Math.max(1, Number(line.quantity || 1));
          const price = Number(dbItem.salePrice || 0);
          const lineTot = qty * price;
          totalAmt += lineTot;
          saleItemsData.push({
            itemId: dbItem.id,
            quantity: qty,
            unitPrice: price,
            discount: 0,
            taxAmount: 0,
            total: lineTot,
          });
        }
      }

      // Generate online invoice number
      const count = await globalPrisma.sale.count({ where: { businessId } });
      const invoiceNumber = `WEB-${String(count + 1).padStart(5, '0')}`;

      // Create Sales record (Status: UNPAID for online order lead)
      const order = await globalPrisma.sale.create({
        data: {
          businessId,
          invoiceNumber,
          partyId: party.id,
          date: new Date(),
          subTotal: totalAmt,
          discountPercent: 0,
          discount: 0,
          taxAmount: 0,
          totalAmount: totalAmt,
          paidAmount: 0,
          dueAmount: totalAmt,
          status: 'UNPAID',
          notes: `[Online Storefront Order] ${notes || ''}`.trim(),
          items: {
            create: saleItemsData,
          },
        },
        include: {
          party: true,
          items: { include: { item: true } },
        },
      });

      return reply.send({
        success: true,
        data: {
          orderId: order.id,
          invoiceNumber: order.invoiceNumber,
          totalAmount: Number(order.totalAmount),
          status: order.status,
        },
        message: 'Online order submitted successfully!',
      });
    } catch (err: any) {
      request.log.error(err, 'Error submitting online order');
      return reply.status(500).send({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Failed to process online order',
      });
    }
  });
}
