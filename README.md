# salud-inteligente

Plataforma API-first para una tienda de suplementos naturales con asesor inteligente basado en IA (Claude).
Diseñada para distribuidoras y clientes en Colombia.

La arquitectura sigue la de laVillaSB: un gateway en Laravel delante de microservicios FastAPI, con una tienda en React.

## Arquitectura

```
Navegador ──> React (Vite + Tailwind)  ──/api──>  Gateway Laravel 12  ──>  business   (9201)
              Netlify en producción                (8110, único punto      catalog    (9202)
              nginx en local (3200)                 público de la API)     inventory  (9203)
                                                                           orders     (9204)
                                                                           advisor    (9205) ──> Claude
                                                          PostgreSQL 16 (una base de datos por servicio)
```

| Componente | Carpeta | Responsabilidad |
| --- | --- | --- |
| Tienda y panel | `app/frontend` | Catálogo, página de cada producto, carrito, pedidos, asesor IA, página de la API (`/api`) y panel `/admin` |
| Gateway | `app/backend/gateway` | Rutas permitidas, autenticación de administrador (Sanctum), límites de uso, métricas del panel |
| Negocio | `app/microservices/business` | Perfil, canales de contacto, servicios, imágenes y mensajes de contacto |
| Catálogo | `app/microservices/catalog` | Categorías, necesidades y productos (fuente única de datos) |
| Inventario | `app/microservices/inventory` | Existencias, disponibilidad y reservas |
| Pedidos | `app/microservices/orders` | Carritos, pedidos, estados y métricas de ventas |
| Asesor | `app/microservices/advisor` | Asesor IA sobre el catálogo en vivo, sin diagnósticos |

La especificación completa (propuesta, diseño con el contrato de la API, especificaciones y tareas) está en `openspec/changes/microservices-platform/`.

## Desarrollo local

Requisitos: Docker con Compose v2.

```bash
# En .env (ignorado por Git): ANTHROPIC_API_KEY y las variables de deploy/env.example que necesites
docker compose up -d --build
```

| URL | Qué es |
| --- | --- |
| http://localhost:3200 | Tienda |
| http://localhost:3200/admin | Panel de administración (`admin@saludinteligente.lat` / `SaludAdmin2026!` en local) |
| http://localhost:3200/api | Documentación interactiva de la API |
| http://localhost:8110/api/v1/health | Estado del gateway y de cada servicio |
| http://localhost:9202/docs | OpenAPI de un servicio (9201 a 9205) |

## Pruebas

| Capa | Comando |
| --- | --- |
| Cada microservicio | `cd app/microservices/<servicio> && pip install -r requirements-dev.txt && python -m pytest -q` |
| Gateway | `cd app/backend/gateway && composer install && php artisan test` |
| Frontend | `cd app/frontend && npm ci && npm run lint && npm run test && npm run build` |

## Despliegue

La tienda se publica en Netlify (`netlify.toml`) y la API en un VPS con Docker y Caddy en `api.saludinteligente.lat`.
Guía paso a paso: [deploy/README.md](deploy/README.md).

## Sitio anterior

El sitio estático original (`public/` y `netlify/functions/chat.js`) se conserva para poder volver a él; ver "Rollback" en la guía de despliegue.
