import { useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  ShoppingBag,
  Store,
  Warehouse,
  X,
} from "lucide-react";
import { useAdminAuth } from "./auth";

const LINKS = [
  { to: "/admin", label: "Resumen", icon: LayoutDashboard, end: true },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { to: "/admin/inventario", label: "Inventario", icon: Warehouse },
  { to: "/admin/productos", label: "Productos", icon: Package },
  { to: "/admin/mensajes", label: "Mensajes", icon: MessageSquare },
  { to: "/admin/cuenta", label: "Mi cuenta", icon: KeyRound },
];

export function AdminLayout() {
  const { isAuthenticated, logout } = useAdminAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  function isActive(to: string, end?: boolean) {
    return end ? location.pathname === to : location.pathname.startsWith(to);
  }

  const nav = (
    <nav className="space-y-1">
      {LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          onClick={() => setMenuOpen(false)}
          className={`flex items-center gap-3 rounded-control px-3 py-2 text-body ${
            isActive(link.to, link.end)
              ? "bg-sage font-medium text-forest"
              : "text-ink hover:bg-sage/60"
          }`}
        >
          <link.icon size={18} strokeWidth={1.75} />
          {link.label}
        </Link>
      ))}
      <Link
        to="/"
        className="flex items-center gap-3 rounded-control px-3 py-2 text-body text-ink hover:bg-sage/60"
      >
        <Store size={18} strokeWidth={1.75} />
        Ver tienda
      </Link>
      <button
        type="button"
        onClick={logout}
        className="flex w-full items-center gap-3 rounded-control px-3 py-2 text-left text-body text-danger hover:bg-danger/10"
      >
        <LogOut size={18} strokeWidth={1.75} />
        Cerrar sesión
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-paper lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-white p-5 lg:block">
        <p className="font-display text-lg font-bold text-forest">Admin</p>
        <div className="mt-6">{nav}</div>
      </aside>

      <div className="flex-1">
        <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
          <p className="font-display text-lg font-bold text-forest">Admin</p>
          <button
            type="button"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-control p-2 text-ink hover:bg-sage"
          >
            {menuOpen ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-b border-line bg-white px-4 py-3 lg:hidden">{nav}</div>
        )}
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
