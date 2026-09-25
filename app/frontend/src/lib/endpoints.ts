export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiEndpoint {
  method: HttpMethod;
  path: string;
  description: string;
  example: string;
  group: string;
  admin?: boolean;
  tryable?: boolean;
}

// Single source of truth for the /api developer page. Mirrors design.md section 5.
export const endpoints: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/v1/health",
    description: "Estado agregado de todos los servicios.",
    example: `{
  "status": "ok",
  "services": {
    "catalog": { "status": "ok", "latency_ms": 12 }
  }
}`,
    group: "Salud",
    tryable: true,
  },
  {
    method: "GET",
    path: "/v1/business",
    description: "Perfil del negocio, contactos, servicios y medios.",
    example: `{
  "profile": { "name": "Salud Inteligente", "tagline": "...", "description": "..." },
  "contacts": { "whatsapp": "573001112233" },
  "services": [],
  "media": []
}`,
    group: "Negocio",
    tryable: true,
  },
  {
    method: "GET",
    path: "/v1/business/contacts",
    description: "Canales de contacto disponibles (los no configurados son null).",
    example: `{
  "whatsapp": "573001112233",
  "phone": null,
  "email": "hola@saludinteligente.lat",
  "address": null,
  "city": "Bogotá",
  "hours": "Lun a sáb, 8am a 6pm",
  "instagram": "@saludinteligente",
  "facebook": null
}`,
    group: "Negocio",
    tryable: true,
  },
  {
    method: "GET",
    path: "/v1/business/services",
    description: "Servicios ofrecidos por el negocio.",
    example: `[{ "id": 1, "title": "Asesoría personalizada", "description": "...", "icon": "sparkles" }]`,
    group: "Negocio",
    tryable: true,
  },
  {
    method: "GET",
    path: "/v1/business/media",
    description: "Imágenes del negocio (hero, necesidades, galería).",
    example: `[{ "id": 1, "kind": "gallery", "title": "Tienda", "url": "/media/site/nosotros.webp", "alt": "..." }]`,
    group: "Negocio",
    tryable: true,
  },
  {
    method: "POST",
    path: "/v1/business/contact-messages",
    description: "Envía un mensaje de contacto (nombre, teléfono o correo, mensaje).",
    example: `{ "id": 10, "status": "new" }`,
    group: "Negocio",
  },
  {
    method: "GET",
    path: "/v1/catalog/categories",
    description: "Categorías del catálogo en orden.",
    example: `[{ "slug": "virales", "name": "Productos Virales", "tagline": "Más vendidos", "product_count": 42 }]`,
    group: "Catálogo",
    tryable: true,
  },
  {
    method: "GET",
    path: "/v1/catalog/needs",
    description: "Necesidades del catálogo con imagen y conteo.",
    example: `[{ "slug": "sueno", "name": "Sueño, estrés y ansiedad", "image_url": "/media/site/need-sueno.webp", "product_count": 18 }]`,
    group: "Catálogo",
    tryable: true,
  },
  {
    method: "GET",
    path: "/v1/catalog/products",
    description:
      "Lista de productos. Filtros: category, need, q, viral, trending, limit, offset.",
    example: `{
  "items": [{ "ref": "VW-158", "slug": "magnesium-complex-8-en-1-vw-158", "name": "Magnesium Complex 8 en 1" }],
  "total": 209,
  "limit": 24,
  "offset": 0
}`,
    group: "Catálogo",
    tryable: true,
  },
  {
    method: "GET",
    path: "/v1/catalog/products/{slug}",
    description: "Detalle de un producto por slug.",
    example: `{ "ref": "VW-158", "slug": "magnesium-complex-8-en-1-vw-158", "name": "Magnesium Complex 8 en 1", "price": null }`,
    group: "Catálogo",
  },
  {
    method: "GET",
    path: "/v1/catalog/products/{slug}/related",
    description: "Hasta 4 productos relacionados por necesidad y luego categoría.",
    example: `[{ "ref": "VW-259", "slug": "toplux-magnesium-complex-8-en-1-vw-259", "name": "Toplux" }]`,
    group: "Catálogo",
  },
  {
    method: "GET",
    path: "/v1/inventory/availability",
    description: "Disponibilidad por referencia. refs=A,B",
    example: `[{ "ref": "VW-158", "status": "available" }]`,
    group: "Inventario",
    tryable: true,
  },
  {
    method: "POST",
    path: "/v1/cart",
    description: "Crea un carrito vacío.",
    example: `{ "token": "uuid", "items": [], "item_count": 0, "subtotal": 0, "has_unpriced": false }`,
    group: "Carrito y pedidos",
  },
  {
    method: "GET",
    path: "/v1/cart/{token}",
    description: "Consulta un carrito por token.",
    example: `{ "token": "uuid", "items": [], "item_count": 0, "subtotal": 0, "has_unpriced": false }`,
    group: "Carrito y pedidos",
  },
  {
    method: "PUT",
    path: "/v1/cart/{token}/items/{ref}",
    description: "Fija la cantidad de una línea (0 elimina).",
    example: `{ "token": "uuid", "items": [], "item_count": 1, "subtotal": 45000, "has_unpriced": false }`,
    group: "Carrito y pedidos",
  },
  {
    method: "DELETE",
    path: "/v1/cart/{token}/items/{ref}",
    description: "Elimina una línea del carrito.",
    example: `{ "token": "uuid", "items": [], "item_count": 0, "subtotal": 0, "has_unpriced": false }`,
    group: "Carrito y pedidos",
  },
  {
    method: "DELETE",
    path: "/v1/cart/{token}/items",
    description: "Vacía el carrito.",
    example: `{ "token": "uuid", "items": [], "item_count": 0, "subtotal": 0, "has_unpriced": false }`,
    group: "Carrito y pedidos",
  },
  {
    method: "POST",
    path: "/v1/orders",
    description: "Crea un pedido a partir de un carrito.",
    example: `{ "order": { "code": "SI-000123", "status": "pending" }, "whatsapp_url": "https://wa.me/..." }`,
    group: "Carrito y pedidos",
  },
  {
    method: "GET",
    path: "/v1/orders/track/{code}",
    description: "Consulta un pedido por código, validando el celular. phone=",
    example: `{ "code": "SI-000123", "status": "pending" }`,
    group: "Carrito y pedidos",
  },
  {
    method: "POST",
    path: "/v1/advisor/chat",
    description: "Conversa con el asesor de IA y recibe recomendaciones del catálogo.",
    example: `{
  "reply": "Para dormir mejor te recomiendo...",
  "recommendations": [{ "ref": "VW-158", "slug": "magnesium-complex-8-en-1-vw-158", "name": "Magnesium Complex 8 en 1", "reason": "...", "price": null }],
  "model": "claude-sonnet-5"
}`,
    group: "Asesor IA",
  },
  {
    method: "POST",
    path: "/admin/login",
    description: "Autenticación del panel de administración.",
    example: `{ "token": "...", "user": { "id": 1, "name": "Admin", "email": "admin@saludinteligente.lat" } }`,
    group: "Administración",
    admin: true,
  },
  {
    method: "GET",
    path: "/admin/dashboard",
    description: "KPIs agregados del negocio para el panel.",
    example: `{ "orders": null, "inventory": null, "advisor": null, "catalog": null, "messages": null, "errors": {} }`,
    group: "Administración",
    admin: true,
  },
  {
    method: "GET",
    path: "/admin/orders",
    description: "Lista de pedidos con filtros de estado y búsqueda.",
    example: `{ "items": [], "total": 0 }`,
    group: "Administración",
    admin: true,
  },
  {
    method: "PATCH",
    path: "/admin/orders/{id}/status",
    description: "Cambia el estado de un pedido siguiendo transiciones válidas.",
    example: `{ "id": 1, "status": "confirmed" }`,
    group: "Administración",
    admin: true,
  },
  {
    method: "GET",
    path: "/admin/inventory",
    description: "Inventario con estado por referencia.",
    example: `{ "items": [], "total": 0 }`,
    group: "Administración",
    admin: true,
  },
  {
    method: "PATCH",
    path: "/admin/inventory/{ref}",
    description: "Actualiza cantidad y umbral de una referencia.",
    example: `{ "ref": "VW-158", "quantity": 20 }`,
    group: "Administración",
    admin: true,
  },
  {
    method: "GET",
    path: "/admin/products",
    description: "Lista de productos incluyendo inactivos.",
    example: `{ "items": [], "total": 0 }`,
    group: "Administración",
    admin: true,
  },
  {
    method: "PATCH",
    path: "/admin/products/{ref}",
    description: "Actualiza precio, descripción o estado activo de un producto.",
    example: `{ "ref": "VW-158", "price": 45000 }`,
    group: "Administración",
    admin: true,
  },
  {
    method: "GET",
    path: "/admin/messages",
    description: "Mensajes de contacto recibidos.",
    example: `{ "items": [], "total": 0 }`,
    group: "Administración",
    admin: true,
  },
  {
    method: "PATCH",
    path: "/admin/messages/{id}",
    description: "Marca un mensaje como leído o archivado.",
    example: `{ "id": 1, "status": "read" }`,
    group: "Administración",
    admin: true,
  },
  {
    method: "PUT",
    path: "/admin/password",
    description: "Cambia la contraseña del administrador (pide la actual y cierra las otras sesiones).",
    example: `{ "message": "Contraseña actualizada." }`,
    group: "Administración",
    admin: true,
  },
  {
    method: "GET",
    path: "/admin/notifications",
    description: "SMS enviados al negocio por cada pedido nuevo (Twilio).",
    example: `{ "items": [{ "order_code": "SI-000001", "status": "sent" }], "total": 1 }`,
    group: "Administración",
    admin: true,
  },
  {
    method: "GET",
    path: "/admin/notifications/status",
    description: "Indica si Twilio está configurado y a qué número llegan los SMS.",
    example: `{ "sms_configured": true, "order_sms_to": "+573018000324" }`,
    group: "Administración",
    admin: true,
  },
];

export function groupedEndpoints(): Record<string, ApiEndpoint[]> {
  return endpoints.reduce<Record<string, ApiEndpoint[]>>((acc, endpoint) => {
    acc[endpoint.group] = acc[endpoint.group] || [];
    acc[endpoint.group].push(endpoint);
    return acc;
  }, {});
}
