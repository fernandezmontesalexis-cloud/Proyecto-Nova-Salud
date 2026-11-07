// Rutas del catálogo: productos, categorías y clientes.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

export const catalogRouter = Router();

catalogRouter.get("/products", async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { active: true },
    select: { id: true, code: true, name: true, description: true, unit: true, purchaseCost: true, salePrice: true, minStock: true, active: true, category: true, lots: { where: { quantity: { gt: 0 } }, select: { quantity: true } } },
    orderBy: { name: "asc" },
  });
  res.json(products.map((product) => ({
    ...product,
    stock: product.lots.reduce((sum, lot) => sum + lot.quantity, 0),
    lots: undefined,
  })));
});

catalogRouter.post("/products", async (req, res) => {
  const schema = z.object({
    code: z.string().trim().min(1).max(40),
    name: z.string().trim().min(2).max(180),
    categoryId: z.coerce.number().int().positive(),
    salePrice: z.coerce.number().nonnegative(),
    purchaseCost: z.coerce.number().nonnegative().default(0),
    minStock: z.coerce.number().int().nonnegative().default(5),
    unit: z.string().trim().default("unidad"),
    description: z.string().optional(),
  });
  const data = schema.parse(req.body);
  const product = await prisma.product.create({ data, include: { category: true } });
  res.status(201).json(product);
});

catalogRouter.get("/categories", async (_req, res) => {
  res.json(await prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }));
});

catalogRouter.post("/categories", async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(2).max(100) }).parse(req.body);
  res.status(201).json(await prisma.category.create({ data: { name } }));
});

catalogRouter.get("/customers", async (_req, res) => {
  res.json(await prisma.customer.findMany({ select: { id: true, name: true, document: true, phone: true, email: true, createdAt: true }, orderBy: { name: "asc" }, take: 100 }));
});

catalogRouter.post("/customers", async (req, res) => {
  const data = z.object({
    name: z.string().trim().min(2).max(150),
    document: z.string().trim().max(20).optional().or(z.literal("")),
    phone: z.string().trim().max(30).optional(),
    email: z.string().trim().email().optional().or(z.literal("")),
  }).parse(req.body);
  res.status(201).json(await prisma.customer.create({ data: {
    ...data,
    document: data.document || null,
    email: data.email || null,
  } }));
});
