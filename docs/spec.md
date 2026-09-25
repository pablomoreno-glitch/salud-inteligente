# Especificación técnica — Salud Inteligente

Catálogo de suplementos naturales con asesor inteligente basado en IA (Claude), desplegado sobre Netlify. Pensado para distribuidoras en Colombia.

---

## 1. Objetivo

Que el cliente de una distribuidora pueda:

1. Ver el catálogo completo de productos (referencia, nombre, precio, imagen).
2. Describir sus síntomas o necesidades en lenguaje natural.
3. Recibir de 3 a 4 recomendaciones del catálogo, cada una con el motivo, sin diagnósticos médicos.

---

## 2. Arquitectura actual

> **Actualización (rama `dev`):** las fases 3, 4 y 5 del roadmap se implementaron como una plataforma de microservicios (React + gateway Laravel + servicios FastAPI + PostgreSQL).
> El catálogo vive ahora en el servicio `catalog` (fuente única de datos) y el asesor en el servicio `advisor`.
> El contrato de la API y el diseño están en `openspec/changes/microservices-platform/design.md`; el resumen, en el `README.md`.
> Lo que sigue describe el sitio estático original, que se conserva para rollback.

```
Navegador                         Netlify                          Anthropic
─────────                         ───────                          ─────────
public/index.html  ──(iframe)──►  public/asesor.html
                                        │
                                        │ POST /api/chat
                                        ▼
                                  netlify.toml
                                  /api/* → /.netlify/functions/:splat
                                        │
                                        ▼
                                  netlify/functions/chat.js  ──►  POST /v1/messages
                                  (catálogo + prompt + key)   ◄──  respuesta del modelo
```

| Componente | Archivo | Responsabilidad |
|---|---|---|
| Catálogo | `public/index.html` | Tienda estática con imágenes embebidas (base64) y botón flotante 🌿 que abre el asesor en un panel lateral. |
| Chat del asesor | `public/asesor.html` | Interfaz de conversación. Envía el historial a `/api/chat` y pinta las recomendaciones. |
| Backend | `netlify/functions/chat.js` | Agrega el catálogo y las reglas del asesor como `system` prompt y llama a la API de Claude. |
| Configuración | `netlify.toml` | `publish = "public"`, `functions = "netlify/functions"` y la redirección `/api/*`. |

### Principio de seguridad

La API key (`ANTHROPIC_API_KEY`) vive **solo** en las variables de entorno de Netlify. El navegador nunca la ve. La versión anterior que llamaba a la API directamente desde el navegador está en `archive/` y no se publica.

---

## 3. Contrato de la API

### `POST /api/chat`

**Request**

```json
{
  "messages": [
    { "role": "user", "content": "Me cuesta dormir y ando muy estresada" }
  ]
}
```

`messages` es el historial de la conversación en el formato de la Messages API de Anthropic (`role`: `user` | `assistant`). Debe ser un arreglo no vacío; el servidor solo envía al modelo los **últimos 20 mensajes** (y descarta los iniciales hasta que el primero sea del usuario).

**Response**: si todo sale bien, `200` con la respuesta de `https://api.anthropic.com/v1/messages` tal cual (el texto está en `content[0].text`). Los errores siempre llegan como `{ "error": "mensaje en español" }`.

**Errores propios**

| Código | Causa |
|---|---|
| `405` | Método distinto de `POST` / `OPTIONS` |
| `400` | Body no es JSON válido, `messages` falta / no es arreglo / está vacío, o algún mensaje no tiene `role` y `content` válidos |
| `500` | `ANTHROPIC_API_KEY` no configurada (mensaje genérico; el detalle solo va al log) |
| `502` | La API de Anthropic respondió con error o no se pudo contactar. Se registra con `console.error` (estado, tipo y mensaje, nunca la key) y el cliente recibe un mensaje genérico |

**CORS**: `Access-Control-Allow-Origin: *`; `OPTIONS` responde `204`.

### Parámetros del modelo

| Parámetro | Valor |
|---|---|
| `model` | `process.env.CLAUDE_MODEL`, por defecto `claude-sonnet-5` |
| `max_tokens` | `1024` |
| Historial máximo | 20 mensajes |
| `anthropic-version` | `2023-06-01` |

### Formato de las recomendaciones

El asesor termina cada respuesta con recomendaciones con un bloque que el front interpreta:

```
RECS:[{"ref":"VW-158","nombre":"Magnesium Complex 8 en 1","razon":"Reduce el estrés y mejora la calidad del sueño"}]
```

Si el cliente solo saluda o no describe síntomas, **no** se incluye el bloque `RECS`.

---

## 4. Reglas del asesor (system prompt)

0. **Aviso de salud (INVIMA):** los productos son suplementos dietarios, no medicamentos; el asesor no diagnostica ni reemplaza la consulta médica. Ante síntomas graves o persistentes, embarazo o lactancia, uso de medicamentos o consultas para niños, debe recomendar consultar a un profesional de la salud. El mismo aviso se muestra en `public/asesor.html` (fijo sobre la caja de texto) y en el encabezado de `public/index.html`.
1. Nunca diagnosticar ni reemplazar al médico; ante condiciones serias, remitir a un profesional.
2. Máximo 3–4 productos, los más relevantes.
3. Tono cálido y cercano, en español colombiano.
4. Explicar brevemente por qué cada producto sirve para lo descrito.
5. No atribuir a un producto beneficios sin respaldo (p. ej. aumento de tamaño corporal o "crecimiento de pestañas" por colágeno).

---

## 5. Catálogo

Hoy el catálogo existe **dos veces**:

- En `public/index.html` (lo que ve el cliente).
- Como texto dentro de `chat.js` (`const CATALOG`), agrupado por necesidad: sueño/estrés, energía, articulaciones, piel/cabello, digestión, peso, inmunidad, concentración, hormonal/mujer, salud masculina, antioxidantes, niños, cardiovascular, hígado, dolor y glucosa.

Cada producto se identifica por su referencia (`VW-158`, `LN-76`, …); el prefijo indica la línea o marca.

> Deuda técnica: cualquier cambio de producto o precio hay que hacerlo en los dos lugares. La Fase 3 lo resuelve con una fuente de datos única.

---

## 6. Variables de entorno

| Variable | Dónde | Descripción |
|---|---|---|
| `ANTHROPIC_API_KEY` | Netlify → Site configuration → Environment variables | Key de la API de Claude (`sk-ant-...`). Para desarrollo local, en `.env` (ignorado por Git). |
| `CLAUDE_MODEL` | Igual que la anterior (opcional) | Modelo de Claude a usar. Si no existe, se usa `claude-sonnet-5`. Permite cambiar de modelo sin tocar código. |

---

## 7. Desarrollo y despliegue

**Local**

```bash
npm install
cp .env.example .env   # poner la key real
npm run dev            # http://localhost:8888
```

**Producción**: Netlify conectado al repo de GitHub; cada push a `main` despliega automáticamente. Directorio de publicación: `public`, sin comando de build. Guía detallada en [DEPLOY_NETLIFY.md](DEPLOY_NETLIFY.md).

---

## 8. Roadmap

### ✅ Fase 1 — Base (completada)
- [x] Catálogo HTML con imágenes de productos
- [x] Asesor IA con la API de Claude
- [x] Backend seguro con Netlify Functions
- [x] Repositorio en GitHub

### 🔧 Fase 2 — Despliegue (siguiente paso)
1. **Conectar GitHub con Netlify**: *Add new site → Import from Git*, repo `salud-inteligente`, variable `ANTHROPIC_API_KEY`, deploy automático en cada push.
2. **Dominio personalizado** *(opcional)*: p. ej. `saludinteligente.co` (Namecheap o Porkbun, ~USD 10/año), conectado en Netlify → Domain management.

### 🧠 Fase 3 — Mejoras del asesor IA
3. **Memoria de conversación**: historial por usuario en base de datos; el asesor recuerda conversaciones anteriores.
4. **Catálogo dinámico**: productos en Supabase o Airtable; se actualizan sin tocar código y el asesor consulta precio y disponibilidad en tiempo real.
5. **Filtros inteligentes**: búsqueda por síntoma, categoría o precio; priorizar los productos que más se venden.

### 🛒 Fase 4 — Funcionalidades de tienda
6. **Carrito de compras**: el cliente agrega productos desde las recomendaciones del asesor y se genera la lista de pedido.
7. **Sistema de pedidos**: formulario integrado, notificación por WhatsApp al distribuidor (Twilio o WhatsApp API) y registro en Google Sheets o Supabase.
8. **WhatsApp Business**: el asesor responde directamente en WhatsApp.

### 📊 Fase 5 — Analítica y escalabilidad
9. **Dashboard de métricas**: productos más consultados, síntomas más frecuentes y conversión de recomendación a pedido.
10. **Multi-distribuidora**: catálogo por distribuidora, panel de administración y roles (admin, asesor, cliente).
11. **PWA**: instalable en el celular y con modo offline.

### 💰 Fase 6 — Monetización
12. **Modelo SaaS**: licenciar la plataforma a otras distribuidoras con planes Básico / Pro / Enterprise y facturación mensual.

---

## 9. Próximos 3 pasos

| # | Tarea | Tiempo estimado |
|---|---|---|
| 1 | Conectar GitHub → Netlify y hacer el deploy | 30 min |
| 2 | Configurar `ANTHROPIC_API_KEY` en Netlify | 10 min |
| 3 | Probar el asesor en la URL pública | 15 min |
