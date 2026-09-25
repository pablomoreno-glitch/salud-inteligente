import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Plus } from "lucide-react";
import type { CartSource, Product } from "../types";
import { formatPrice } from "../lib/format";
import { useSetCartItem } from "../lib/cart";

interface ProductCardProps {
  product: Product;
  source?: CartSource;
}

export function ProductCard({ product, source = "catalog" }: ProductCardProps) {
  const [confirmed, setConfirmed] = useState(false);
  const setCartItem = useSetCartItem();

  function handleAdd(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setCartItem.mutate(
      { ref: product.ref, quantity: 1, source },
      {
        onSuccess: () => {
          setConfirmed(true);
          setTimeout(() => setConfirmed(false), 1200);
        },
      },
    );
  }

  return (
    <Link
      to={`/producto/${product.slug}`}
      className="group flex flex-col rounded-tile border border-line bg-white p-3 transition-shadow hover:border-leaf"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-tile bg-white">
        <img
          src={product.image_url}
          alt={product.name}
          width={400}
          height={400}
          loading="lazy"
          className="h-full w-full object-contain"
        />
        <button
          type="button"
          aria-label="Agregar al carrito"
          onClick={handleAdd}
          disabled={setCartItem.isPending}
          className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-forest text-white shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
        >
          {confirmed ? <Check size={18} strokeWidth={1.75} /> : <Plus size={18} strokeWidth={1.75} />}
        </button>
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-1">
        <h3 className="line-clamp-2 text-body-lg font-semibold text-ink">
          {product.name}
        </h3>
        <p className="text-meta text-muted">{product.format}</p>
        <p className="mt-auto pt-1 text-body-lg font-medium text-ink">
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}
