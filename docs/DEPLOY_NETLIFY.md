# Asesor de Suplementos IA — Guía de Publicación en Netlify

## Estructura del proyecto
```
asesor-netlify/
├── netlify.toml                  ← configuración de Netlify
├── netlify/
│   └── functions/
│       └── chat.js               ← backend seguro (aquí va la API key)
└── public/
    └── index.html                ← el chat que ven tus clientes
```

---

## PASO 1 — Obtener tu API key de Anthropic

1. Ve a https://console.anthropic.com
2. Regístrate o inicia sesión
3. Haz clic en **"API Keys"** en el menú izquierdo
4. Haz clic en **"Create Key"**
5. Ponle un nombre (ej: "asesor-suplementos")
6. Copia la key — empieza con `sk-ant-...`
   ⚠️ Guárdala bien, solo se muestra una vez

> El plan gratuito de Anthropic incluye créditos para empezar.
> Cada conversación del asesor cuesta aprox. $0.003 USD.

---

## PASO 2 — Subir el proyecto a GitHub

1. Ve a https://github.com y crea una cuenta si no tienes
2. Haz clic en **"New repository"** (botón verde)
3. Nombre: `asesor-suplementos`
4. Marca **"Private"** (privado, por seguridad)
5. Haz clic en **"Create repository"**
6. En la página del repo, haz clic en **"uploading an existing file"**
7. Arrastra TODA la carpeta `asesor-netlify` o sube los archivos uno por uno:
   - `netlify.toml`
   - `netlify/functions/chat.js`
   - `public/index.html`
8. Haz clic en **"Commit changes"**

---

## PASO 3 — Publicar en Netlify

1. Ve a https://netlify.com y crea una cuenta gratis
2. Haz clic en **"Add new site"** → **"Import an existing project"**
3. Elige **"GitHub"** y autoriza el acceso
4. Selecciona el repo `asesor-suplementos`
5. En la configuración:
   - **Branch:** main
   - **Build command:** (dejar vacío)
   - **Publish directory:** `public`
6. Haz clic en **"Deploy site"**
7. Netlify te dará una URL como: `https://nombre-aleatorio.netlify.app`

---

## PASO 4 — Configurar la API key de forma segura

1. En tu sitio de Netlify, ve a:
   **Site configuration → Environment variables**
2. Haz clic en **"Add a variable"**
3. Key: `ANTHROPIC_API_KEY`
4. Value: pega tu API key (`sk-ant-...`)
5. Haz clic en **"Save"**
6. Ve a **Deploys** → **"Trigger deploy"** → **"Deploy site"**

¡Listo! Tu asesor ya funciona en la URL de Netlify.

---

## PASO 5 (Opcional) — Usar tu propio dominio

Si tienes un dominio propio (ej: `mitienda.com`):

1. En Netlify: **Domain management → Add domain**
2. Escribe tu dominio y sigue las instrucciones
3. Netlify instala el certificado SSL gratis automáticamente

---

## Compartir el asesor con tus clientes

Una vez publicado, comparte la URL de Netlify:
- Por WhatsApp
- En tu Instagram/bio
- Como botón en tu catálogo

---

## Personalización

Para cambiar los chips de temas rápidos, edita en `public/index.html`:
```html
<span class="chip" onclick="chip(this)">Me cuesta dormir</span>
```

Para agregar productos nuevos al catálogo del asesor, edita en
`netlify/functions/chat.js` la sección `const CATALOG = ...`

---

## Costos aproximados

| Servicio | Costo |
|----------|-------|
| Netlify  | Gratis (hasta 125k peticiones/mes) |
| Anthropic API | ~$0.003 USD por conversación |
| Dominio propio | Opcional, ~$10-15 USD/año |
