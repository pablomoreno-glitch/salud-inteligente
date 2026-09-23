# salud-inteligente

API escalable para catálogo de suplementos naturales con asesor inteligente basado en IA. Construida con Netlify Functions y tienda HTML dinámica. Diseñada para distribuidoras en Colombia.

## Estructura

```
salud-inteligente/
├── public/                     ← sitio estático que publica Netlify
│   ├── index.html              ← catálogo completo (productos e imágenes)
│   ├── catalogo.css            ← diseño mobile-first del catálogo y del panel del asesor
│   ├── catalogo.js             ← subsecciones por necesidad, navegación y buscador
│   ├── asesor-panel.js         ← abrir/cerrar el asesor (✕, fuera, Escape, botón atrás)
│   └── asesor.html             ← chat del asesor (llama a /api/chat)
├── netlify/
│   └── functions/
│       └── chat.js             ← backend: catálogo + prompt + llamada a la API de Claude
├── docs/
│   ├── DEPLOY_NETLIFY.md       ← guía paso a paso de publicación
│   └── catalogo_pedido.pdf     ← PDF del pedido
├── archive/                    ← versiones anteriores (referencia, no se publican)
├── netlify.toml                ← config: publish=public, /api/* → functions
├── .env.example                ← variables de entorno necesarias
└── package.json
```

## Cómo funciona

1. El cliente abre el catálogo (`public/index.html`).
2. Al pulsar el botón 🌿 se abre `asesor.html` dentro de un panel.
3. El chat envía los mensajes a `/api/chat`, que Netlify redirige a `netlify/functions/chat.js`.
4. La función agrega el catálogo y las reglas del asesor, y llama a la API de Claude con la key guardada en el servidor (`ANTHROPIC_API_KEY`). La key nunca llega al navegador.

## Desarrollo local

```bash
npm install
cp .env.example .env   # y pon tu API key real
npm run dev            # abre http://localhost:8888
```

## Despliegue

Ver [docs/DEPLOY_NETLIFY.md](docs/DEPLOY_NETLIFY.md). Resumen: conectar el repo en Netlify, publish directory `public`, y crear la variable `ANTHROPIC_API_KEY`.

## Próximos pasos

- [ ] Sacar el catálogo de productos a un archivo de datos (JSON) compartido por el catálogo y el asesor
- [ ] Separar CSS/JS e imágenes del `index.html` (hoy trae las imágenes embebidas en base64, ~4.5 MB)
- [ ] Flujo de pedido por WhatsApp
