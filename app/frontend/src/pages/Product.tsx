import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useAvailability, useProduct, useRelatedProducts } from "../lib/queries";
import { ApiError } from "../lib/api";
import { formatPrice } from "../lib/format";
import { useAdvisor } from "../context/advisor";
import { useSetCartItem } from "../lib/cart";
import { AvailabilityPill } from "../components/AvailabilityPill";
import { QuantityStepper } from "../components/QuantityStepper";
import { DisclaimerBox } from "../components/Disclaimer";
import { ProductCard } from "../components/ProductCard";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { NotFound } from "./NotFound";

function setMeta(name: string, content: string) {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export function Product() {
  const { slug } = useParams<{ slug: string }>();
  const product = useProduct(slug);
  const related = useRelatedProducts(slug);
  const availability = useAvailability(product.data ? [product.data.ref] : []);
  const advisor = useAdvisor();
  const setCartItem = useSetCartItem();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (product.data) {
      document.title = `${product.data.name} - Salud Inteligente`;
      setMeta(
        "description",
        product.data.description.slice(0, 155) ||
          `${product.data.name}, ${product.data.format}.`,
      );
    }
    return () => {
      document.title = "Salud Inteligente - Suplementos naturales";
    };
  }, [product.data]);

  if (product.isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-6 w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (product.isError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {product.error instanceof ApiError && product.error.status === 404 ? (
          <NotFound />
        ) : (
          <ErrorState onRetry={() => product.refetch()} message="No pudimos cargar este producto." />
        )}
      </div>
    );
  }

  const item = product.data;
  if (!item) return null;

  const status = availability.data?.[0]?.status ?? "available";
  const isOut = status === "out";

  function handleAddToCart() {
    setCartItem.mutate(
      { ref: item!.ref, quantity, source: "catalog" },
      { onSuccess: () => setAdded(true) },
    );
  }

  function handleAskAdvisor() {
    void advisor.sendMessage(
      `Tengo una pregunta sobre el producto "${item!.name}". ¿Me puedes contar más sobre sus beneficios y para qué sirve?`,
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav aria-label="Miga de pan" className="mb-6 text-meta text-muted">
        <Link to="/catalogo" className="hover:text-leaf">
          Catálogo
        </Link>
        {" / "}
        <Link to={`/catalogo?categoria=${item.category.slug}`} className="hover:text-leaf">
          {item.category.name}
        </Link>
        {" / "}
        <span className="text-ink">{item.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="aspect-square w-full overflow-hidden rounded-tile border border-line bg-white">
          <img
            src={item.image_url}
            alt={item.name}
            width={640}
            height={640}
            className="h-full w-full object-contain"
          />
        </div>

        <div>
          {item.need && (
            <span className="inline-block rounded-pill bg-sage px-3 py-1 text-meta font-medium text-forest">
              {item.need.name}
            </span>
          )}
          <h1 className="mt-3 font-display text-h3 font-bold text-ink lg:text-h2">
            {item.name}
          </h1>
          <p className="mt-1 text-meta text-muted">
            Ref. {item.ref} · {item.format}
          </p>
          <p className="mt-3 text-h4 font-semibold text-ink">
            {formatPrice(item.price)}
          </p>

          <div className="mt-3">
            <AvailabilityPill status={status} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <QuantityStepper value={quantity} onChange={setQuantity} disabled={isOut} />
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOut || setCartItem.isPending}
              className="rounded-pill bg-forest px-6 py-3 text-body font-medium text-white hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {added ? "Agregado al carrito" : "Agregar al carrito"}
            </button>
          </div>

          <button
            type="button"
            onClick={handleAskAdvisor}
            className="mt-4 rounded-pill border border-line px-5 py-2.5 text-body font-medium text-ink hover:border-leaf"
          >
            Preguntar al asesor sobre este producto
          </button>
        </div>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-body-lg font-semibold text-ink">Descripción</h2>
          <p className="mt-2 text-body text-muted">{item.description}</p>

          {item.benefits.length > 0 && (
            <div className="mt-6">
              <h2 className="text-body-lg font-semibold text-ink">Beneficios</h2>
              <ul className="mt-2 space-y-2">
                {item.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-body text-ink">
                    <Leaf size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-leaf" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-body-lg font-semibold text-ink">Detalles</h2>
          <dl className="mt-2 divide-y divide-line rounded-card border border-line bg-white">
            <div className="flex justify-between px-4 py-3">
              <dt className="text-body text-muted">Presentación</dt>
              <dd className="text-body text-ink">{item.presentation}</dd>
            </div>
            <div className="flex justify-between px-4 py-3">
              <dt className="text-body text-muted">Registro INVIMA</dt>
              <dd className="text-body text-ink">{item.invima ?? "Por confirmar"}</dd>
            </div>
            <div className="flex justify-between px-4 py-3">
              <dt className="text-body text-muted">Categoría</dt>
              <dd className="text-body text-ink">{item.category.name}</dd>
            </div>
            <div className="flex justify-between px-4 py-3">
              <dt className="text-body text-muted">Referencia</dt>
              <dd className="text-body text-ink">{item.ref}</dd>
            </div>
          </dl>

          <DisclaimerBox className="mt-4" />
        </div>
      </div>

      {related.data && related.data.length > 0 && (
        <div className="mt-14">
          <h2 className="font-display text-h4 font-bold text-ink">
            También te puede servir
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.data.map((relatedProduct) => (
              <ProductCard key={relatedProduct.ref} product={relatedProduct} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
