# Respaldo del catálogo anterior

Copia del catálogo tal como estaba en producción (saludinteligente.lat) el 2 de octubre de 2026,
antes de reemplazar el inventario por las listas de Greenlab, NaturPro y El Oasis.

| Archivo | Contenido |
| --- | --- |
| `productos_produccion_api.json` | Los 236 productos que devolvía la API pública (`/api/v1/catalog/products`), con precio, descripción, beneficios e imagen |
| `categorias_produccion_api.json` | Las 9 categorías con su número de productos |
| `necesidades_produccion_api.json` | Las necesidades (sueño, energía, ...) con su número de productos |
| `catalog_seed_con_costos.json` | El `seed/catalog.json` del servicio de catálogo en el commit `6bccc4c`, que además incluye el costo de proveedor, el precio sugerido y el precio de mercado (la API pública no los muestra) |
| `imagenes/` | Las 236 fotos de producto descargadas de producción (`/media/products/*.webp`) |

## Restaurar

1. Copiar `catalog_seed_con_costos.json` sobre `app/microservices/catalog/seed/catalog.json`.
2. Copiar `imagenes/*` a `app/frontend/public/media/products/`.
3. Desplegar y sincronizar la base con `python -m src.sync_catalog --apply` dentro del contenedor del catálogo.
