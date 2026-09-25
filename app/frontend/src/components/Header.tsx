import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, Menu, Search, ShoppingCart, Sparkles, X } from "lucide-react";
import { useAdvisor } from "../context/advisor";
import { useCart } from "../lib/cart";

const NAV_LINKS = [
  { to: "/catalogo", label: "Catálogo" },
  { to: "/#necesidades", label: "Necesidades" },
  { to: "/nosotros", label: "Nosotros" },
];

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const advisor = useAdvisor();
  const { data: cart } = useCart();

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSearchOpen(false);
    setMenuOpen(false);
    navigate(`/catalogo?q=${encodeURIComponent(query)}`);
  }

  const itemCount = cart?.item_count ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 shrink items-center gap-1.5 sm:gap-2">
          <Leaf size={22} strokeWidth={1.75} className="shrink-0 text-leaf" />
          <span className="truncate font-display text-base font-bold text-forest sm:text-lg">
            Salud Inteligente
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-body font-medium text-ink hover:text-leaf"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          {/* Search lives in the header row from the sm breakpoint up; on
              phones it moves into the menu sheet so the row always fits. */}
          <button
            type="button"
            aria-label="Buscar productos"
            onClick={() => setSearchOpen((open) => !open)}
            className="hidden rounded-control p-2 text-ink hover:bg-sage sm:inline-flex"
          >
            <Search size={20} strokeWidth={1.75} />
          </button>

          <button
            type="button"
            onClick={advisor.open}
            className="flex items-center gap-1.5 rounded-pill bg-forest px-2.5 py-2 text-body font-medium text-white hover:bg-forest/90 sm:gap-2 sm:px-4"
          >
            <Sparkles size={18} strokeWidth={1.75} />
            <span className="hidden sm:inline">Asesor IA</span>
            <span className="sm:hidden">Asesor</span>
          </button>

          <Link
            to="/carrito"
            aria-label="Ver carrito"
            className="relative shrink-0 rounded-control p-2 text-ink hover:bg-sage"
          >
            <ShoppingCart size={20} strokeWidth={1.75} />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-leaf px-1 text-[11px] font-semibold text-white">
                {itemCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuOpen((open) => !open)}
            className="shrink-0 rounded-control p-2 text-ink hover:bg-sage md:hidden"
          >
            {menuOpen ? (
              <X size={20} strokeWidth={1.75} />
            ) : (
              <Menu size={20} strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="hidden border-t border-line bg-paper px-4 py-3 sm:block sm:px-6">
          <form onSubmit={handleSearchSubmit} className="mx-auto flex max-w-6xl gap-2">
            <label htmlFor="header-search" className="sr-only">
              Buscar productos
            </label>
            <input
              id="header-search"
              type="search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar productos..."
              className="flex-1 rounded-pill border border-line bg-white px-4 py-2 text-body outline-none focus-visible:border-leaf"
            />
            <button
              type="submit"
              className="rounded-pill bg-forest px-4 py-2 text-body font-medium text-white"
            >
              Buscar
            </button>
          </form>
        </div>
      )}

      {menuOpen && (
        <nav className="border-t border-line bg-paper px-4 py-3 md:hidden">
          <form onSubmit={handleSearchSubmit} className="mb-4 flex gap-2">
            <label htmlFor="mobile-search" className="sr-only">
              Buscar productos
            </label>
            <input
              id="mobile-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar productos..."
              className="flex-1 rounded-pill border border-line bg-white px-4 py-2 text-body outline-none focus-visible:border-leaf"
            />
            <button
              type="submit"
              className="rounded-pill bg-forest px-4 py-2 text-body font-medium text-white"
            >
              Buscar
            </button>
          </form>
          <ul className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className="block text-body-lg font-medium text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
