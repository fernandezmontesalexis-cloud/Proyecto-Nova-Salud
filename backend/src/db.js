// Punto único de acceso del backend a la base de datos mediante Prisma.
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
