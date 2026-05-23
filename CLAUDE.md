# CLAUDE.md — Vitrinexo

Este archivo es leído automáticamente por Claude Code al iniciar una sesión en este repositorio. Contiene las convenciones, restricciones y contexto necesarios para trabajar en el proyecto sin ambigüedad.

---

## Contexto del proyecto

Vitrinexo es un directorio B2B hispanohablante construido en WordPress. Tiene dos partes:

- **`vitrinexo-ux/`** (este repo) — maquetas HTML/CSS/JS del frontend. Son la referencia visual y de estructura para el theme de WordPress.
- **El theme y plugin de WordPress** (aún no creados) — se construirán basándose en estas maquetas y en la documentación de `docs/`.

El trabajo actual en este repo es principalmente:
1. Mantener y mejorar las maquetas HTML
2. Desarrollar documentación para el desarrollo WordPress

---

## Estructura del repositorio

```
/                          # Maquetas HTML (una por página)
/src/style.css             # Sistema de diseño completo (tokens + componentes)
/src/components/           # Componentes HTML reutilizables (nav, footer, modales)
/src/components-react/     # Componentes React (MemberCard, MemberProfile, etc.)
/src/data/members.js       # Datos de ejemplo para las maquetas
/src/assets/               # Imágenes, SVGs
/emails/                   # Templates de email (HTML standalone)
/docs/                     # Documentación de arquitectura WordPress
```

---

## Convenciones para maquetas HTML

### CSS
- **Nunca usar `style=""` inline** salvo `display:none` (estructural de JS) y `background:var(--color-ice-500)` en `<body>` (patrón compartido del proyecto)
- Todas las clases CSS viven en `/src/style.css`
- Antes de crear una clase nueva, verificar si ya existe una equivalente en el sistema
- Seguir la nomenclatura existente: `.btn-vx`, `.card-vx`, `.badge-vx`, `.tag-vx`, etc.
- Los tokens de color son `--color-{nombre}-{escala}` (ej: `--color-cyan-600`)

### HTML
- Usar `<include src="src/components/nav-logged.html">` para el nav autenticado
- Usar `<include src="src/components/nav.html">` para el nav público
- Usar `<include src="src/components/footer-logged.html">` para el footer autenticado
- Usar `<include src="src/components/footer.html">` para el footer público
- Usar `<include src="src/components/modal-conectar.html">` para el modal de conexión
- Todas las páginas autenticadas tienen `<main>` envolviendo el contenido principal (para sticky footer)

### Tabs
- Usar `.vx-tab` y `.vx-tab--active` (NO `.auth-tab`) para todos los tabs del sitio

### Cards de miembros
- Las cards en directorio, comunidades y favoritos deben mostrar **ambos labels** ("Ofrece" + "Busca") en una línea y todos los tags mezclados con color coding
- Las cards en secciones de match (seeks/offers separadas) muestran solo el tipo relevante

### Paginación
- Usar la clase `.pagination` de Bootstrap con `.page-link` y `.page-item`
- El CSS de paginación in-brand ya está definido en `style.css`
- Usar íconos `ti ti-chevron-left` / `ti ti-chevron-right` en lugar de `<` / `>`

---

## Convenciones de commits

```
feat:     nueva funcionalidad o página
fix:      corrección de bug o comportamiento incorrecto
refactor: reorganización de código sin cambio de comportamiento
style:    cambios visuales, CSS, clases
docs:     documentación
chore:    tareas de mantenimiento
```

**Nunca hacer force push** a `main` salvo que sea absolutamente necesario y se documente el motivo en el commit.

**Siempre hacer `git pull` antes de cualquier cambio** para evitar conflictos.

---

## Lo que NO hacer

- No crear archivos CSS separados por página — todo va a `/src/style.css`
- No duplicar CSS que ya existe — verificar siempre antes de agregar
- No usar Bootstrap para layout de cards de miembros — usar las clases `.card` del sistema propio
- No modificar `/src/data/members.js` para propósitos de testing sin avisar — es la fuente de verdad de los datos de ejemplo
- No crear páginas nuevas sin actualizar los navs y footers si corresponde
- No hardcodear colores hex en HTML o CSS — siempre usar tokens `var(--color-*)`
- No tocar los emails en `/emails/` con CSS externo — los emails requieren CSS inline por compatibilidad con clientes de correo

---

## Archivos de referencia clave

Antes de trabajar en cualquier área, leer los docs relevantes:

| Área | Documento |
|---|---|
| Arquitectura WordPress completa | `docs/arquitectura-wordpress.md` |
| Flujo de onboarding y verificación | `docs/flujo-onboarding.md` |
| Flujo de conexiones | `docs/flujo-conexiones.md` |
| Especificaciones de módulos PHP | `docs/specs-modulos.md` |
| Esquema de datos | `docs/esquema-datos.md` |
| Casos de prueba | `docs/casos-prueba.md` |
| Convenciones PHP | `docs/convenciones-php.md` |
| Orden de implementación | `docs/orden-implementacion.md` |

---

## Estado actual del proyecto

**Completado:**
- Sistema de diseño completo en `style.css`
- Todas las maquetas HTML del frontend (30+ páginas)
- Templates de email (8 templates)
- Documentación de arquitectura WordPress
- Documentación de flujos de usuario

**Pendiente:**
- Desarrollo del theme WordPress (`vitrinexo-theme/`)
- Desarrollo del plugin WordPress (`vitrinexo-core/`)
