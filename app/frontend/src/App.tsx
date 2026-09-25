import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Catalog } from "./pages/Catalog";
import { Product } from "./pages/Product";
import { Cart } from "./pages/Cart";
import { OrderConfirmation } from "./pages/OrderConfirmation";
import { About } from "./pages/About";
import { Cookies } from "./pages/Cookies";
import { ApiDocs } from "./pages/ApiDocs";
import { NotFound } from "./pages/NotFound";
import { AdminAuthProvider } from "./admin/AdminAuthContext";
import { AdminLayout } from "./admin/AdminLayout";
import { Login } from "./admin/Login";

// The admin panel (and Recharts) is only needed behind /admin, so it is
// code-split out of the public storefront bundle.
const Dashboard = lazy(() =>
  import("./admin/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Orders = lazy(() =>
  import("./admin/Orders").then((m) => ({ default: m.Orders })),
);
const Inventory = lazy(() =>
  import("./admin/Inventory").then((m) => ({ default: m.Inventory })),
);
const Products = lazy(() =>
  import("./admin/Products").then((m) => ({ default: m.Products })),
);
const Account = lazy(() =>
  import("./admin/Account").then((m) => ({ default: m.Account })),
);
const Messages = lazy(() =>
  import("./admin/Messages").then((m) => ({ default: m.Messages })),
);

function AdminFallback() {
  return <p className="p-6 text-body text-muted">Cargando...</p>;
}

export function App() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/catalogo" element={<Catalog />} />
          <Route path="/producto/:slug" element={<Product />} />
          <Route path="/carrito" element={<Cart />} />
          <Route path="/pedido/:code" element={<OrderConfirmation />} />
          <Route path="/nosotros" element={<About />} />
          <Route path="/api" element={<ApiDocs />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route
            index
            element={
              <Suspense fallback={<AdminFallback />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="pedidos"
            element={
              <Suspense fallback={<AdminFallback />}>
                <Orders />
              </Suspense>
            }
          />
          <Route
            path="inventario"
            element={
              <Suspense fallback={<AdminFallback />}>
                <Inventory />
              </Suspense>
            }
          />
          <Route
            path="productos"
            element={
              <Suspense fallback={<AdminFallback />}>
                <Products />
              </Suspense>
            }
          />
          <Route
            path="mensajes"
            element={
              <Suspense fallback={<AdminFallback />}>
                <Messages />
              </Suspense>
            }
          />
          <Route
            path="cuenta"
            element={
              <Suspense fallback={<AdminFallback />}>
                <Account />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}
