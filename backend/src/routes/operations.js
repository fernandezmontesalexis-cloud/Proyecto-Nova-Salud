// Rutas operativas: dashboard, inventario, ingresos y ventas.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

export const operationsRouter = Router();

operationsRouter.get("/dashboard", async (_req, res) => {
  const [products, lots, salesToday, recentSales] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, select: { id: true, minStock: true, lots: { where: { quantity: { gt: 0 } }, select: { quantity: true } } } }),
    prisma.inventoryLot.findMany({ where: { quantity: { gt: 0 }, expiresAt: { not: null } }, select: { expiresAt: true } }),
    prisma.sale.aggregate({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }, _sum: { total: true }, _count: true }),
    prisma.sale.findMany({ take: 8, orderBy: { createdAt: "desc" }, select: { id: true, number: true, total: true, createdAt: true, customer: { select: { name: true } }, items: { select: { id: true } } } }),
  ]);
  const lowStock = products.map((product) => ({ ...product, stock: product.lots.reduce((sum, lot) => sum + lot.quantity, 0) }))
    .filter((product) => product.stock <= product.minStock).length;
  const expiryThreshold = new Date();
  expiryThreshold.setDate(expiryThreshold.getDate() + 60);
  const expiring = lots.filter((lot) => new Date(lot.expiresAt) <= expiryThreshold).length;
  res.json({ productCount: products.length, lowStock, expiring, salesToday: salesToday._count, revenueToday: salesToday._sum.total ?? 0, recentSales });
});

operationsRouter.get("/inventory", async (_req, res) => {
  const lots = await prisma.inventoryLot.findMany({
    where: { quantity: { gt: 0 } },
    select: { id: true, lotCode: true, expiresAt: true, quantity: true, receivedAt: true, product: { select: { id: true, code: true, name: true, minStock: true, category: { select: { id: true, name: true } } } }, supplier: { select: { id: true, name: true } } },
    orderBy: [{ expiresAt: "asc" }, { product: { name: "asc" } }],
  });
  res.json(lots);
});

operationsRouter.post("/inventory/receipts", async (req, res) => {
  const data = z.object({
    productId: z.coerce.number().int().positive(),
    supplierId: z.coerce.number().int().positive().optional(),
    lotCode: z.string().trim().min(1).max(60),
    expiresAt: z.string().optional(),
    quantity: z.coerce.number().int().positive(),
    note: z.string().max(255).optional(),
  }).parse(req.body);
  const result = await prisma.$transaction(async (tx) => {
    const lot = await tx.inventoryLot.upsert({
      where: { productId_lotCode: { productId: data.productId, lotCode: data.lotCode } },
      update: { quantity: { increment: data.quantity }, expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined },
      create: { productId: data.productId, supplierId: data.supplierId, lotCode: data.lotCode, expiresAt: data.expiresAt ? new Date(data.expiresAt) : null, quantity: data.quantity },
    });
    await tx.inventoryMovement.create({ data: { productId: data.productId, lotId: lot.id, userId: req.user.id, type: "PURCHASE", quantity: data.quantity, note: data.note ?? "Ingreso de inventario" } });
    return lot;
  });
  res.status(201).json(result);
});

operationsRouter.post("/sales", async (req, res) => {
  const data = z.object({
    customerId: z.coerce.number().int().positive().optional(),
    items: z.array(z.object({ productId: z.coerce.number().int().positive(), quantity: z.coerce.number().int().positive() })).min(1),
  }).parse(req.body);

  const sale = await prisma.$transaction(async (tx) => {
    const lines = [];
    for (const item of data.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product?.active) throw Object.assign(new Error(`Producto ${item.productId} no disponible`), { status: 400 });
      let remaining = item.quantity;
      const lots = await tx.inventoryLot.findMany({
        where: { productId: item.productId, quantity: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
        orderBy: [{ expiresAt: "asc" }, { receivedAt: "asc" }],
      });
      for (const lot of lots) {
        if (!remaining) break;
        const quantity = Math.min(lot.quantity, remaining);
        await tx.inventoryLot.update({ where: { id: lot.id }, data: { quantity: { decrement: quantity } } });
        await tx.inventoryMovement.create({ data: { productId: product.id, lotId: lot.id, userId: req.user.id, type: "SALE", quantity: -quantity, note: "Salida por venta" } });
        lines.push({ productId: product.id, lotId: lot.id, quantity, unitPrice: product.salePrice, lineTotal: Number(product.salePrice) * quantity });
        remaining -= quantity;
      }
      if (remaining) throw Object.assign(new Error(`Stock insuficiente para ${product.name}`), { status: 409 });
    }
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const number = `FP-${Date.now()}`;
    return tx.sale.create({ data: {
      number,
      customerId: data.customerId,
      userId: req.user.id,
      subtotal,
      total: subtotal,
      items: { create: lines },
    }, include: { items: { include: { product: true } }, customer: true } });
  });
  res.status(201).json(sale);
});
