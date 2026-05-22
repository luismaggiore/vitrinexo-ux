# Arquitectura WordPress — Vitrinexo
**Documento de referencia para el desarrollo del theme y plugin**

---

## Índice

1. [Principios de diseño](#1-principios-de-diseño)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Estructura de archivos](#3-estructura-de-archivos)
4. [Custom Post Types](#4-custom-post-types)
5. [User Meta](#5-user-meta)
6. [Sistema de roles y acceso](#6-sistema-de-roles-y-acceso)
7. [Módulos del plugin vitrinexo-core](#7-módulos-del-plugin-vitrinexo-core)
8. [Shortcodes](#8-shortcodes)
9. [Page mapping y URLs](#9-page-mapping-y-urls)
10. [REST API](#10-rest-api)
11. [Sistema de email](#11-sistema-de-email)
12. [Flujos completos](#12-flujos-completos)
13. [Relaciones entre módulos](#13-relaciones-entre-módulos)

---

## 1. Principios de diseño

### Separación estricta de responsabilidades
El **theme** solo se ocupa de presentación. El **plugin** contiene toda la lógica de negocio. Si se cambia el theme, ningún dato ni lógica se pierde. Si se actualiza WordPress, el plugin funciona independientemente del theme.

### Mínima dependencia de plugins externos
Solo se usan plugins externos para lo que no tiene sentido desarrollar a mano: email transaccional (FluentSMTP) y seguridad/caché. Todo lo demás es código propio.

### WordPress puro (no headless)
Las páginas se renderizan en servidor via PHP. Las interacciones dinámicas (filtros, formularios, guardar datos) usan la REST API nativa de WordPress. Esta decisión balancea simplicidad operacional con experiencia de usuario fluida.

### Preparado para pagos desde el día uno
La arquitectura de membresía está diseñada para soportar planes pagados desde el inicio, aunque en la fase de Socios Fundadores el acceso sea gratuito. El gateway de pago se conecta via hooks sin modificar la lógica central.

### Modularización por dominio
Cada dominio del negocio (usuarios, conexiones, 4Dinner, etc.) es un módulo independiente con sus propias clases. Facilita el troubleshooting, testing y modificación sin efectos secundarios en otros módulos.

---

## 2. Stack tecnológico

| Capa | Tecnología | Razón |
|---|---|---|
| CMS | WordPress 6.x | Ecosistema maduro, familiaridad del equipo |
| Theme | PHP custom (blank theme) | Control total, sin overhead de theme base |
| Lógica de negocio | Plugin PHP propio `vitrinexo-core` | Separación de theme, sobrevive actualizaciones |
| Frontend dinámico | REST API + fetch nativo | No requiere jQuery ni librería adicional |
| Email transaccional | FluentSMTP + Postmark | Mejor deliverability, gratis en volumen bajo |
| Campos custom | PHP a mano en `functions.php` / plugin | Sin dependencia de ACF u otros plugins de campos |
| Imágenes | WordPress Media Library nativa | Sin plugin adicional |
| Seguridad | Wordfence o similar | Un solo plugin de seguridad |
| Caché | WP Rocket o W3 Total Cache | Un solo plugin de caché |

---

## 3. Estructura de archivos

### Theme: `vitrinexo-theme/`

```
vitrinexo-theme/
├── style.css                        # Metadata del theme (no CSS real)
├── functions.php                    # Enqueue assets, registrar nav menus, nada más
├── index.php                        # Fallback requerido por WordPress
│
├── templates/                       # Un template PHP por página
│   ├── front-page.php               # / → landing pública
│   ├── page-login.php               # /login
│   ├── page-recuperar-contrasena.php
│   ├── page-nueva-contrasena.php
│   ├── page-confirmar-correo.php
│   ├── page-verificacion-pendiente.php
│   ├── page-onboarding.php
│   ├── page-dashboard.php
│   ├── page-directorio.php
│   ├── page-search-results.php
│   ├── page-matches.php
│   ├── page-match-seeks.php
│   ├── page-match-offers.php
│   ├── page-perfil.php              # /perfil/{slug} — propio y ajeno
│   ├── page-editor-perfil.php
│   ├── page-favoritos.php
│   ├── page-conexiones.php
│   ├── page-conexion-aceptada.php
│   ├── page-conexion-rechazada.php
│   ├── page-notificaciones.php
│   ├── page-configuracion.php
│   ├── page-comunidad.php           # Template genérico para Out2B, Woman, Senior
│   ├── page-4dinner-landing.php     # /4dinner → landing pública
│   ├── page-4dinner.php             # /events/4dinner → vista autenticada
│   ├── page-blog.php
│   ├── single-blog.php              # Template de post individual de blog
│   └── page-404.php
│
├── partials/                        # Fragmentos reutilizables entre templates
│   ├── nav.php                      # Navegación pública
│   ├── nav-logged.php               # Navegación autenticada
│   ├── footer.php                   # Footer público
│   ├── footer-logged.php            # Footer autenticado
│   ├── card-member.php              # Tarjeta de miembro del directorio
│   ├── modal-conectar.php           # Modal de conexión
│   └── empty-state.php             # Estado vacío reutilizable
│
└── assets/
    ├── css/
    │   └── style.css                # CSS completo del sistema de diseño
    ├── js/
    │   ├── main.js                  # JS global (nav mobile, modales)
    │   ├── directorio.js            # Filtros y búsqueda del directorio
    │   ├── onboarding.js            # Wizard de pasos
    │   ├── editor-perfil.js         # Preview de logo, foto, etc.
    │   └── conexiones.js            # Tabs y acciones de conexiones
    └── img/
        └── vitrinexo.svg
```

### Plugin: `vitrinexo-core/`

```
vitrinexo-core/
├── vitrinexo-core.php               # Bootstrap: carga módulos, define constantes
│
├── modules/
│   ├── users/
│   │   ├── class-vx-user.php
│   │   ├── class-vx-user-meta.php
│   │   ├── class-vx-auth.php
│   │   └── class-vx-verification.php
│   │
│   ├── membership/
│   │   ├── class-vx-membership.php
│   │   ├── class-vx-membership-meta.php
│   │   ├── class-vx-plans.php
│   │   └── class-vx-membership-hooks.php
│   │
│   ├── onboarding/
│   │   ├── class-vx-onboarding.php
│   │   └── class-vx-onboarding-rest.php
│   │
│   ├── directory/
│   │   ├── class-vx-directory.php
│   │   ├── class-vx-search.php
│   │   └── class-vx-matches.php
│   │
│   ├── connections/
│   │   ├── class-vx-connection.php
│   │   ├── class-vx-connection-meta.php
│   │   ├── class-vx-connection-flow.php
│   │   └── class-vx-connection-rest.php
│   │
│   ├── communities/
│   │   ├── class-vx-community.php
│   │   └── class-vx-senior-verification.php
│   │
│   ├── dinner/
│   │   ├── class-vx-dinner.php
│   │   ├── class-vx-dinner-meta.php
│   │   └── class-vx-dinner-assignment.php
│   │
│   ├── notifications/
│   │   ├── class-vx-notification.php
│   │   └── class-vx-notification-triggers.php
│   │
│   ├── email/
│   │   ├── class-vx-mailer.php
│   │   ├── class-vx-email-templates.php
│   │   └── class-vx-cron.php
│   │
│   └── admin/
│       ├── class-vx-admin-users.php
│       ├── class-vx-admin-connections.php
│       ├── class-vx-admin-dinner.php
│       └── class-vx-admin-membership.php
│
├── cpts/
│   ├── cpt-empresa.php
│   ├── cpt-conexion.php
│   ├── cpt-dinner.php
│   └── cpt-notification.php
│
├── rest/
│   ├── rest-auth.php
│   ├── rest-onboarding.php
│   ├── rest-directory.php
│   ├── rest-connections.php
│   ├── rest-favorites.php
│   ├── rest-notifications.php
│   └── rest-dinner.php
│
└── helpers/
    ├── helper-domains.php
    ├── helper-tokens.php
    ├── helper-tags.php
    ├── helper-pagination.php
    └── helper-slugs.php
```

---

## 4. Custom Post Types

### `vx_empresa`
Representa una empresa asociada a un usuario. Un usuario puede tener más de una. No hay deduplicación — si dos usuarios pertenecen a la misma empresa real, cada uno tiene su propio `vx_empresa`. Esto simplifica el modelo de datos sin impacto real en la UX.

```
post_title          → nombre de la empresa
post_author         → user_id del creador/dueño
post_status         → publish | draft

meta:
vx_user_id          → user_id del dueño (redundante con post_author, para queries)
vx_cargo            → cargo o rol del usuario en la empresa
vx_logo             → attachment_id del logo circular
vx_banner           → attachment_id del banner de perfil
vx_web              → URL del sitio web
vx_linkedin         → URL de LinkedIn de la empresa
vx_descripcion      → descripción breve de la empresa
vx_cliente_ideal    → descripción del cliente ideal
vx_empresa_activa   → true | false (empresa actualmente seleccionada en el perfil)
```

**Relaciones:** Un usuario puede tener N empresas. El perfil público muestra la empresa con `vx_empresa_activa = true`. Desde el editor de perfil el usuario puede cambiar la empresa activa o agregar nuevas. El shortcode `[vx_perfil]` consulta las empresas del usuario via `WP_Query` filtrando por `vx_user_id`.

---

### `vx_conexion`
Representa una solicitud de conexión entre dos usuarios. Es el núcleo del sistema de networking de Vitrinexo.

```
post_title          → "Conexión: [emisor] → [receptor]" (generado automáticamente)
post_status         → publish

meta:
vx_emisor_id                → user_id del que inicia
vx_emisor_nombre            → snapshot del nombre al momento de enviar
vx_emisor_email             → snapshot del email
vx_emisor_telefono          → snapshot del teléfono
vx_emisor_linkedin          → snapshot del LinkedIn
vx_emisor_contacto_preferido → 'email' | 'telefono' | 'linkedin'
vx_emisor_empresas          → array de nombres de empresa(s) desde las que contacta
vx_receptor_id              → user_id del receptor
vx_receptor_nombre          → snapshot del nombre
vx_receptor_email           → snapshot del email (para envío, no se revela)
vx_pitch                    → mensaje del emisor
vx_estado                   → 'pendiente' | 'aceptado' | 'rechazado' | 'sin_respuesta'
vx_fecha_envio              → timestamp
vx_fecha_respuesta          → timestamp (cuando acepta o rechaza)
vx_token_aceptar            → UUID v4 de un solo uso para el botón del email
vx_token_rechazar           → UUID v4 de un solo uso para el botón del email
vx_recordatorio_enviado     → true | false
```

**Por qué snapshots:** Los datos del emisor se copian en el momento del envío para que aunque el usuario cambie su información, el receptor siempre vea los datos correctos al momento de la solicitud. Los datos de contacto solo se revelan al aceptar.

**Relaciones:** `class-vx-connection-flow.php` es el único lugar que crea, modifica y consulta este CPT. Los endpoints REST de conexiones lo llaman. `class-vx-notification-triggers.php` escucha cambios en el estado para crear notificaciones automáticamente.

---

### `vx_dinner`
Representa un evento 4Dinner — una cena en una ciudad y fecha específica.

```
post_title          → "4Dinner Santiago · 11 junio 2026" (generado automáticamente)
post_status         → publish | draft | archive

meta:
vx_dinner_ciudad          → ciudad del evento
vx_dinner_pais            → país
vx_dinner_fecha           → timestamp de la cena
vx_dinner_restaurante     → nombre del restaurante
vx_dinner_direccion       → dirección completa
vx_dinner_cupos_total     → siempre 4
vx_dinner_estado          → 'abierto' | 'completo' | 'realizado' | 'cancelado'
vx_dinner_asignados       → array de user_ids (máximo 4)
vx_dinner_interesados     → array de user_ids que expresaron interés
vx_dinner_notas_admin     → notas internas del admin
```

**Relaciones:** El admin gestiona este CPT desde WP Admin via `class-vx-admin-dinner.php`, que provee dos meta boxes: lista de interesados y mesa confirmada. `class-vx-dinner-assignment.php` maneja la asignación y dispara los emails. Todo miembro activo puede expresar interés via `POST /wp-json/vitrinexo/v1/dinners/{id}/interes`. El admin también puede invitar directamente a cualquier miembro buscando en `class-vx-admin-dinner.php`.

---

### `vx_notification`
Registra cada notificación del sistema para un usuario específico.

```
post_title          → descripción corta de la notificación (para WP Admin)
post_status         → publish

meta:
vx_notif_user_id    → destinatario
vx_notif_tipo       → 'conexion_nueva' | 'conexion_aceptada' | 'match_nuevo' |
                       'dinner_disponible' | 'visita_perfil' | 'favorito'
vx_notif_leida      → true | false
vx_notif_fecha      → timestamp
vx_notif_link       → URL destino al hacer clic
vx_notif_actor_id   → user_id que generó la notificación (si aplica)
vx_notif_data       → JSON con datos adicionales según el tipo
```

**Relaciones:** `class-vx-notification-triggers.php` crea notificaciones automáticamente via hooks en otros módulos. `GET /wp-json/vitrinexo/v1/notificaciones` las consulta para el usuario actual. La campanita del nav hace fetch a ese endpoint al cargar.

---

## 5. User Meta

### Identidad y perfil público
```
vx_nombre                   → nombre del usuario
vx_apellido                 → apellido
vx_perfil_slug              → slug único para la URL /perfil/{slug}
vx_foto                     → attachment_id de la foto de perfil
vx_bio                      → bio profesional personal
vx_ciudad                   → ciudad de residencia
vx_pais                     → país
vx_contacto_preferido       → 'email' | 'telefono' | 'linkedin'
vx_telefono                 → teléfono de contacto
vx_linkedin                 → URL del perfil personal de LinkedIn
```

### Verificación y estado de cuenta
```
vx_estado                   → 'pendiente' | 'activo' | 'rechazado'
vx_tipo_verificacion        → 'automatica' | 'manual'
vx_token_confirmacion       → UUID del link de activación
vx_token_expira             → timestamp de expiración (24h automático, 72h manual)
vx_onboarding_completo      → true | false
vx_onboarding_paso          → 1-6 (último paso guardado, para retomar)
vx_onboarding_datos_{paso}  → JSON con datos guardados en cada paso
```

### Membresía
```
vx_plan                     → 'fundador' | 'mensual' | 'anual' | 'gratuito'
vx_plan_estado              → 'activo' | 'vencido' | 'cancelado' | 'trial'
vx_plan_inicio              → timestamp de inicio del plan
vx_plan_vencimiento         → timestamp de vencimiento
vx_precio_preferente        → true | false (fundadores: true permanente)
vx_gateway_customer_id      → ID del cliente en el gateway de pago (Stripe/PayU)
vx_gateway_subscription_id  → ID de la suscripción activa en el gateway
```

### Comunidades
```
vx_comunidad_out2b          → true | false
vx_comunidad_woman          → true | false
vx_comunidad_senior         → true | false
vx_senior_solicitado        → true | false (declaró ser Senior en onboarding)
vx_senior_verificado        → true | false (admin aprobó el badge)
```

### Tags offer / seek
```
vx_offer_tags               → array serializado de tags de oferta
vx_seek_tags                → array serializado de tags de búsqueda
vx_offer_texto              → pitch de oferta en texto libre
vx_seek_texto               → pitch de búsqueda en texto libre
```

### 4Dinner
```
vx_dinners_asignado         → array de dinner_ids en los que fue asignado
vx_dinners_interesado       → array de dinner_ids en los que expresó interés
```

---

## 6. Sistema de roles y acceso

### Roles de WordPress
Se usan los roles nativos sin crear roles custom. La lógica de acceso se basa en user meta, no en capabilities de WordPress.

| Rol WP | Quién lo tiene |
|---|---|
| `administrator` | Equipo de Vitrinexo/Maggiore |
| `subscriber` | Todos los usuarios registrados |

### Estados de acceso por user meta

**Visitante** (no logueado)
- Ve: landing, landing-4dinner, blog, páginas de comunidad públicas, login, recuperar contraseña
- No ve: ninguna página autenticada → redirect a `/login`

**Usuario pendiente** (`vx_estado = pendiente`)
- Solo ve su página de espera según `vx_tipo_verificacion`:
  - `automatica` → `/confirmar-correo`
  - `manual` → `/verificacion-pendiente`
- Cualquier otra página autenticada → redirect a su página de espera

**Usuario en onboarding** (`vx_estado = activo` + `vx_onboarding_completo = false`)
- Solo accede a `/onboarding`
- Cualquier otra página autenticada → redirect a `/onboarding` en el paso donde quedó

**Miembro activo** (`vx_estado = activo` + `vx_onboarding_completo = true`)
- Acceso completo a toda la plataforma autenticada
- El nivel de contenido visible depende del plan pero no hay restricciones de acceso en esta fase

**Admin** (`administrator`)
- Acceso completo incluyendo `/wp-admin`
- Los no-admins son bloqueados de `/wp-admin` y redirigidos a `/dashboard`

### Guard de acceso
Implementado en un único hook `template_redirect` en `class-vx-auth.php`. Evalúa los estados en orden y redirige según corresponda. Este es el único lugar donde vive la lógica de acceso — ningún template verifica permisos por su cuenta.

```php
// Orden de evaluación en template_redirect
1. ¿Es admin? → acceso total
2. ¿No está logueado? → /login (si intenta página autenticada)
3. ¿vx_estado = pendiente? → /confirmar-correo o /verificacion-pendiente
4. ¿vx_onboarding_completo = false? → /onboarding
5. ¿Plan vencido? → /configuracion#plan (con aviso)
6. OK → acceso normal
```

### Bloqueo de wp-admin para no-admins
```php
add_action('admin_init', function() {
    if (!current_user_can('manage_options')) {
        wp_redirect(home_url('/dashboard/'));
        exit;
    }
});
add_filter('show_admin_bar', fn($show) => current_user_can('manage_options') ? $show : false);
```

---

## 7. Módulos del plugin vitrinexo-core

### `vitrinexo-core.php` — Bootstrap

**Responsabilidad:** Punto de entrada del plugin. Carga todos los módulos, define constantes globales, registra los hooks de activación/desactivación.

**Constantes:**
- `VX_VERSION` — versión del plugin
- `VX_PLUGIN_DIR` — ruta absoluta
- `VX_PLUGIN_URL` — URL pública
- `VX_REST_NAMESPACE` — `vitrinexo/v1`

**Relaciones:** No tiene lógica propia. Solo hace `require_once` de todos los módulos en el orden correcto y llama `add_action('init', ...)` para inicializar cada uno.

---

### `modules/users/class-vx-user.php` — Modelo de usuario

**Responsabilidad:** Abstracción sobre el usuario de WordPress. Centraliza todos los getters y setters de user meta para que el resto del código nunca llame `get_user_meta()` directamente.

**Métodos principales:**
- `VX_User::get($user_id)` — factory, devuelve instancia del usuario
- `->get_nombre_completo()` — combina vx_nombre + vx_apellido
- `->get_empresas()` — devuelve array de posts vx_empresa del usuario
- `->get_empresa_activa()` — empresa con vx_empresa_activa = true
- `->get_offer_tags()` — devuelve array de tags
- `->get_seek_tags()` — devuelve array de tags
- `->is_active()` — true si vx_estado = activo y onboarding completo
- `->is_founder()` — true si vx_plan = fundador
- `->to_card_array()` — datos formateados para renderizar una tarjeta

**Relaciones:** Usado por casi todos los demás módulos. `class-vx-directory.php` lo usa para construir los resultados. `class-vx-connection-flow.php` lo usa para obtener datos del emisor y receptor. Los shortcodes lo usan via las funciones del módulo correspondiente.

---

### `modules/users/class-vx-user-meta.php` — Registro de meta keys

**Responsabilidad:** Registra todos los user meta keys con `register_meta()`. Define los valores por defecto y los tipos de datos. Centraliza los nombres de las keys para evitar typos dispersos por el código.

**Constantes de keys:**
```php
const ESTADO = 'vx_estado';
const PLAN   = 'vx_plan';
// etc. para cada key
```

**Relaciones:** `class-vx-user.php` importa estas constantes. Nadie más debería escribir strings de meta keys directamente.

---

### `modules/users/class-vx-auth.php` — Autenticación y guards

**Responsabilidad:** Todo lo relacionado con acceso. Hook `template_redirect` que evalúa el estado del usuario y redirige. Bloqueo de `/wp-admin` para no-admins. Login/logout custom si se necesita sobreescribir el de WordPress.

**Métodos:**
- `VX_Auth::check_access()` — hook en template_redirect, evalúa y redirige
- `VX_Auth::redirect_if_not_logged()` — usado en templates que requieren auth
- `VX_Auth::get_redirect_for_pending($user_id)` — devuelve URL según tipo de verificación
- `VX_Auth::block_admin_for_non_admins()` — hook en admin_init

**Relaciones:** Lee `vx_estado`, `vx_tipo_verificacion`, `vx_onboarding_completo` via `class-vx-user.php`. No modifica datos — solo lee y redirige.

---

### `modules/users/class-vx-verification.php` — Verificación de cuentas

**Responsabilidad:** Flujo completo de verificación. Detecta si el dominio del email es institucional o genérico. Genera tokens UUID. Envía emails de confirmación. Activa cuentas cuando se valida el token. Notifica al admin cuando llega una cuenta manual.

**Métodos:**
- `VX_Verification::is_institutional($email)` — devuelve bool
- `VX_Verification::generate_token($user_id, $expiry_hours)` — genera UUID, lo guarda, devuelve el token
- `VX_Verification::validate_token($user_id, $token)` — valida y consume el token
- `VX_Verification::activate_account($user_id)` — cambia vx_estado a 'activo', dispara email de bienvenida
- `VX_Verification::send_confirmation_email($user_id)` — llama a VX_Mailer con el template correcto
- `VX_Verification::notify_admin_pending($user_id)` — notifica al admin de cuenta manual
- `VX_Verification::approve_manual($user_id)` — genera token de aprobación, envía email

**Relaciones:** Llamado desde `rest-auth.php` cuando se registra un usuario y cuando se activa la cuenta. Usa `helper-domains.php` para la detección de dominio y `helper-tokens.php` para los UUIDs. Usa `class-vx-mailer.php` para el envío de emails.

---

### `modules/membership/class-vx-membership.php` — Modelo de membresía

**Responsabilidad:** Abstracción sobre el estado de membresía de un usuario. Getters y setters para todos los meta de plan. Lógica de validación (¿está activo? ¿está vencido? ¿es fundador?).

**Métodos:**
- `VX_Membership::get($user_id)` — factory
- `->is_active()` — true si vx_plan_estado = activo y no vencido
- `->is_founder()` — true si vx_plan = fundador
- `->has_lifetime_price()` — true si vx_precio_preferente = true
- `->get_expiry()` — devuelve timestamp de vencimiento
- `->activate($plan, $expiry)` — activa un plan
- `->cancel()` — cancela la membresía
- `->get_gateway_customer_id()` — ID del cliente en el gateway

**Relaciones:** Usado por `class-vx-auth.php` para verificar acceso. Usado por `class-vx-membership-hooks.php` cuando el gateway confirma un pago. El admin lo usa via `class-vx-admin-membership.php`.

---

### `modules/membership/class-vx-plans.php` — Definición de planes

**Responsabilidad:** Define los planes disponibles, sus precios, duraciones y beneficios. Es la única fuente de verdad sobre los planes — si se agrega un plan nuevo, solo se modifica aquí.

```php
const PLANS = [
    'fundador' => [
        'nombre'    => 'Socio Fundador',
        'precio'    => 0,
        'duracion'  => 180, // días
        'precio_renovacion' => null, // se define cuando llegue el momento
    ],
    'mensual'  => [ ... ],
    'anual'    => [ ... ],
];
```

**Relaciones:** Usado por `class-vx-membership.php` y por `class-vx-admin-membership.php` para renderizar opciones.

---

### `modules/membership/class-vx-membership-hooks.php` — Capa de integración con gateway

**Responsabilidad:** Este es el único archivo que cambia cuando se conecta un gateway de pago. Define los hooks que el gateway dispara y los traduce a llamadas de `class-vx-membership.php`. El resto del sistema no sabe qué gateway se usa.

**Hooks a implementar cuando llegue el momento:**
```php
// Stripe ejemplo:
add_action('vx_payment_success',    [$this, 'handle_payment_success']);
add_action('vx_payment_failed',     [$this, 'handle_payment_failed']);
add_action('vx_subscription_cancelled', [$this, 'handle_cancellation']);
```

**Relaciones:** Solo interactúa con `class-vx-membership.php` y `class-vx-mailer.php` (para emails de confirmación de pago). Aislado del resto del sistema.

---

### `modules/onboarding/class-vx-onboarding.php` — Lógica del wizard

**Responsabilidad:** Gestiona los 6 pasos del onboarding. Guarda el progreso paso a paso. Valida que los campos obligatorios de cada paso estén completos. Marca el onboarding como completo cuando se llega al paso 6.

**Pasos:**
1. Bienvenida (sin datos que guardar)
2. Datos personales: nombre, apellido, foto, bio, ciudad, país, contacto preferido
3. Empresa: crear post vx_empresa con todos sus campos
4. Tags offer/seek: vx_offer_tags, vx_seek_tags, vx_offer_texto, vx_seek_texto
5. Comunidades: vx_comunidad_out2b, vx_comunidad_woman, vx_comunidad_senior, vx_senior_solicitado
6. Confirmación: marcar vx_onboarding_completo = true, disparar email bienvenida

**Métodos:**
- `VX_Onboarding::save_step($user_id, $paso, $datos)` — valida y guarda un paso
- `VX_Onboarding::get_state($user_id)` — devuelve hasta qué paso llegó
- `VX_Onboarding::complete($user_id)` — marca completo, dispara acciones
- `VX_Onboarding::validate_step($paso, $datos)` — valida campos obligatorios

**Relaciones:** Llamado desde `rest-onboarding.php`. Usa `class-vx-user.php` para guardar meta. Usa `class-vx-mailer.php` al completar. Si el usuario declaró interés en Senior, notifica a `class-vx-senior-verification.php`.

---

### `modules/directory/class-vx-directory.php` — Consultas del directorio

**Responsabilidad:** Todas las queries de listado de usuarios del directorio. Construye `WP_User_Query` con los filtros correspondientes y devuelve arrays formateados para renderizar.

**Métodos:**
- `VX_Directory::get_members($args)` — query principal con paginación y filtros
- `VX_Directory::get_filters()` — devuelve opciones disponibles de país y rubro
- `VX_Directory::format_for_card($user_id)` — formatea un usuario para la tarjeta

**Filtros disponibles:**
- `pais` — filtra por vx_pais
- `rubro` — filtra por industria de la empresa activa
- `comunidad` — filtra por vx_comunidad_*
- `fundador` — filtra por vx_plan = fundador
- `page` — paginación

**Relaciones:** Llamado desde `rest-directory.php` y directamente desde el shortcode `[vx_directorio]`. Usa `class-vx-user.php` para formatear cada resultado.

---

### `modules/directory/class-vx-search.php` — Búsqueda

**Responsabilidad:** Búsqueda full-text sobre el directorio. Busca en nombre, empresa, bio, tags offer y seek. Devuelve resultados ordenados por relevancia.

**Métodos:**
- `VX_Search::search($query, $filters)` — búsqueda principal
- `VX_Search::build_meta_query($query)` — construye la meta_query de WordPress

**Relaciones:** Llamado desde `rest-directory.php` cuando hay un parámetro `q`. Comparte formato de respuesta con `class-vx-directory.php`.

---

### `modules/directory/class-vx-matches.php` — Algoritmo de matches

**Responsabilidad:** Calcula qué usuarios son match para el usuario actual. Un match de tipo "seeks" es alguien cuyos offer_tags intersectan con los seek_tags del usuario. Un match de tipo "offers" es alguien cuyos seek_tags intersectan con los offer_tags del usuario.

**Métodos:**
- `VX_Matches::get_seeks_matches($user_id)` — usuarios que ofrecen lo que busco
- `VX_Matches::get_offers_matches($user_id)` — usuarios que buscan lo que ofrezco
- `VX_Matches::calculate_score($tags_a, $tags_b)` — score de coincidencia (0-1)

**Relaciones:** Llamado desde `rest-directory.php` y desde el shortcode `[vx_matches]`. Usa `class-vx-user.php` para obtener los tags del usuario actual y de los candidatos.

---

### `modules/connections/class-vx-connection.php` — Modelo de conexión

**Responsabilidad:** Abstracción sobre el CPT `vx_conexion`. Getters y setters. Queries para obtener conexiones de un usuario en cualquier dirección y estado.

**Métodos:**
- `VX_Connection::get($post_id)` — factory
- `VX_Connection::get_by_token($token, $tipo)` — busca por token aceptar/rechazar
- `VX_Connection::get_sent_by($user_id)` — enviadas por el usuario
- `VX_Connection::get_received_by($user_id)` — recibidas por el usuario
- `VX_Connection::get_accepted($user_id)` — concretadas en cualquier dirección
- `->get_contact_data()` — datos de contacto del emisor (solo si aceptado)

**Relaciones:** Usado por `class-vx-connection-flow.php` y por el shortcode `[vx_conexiones]`.

---

### `modules/connections/class-vx-connection-flow.php` — Flujo de conexión

**Responsabilidad:** La lógica completa del ciclo de vida de una conexión. Crear, aceptar, rechazar, marcar sin respuesta.

**Métodos:**
- `VX_Connection_Flow::create($emisor_id, $receptor_id, $pitch, $empresas)` — crea el CPT, genera tokens, envía email al receptor
- `VX_Connection_Flow::accept($token)` — valida token, cambia estado, crea notificación, envía email con datos al emisor
- `VX_Connection_Flow::reject($token)` — valida token, cambia estado, registra rechazo (sin notificar al emisor)
- `VX_Connection_Flow::mark_no_response($conexion_id)` — llamado por el cron a las 72h

**Decisiones de diseño:**
- El rechazo es privado — el emisor no recibe notificación
- Los datos de contacto del emisor solo se revelan en `accept()`, nunca antes
- Los tokens son UUID v4 de un solo uso — se invalidan al procesarse

**Relaciones:** Llama a `class-vx-mailer.php` para los emails. Llama a `class-vx-notification-triggers.php` para crear notificaciones. Llama a `helper-tokens.php` para generar tokens. Llamado desde `rest-connections.php`.

---

### `modules/communities/class-vx-community.php` — Gestión de comunidades

**Responsabilidad:** Lógica de membresía a comunidades (Out2B, Woman, Senior). Activar, desactivar, verificar si un usuario pertenece. Filtrar el directorio por comunidad.

**Métodos:**
- `VX_Community::activate($user_id, $community)` — activa la comunidad
- `VX_Community::deactivate($user_id, $community)` — desactiva
- `VX_Community::is_member($user_id, $community)` — bool
- `VX_Community::get_members($community, $args)` — lista de miembros con filtros

**Relaciones:** Llamado desde `class-vx-onboarding.php` al completar el paso 5. Usado por `class-vx-directory.php` para el filtro de comunidad. `class-vx-senior-verification.php` lo llama cuando el admin aprueba un Senior.

---

### `modules/communities/class-vx-senior-verification.php` — Verificación Senior

**Responsabilidad:** Flujo específico de la comunidad Senior que requiere aprobación manual del admin. Registra la solicitud, notifica al admin, procesa la aprobación.

**Métodos:**
- `VX_Senior_Verification::request($user_id)` — guarda vx_senior_solicitado = true, notifica admin
- `VX_Senior_Verification::approve($user_id)` — activa vx_senior_verificado = true, activa comunidad Senior
- `VX_Senior_Verification::reject($user_id)` — limpia la solicitud

**Relaciones:** Llamado desde `class-vx-onboarding.php`. El admin lo usa via `class-vx-admin-users.php`. Usa `class-vx-community.php` para la activación final.

---

### `modules/dinner/class-vx-dinner.php` — Modelo de evento 4Dinner

**Responsabilidad:** Abstracción sobre el CPT `vx_dinner`. Getters y queries.

**Métodos:**
- `VX_Dinner::get($post_id)` — factory
- `VX_Dinner::get_upcoming()` — eventos futuros con estado 'abierto'
- `VX_Dinner::get_past()` — eventos realizados
- `->get_assigned_users()` — array de VX_User de los asignados
- `->get_interested_users()` — array de VX_User de los interesados
- `->has_space()` — true si hay menos de 4 asignados
- `->add_interest($user_id)` — agrega user_id a vx_dinner_interesados y a vx_dinners_interesado del usuario
- `->remove_interest($user_id)` — inverso

**Relaciones:** Usado por `class-vx-dinner-assignment.php` y por el shortcode `[vx_4dinner]`. `rest-dinner.php` lo llama para el endpoint de interés.

---

### `modules/dinner/class-vx-dinner-assignment.php` — Asignación de mesas

**Responsabilidad:** Lógica de asignación manual de usuarios a un evento. Cuando el admin asigna al cuarto usuario, dispara automáticamente los 4 emails de confirmación con los datos de todos los comensales.

**Métodos:**
- `VX_Dinner_Assignment::assign($dinner_id, $user_id)` — asigna un usuario, actualiza meta del CPT y user meta, si son 4 dispara confirmaciones
- `VX_Dinner_Assignment::unassign($dinner_id, $user_id)` — desasigna
- `VX_Dinner_Assignment::send_confirmations($dinner_id)` — envía email a los 4 comensales con los datos de todos
- `VX_Dinner_Assignment::build_confirmation_data($dinner_id)` — construye el array de datos para el email

**Relaciones:** Llamado exclusivamente desde `class-vx-admin-dinner.php`. Usa `class-vx-dinner.php` para leer y modificar el CPT. Usa `class-vx-mailer.php` para los emails.

---

### `modules/notifications/class-vx-notification.php` — Modelo de notificación

**Responsabilidad:** Abstracción sobre el CPT `vx_notification`. Crear, marcar como leída, consultar.

**Métodos:**
- `VX_Notification::create($user_id, $tipo, $link, $actor_id, $data)` — crea una notificación
- `VX_Notification::get_for_user($user_id, $limit)` — devuelve notificaciones del usuario
- `VX_Notification::mark_read($notif_id)` — marca una como leída
- `VX_Notification::mark_all_read($user_id)` — marca todas como leídas
- `VX_Notification::count_unread($user_id)` — para el badge de la campanita

**Relaciones:** Creado por `class-vx-notification-triggers.php`. Consultado por `rest-notifications.php`. El count_unread es llamado en cada carga de página autenticada para el badge del nav.

---

### `modules/notifications/class-vx-notification-triggers.php` — Disparadores automáticos

**Responsabilidad:** Hooks que escuchan eventos del sistema y crean notificaciones automáticamente. Es la única clase que llama `VX_Notification::create()` — centraliza toda la lógica de "cuándo se crea una notificación".

**Hooks registrados:**
```php
add_action('vx_connection_received',  → notif tipo 'conexion_nueva' al receptor
add_action('vx_connection_accepted',  → notif tipo 'conexion_aceptada' al emisor
add_action('vx_profile_visited',      → notif tipo 'visita_perfil' al visitado
add_action('vx_user_favorited',       → notif tipo 'favorito' al usuario guardado
add_action('vx_dinner_available',     → notif tipo 'dinner_disponible' a miembros activos
add_action('vx_matches_updated',      → notif tipo 'match_nuevo' cuando hay matches nuevos
```

**Relaciones:** Solo depende de `class-vx-notification.php`. Los eventos los disparan los módulos correspondientes con `do_action('vx_connection_received', $user_id, $data)` etc.

---

### `modules/email/class-vx-mailer.php` — Wrapper de email

**Responsabilidad:** Capa de abstracción sobre `wp_mail()` con FluentSMTP. Centraliza el envío de emails — si se cambia el proveedor, solo cambia aquí.

**Métodos:**
- `VX_Mailer::send($to, $subject, $template, $data)` — envía un email
- `VX_Mailer::send_bulk($recipients, $subject, $template, $data)` — envío múltiple (para los 4Dinner)

**Relaciones:** Usado por todos los módulos que envían emails. Obtiene el HTML del email via `class-vx-email-templates.php`.

---

### `modules/email/class-vx-email-templates.php` — Templates de email

**Responsabilidad:** Genera el HTML de cada tipo de email. Cada template es un método que recibe datos y devuelve HTML. Los templates son los mismos que están en `emails/` del repositorio UX, traducidos a PHP con variables.

**Templates:**
- `->confirmacion($nombre, $link)` — activación correo institucional
- `->aprobacion($nombre, $link)` — aprobación cuenta manual
- `->bienvenida($nombre)` — primera activación
- `->conexion_recibida($receptor, $emisor, $pitch, $empresa, $token_aceptar, $token_rechazar)`
- `->conexion_aceptada($emisor, $receptor, $datos_contacto)`
- `->recordatorio_conexion($receptor, $emisor, $pitch, $tokens)`
- `->match_semanal($usuario, $seeks_matches, $offers_matches)`
- `->dinner_confirmacion($usuario, $dinner, $comensales)`

**Relaciones:** Solo llamado por `class-vx-mailer.php`. Los CSS son inline (requerimiento de clientes de email).

---

### `modules/email/class-vx-cron.php` — Tareas programadas

**Responsabilidad:** Registra y ejecuta las tareas programadas via WP Cron.

**Tareas:**
- **Cada hora:** busca conexiones pendientes con más de 72h sin respuesta, envía recordatorio si no se ha enviado, marca como `sin_respuesta` si llevan más de 7 días
- **Cada lunes:** genera el resumen semanal de matches nuevos para cada usuario activo con notificaciones de matches activadas
- **Diariamente:** verifica membresías vencidas, cambia vx_plan_estado a 'vencido', dispara email de aviso

**Relaciones:** Llama a `class-vx-connection-flow.php` para marcar sin_respuesta. Llama a `class-vx-matches.php` para calcular matches nuevos. Llama a `class-vx-mailer.php` para los emails. Llama a `class-vx-membership.php` para verificar vencimientos.

---

### `modules/admin/class-vx-admin-users.php` — Vista de usuarios en WP Admin

**Responsabilidad:** Mejora la lista de usuarios de WordPress con columnas y acciones relevantes para Vitrinexo.

**Columnas agregadas:**
- Estado de cuenta (pendiente / activo / rechazado)
- Plan (fundador / mensual / etc.)
- Verificación Senior (solicitado / verificado / no)
- Fecha de registro
- Acciones rápidas: Aprobar, Rechazar, Activar Senior

**Relaciones:** Llama a `class-vx-verification.php` para aprobar cuentas manuales. Llama a `class-vx-senior-verification.php` para verificar Seniors. Lee via `class-vx-user.php`.

---

### `modules/admin/class-vx-admin-dinner.php` — Gestión de 4Dinner en WP Admin

**Responsabilidad:** Meta boxes custom en el edit screen del CPT `vx_dinner`. Provee la interfaz para que el admin vea interesados, busque miembros y asigne la mesa.

**Meta boxes:**
- **Detalles del evento:** ciudad, fecha, restaurante, dirección (campos del CPT)
- **Interesados:** lista de usuarios que expresaron interés con botón "Asignar a la mesa"
- **Mesa confirmada:** los 4 asignados con foto, nombre y empresa. Botón "Enviar confirmaciones" (solo activo cuando hay 4)
- **Buscar miembro:** input de búsqueda para invitar directamente a cualquier miembro verificado

**Relaciones:** Llama a `class-vx-dinner-assignment.php` para todas las operaciones de asignación. Usa `class-vx-user.php` para renderizar los perfiles en los meta boxes.

---

### `modules/admin/class-vx-admin-membership.php` — Gestión de membresías en WP Admin

**Responsabilidad:** Vista para que el admin gestione planes, active membresías manualmente (para el período de fundadores), y vea el estado de las membresías.

**Funcionalidades:**
- Activar plan Fundador a un usuario manualmente
- Extender vencimiento de un plan
- Ver historial de planes de un usuario
- Exportar lista de Socios Fundadores

**Relaciones:** Llama a `class-vx-membership.php` para todas las modificaciones.

---

## 8. Shortcodes

Convención: todos los shortcodes tienen el prefijo `[vx_*]`. La lógica de cada shortcode es mínima — verifica autenticación si aplica, obtiene datos del módulo correspondiente y carga el partial del theme.

```
[vx_landing]                           → templates/front-page.php
[vx_landing_4dinner]                   → templates/page-4dinner-landing.php
[vx_blog]                              → templates/page-blog.php
[vx_single_blog]                       → templates/single-blog.php
[vx_login]                             → templates/page-login.php
[vx_recuperar_contrasena]              → templates/page-recuperar-contrasena.php
[vx_nueva_contrasena]                  → templates/page-nueva-contrasena.php
[vx_confirmar_correo]                  → templates/page-confirmar-correo.php
[vx_verificacion_pendiente]            → templates/page-verificacion-pendiente.php
[vx_onboarding]                        → templates/page-onboarding.php
[vx_dashboard]                         → templates/page-dashboard.php
[vx_directorio]                        → templates/page-directorio.php
[vx_search_results]                    → templates/page-search-results.php
[vx_matches]                           → templates/page-matches.php
[vx_match_seeks]                       → templates/page-match-seeks.php
[vx_match_offers]                      → templates/page-match-offers.php
[vx_perfil]                            → templates/page-perfil.php (propio)
[vx_perfil user_id="123"]              → templates/page-perfil.php (ajeno)
[vx_editor_perfil]                     → templates/page-editor-perfil.php
[vx_favoritos]                         → templates/page-favoritos.php
[vx_conexiones]                        → templates/page-conexiones.php
[vx_conexion_aceptada]                 → templates/page-conexion-aceptada.php
[vx_conexion_rechazada]                → templates/page-conexion-rechazada.php
[vx_notificaciones]                    → templates/page-notificaciones.php
[vx_configuracion]                     → templates/page-configuracion.php
[vx_comunidad community="out2b"]       → templates/page-comunidad.php
[vx_comunidad community="woman"]       → templates/page-comunidad.php
[vx_comunidad community="senior"]      → templates/page-comunidad.php
[vx_4dinner]                           → templates/page-4dinner.php
[vx_404]                               → templates/page-404.php
[vx_empty_state type="favoritos"]      → partials/empty-state.php
```

---

## 9. Page mapping y URLs

Cada URL es una página de WordPress con el shortcode correspondiente en el contenido. Las páginas se crean programáticamente al activar el plugin via `wp_insert_post()` con `do_not_allow` en los meta para que no se modifiquen desde el editor.

```
/                           → Portada de WordPress → [vx_landing]
/4dinner                    → [vx_landing_4dinner]
/blog                       → [vx_blog]
/blog/{slug}                → Post de WordPress (categoría vitrinexo-blog)
/login                      → [vx_login]
/recuperar-contrasena       → [vx_recuperar_contrasena]
/nueva-contrasena           → [vx_nueva_contrasena]
/confirmar-correo           → [vx_confirmar_correo]
/verificacion-pendiente     → [vx_verificacion_pendiente]
/onboarding                 → [vx_onboarding]
/dashboard                  → [vx_dashboard]
/directorio                 → [vx_directorio]
/directorio/buscar          → [vx_search_results]
/matches                    → [vx_matches]
/matches/ofrecen            → [vx_match_seeks]
/matches/buscan             → [vx_match_offers]
/perfil/{slug}              → [vx_perfil] (rewrite rule custom)
/editar-perfil              → [vx_editor_perfil]
/favoritos                  → [vx_favoritos]
/conexiones                 → [vx_conexiones]
/conexion-aceptada          → [vx_conexion_aceptada]
/conexion-rechazada         → [vx_conexion_rechazada]
/notificaciones             → [vx_notificaciones]
/configuracion              → [vx_configuracion]
/comunidad/out2b            → [vx_comunidad community="out2b"]
/comunidad/woman            → [vx_comunidad community="woman"]
/comunidad/senior           → [vx_comunidad community="senior"]
/events/4dinner             → [vx_4dinner]
```

### Slug de perfil
Generado en el registro: `sanitize_title($nombre . ' ' . $apellido)`. Si ya existe, se agrega sufijo numérico: `felipe-munoz-2`. Guardado en `vx_perfil_slug`. Rewrite rule en `class-vx-auth.php`:

```php
add_rewrite_rule('^perfil/([^/]+)/?$', 'index.php?pagename=perfil&vx_slug=$matches[1]', 'top');
```

### `/activar-cuenta` — endpoint REST, no página
No es una página de WordPress. Es un endpoint REST que valida el token y redirige:
```
GET /wp-json/vitrinexo/v1/activar?uid=123&token=abc&accion=confirmar
```

---

## 10. REST API

Todos los endpoints bajo `/wp-json/vitrinexo/v1/`. Autenticación via nonce de WordPress para usuarios logueados. Los endpoints de activación de cuenta y de conexiones (aceptar/rechazar) se autentican por token en la URL.

### Autenticación y verificación
```
GET  /activar               → valida token, activa cuenta, redirige a /onboarding
POST /reenviar-token        → genera nuevo token, reenvía email
```

### Onboarding
```
POST /onboarding/paso       → body: {paso, datos} — guarda progreso
GET  /onboarding/estado     → devuelve {paso_actual, datos_guardados}
```

### Directorio y búsqueda
```
GET  /directorio            → params: pais, rubro, comunidad, fundador, page
GET  /directorio/buscar     → params: q, pais, rubro, page
GET  /perfil/{slug}         → datos públicos del perfil
```

### Matches
```
GET  /matches/seeks         → perfiles que ofrecen lo que busco (con paginación)
GET  /matches/offers        → perfiles que buscan lo que ofrezco (con paginación)
```

### Conexiones
```
POST   /conexiones                  → body: {receptor_id, pitch, empresas[]}
POST   /conexiones/aceptar          → body: {token} — no requiere sesión
POST   /conexiones/rechazar         → body: {token} — no requiere sesión
GET    /conexiones                  → params: tipo (enviadas|recibidas|concretadas)
```

### Favoritos
```
POST   /favoritos/{user_id}         → agrega a favoritos
DELETE /favoritos/{user_id}         → quita de favoritos
GET    /favoritos                   → lista de favoritos del usuario
```

### Notificaciones
```
GET    /notificaciones              → lista con paginación
GET    /notificaciones/unread-count → número de no leídas (para el badge)
POST   /notificaciones/leer-todas   → marca todas como leídas
POST   /notificaciones/{id}/leer    → marca una como leída
```

### 4Dinner
```
GET    /dinners                     → eventos activos con cupos disponibles
POST   /dinners/{id}/interes        → expresa interés en un evento
DELETE /dinners/{id}/interes        → retira el interés
```

### Membresía (solo lectura)
```
GET    /membresia                   → estado del plan del usuario actual
```

---

## 11. Sistema de email

### Proveedor: FluentSMTP + Postmark
**FluentSMTP** es el plugin de WordPress que conecta `wp_mail()` con el proveedor SMTP. Es gratuito, liviano y sin features innecesarios de CRM o marketing.

**Postmark** es el proveedor SMTP. Se elige por su deliverability superior para email transaccional — a diferencia de SendGrid o Mailchimp, está diseñado exclusivamente para emails transaccionales (confirmaciones, notificaciones) y no para campañas. El plan gratuito cubre hasta 100 emails/mes, suficiente para la fase inicial.

### Templates
Los templates viven en `class-vx-email-templates.php` como métodos PHP que devuelven HTML. Los CSS son inline (obligatorio para compatibilidad con clientes de email como Gmail y Outlook).

| Template | Cuándo se envía |
|---|---|
| `confirmacion` | Al registrarse con email institucional |
| `aprobacion` | Cuando el admin aprueba una cuenta manual |
| `bienvenida` | Al activar la cuenta (cualquier flujo) |
| `conexion_recibida` | Cuando alguien envía una solicitud de conexión |
| `conexion_aceptada` | Cuando el receptor acepta la conexión |
| `recordatorio_conexion` | A las 72h si el receptor no respondió |
| `match_semanal` | Cada lunes con matches nuevos de la semana |
| `dinner_confirmacion` | Cuando el admin asigna los 4 comensales de una mesa |

---

## 12. Flujos completos

### Flujo de registro y verificación

```
1. Usuario llena formulario en /login (tab Registrarse)
2. WordPress crea el usuario con rol 'subscriber' y vx_estado = 'pendiente'
3. VX_Verification::is_institutional($email) evalúa el dominio

   ┌─ Institucional ─────────────────────────────────────────┐
   │  4a. Genera token UUID (expira 24h)                     │
   │  4b. Envía email de confirmación con link               │
   │  5a. Usuario ve /confirmar-correo                       │
   │  6a. Usuario hace clic → GET /activar?token=...         │
   │  7a. VX_Verification::validate_token() → OK             │
   │  8a. VX_Verification::activate_account()                │
   │  9a. Redirect a /onboarding                             │
   └─────────────────────────────────────────────────────────┘

   ┌─ Genérico ──────────────────────────────────────────────┐
   │  4b. Notifica al admin por email                        │
   │  5b. Usuario ve /verificacion-pendiente                 │
   │  6b. Admin aprueba en WP Admin                          │
   │  7b. VX_Verification::approve_manual() → genera token   │
   │       UUID (expira 72h), envía email de aprobación      │
   │  8b. Usuario hace clic → GET /activar?token=...         │
   │  9b. Mismo flujo que 7a-9a                              │
   └─────────────────────────────────────────────────────────┘

10. VX_Mailer envía email de bienvenida
11. VX_Auth::check_access() detecta onboarding incompleto → /onboarding
```

### Flujo de onboarding

```
1. Usuario accede a /onboarding
2. JS carga el estado via GET /onboarding/estado
3. Muestra el último paso guardado (o el 1 si es nuevo)
4. Al avanzar cada paso: POST /onboarding/paso {paso, datos}
5. VX_Onboarding::save_step() valida y guarda via VX_User
6. Al llegar al paso 6:
   - Detecta tipo de email → muestra variante A (institucional) o B (genérico)
   - Si Senior solicitado: VX_Senior_Verification::request()
7. Al hacer clic en "Completar":
   - POST /onboarding/paso {paso: 6, completar: true}
   - VX_Onboarding::complete() → vx_onboarding_completo = true
   - VX_Auth::check_access() ya no redirige a /onboarding
   - Redirect a /dashboard
```

### Flujo de conexión

```
1. Usuario A hace clic en "Conectar" en el perfil de Usuario B
2. Se abre modal-conectar con selector de empresa(s) y campo pitch
3. Submit → POST /conexiones {receptor_id, pitch, empresas[]}
4. VX_Connection_Flow::create():
   a. Crea CPT vx_conexion con snapshot de datos
   b. Genera dos tokens UUID (aceptar y rechazar)
   c. VX_Mailer::send() → email conexion_recibida a B
   d. VX_Notification_Triggers dispara 'vx_connection_received'
5. Modal muestra estado de éxito

6. B recibe email con pitch, datos de A y empresa, botones Aceptar/Rechazar
   (datos de contacto de A están ocultos)

   ┌─ B hace clic en Aceptar ────────────────────────────────┐
   │  7a. GET /conexiones/aceptar?token=...                  │
   │  8a. VX_Connection_Flow::accept():                      │
   │       - Valida y consume token                          │
   │       - vx_estado → 'aceptado'                         │
   │       - VX_Mailer → email conexion_aceptada a A         │
   │         (con datos de contacto de B revelados)          │
   │       - VX_Notification_Triggers → 'vx_connection_accepted'
   │  9a. Redirect a /conexion-aceptada (muestra datos de A) │
   └─────────────────────────────────────────────────────────┘

   ┌─ B hace clic en Rechazar ───────────────────────────────┐
   │  7b. GET /conexiones/rechazar?token=...                 │
   │  8b. VX_Connection_Flow::reject():                      │
   │       - Valida y consume token                          │
   │       - vx_estado → 'rechazado'                        │
   │       - Sin email a A (rechazo privado)                 │
   │  9b. Redirect a /conexion-rechazada                     │
   └─────────────────────────────────────────────────────────┘

   ┌─ B no responde en 72h ──────────────────────────────────┐
   │  7c. WP Cron detecta la conexión pendiente              │
   │  8c. VX_Mailer → email recordatorio_conexion a B        │
   │  9c. vx_recordatorio_enviado = true                     │
   │  10c. Si pasan 7 días → vx_estado = 'sin_respuesta'    │
   └─────────────────────────────────────────────────────────┘
```

### Flujo de 4Dinner

```
1. Admin crea un CPT vx_dinner en WP Admin con fecha, ciudad, restaurante
2. El evento aparece en /events/4dinner con estado 'abierto' y cupos disponibles

3. Usuario ve el evento y hace clic en "Quiero ir"
   → POST /dinners/{id}/interes
   → VX_Dinner::add_interest() actualiza vx_dinner_interesados y vx_dinners_interesado del usuario

4. Admin entra al edit screen del CPT en WP Admin
   - Meta box "Interesados": ve la lista de usuarios anotados con su foto y empresa
   - Meta box "Buscar miembro": puede buscar cualquier miembro verificado para invitar
   - Meta box "Mesa confirmada": asigna usuarios uno a uno

5. Al asignar el cuarto usuario:
   - VX_Dinner_Assignment::assign() detecta que hay 4 asignados
   - Llama automáticamente a VX_Dinner_Assignment::send_confirmations()
   - VX_Mailer envía email dinner_confirmacion a los 4 comensales
     (cada email incluye nombre, empresa y foto de los otros 3)
   - El evento cambia a estado 'completo'

6. El evento deja de aparecer como disponible en /events/4dinner
```

---

## 13. Relaciones entre módulos

```
vitrinexo-core.php
    └── carga todos los módulos en orden

class-vx-auth.php
    ├── lee  → class-vx-user.php
    ├── lee  → class-vx-membership.php
    └── usa  → helper-slugs.php (rewrite rules)

class-vx-verification.php
    ├── usa  → helper-domains.php
    ├── usa  → helper-tokens.php
    └── llama → class-vx-mailer.php

class-vx-onboarding.php
    ├── escribe → class-vx-user.php
    ├── llama   → class-vx-community.php
    ├── llama   → class-vx-senior-verification.php
    └── llama   → class-vx-mailer.php

class-vx-directory.php
    ├── lee   → class-vx-user.php
    └── usa   → helper-pagination.php

class-vx-matches.php
    ├── lee   → class-vx-user.php (offer_tags, seek_tags)
    └── usa   → helper-tags.php

class-vx-connection-flow.php
    ├── escribe → class-vx-connection.php (CPT)
    ├── usa     → helper-tokens.php
    ├── llama   → class-vx-mailer.php
    └── dispara → do_action('vx_connection_received')
                  do_action('vx_connection_accepted')

class-vx-notification-triggers.php
    ├── escucha → do_action('vx_connection_received')
    ├── escucha → do_action('vx_connection_accepted')
    ├── escucha → do_action('vx_profile_visited')
    └── llama   → class-vx-notification.php

class-vx-dinner-assignment.php
    ├── escribe → class-vx-dinner.php (CPT)
    ├── escribe → class-vx-user.php (vx_dinners_asignado)
    └── llama   → class-vx-mailer.php

class-vx-cron.php
    ├── llama → class-vx-connection-flow.php (sin_respuesta)
    ├── llama → class-vx-matches.php (match semanal)
    ├── llama → class-vx-membership.php (vencimientos)
    └── llama → class-vx-mailer.php

class-vx-mailer.php
    └── usa → class-vx-email-templates.php

class-vx-admin-dinner.php
    ├── lee    → class-vx-dinner.php
    ├── llama  → class-vx-dinner-assignment.php
    └── usa    → class-vx-user.php (renderizar perfiles)

class-vx-admin-users.php
    ├── lee   → class-vx-user.php
    ├── llama → class-vx-verification.php (aprobar)
    └── llama → class-vx-senior-verification.php

class-vx-membership-hooks.php
    ├── escucha → hooks del gateway de pago (Stripe/PayU)
    └── llama   → class-vx-membership.php
```
