import { useState } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import { useAdvisor } from "../context/advisor";
import { useBusiness, useCategories, useNeeds, useProducts } from "../lib/queries";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";

const SUGGESTION_CHIPS = [
  "Me cuesta dormir",
  "Quiero más energía",
  "Dolor en las articulaciones",
];

export function Home() {
  const advisor = useAdvisor();
  const [heroInput, setHeroInput] = useState("");
  const needs = useNeeds();
  const categories = useCategories();
  const viral = useProducts({ viral: true, limit: 10 });
  const business = useBusiness();

  function handleHeroSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!heroInput.trim()) return;
    void advisor.sendMessage(heroInput);
    setHeroInput("");
  }

  return (
    <div>
      <section className="border-b border-line bg-sage/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-20">
          <div>
            <h1 className="font-display text-h2 font-bold leading-tight text-forest lg:text-h1">
              Suplementos naturales, elegidos para lo que sientes
            </h1>
            <p className="mt-4 text-body-lg text-muted">
              Catálogo con registro INVIMA y un asesor con IA que te recomienda,
              sin reemplazar la consulta médica.
            </p>

            <form onSubmit={handleHeroSubmit} className="mt-6 flex items-center gap-2">
              <label htmlFor="hero-advisor-input" className="sr-only">
                Cuéntale al asesor qué necesitas
              </label>
              <input
                id="hero-advisor-input"
                type="text"
                value={heroInput}
                onChange={(event) => setHeroInput(event.target.value)}
                placeholder="Cuéntale al asesor qué necesitas..."
                className="flex-1 rounded-pill border border-line bg-white px-5 py-3 text-body-lg text-ink outline-none focus-visible:border-leaf"
              />
              <button
                type="submit"
                aria-label="Enviar al asesor"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest text-white hover:bg-forest/90"
              >
                <Send size={20} strokeWidth={1.75} />
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => void advisor.sendMessage(chip)}
                  className="rounded-pill border border-line bg-white px-4 py-2 text-meta text-ink hover:border-leaf"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-tile">
            <img
              src="/media/site/hero.webp"
              alt="Suplementos naturales Salud Inteligente"
              width={960}
              height={540}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section id="necesidades" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="font-display text-h3 font-bold text-ink">
          ¿Qué necesitas hoy?
        </h2>
        {needs.isError && (
          <ErrorState onRetry={() => needs.refetch()} message="No pudimos cargar las necesidades." />
        )}
        {needs.isLoading && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-tile bg-sage" />
            ))}
          </div>
        )}
        {needs.data && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {/* A need with no products yet (e.g. a fallback "other" bucket)
                would only lead to an empty catalog view, so it is skipped
                here even though the API still lists it for completeness. */}
            {needs.data
              .filter((need) => need.product_count > 0)
              .map((need) => (
                <Link
                  key={need.slug}
                  to={`/catalogo?necesidad=${need.slug}`}
                  className="group overflow-hidden rounded-tile border border-line bg-sage"
                >
                  <div className="aspect-square w-full overflow-hidden">
                    <img
                      src={need.image_url}
                      alt={need.name}
                      width={400}
                      height={400}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-body font-semibold text-ink">{need.name}</p>
                    <p className="text-meta text-muted">
                      {need.product_count} productos
                    </p>
                  </div>
                </Link>
              ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="font-display text-h3 font-bold text-ink">Lo más pedido</h2>
        {viral.isLoading && <ProductGridSkeleton count={4} />}
        {viral.isError && (
          <ErrorState onRetry={() => viral.refetch()} message="No pudimos cargar los productos." />
        )}
        {viral.data && (
          <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 no-scrollbar">
            {viral.data.items.map((product) => (
              <div key={product.ref} className="w-52 shrink-0 snap-start sm:w-60">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="font-display text-h3 font-bold text-ink">
          Explora por categoría
        </h2>
        {categories.isError && (
          <ErrorState onRetry={() => categories.refetch()} message="No pudimos cargar las categorías." />
        )}
        {categories.data && (
          <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {categories.data.map((category) => (
              <Link
                key={category.slug}
                to={`/catalogo?categoria=${category.slug}`}
                className="flex items-center justify-between border-b border-line py-3 hover:text-leaf"
              >
                <span>
                  <span className="block text-body-lg font-medium text-ink">
                    {category.name}
                  </span>
                  <span className="block text-meta text-muted">{category.tagline}</span>
                </span>
                <span className="text-meta text-muted">{category.product_count}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-line bg-sage/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div className="overflow-hidden rounded-tile">
            <img
              src="/media/site/nosotros.webp"
              alt="Cómo funciona el asesor IA"
              width={800}
              height={600}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h2 className="font-display text-h3 font-bold text-ink">
              Un asesor que conoce el catálogo
            </h2>
            <p className="mt-3 text-body-lg text-muted">
              Cuéntale lo que sientes y te recomienda productos reales del
              catálogo, con su razón. No reemplaza la consulta médica ni hace
              diagnósticos.
            </p>
            <button
              type="button"
              onClick={advisor.open}
              className="mt-4 rounded-pill bg-forest px-5 py-3 text-body font-medium text-white hover:bg-forest/90"
            >
              Hablar con el asesor
            </button>
          </div>
        </div>
      </section>

      {business.data && business.data.services.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-h3 font-bold text-ink">
            Nuestros servicios
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {business.data.services.map((service) => (
              <div
                key={service.id}
                className="rounded-card border border-line bg-white p-4"
              >
                <p className="text-body-lg font-semibold text-ink">{service.title}</p>
                <p className="mt-1 text-body text-muted">{service.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
