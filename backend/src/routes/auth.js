// Endpoints públicos de acceso para el personal autorizado de la botica.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { createToken, verifyPassword } from "../auth.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const data = z.object({ email: z.string().trim().email(), password: z.string().min(1) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user?.active || !verifyPassword(data.password, user.passwordHash)) return res.status(401).json({ error: "Correo o contraseña incorrectos" });
  res.json({ token: createToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
