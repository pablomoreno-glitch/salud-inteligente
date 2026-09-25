# Frontend brief: Salud Inteligente storefront and admin

Companion to `design.md` section 6.
This brief fixes the visual and interaction decisions so the implementation does not drift into a generic template.

## Audience and job

Colombian customers and distributor clients, mostly on phones, many arriving from WhatsApp links.
The page's job: help someone find the right supplement for what they feel, trust it (INVIMA registry, clear benefits, no medical claims), and place an order that ends in WhatsApp.
The owner's job in `/admin`: see how the business is doing and run orders, stock and prices.

## Visual direction: "herbario"

Quiet, airy, botanical, like a well-lit apothecary shelf.
The Higgsfield still lifes (single subject on pale sage paper) are the visual signature; the interface stays out of their way.

- Background `paper` #FBFCFA, surfaces `sage` #E6EEE7 (identical to the photo backgrounds so need tiles look like one continuous sheet), text `ink` #18221C, secondary `muted` #5E6F63, borders `line` #DCE5DD, primary `forest` #1F3D2B, accent `leaf` #3F7D58.
- One danger color for errors and "Agotado" only: #B42318. One warm note for "Pocas unidades": #9A6700.
- Typography: Playfair Display (700) only for page titles, product names on the detail page and section headings; DM Sans (400/500/600) everywhere else. Sizes: 14/16 body, 13 meta, headings 24/32/44/56 on a clear scale. Sentence case everywhere. No all-caps eyebrow labels, no letter-spaced tags.
- Radius hierarchy, not one radius for everything: 999px pills for chips and the advisor input, 16px for image tiles, 12px for cards and inputs, 8px for small controls.
- Shadows: almost none. Separation by whitespace and 1px `line` borders. The advisor drawer and dropdowns are the only elevated surfaces.
- Motion: one moment only, the hero advisor input gently focusing on load is NOT allowed (no autofocus on mobile). Use motion just for responses to actions: drawer slide, cart count bump, add-to-cart confirmation. Respect `prefers-reduced-motion`.
- Icons: lucide-react, 1.75 stroke, 18-20px.
- Emojis from the legacy site are dropped from navigation; the need tiles use photos instead.

## Layout and pages

### Header (all public pages)

Slim, sticky, `paper` with a bottom `line` border.
Left: wordmark "Salud Inteligente" (Playfair, forest) with a small leaf mark.
Center (desktop): Catálogo, Necesidades (anchor on home), Nosotros.
Right: search icon (opens a search field that routes to `/catalogo?q=`), "Asesor IA" button (forest pill with sparkles icon, always visible, also on mobile as an icon + short label), cart icon with a count badge.
Mobile: wordmark, Asesor, cart, menu button opening a sheet with the links.

### Home `/`

1. Hero: two columns on desktop, stacked on mobile.
   Left: headline "Suplementos naturales, elegidos para lo que sientes" (Playfair 44-56), one line of support copy mentioning INVIMA registry and the advisor, then the signature element: a large pill input "Cuéntale al asesor qué necesitas..." with a send button. Submitting opens the advisor drawer and sends the text as the first message. Under it, 3 suggestion chips ("Me cuesta dormir", "Quiero más energía", "Dolor en las articulaciones") that do the same.
   Right: `hero.webp` as a large rounded image.
2. "¿Qué necesitas hoy?": grid of need tiles (3 columns desktop, 2 mobile), each the need photo with the need name and product count below; links to `/catalogo?necesidad=<slug>`.
3. "Lo más pedido": horizontal scroll-snap row of viral products (product cards).
4. "Explora por categoría": simple list of the 10 categories as text rows with count and tagline, two columns on desktop, each a link.
5. Advisor band: `nosotros.webp` + short copy on how the advisor works and its limits (no diagnoses) + button.
6. Services strip from `/api/v1/business/services`.

### Catalog `/catalogo`

Left filter column on desktop (sticky): categories list, needs list, "Solo virales", "Tendencia"; on mobile a "Filtrar" button opening a bottom sheet.
Top: search input, result count, active filter chips with remove buttons.
Grid of product cards: 4 columns at 1280px, 3 at 1024px, 2 on mobile.
"Cargar más" button (pagination with offset), never infinite scroll.
State lives in the query string so links are shareable.
Empty state: short message and a button "Pregúntale al asesor" that opens the drawer.

### Product card (everywhere)

White image area (the product photos have white backgrounds) with 16px radius, product name (DM Sans 600, 2 lines max), format in `muted`, price formatted `$ 45.000` or "Precio por confirmar" in `muted`.
The whole card is one link to `/producto/:slug`.
A small circular "+" button (aria-label "Agregar al carrito") adds 1 unit without navigating and shows a brief confirmation.

### Product detail `/producto/:slug`

Breadcrumb: Catálogo / Category / Name.
Two columns desktop: large image on white left; right: need chip, name (Playfair 32-44), ref and format in `muted`, price, availability pill (Disponible / Pocas unidades / Agotado from `/api/v1/inventory/availability`), quantity stepper + "Agregar al carrito" (disabled when Agotado), secondary button "Preguntar al asesor sobre este producto" (opens the drawer with a prefilled question).
Below: description paragraph, "Beneficios" list with leaf bullets, a details table (Presentación, Registro INVIMA, Categoría, Referencia), the INVIMA disclaimer box, then "También te puede servir" with related products.
Set `document.title` to the product name and a meta description from the description.

### Cart `/carrito`

Lines with image, name (link), unit price, stepper, remove; subtotal; notice when `has_unpriced` ("Algunos productos tienen precio por confirmar; te lo confirmamos por WhatsApp").
Checkout form in the same page: nombre, celular, ciudad, notas (optional); inline validation; submit "Confirmar pedido".
409 stock errors show which products are out.
Empty cart: message + link to the catalog + advisor button.

### Order confirmation `/pedido/:code`

Order code large, summary of lines and total, big WhatsApp button "Enviar pedido por WhatsApp" when `whatsapp_url` exists (keep the checkout response in sessionStorage to render this page; if missing, show the code and a generic message).
If there is no WhatsApp configured, show "Te contactaremos al número que dejaste".

### Business `/nosotros`

Profile text, services grid, gallery from media, contact channels that are not null (hide missing ones, never show placeholders), contact form posting to `/api/v1/business/contact-messages` with success and error states.

### Developer page `/api`

Titled "API de Salud Inteligente".
Intro: base URL `/api`, architecture in one sentence (gateway + microservices), JSON, rate limits.
Endpoints grouped by service (Negocio, Catálogo, Inventario, Carrito y pedidos, Asesor IA, Salud), each row: method badge (GET green, POST forest, PUT/PATCH amber, DELETE red), path in a monospace font, description, collapsible example response.
Public GET endpoints have "Probar" which runs the request live and shows status, latency and pretty JSON in a dark code panel.
Admin endpoints are listed in a separate collapsed group marked "Requiere token de administrador", without "Probar".
Content comes from a typed endpoint list in the code (single source), not scraped.

### Advisor drawer (global)

Right-side drawer on desktop (440px), full-screen sheet on mobile, opened from the header, hero, product page and empty states.
Header: title "Asesor IA", subtitle "Recomendaciones del catálogo, sin diagnósticos", close button.
Messages: user bubbles in forest, assistant in white with `line` border; assistant text supports simple markdown (bold, lists, line breaks) rendered safely (no raw HTML injection).
Recommendations render as compact product cards (image, name, reason, price, "Ver producto" link, "Agregar" button that adds with `source=advisor`).
Typing indicator while waiting; errors shown inline with a retry.
Fixed disclaimer above the input: "Son suplementos dietarios, no medicamentos. El asesor no diagnostica ni reemplaza la consulta médica."
Conversation persists in sessionStorage.
It must never be covered by the Netlify badge (fixed bottom-right, about 190x52px, z-index 2147483645): give the drawer `z-index: 2147483647` when open and keep any floating buttons above 72px from the bottom.

### Footer

Wordmark, links, contact channels (non-null only), and the full INVIMA disclaimer from `docs/spec.md` section 4 rule 0.

## Admin `/admin`

Separate layout: left sidebar on desktop (Resumen, Pedidos, Inventario, Productos, Mensajes, Ver tienda, Cerrar sesión), top bar with a menu on mobile.
Token stored in localStorage, sent as `Authorization: Bearer`; any 401 clears it and returns to `/admin/login`.

- Login: centered card, email + password, Spanish errors.
- Resumen: range selector 7/30/90 days. KPI tiles (Pedidos, Ingresos, Ticket promedio, Unidades vendidas, Tasa de cancelación, Pedidos con asesor IA, Pendientes). Chart of daily orders (bars) and revenue (line) built with Recharts, readable in light theme, with axis labels in Spanish and pesos formatting. Top products table, most recommended by the advisor table, stock alerts (low/out/untracked counts, link to Inventario), catalog health (unpriced products, link to Productos), new messages. Any null section from the dashboard shows "No disponible" instead of breaking.
- Pedidos: status filter tabs with counts, search, table (code, date, customer, city, items, total, status pill); row opens a detail panel with lines, customer data, history, and status action buttons that only offer valid transitions; confirm dialog for cancel.
- Inventario: searchable table joining products (name, ref, image) with stock (quantity input, threshold input, status pill, "Sin control" when untracked, button to start/stop tracking); save per row with optimistic feedback.
- Productos: searchable table with name, ref, category, price input (pesos), active toggle, and an edit panel for description.
- Mensajes: list with status filter; mark read/archived.

## Quality floor

- Responsive from 360px to 1440px with no horizontal scroll; 16px side gutters on mobile.
- Visible keyboard focus (leaf ring), labels on every input, aria-labels on icon buttons, alt text on images (product name).
- Lazy-loaded images with explicit width/height to avoid layout shift.
- Prices formatted with `Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP', maximumFractionDigits: 0})`.
- All UI copy in neutral Colombian Spanish, sentence case, active voice. No em dash characters.
