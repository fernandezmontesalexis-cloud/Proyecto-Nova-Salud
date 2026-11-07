// Carga datos iniciales de demostración de forma segura y repetible.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/auth.js";

const prisma = new PrismaClient();

// Crea el primer usuario administrador usando credenciales privadas del entorno.
await prisma.user.upsert({
  where: { email: process.env.ADMIN_EMAIL || "admin@novasalud.pe" },
  update: { name: "Alexis Fernández Montes", passwordHash: hashPassword(process.env.ADMIN_PASSWORD || "NovaSalud2026!"), role: "ADMIN", active: true },
  create: { name: "Alexis Fernández Montes", email: process.env.ADMIN_EMAIL || "admin@novasalud.pe", passwordHash: hashPassword(process.env.ADMIN_PASSWORD || "NovaSalud2026!"), role: "ADMIN" },
});

const examples = [
  { category: "Analgésicos", code: "MED-001", name: "Paracetamol 500 mg x 100 tabletas", salePrice: 0.5, purchaseCost: 0.25, minStock: 20, lotCode: "PAR-2608", quantity: 120, daysToExpiry: 540 },
  { category: "Analgésicos", code: "MED-002", name: "Ibuprofeno 400 mg x 100 tabletas", salePrice: 0.8, purchaseCost: 0.4, minStock: 15, lotCode: "IBU-2610", quantity: 8, daysToExpiry: 600 },
  { category: "Antigripales", code: "MED-003", name: "Antigripal día x 12 tabletas", salePrice: 1.5, purchaseCost: 0.8, minStock: 10, lotCode: "ANT-2604", quantity: 6, daysToExpiry: 35 },
  { category: "Cuidado personal", code: "CUI-001", name: "Alcohol medicinal 70% 500 ml", salePrice: 8.9, purchaseCost: 5.2, minStock: 8, lotCode: "ALC-2606", quantity: 35, daysToExpiry: 400 },
  { category: "Vitaminas", code: "VIT-001", name: "Vitamina C 1 g x 10 tabletas", salePrice: 12.5, purchaseCost: 7.1, minStock: 10, lotCode: "VIT-2611", quantity: 22, daysToExpiry: 730 },
];

for (const item of examples) {
  const category = await prisma.category.upsert({ where: { name: item.category }, update: {}, create: { name: item.category } });
  const product = await prisma.product.upsert({
    where: { code: item.code },
    update: {},
    create: { code: item.code, name: item.name, categoryId: category.id, salePrice: item.salePrice, purchaseCost: item.purchaseCost, minStock: item.minStock },
  });
  const existing = await prisma.inventoryLot.findUnique({ where: { productId_lotCode: { productId: product.id, lotCode: item.lotCode } } });
  if (!existing) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + item.daysToExpiry);
    const lot = await prisma.inventoryLot.create({ data: { productId: product.id, lotCode: item.lotCode, expiresAt, quantity: item.quantity } });
    await prisma.inventoryMovement.create({ data: { productId: product.id, lotId: lot.id, type: "PURCHASE", quantity: item.quantity, note: "Inventario inicial de demostración" } });
  }
}

console.log("Datos de demostración de FarmaPlus listos.");
await prisma.$disconnect();
