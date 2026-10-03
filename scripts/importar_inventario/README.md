# Importar el inventario de Greenlab, NaturPro y El Oasis

Scripts usados el 2 de octubre de 2026 para reemplazar el catálogo por los Excel
`inventario_GL_NP_v4.xlsx` (Greenlab y NaturPro, 93 productos) y
`catalogo_eloasis_CON_PARA_QUE_SIRVE.xlsx` (El Oasis, 203 productos).
El catálogo anterior está respaldado en `backup/catalogo_anterior/`.

```bash
python scripts/importar_inventario/extraer_excel.py inventario_GL_NP_v4.xlsx catalogo_eloasis_CON_PARA_QUE_SIRVE.xlsx
git show 5df8132:app/microservices/catalog/seed/catalog.json > scripts/importar_inventario/cat_old.json
git checkout 6bccc4c -- app/microservices/catalog/seed/catalog.json   # partir del catálogo anterior
python scripts/importar_inventario/generar_catalogo.py .
```

## Reglas

- `mapeo.py` (revisado a mano) une cada fila con un producto existente para conservar su Ref, su enlace y su foto,
  o la marca como nueva. Los productos NaturPro que aparecen en los dos Excel quedan una sola vez (versión GL/NP, que trae
  el precio mayorista) y los repetidos dentro de El Oasis también.
- Campos: precio de venta → `price`; precio mayorista → `cost_price`; descripción breve, modo de uso (El Oasis) y
  precauciones → `description`; "Uso" (GL/NP) o "¿Para qué sirve?" (El Oasis) → `benefits`; "¿Para qué sirve?" → `advisor_tags`.
- Fotos: los productos que ya existían conservan su foto (900 px). Los nuevos de El Oasis usan la miniatura del Excel
  (75 px, ampliada a 300 px). Las fotos del Excel GL/NP están desplazadas entre productos, así que los 2 productos
  GL nuevos llevan una tarjeta "Foto próximamente" (`has_photo: false`).
- Los productos que no están en los Excel se conservan con `is_active: false`, igual que Vibazina (medicamento) y el
  exhibidor de la tienda (ver `INACTIVE_EO`).
