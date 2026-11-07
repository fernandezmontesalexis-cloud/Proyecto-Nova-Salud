# FarmaPlus

Sistema web de inventario y ventas para una botica. El proyecto separa el frontend React del backend Node.js y utiliza MySQL administrado localmente con XAMPP.

## Diseño de base de datos

| Entidad | Propósito | Relaciones principales |
| --- | --- | --- |
| `Category` | Clasificar medicamentos y productos | Una categoría tiene muchos productos |
| `Supplier` | Registrar proveedores | Un proveedor tiene muchos lotes de compra |
| `Product` | Datos generales, precio y mínimo de stock | Pertenece a categoría; tiene lotes, ventas y movimientos |
| `InventoryLot` | Stock por lote y vencimiento | Pertenece a producto y proveedor; se asigna a detalles de venta |
| `Customer` | Clientes opcionales de una venta | Tiene muchas ventas |
| `User` | Personal que registra operaciones | Registra ventas y movimientos |
| `Sale` | Cabecera, fecha y total de venta | Tiene detalles; opcionalmente cliente; registra usuario |
| `SaleItem` | Producto, lote, cantidad y precio vendido | Pertenece a venta, producto y lote |
| `InventoryMovement` | Auditoría de entradas, salidas y ajustes | Pertenece a producto y opcionalmente lote/usuario |

El stock disponible se deriva de la suma de cantidades de lotes no vencidos. Las ventas descuentan lotes próximos a vencer primero (FEFO) dentro de una transacción de base de datos. Se guardan precios de venta como valores históricos en el detalle de venta. Las contraseñas se almacenan como hashes.

## Preparación local

1. Inicia MySQL en XAMPP.
2. En phpMyAdmin crea la base `farmaplus` con cotejamiento `utf8mb4_unicode_ci`.
3. Revisa `backend/.env` y `frontend/.env`; ambos archivos contienen la configuración local y no deben publicarse.
4. En `backend`, ejecuta `npm install`, `npm run db:generate`, `npm run db:push` y `npm run db:seed`.
5. Ejecuta `npm run dev` en `backend`.
6. En otra terminal, entra a `frontend`, ejecuta `npm install` y `npm run dev`.
7. Abre la URL local que indique Vite e inicia sesión con el administrador configurado en `backend/.env`.

También puedes importar `backend/database.sql` desde phpMyAdmin para crear las tablas; en ese caso ejecuta `npm run db:generate` y `npm run db:seed` después.

## Estructura

- `backend/prisma/schema.prisma`: modelo Prisma para MySQL.
- `backend/database.sql`: DDL equivalente para crear las tablas desde phpMyAdmin.
- `backend/src`: API REST Express.
- `frontend/src`: interfaz React.

La API incluye autenticación, resumen, inventario, productos, categorías, clientes y registro de ventas. Las rutas operativas requieren un token firmado, las contraseñas se almacenan con scrypt y cada ingreso/venta queda asociado al usuario que la registró. Antes de publicar el sistema, cambia `AUTH_SECRET` y `ADMIN_PASSWORD` por valores propios y seguros.
