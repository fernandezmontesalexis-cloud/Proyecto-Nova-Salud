// Configura Express, middleware, rutas HTTP y el ciclo de vida de la API.
import "dotenv/config";
import express from "express";
import cors from "cors";
import { ZodError } from "zod";
import { prisma } from "./db.js";
import { catalogRouter } from "./routes/catalog.js";
import { operationsRouter } from "./routes/operations.js";
import { authRouter } from "./routes/auth.js";
import { requireAuth } from "./auth.js";

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json({ limit: "100kb" }));
app.get("/api/health", (_req, res) => res.json({ name: "FarmaPlus API", status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api", requireAuth, catalogRouter);
app.use("/api", requireAuth, operationsRouter);
app.use((error, _req, res, _next) => {
  if (error instanceof ZodError) return res.status(400).json({ error: "Datos inválidos", details: error.issues });
  const status = error.status ?? (error.code === "P2002" ? 409 : 500);
  console.error(error);
  res.status(status).json({ error: status === 500 ? "Error interno del servidor" : error.message });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`FarmaPlus API escuchando en http://localhost:${port}`));

async function shutdown(signal) {
  console.log(`${signal}: cerrando conexiones`);
  await prisma.$disconnect();
  process.exit(0);
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
