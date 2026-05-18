# Vitrinexo UX — Especificación de Maquetas

## Contexto del proyecto

Vitrinexo es una plataforma B2B hispanohablante que conecta personas a través de sus empresas. El producto es un directorio curado con sistema de matching por keywords y contacto vía email. No hay chat interno ni lógica de tiempo real.

**Stack del repositorio**
- Vite + React (JSX)
- Bootstrap 5
- Tabler Icons (`ti ti-*`)
- Fuente: Switzer (local, `css/switzer.css`)
- Design tokens en `src/style.css`
- Mock data en `src/data/members.js`
- Componentes React en `src/components-react/`
- Maquetas HTML en `src/components/`

**Design tokens clave**
```css
/* Colores */
--color-green-500: #2ead6e      /* primario */
--color-purple-500: #5100ff     /* secundario */
--color-coral-500: #ff734d      /* acento / seeks */
--color-ice-500: #edf5fc        /* background */
--color-surface: #fafcff
--color-border: #d7e4ef
--color-text-primary: #3d444e
--color-text-secondary: #5e6b7a

/* Sombras */
--shadow-sm / --shadow-md / --shadow-lg

/* Radios */
--radius-sm: 8px / --radius-md: 14px / --radius-lg: 24px / --radius-pill: 999px

/* Tipografía */
--font-display: "Switzer"
--font-body: "Switzer"
```

**Clases de componentes ya definidas en style.css**
- Botones: `.btn-vx`, `.btn-primary-vx`, `.btn-soft-primary`, `.btn-ghost-vx`, `.btn-outline-primary`, tamaños `.btn-vx-sm/md/lg`
- Badges: `.badge-vx`, `.badge-founder`, `.badge-neutral`, `.badge-primary`, `.badge-secondary`, `.badge-accent`
- Tags: `.tag-vx`, `.tag-offers` (verde), `.tag-seeks` (coral)
- Cards: `.card-vx`, `.member-card`, `.member-offer`, `.member-need`
- Forms: `.form-control-vx`, `.form-label-vx`, `.input-group-vx`, `.form-error-msg`
- Alertas: `.alert-vx`, `.alert-success`, `.alert-info`, `.alert-warning`, `.alert-neutral`
- Nav: `.navbar-vx`, `.navbar-brand-vx`, `.brand-mark`
- Misc: `.search-bar-vx`, `.toggle-vx`, `.dropdown-vx`, `.modal-vx`, `.stat-card-vx`, `.progress-vx`, `.tooltip-vx`, `.cta-banner-vx`, `.table-vx`, `.avatar-group`

---

## Estructura de datos

### Usuario (`members.js`)
```js
{
  id: "user_001",
  name: string,
  bio: string,
  image: string,               // ruta local o URL
  tags: string[],              // expertise/identidad personal
  isFounder: boolean,          // Socio Fundador de Vitrinexo
  location: string,            // ciudad física de la persona
  country: string,             // país físico de la persona
  isLGBT: boolean,             // autodeclarado
  gender: "man"|"woman"|"other", // autodeclarado
  isSenior: boolean,           // verificado por admin

  offerTags: string[],         // keywords de lo que ofrece
  offerText: string,           // descripción larga de lo que ofrece
  seekTags: string[],          // keywords de lo que busca
  seekText: string,            // descripción larga de lo que busca

  contact: {
    phone: string,
    email: string,
    linkedin: string,
    preferredContact: "email"|"phone"|"linkedin"
  },                           // PRIVADO — visible solo post-match

  favorites: string[],         // array de user IDs guardados

  companies: Company[]         // array — puede tener más de una
}
```

### Empresa (`Company`)
```js
{
  id: "company_001",
  name: string,
  title: string,               // rol de esta persona en esta empresa
  about: string,
  idealClient: string,
  rubroTags: string[],         // para búsqueda y filtros del directorio
  website: string,             // puede ser vacío
  linkedin: string,            // puede ser vacío
  bannerImage: string,         // URL imagen banner
  status: "borrador"|"pendiente"|"verificada"|"rechazada"
}
```

---

## Páginas a desarrollar

---

### 1. `landing.html` — Landing pública

Página de entrada para usuarios no autenticados.

**Componentes:**
- Navbar sin login — logo Vitrinexo + botón "Iniciar sesión" + botón "Registrarse" (primario)
- Hero — título, subtítulo con propuesta de valor, CTA principal "Quiero ser Socio Fundador", CTA secundario "Ver cómo funciona"
- Stats strip — 18+ países, 700+ empresas, 6 meses gratis, 87 cupos restantes con `.stat-card-vx` y `.progress-vx`
- Preview borrosa del directorio — grid de cards con `filter: blur(6px)` y overlay con CTA de registro encima
- CTA banner fundador — `.cta-banner-vx` con beneficios y formulario simple (nombre, email, país, rubro)
- Footer — links, contacto, copyright

**Notas:**
- Sin acceso al directorio real
- El blur sobre las cards comunica que hay contenido pero requiere registro

---

### 2. `login.html` — Login y Registro

Una sola página con toggle entre ambos modos.

**Modo login:**
- Input email corporativo con icono `.input-group-vx`
- Input contraseña
- Toggle "Recordarme"
- Link "¿Olvidaste tu contraseña?"
- Botón "Ingresar" `.btn-primary-vx`
- Link "¿No tienes cuenta? → Registrarse"

**Modo registro:**
- Input nombre + apellido (en fila)
- Input email corporativo
- Select país
- Select rubro
- Botón "Crear cuenta" `.btn-primary-vx`
- Nota de privacidad debajo

**Notas:**
- El toggle entre modos puede ser tabs o un switch de texto
- Usar `.modal-vx` como contenedor centrado en pantalla o página standalone

---

### 3. `verificacion-pendiente.html` — Espera de validación

Pantalla que ve el usuario recién registrado mientras el admin valida su ficha.

**Componentes:**
- Navbar mínimo — solo logo, sin links
- Ilustración o ícono central (reloj, escudo, similar)
- Título: "Tu ficha está en revisión"
- Subtítulo explicando el proceso (24-48 horas hábiles)
- `.alert-vx.alert-info` con información adicional
- Botón secundario "Volver al inicio" o "Cerrar sesión"

**Notas:**
- Sin navegación lateral ni acceso al directorio
- Página de espera limpia, no frustrante

---

### 4. `directorio.html` — Directorio principal ⭐

Página central del producto. Requiere login.

**Componentes:**

**Navbar autenticado:**
- Logo
- Links: Directorio, Mis favoritos, Comunidades
- Avatar del usuario logueado con dropdown — Mi perfil, Editar perfil, Cerrar sesión
- Ícono campana de notificaciones (decorativo en maqueta)

**Banner 4Dinner:**
- Banner compacto entre el buscador y el grid
- Ciudad + fecha del próximo evento + descripción breve
- Botón "Ver más →" que enlaza a `/4dinner`
- Usar `.alert-vx.alert-neutral` o un componente propio con color diferenciado

**Buscador:**
- `.search-bar-vx` con placeholder "Busca por nombre, empresa, rubro, país..."
- Filtros debajo: País, Rubro, Solo Socios Fundadores — usar `.btn-ghost-vx.btn-vx-sm`

**Sección "Ofrecen lo que buscas":**
- Título de sección
- Grid horizontal o row de cards de miembros cuyos `offerTags` coinciden con los `seekTags` del usuario logueado
- Estado vacío si no hay matches

**Sección "Buscan lo que ofreces":**
- Título de sección
- Grid de cards cuyos `seekTags` coinciden con los `offerTags` del usuario logueado
- Estado vacío si no hay matches

**Grid principal "Todos los miembros":**
- `row-cols-1 row-cols-md-2 row-cols-lg-4 row-cols-xl-5 g-2`
- Usar componente `MemberCard` — ver sección de componentes

**Estado vacío búsqueda:**
- Ícono + "No encontramos resultados para tu búsqueda" + sugerencia de ampliar filtros

---

### 5. `perfil.html` — Perfil público

Vista del perfil de otro miembro. Requiere login.

**Componentes:**

**Header del perfil:**
- Banner de la empresa activa (cambia con tabs si hay más de una empresa)
- Foto circular sobre el banner
- Nombre + badge Socio Fundador si aplica
- Nombre empresa activa con link al website + título/cargo
- Ubicación con ícono pin + chip de país (3 letras)
- Botones: corazón (guardar) + "Conectar" `.btn-soft-primary`

**Tags de persona:**
- Row de `.tag-vx` — identidad/expertise, no cambian con tabs

**Tabs de empresa (solo si companies.length > 1):**
- Un tab por empresa con el nombre corto
- Al cambiar tab: cambia banner, nombre empresa, título, about, cliente ideal
- Usar clases `.profile-tab` y `.profile-tab-active`

**Secciones de contenido:**
- "Sobre mí" — `bio` de la persona, siempre fijo
- "Sobre [nombre empresa]" — `about` de la empresa activa
- "Cliente ideal" — `idealClient` de la empresa activa

**Pills offer/seek:**
- Dos columnas `.profile-duo`
- Izquierda `.profile-pill-offer`: título "Qué ofrezco" + `offerText` + tags verdes
- Derecha `.profile-pill-seek`: título "Qué busco" + `seekText` + tags coral
- Siempre fijos — son de la persona

**Notas:**
- Datos de contacto NO visibles — solo aparecen post-match
- Si el perfil es el propio usuario logueado mostrar botón "Editar perfil" en lugar de conectar/guardar

---

### 6. `mis-favoritos.html` — Perfiles guardados

Lista de perfiles guardados con corazón. Requiere login.

**Componentes:**
- Navbar autenticado
- Título de página + contador "X perfiles guardados"
- Grid de `MemberCard` igual que el directorio
- **Estado vacío:** ícono corazón + "Aún no guardaste ningún perfil" + botón "Explorar el directorio"

---

### 7. `onboarding.html` — Wizard primer uso

Flujo guiado para completar la ficha por primera vez. Se muestra tras la verificación.

**Paso 1 — Datos personales:**
- Foto de perfil (upload)
- Bio (textarea)
- Ubicación + país (inputs)
- Tags de persona (input tipo chips con sugerencias)
- Checkbox autodeclarado: ¿Te identificas como parte de la comunidad LGBTQ+?
- Select género: Hombre / Mujer / Otro
- Checkbox: ¿Eres un ejecutivo Senior? (nota: requiere verificación posterior)

**Paso 2 — Qué ofrezco y qué busco:**
- `offerTags` — input chips
- `offerText` — textarea
- `seekTags` — input chips
- `seekText` — textarea

**Paso 3 — Tu empresa:**
- Nombre empresa
- Título/cargo
- About (textarea)
- Cliente ideal (textarea)
- Rubro tags
- Website
- LinkedIn empresa
- Upload banner

**Paso 4 — Confirmación:**
- Preview de la ficha tal como se verá
- Botón "Publicar mi perfil"

**Notas:**
- Barra de progreso en la parte superior con los 4 pasos
- Botones "Anterior" y "Siguiente / Finalizar"
- Cada paso en una pantalla separada o sección visible

---

### 8. `editor-perfil.html` — Editar perfil propio

Formulario completo para editar la ficha. Accesible desde el perfil propio o el dropdown.

**Sección Persona:**
- Foto de perfil + botón cambiar
- Nombre (readonly — cambio requiere admin)
- Bio
- Ubicación + país
- Tags personales
- Offer tags + offer text
- Seek tags + seek text
- Preferencias de contacto
- Configuración comunidades (LGBT, género, Senior)

**Sección Empresas:**
- Lista de empresas asociadas con botón editar cada una
- Botón "Agregar otra empresa"
- Por cada empresa: nombre, título, about, cliente ideal, rubro tags, website, linkedin, banner

**Notas:**
- Botón "Guardar cambios" fijo o al final
- Toast de confirmación al guardar `.alert-success`
- Si hay cambios sin guardar al salir, mostrar confirmación

---

### 9. `comunidad-out2b.html` / `comunidad-woman.html` / `comunidad-senior.html`

Tres páginas con el mismo template, cada una con su filtro aplicado.

**Componentes:**
- Navbar autenticado
- Header de comunidad — nombre, descripción breve, ilustración o color de identidad
- Grid de cards filtrado (isLGBT / gender=woman / isSenior)
- El badge de comunidad es visible solo para miembros de esa comunidad
- Estado vacío si no hay miembros aún

**Notas:**
- Reutilizar el mismo HTML con clases de modificador por comunidad
- La pertenencia a la comunidad es invisible para quienes no pertenecen a ella

---

### 10. `4dinner.html` — Eventos presenciales

Página editorial, sin funcionalidad compleja.

**Componentes:**
- Navbar autenticado
- Header con descripción del formato 4Dinner (4 personas, 1 mesa, miércoles 8pm)
- Sección "Próximos eventos" — cards con ciudad, fecha, descripción + formulario Google embebido o link a Google Form
- Sección "Eventos pasados" — cards con ciudad, fecha, crónica breve y foto si hay
- Footer

---

## Componentes transversales

### MemberCard
Usada en directorio, favoritos y secciones de match.

```
[ imagen persona con blur gradient en parte inferior ]
[ botones flotantes: ver perfil | guardar | conectar ]
[ nombre + badge founder si aplica ]
[ título · empresa ] (una línea por empresa si tiene varias)
[ ciudad (PAÍ) ]
[ "Ofrece" label + "Busca" label ]
[ 2 offer tags aleatorios + 2 seek tags aleatorios ]
```

- Tags offer: `.tag-vx.tag-offers` (fondo verde suave)
- Tags seek: `.tag-vx.tag-seeks` (fondo coral suave)
- Badge founder: `.founder-tag.ti.ti-star` con tooltip "Miembro fundador"

### Modal de contacto / pitch
Se abre al hacer clic en "Conectar".

```
[ título: "Conectar con [nombre]" ]
[ subtítulo: empresa activa del receptor ]
[ textarea: "Cuéntale por qué quieres conectar" ]
[ nota: tu nombre, empresa y email serán visibles para [nombre] ]
[ botón cancelar + botón "Enviar solicitud" ]
```

### Modal de confirmación de envío
Post-envío del pitch.

```
[ ícono check ]
[ "Tu solicitud fue enviada" ]
[ "Le avisamos a [nombre] por email. Si acepta, podrás ver su información de contacto." ]
[ botón "Entendido" ]
```

### Modal de reporte
Accesible desde el perfil de otro miembro.

```
[ título: "Reportar comportamiento" ]
[ textarea: descripción del problema ]
[ botón cancelar + botón "Enviar reporte" ]
```

### Estados vacíos
Cada estado vacío debe tener: ícono, título, subtítulo y CTA cuando aplique.

- Favoritos vacíos: ícono corazón + "Aún no guardaste perfiles" + "Explorar directorio →"
- Directorio sin resultados: ícono búsqueda + "Sin resultados" + "Limpiar filtros"

---

## Lógica de matching (para renderizado en maqueta)

El matching es una comparación de arrays de strings entre usuarios:

- **"Ofrecen lo que buscas"** — miembros cuyo `offerTags` tiene al menos 1 elemento en común con el `seekTags` del usuario logueado
- **"Buscan lo que ofreces"** — miembros cuyo `seekTags` tiene al menos 1 elemento en común con el `offerTags` del usuario logueado

En la maqueta estática simular con un subset de los miembros del array `members`.

---

## Comunidades verticales — campos en usuario

```js
isLGBT: boolean      // autodeclarado — acceso a /out2b
gender: string       // "man"|"woman"|"other" — si "woman", acceso a /woman
isSenior: boolean    // verificado por admin — acceso a /senior
```

Visibilidad de badges de comunidad: solo visible para miembros de esa misma comunidad.

---

## 4Dinner — sin base de datos

- Página editorial estática
- Formulario de interés = Google Form embebido
- Crónicas de eventos pasados = HTML estático o include
- Banner en `/directorio.html` con próximo evento y link "Ver más →"

---

## Archivos existentes en el repo

```
src/style.css                          — design system completo
src/data/members.js                    — mock data con 10 miembros
src/components-react/MemberCard.jsx    — card de miembro
src/components-react/MemberGrid.jsx    — grid de cards
src/components-react/MemberProfile.jsx — perfil completo con tabs
src/components/card-member.html        — versión HTML de la card
src/components/nav.html                — navbar
src/assets/placeholder.webp (x5)      — imágenes de prueba
index.html                             — UI kit de referencia con todos los componentes
css/switzer.css                        — fuente Switzer local
```

Antes de desarrollar cualquier maqueta, revisar `index.html` como referencia visual completa de todos los componentes disponibles.
