// Interfaz principal: navegación, consultas a la API y operaciones de la botica.
import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowDownToLine, ArrowUpRight, Boxes, ChartNoAxesCombined, ChevronDown, CircleHelp, Clock3, LayoutDashboard, Package, Plus, Search, ShoppingBag, ShoppingCart, Trash2, Users, X } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const money = (value) => `S/ ${Number(value || 0).toFixed(2)}`;
const date = (value) => value ? new Date(value).toLocaleDateString("es-PE") : "—";

function App() {
  const [section, setSection] = useState("Resumen");
  const [token, setToken] = useState(() => sessionStorage.getItem("farmaplus_token"));
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(sessionStorage.getItem("farmaplus_user") || "null"));
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [cart, setCart] = useState([]);
  const [stockForm, setStockForm] = useState({ productId: "", lotCode: "", expiresAt: "", quantity: "" });
  const [productForm, setProductForm] = useState({ code: "", name: "", categoryId: "", salePrice: "", purchaseCost: "", minStock: "5", unit: "unidad", description: "" });
  const [customerForm, setCustomerForm] = useState({ name: "", document: "", phone: "", email: "" });
  const nav = [{ label: "Resumen", icon: LayoutDashboard }, { label: "Inventario", icon: Boxes }, { label: "Productos", icon: Package }, { label: "Ventas", icon: ShoppingCart }, { label: "Clientes", icon: Users }];

  async function request(path, options) {
    const headers = { ...(options?.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const response = await fetch(`${API}/${path}`, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) { sessionStorage.removeItem("farmaplus_token"); sessionStorage.removeItem("farmaplus_user"); setToken(null); setCurrentUser(null); }
    if (!response.ok) throw Error(payload.error || "No se pudo completar la operación");
    return payload;
  }
  async function refresh() {
    try {
      const [d, p, i, c, clients] = await Promise.all([request("dashboard"), request("products"), request("inventory"), request("categories"), request("customers")]);
      setDashboard(d); setProducts(p); setInventory(i); setCategories(c); setCustomers(clients);
    } catch (error) { setNotice({ type: "error", text: `No se pudo conectar con la API: ${error.message}` }); }
  }
  useEffect(() => { if (token) refresh(); }, [token]);
  // Actualiza inventario y ventas periódicamente para que el mostrador vea cambios recientes.
  useEffect(() => { if (!token) return undefined; const interval = window.setInterval(refresh, 30000); return () => window.clearInterval(interval); }, [token]);
  useEffect(() => { const closeModal = () => setModal(null); window.addEventListener("farmaplus:close-modal", closeModal); return () => window.removeEventListener("farmaplus:close-modal", closeModal); }, []);
  // Mantiene visible el usuario autenticado y evita mostrar acciones duplicadas en Inventario.
  useEffect(() => {
    const name = currentUser?.name || "Alexis Fernández Montes";
    const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    document.querySelectorAll(".profile b").forEach((element) => { element.textContent = name; });
    document.querySelectorAll(".avatar").forEach((element) => { element.textContent = initials; });
    const headingAction = document.querySelector(".heading-actions button");
    if (headingAction) headingAction.style.display = section === "Inventario" ? "none" : "";
  }, [section, dashboard, products, inventory, customers, currentUser]);
  // Agrega la acción de cierre al perfil visible del usuario autenticado.
  useEffect(() => {
    const profile = document.querySelector(".profile");
    if (!profile || profile.querySelector(".logout-button")) return undefined;
    const button = document.createElement("button");
    button.className = "logout-button";
    button.type = "button";
    button.textContent = "Cerrar sesión";
    button.addEventListener("click", logout);
    profile.appendChild(button);
    return () => button.removeEventListener("click", logout);
  }, [currentUser]);
  const filteredProducts = useMemo(() => products.filter((p) => `${p.name} ${p.code} ${p.category?.name || ""}`.toLowerCase().includes(query.toLowerCase())), [products, query]);
  const filteredInventory = useMemo(() => inventory.filter((lot) => `${lot.product?.name || ""} ${lot.lotCode}`.toLowerCase().includes(query.toLowerCase())), [inventory, query]);
  const cartTotal = cart.reduce((sum, item) => sum + Number(item.salePrice) * item.quantity, 0);
  function go(label) { setSection(label); setQuery(""); setNotice(null); }
  function logout() { sessionStorage.removeItem("farmaplus_token"); sessionStorage.removeItem("farmaplus_user"); setToken(null); setCurrentUser(null); setCart([]); }
  function openStock() { setModal("stock"); }
  function openProduct() { setProductForm({ code: "", name: "", categoryId: categories[0]?.id || "", salePrice: "", purchaseCost: "", minStock: "5", unit: "unidad", description: "" }); setModal("product"); }
  function openCustomer() { setCustomerForm({ name: "", document: "", phone: "", email: "" }); setModal("customer"); }
  async function receiveStock(event) {
    event.preventDefault(); setBusy(true);
    try { await request("inventory/receipts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...stockForm, productId: Number(stockForm.productId), quantity: Number(stockForm.quantity) }) }); setStockForm({ productId: "", lotCode: "", expiresAt: "", quantity: "" }); setModal(null); setNotice({ type: "success", text: "Ingreso de inventario registrado." }); await refresh(); }
    catch (error) { setNotice({ type: "error", text: error.message }); } finally { setBusy(false); }
  }
  async function createProduct(event) {
    event.preventDefault(); setBusy(true);
    try { await request("products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...productForm, categoryId: Number(productForm.categoryId), salePrice: Number(productForm.salePrice), purchaseCost: Number(productForm.purchaseCost || 0), minStock: Number(productForm.minStock) }) }); setModal(null); setNotice({ type: "success", text: "Producto agregado al catálogo." }); await refresh(); }
    catch (error) { setNotice({ type: "error", text: error.message }); } finally { setBusy(false); }
  }
  async function createCustomer(event) {
    event.preventDefault(); setBusy(true);
    try { await request("customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(customerForm) }); setModal(null); setNotice({ type: "success", text: "Cliente registrado correctamente." }); await refresh(); }
    catch (error) { setNotice({ type: "error", text: error.message }); } finally { setBusy(false); }
  }
  function addToCart(product) {
    if (!product.stock) return setNotice({ type: "error", text: "Este producto no tiene stock disponible." });
    setCart((items) => items.some((item) => item.id === product.id) ? items.map((item) => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item) : [...items, { ...product, quantity: 1 }]);
  }
  async function checkout() {
    if (!cart.length) return; setBusy(true);
    try { await request("sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })) }) }); setCart([]); setNotice({ type: "success", text: "Venta registrada correctamente." }); await refresh(); }
    catch (error) { setNotice({ type: "error", text: error.message }); } finally { setBusy(false); }
  }
  if (!token) return <Login onLogin={(nextToken, user) => { sessionStorage.setItem("farmaplus_token", nextToken); sessionStorage.setItem("farmaplus_user", JSON.stringify(user)); setToken(nextToken); setCurrentUser(user); }} />;
  const title = section === "Resumen" ? `Buenos días, ${(currentUser?.name || "Alexis").split(" ")[0]}` : section;
  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#inicio"><span className="brand-mark"><Plus size={21} strokeWidth={3} /></span><span>farma<span className="brand-light">plus</span><small>GESTIÓN DE BOTICA</small></span></a><div className="workspace"><span className="workspace-icon">N</span><span><b>Nova Salud</b><small>Botica principal</small></span><ChevronDown size={15} /></div><span className="nav-label">MENÚ PRINCIPAL</span><nav>{nav.map(({ label, icon: Icon }) => <button className={`nav-item ${section === label ? "selected" : ""}`} key={label} onClick={() => go(label)}><Icon size={18} /><span>{label}</span>{label === "Inventario" && dashboard?.lowStock > 0 && <em>{dashboard.lowStock}</em>}</button>)}</nav><div className="sidebar-bottom"><button className="nav-item"><CircleHelp size={18}/><span>Centro de ayuda</span></button><div className="profile"><div className="avatar">JP</div><span><b>Juan Pérez</b><small>Administrador</small></span><ChevronDown size={15}/></div></div></aside>
    <main className="main-area"><header className="topbar"><div className="breadcrumb">FarmaPlus <span>/</span> <b>{section}</b></div><div className="top-actions"><span className="today"><Clock3 size={15}/> {new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric" }).format(new Date())}</span><button className="help-button"><CircleHelp size={17}/></button><div className="avatar small-avatar">JP</div></div></header><div className="page-content"><div className="page-heading"><div><div className="eyebrow">SÁBADO, BOTICA PRINCIPAL</div><h1>{title}</h1><p>{section === "Resumen" ? "Aquí tienes el estado de tu botica hoy." : "Consulta y administra la operación de FarmaPlus."}</p></div><div className="heading-actions">{section === "Productos" && <button className="primary-button" onClick={openProduct}><Plus size={17}/> Nuevo producto</button>}{section === "Clientes" && <button className="primary-button" onClick={openCustomer}><Plus size={17}/> Nuevo cliente</button>}{section !== "Clientes" && section !== "Productos" && section !== "Ventas" && <button className="primary-button" onClick={openStock}><ArrowDownToLine size={17}/> Registrar ingreso</button>}</div></div>{notice && <div className={`notice ${notice.type}`}><span>{notice.text}</span><button onClick={() => setNotice(null)}><X size={16}/></button></div>}
      {section === "Resumen" && <Dashboard dashboard={dashboard} inventory={inventory} products={products} go={go} openStock={openStock} />}{section === "Inventario" && <Inventory inventory={filteredInventory} openStock={openStock} />}{section === "Productos" && <Products products={filteredProducts} query={query} setQuery={setQuery} openProduct={openProduct} />}{section === "Ventas" && <Sales products={products} cart={cart} setCart={setCart} cartTotal={cartTotal} addToCart={addToCart} checkout={checkout} query={query} setQuery={setQuery} busy={busy} />}{section === "Clientes" && <Customers customers={customers} query={query} setQuery={setQuery} openCustomer={openCustomer} />}<footer>FarmaPlus <span>·</span> Sistema de gestión de botica <span>·</span> Versión 1.0</footer></div></main>
    {modal === "stock" && <Modal title="Registrar ingreso" subtitle="Añade unidades a un lote de inventario." icon={ArrowDownToLine} close={() => setModal(null)}><form onSubmit={receiveStock}><Field label="Producto"><select required value={stockForm.productId} onChange={(e) => setStockForm({ ...stockForm, productId: e.target.value })}><option value="">Selecciona un producto</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}</select></Field><div className="form-row"><Field label="Código de lote"><input required value={stockForm.lotCode} onChange={(e) => setStockForm({ ...stockForm, lotCode: e.target.value })} placeholder="Ej. L-2026-01" /></Field><Field label="Cantidad"><input required type="number" min="1" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} /></Field></div><Field label="Fecha de vencimiento"><input type="date" value={stockForm.expiresAt} onChange={(e) => setStockForm({ ...stockForm, expiresAt: e.target.value })} /></Field><ModalActions busy={busy} /></form></Modal>}
    {modal === "product" && <Modal title="Nuevo producto" subtitle="Completa los datos del catálogo." icon={Package} close={() => setModal(null)}><form onSubmit={createProduct}><div className="form-row"><Field label="Código"><input required value={productForm.code} onChange={(e) => setProductForm({ ...productForm, code: e.target.value })} placeholder="MED-001" /></Field><Field label="Unidad"><input required value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} /></Field></div><Field label="Nombre del producto"><input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Paracetamol 500mg" /></Field><div className="form-row"><Field label="Categoría"><select required value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}><option value="">Selecciona</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Precio de venta"><input required type="number" min="0" step="0.01" value={productForm.salePrice} onChange={(e) => setProductForm({ ...productForm, salePrice: e.target.value })} /></Field></div><div className="form-row"><Field label="Costo de compra"><input type="number" min="0" step="0.01" value={productForm.purchaseCost} onChange={(e) => setProductForm({ ...productForm, purchaseCost: e.target.value })} /></Field><Field label="Stock mínimo"><input required type="number" min="0" value={productForm.minStock} onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })} /></Field></div><ModalActions busy={busy} label="Guardar producto" /></form></Modal>}
    {modal === "customer" && <Modal title="Nuevo cliente" subtitle="Registra los datos del cliente." icon={Users} close={() => setModal(null)}><form onSubmit={createCustomer}><Field label="Nombre completo"><input required value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} /></Field><div className="form-row"><Field label="Documento"><input value={customerForm.document} onChange={(e) => setCustomerForm({ ...customerForm, document: e.target.value })} /></Field><Field label="Teléfono"><input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} /></Field></div><Field label="Correo electrónico"><input type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} /></Field><ModalActions busy={busy} label="Guardar cliente" /></form></Modal>}
  </div>;
}

function Dashboard({ dashboard, inventory, products, go, openStock }) { const low = inventory.filter((lot) => lot.product && lot.quantity <= lot.product.minStock).slice(0, 5); return <><section className="metric-grid"><Metric icon={Package} label="Productos activos" value={dashboard?.productCount ?? "—"} hint="En el catálogo" tint="green" /><Metric icon={AlertTriangle} label="Stock bajo" value={dashboard?.lowStock ?? "—"} hint="Requieren reposición" tint="amber" alert={dashboard?.lowStock > 0} /><Metric icon={Clock3} label="Por vencer" value={dashboard?.expiring ?? "—"} hint="En los próximos 60 días" tint="blue" /><Metric icon={ChartNoAxesCombined} label="Ventas de hoy" value={money(dashboard?.revenueToday)} hint={`${dashboard?.salesToday ?? 0} transacciones`} tint="purple" trend /></section><section className="dashboard-grid"><div className="panel inventory-panel"><div className="panel-head"><div><h2>Inventario con stock bajo</h2><p>Productos que necesitan atención</p></div><button className="text-button" onClick={() => go("Inventario")}>Ver inventario <ArrowUpRight size={15}/></button></div>{low.length ? <Table><thead><tr><th>PRODUCTO</th><th>LOTE / VENCE</th><th>STOCK</th><th>ESTADO</th></tr></thead><tbody>{low.map((lot) => <tr key={lot.id}><td><b>{lot.product.name}</b><small>{lot.product.code}</small></td><td>{lot.lotCode}<small>{date(lot.expiresAt)}</small></td><td><b>{lot.quantity}</b> und.</td><td><span className="status low">Stock bajo</span></td></tr>)}</tbody></Table> : <Empty icon={Boxes} title="Todo bajo control" text="No hay lotes con stock bajo."/>}</div><div className="panel quick-panel"><div className="panel-head"><div><h2>Accesos rápidos</h2><p>Atajos para tu operación</p></div></div><Quick icon={ShoppingBag} title="Nueva venta" subtitle="Registrar una salida" onClick={() => go("Ventas")} /><Quick icon={ArrowDownToLine} title="Ingreso de stock" subtitle="Añadir productos al inventario" onClick={openStock} /><Quick icon={Package} title="Ver productos" subtitle={`${products.length} productos en catálogo`} onClick={() => go("Productos")} /></div></section><RecentSales sales={dashboard?.recentSales || []} /></>; }
function RecentSales({ sales }) { return <section className="panel recent-panel"><div className="panel-head"><div><h2>Ventas recientes</h2><p>Últimas transacciones registradas</p></div></div>{sales.length ? <Table><thead><tr><th>N.º VENTA</th><th>CLIENTE</th><th>PRODUCTOS</th><th>FECHA</th><th>TOTAL</th></tr></thead><tbody>{sales.map((sale) => <tr key={sale.id}><td><b className="sale-number">{sale.number}</b></td><td>{sale.customer?.name || "Venta mostrador"}</td><td>{sale.items.length} artículos</td><td>{date(sale.createdAt)}</td><td><b>{money(sale.total)}</b></td></tr>)}</tbody></Table> : <Empty icon={ShoppingCart} title="Aún no hay ventas" text="Las ventas registradas aparecerán aquí."/>}</section>; }
function Inventory({ inventory, openStock }) { return <section className="panel full-panel"><div className="panel-head"><div><h2>Lotes de inventario</h2><p>Control de existencias y vencimientos</p></div><button className="primary-button compact" onClick={openStock}><Plus size={15}/> Registrar lote</button></div>{inventory.length ? <Table><thead><tr><th>PRODUCTO</th><th>LOTE</th><th>VENCE</th><th>PROVEEDOR</th><th>STOCK</th><th>ESTADO</th></tr></thead><tbody>{inventory.map((lot) => <tr key={lot.id}><td><b>{lot.product?.name}</b><small>{lot.product?.code}</small></td><td>{lot.lotCode}</td><td>{date(lot.expiresAt)}</td><td>{lot.supplier?.name || "Sin proveedor"}</td><td><b>{lot.quantity}</b> und.</td><td><span className={`status ${lot.quantity <= (lot.product?.minStock || 0) ? "low" : "good"}`}>{lot.quantity <= (lot.product?.minStock || 0) ? "Reponer" : "Disponible"}</span></td></tr>)}</tbody></Table> : <Empty icon={Boxes} title="Inventario vacío" text="Registra el primer ingreso de stock."/>}</section>; }
function Products({ products, query, setQuery, openProduct }) { return <section className="panel full-panel"><div className="panel-head"><div><h2>Catálogo de productos</h2><p>{products.length} productos encontrados</p></div><SearchBox value={query} onChange={setQuery} placeholder="Buscar producto..." /></div>{products.length ? <Table><thead><tr><th>PRODUCTO</th><th>CATEGORÍA</th><th>PRECIO</th><th>STOCK</th><th>ESTADO</th></tr></thead><tbody>{products.map((p) => <tr key={p.id}><td><b>{p.name}</b><small>{p.code}</small></td><td>{p.category?.name || "—"}</td><td><b>{money(p.salePrice)}</b></td><td>{p.stock ?? 0} und.</td><td><span className={`status ${(p.stock ?? 0) <= p.minStock ? "low" : "good"}`}>{(p.stock ?? 0) <= p.minStock ? "Reponer" : "Disponible"}</span></td></tr>)}</tbody></Table> : <Empty icon={Package} title="Sin productos" text="Agrega el primer producto al catálogo." action={openProduct}/>}</section>; }
 function Sales({ products, cart, setCart, cartTotal, addToCart, checkout, query, setQuery, busy }) { const available = products.filter((p) => `${p.name} ${p.code}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8); return <section className="sales-layout"><div className="panel sales-products"><div className="panel-head"><div><h2>Selecciona productos</h2><p>Agrega artículos a la venta</p></div><SearchBox value={query} onChange={setQuery} placeholder="Buscar..." /></div><div className="product-picker">{available.map((p) => <button className="product-option" key={p.id} onClick={() => addToCart(p)}><span className="quick-icon"><Package size={17}/></span><span><b>{p.name}</b><small>{p.code} · {p.stock || 0} disponibles</small></span><strong>{money(p.salePrice)}</strong></button>)}{!available.length && <Empty icon={Package} title="No hay coincidencias" text="Prueba con otro nombre o código."/>}</div></div><div className="panel cart-panel"><div className="panel-head"><div><h2>Nueva venta</h2><p>{cart.length} productos seleccionados</p></div><ShoppingCart size={19} className="muted-icon" /></div><div className="cart-items">{cart.length ? cart.map((item) => <div className="cart-item" key={item.id}><div><b>{item.name}</b><small>{money(item.salePrice)} × {item.quantity}</small></div><strong>{money(Number(item.salePrice) * item.quantity)}</strong><button onClick={() => setCart(cart.filter((i) => i.id !== item.id))}><Trash2 size={15}/></button></div>) : <Empty icon={ShoppingCart} title="Carrito vacío" text="Selecciona un producto para comenzar."/>}</div><div className="cart-total"><span>Total</span><strong>{money(cartTotal)}</strong></div><button className="primary-button checkout-button" disabled={!cart.length || busy} onClick={checkout}>{busy ? "Registrando..." : "Confirmar venta"}</button></div></section>; }
function Customers({ customers, query, setQuery, openCustomer }) { const filtered = customers.filter((c) => `${c.name} ${c.document || ""} ${c.phone || ""}`.toLowerCase().includes(query.toLowerCase())); return <section className="panel full-panel"><div className="panel-head"><div><h2>Clientes</h2><p>{filtered.length} clientes registrados</p></div><SearchBox value={query} onChange={setQuery} placeholder="Buscar cliente..." /></div>{filtered.length ? <Table><thead><tr><th>NOMBRE</th><th>DOCUMENTO</th><th>TELÉFONO</th><th>CORREO</th><th>REGISTRO</th></tr></thead><tbody>{filtered.map((c) => <tr key={c.id}><td><b>{c.name}</b></td><td>{c.document || "—"}</td><td>{c.phone || "—"}</td><td>{c.email || "—"}</td><td>{date(c.createdAt)}</td></tr>)}</tbody></Table> : <Empty icon={Users} title="Sin clientes" text="Registra el primer cliente." action={openCustomer}/>}</section>; }
function Login({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok) throw Error(payload.error || "No se pudo iniciar sesión");
      onLogin(payload.token, payload.user);
    } catch (loginError) { setError(loginError.message); } finally { setBusy(false); }
  }
  return <div className="login-page"><div className="login-card"><div className="login-brand"><span className="brand-mark"><Plus size={21} strokeWidth={3} /></span><span>farma<span className="brand-light">plus</span><small>GESTIÓN DE BOTICA</small></span></div><div className="login-heading"><span className="eyebrow">NOVA SALUD</span><h1>Bienvenido de nuevo</h1><p>Ingresa para administrar tu botica.</p></div><form onSubmit={submit}><Field label="Correo electrónico"><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field><Field label="Contraseña"><input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>{error && <div className="login-error">{error}</div>}<button className="primary-button login-button" disabled={busy}>{busy ? "Ingresando..." : "Iniciar sesión"}</button></form><small className="login-security">Acceso protegido para personal autorizado</small></div></div>;
}
function Modal({ title, subtitle, icon: Icon, close, children }) { return <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && close()}><div className="modal"><div className="modal-title"><div><span className="modal-icon"><Icon size={19}/></span><h2>{title}</h2><p>{subtitle}</p></div><button type="button" className="close-button" onClick={close}><X size={19}/></button></div>{children}</div></div>; }
function Field({ label, children }) { return <label>{label}{children}</label>; }
function ModalActions({ busy, label = "Registrar ingreso" }) { return <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => window.dispatchEvent(new Event("farmaplus:close-modal"))}>Cancelar</button><button className="primary-button" disabled={busy}>{busy ? "Guardando..." : label}</button></div>; }
function SearchBox({ value, onChange, placeholder }) { return <div className="search-box"><Search size={16}/><input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} /></div>; }
function Table({ children }) { return <div className="table-scroll"><table>{children}</table></div>; }
function Metric({ icon: Icon, label, value, hint, tint, alert, trend }) { return <div className="metric-card"><div className="metric-top"><span className={`metric-icon ${tint}`}><Icon size={19}/></span>{alert && <span className="attention">Atención</span>}{trend && <span className="trend"><Activity size={13}/> En curso</span>}</div><div className="metric-value">{value}</div><div className="metric-label">{label}</div><div className="metric-hint">{hint}</div></div>; }
function Empty({ icon: Icon, title, text, action }) { return <div className="empty-state"><span><Icon size={20}/></span><b>{title}</b><p>{text}</p>{action && <button className="primary-button compact" onClick={action}><Plus size={14}/> Crear ahora</button>}</div>; }
function Quick({ icon: Icon, title, subtitle, onClick }) { return <button className="quick-link" onClick={onClick}><span className="quick-icon"><Icon size={18}/></span><span><b>{title}</b><small>{subtitle}</small></span><ArrowUpRight size={16}/></button>; }

export default App;
