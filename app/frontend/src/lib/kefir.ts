import { formatPrice } from "./format";

/** The kefir's catalog entry, the single source of its price and product page. */
export const KEFIR_SLUG = "kefir-casero-1-l";

/** The prefilled WhatsApp order: liters, and the price and total when the catalog knows them. */
export function kefirOrderMessage(liters: number, pricePerLiter: number | null): string {
  const amount = `${liters} ${liters === 1 ? "litro" : "litros"}`;
  if (pricePerLiter === null) {
    return `Hola, quiero pedir ${amount} de Kefir Casero. ¿Me confirmas el pedido?`;
  }
  return (
    `Hola, quiero pedir ${amount} de Kefir Casero ` +
    `(${formatPrice(pricePerLiter)} el litro, total ${formatPrice(pricePerLiter * liters)}). ` +
    "¿Me confirmas el pedido?"
  );
}
