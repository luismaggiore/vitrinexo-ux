# Desarrollo del theme — vitrinexo-theme

Especificaciones de implementación para el theme de WordPress. Cubre la frontera plugin/theme, template parts, shortcodes, JavaScript, nonces, imágenes y la página de perfil.

---

## 1. Frontera plugin / theme

### La regla

| Capa | Responsabilidad | Lo que NUNCA hace |
|---|---|---|
| **Plugin** (`vitrinexo-core/`) | Datos, lógica, BD, emails, hooks | Generar HTML |
| **Theme** (`vitrinexo-theme/`) | Todo el HTML, templates, CSS, JS | Llamar `get_user_meta()` directamente, usar `$wpdb` |
| **Shortcode** | Puente: verifica auth + llama `get_template_part()` | Generar HTML propio |

### Regla práctica para Claude Code

- Si un archivo en `vitrinexo-core/` contiene HTML → **está mal**
- Si un archivo en `vitrinexo-theme/` llama `get_user_meta()` directamente → **está mal**
- El theme siempre obtiene datos a través de las clases del plugin (`VX_User`, `VX_Directory`, etc.)

### Excepción válida

Shortcodes de fragmentos pequeños y reutilizables (`[vx_empty_state]`) pueden devolver HTML directamente desde el plugin. Son la excepción, no la regla.

### Ejemplo de la frontera en acción

```php
// ✅ BIEN — plugin provee datos, theme renderiza
// En vitrinexo-core/shortcodes/shortcodes-auth.php
add_shortcode('vx_directorio', function() {
    if (!is_user_logged_in()) return '';
    get_template_part('templates/page-directorio');
});

// En vitrinexo-theme/templates/page-directorio.php
$result = VX_Directory::get_members(array_merge($_GET, ['page' => absint($_GET['page'] ?? 1)]));
$users  = $result['users'];
$total  = $result['total'];
$pages  = $result['pages'];
foreach ($users as $user) {
    get_template_part('partials/card-member', null, [
        'user'    => $user,
        'context' => 'directorio',
    ]);
}

// ❌ MAL — theme accediendo directamente a BD
// En vitrinexo-theme/templates/page-directorio.php
$estado = get_user_meta($user_id, 'vx_estado', true); // NO
```

---

## 2. Template parts con parámetros

WordPress 5.5+ permite pasar datos a los template parts via el tercer argumento de `get_template_part()`. Todos los partials de Vitrinexo reciben sus datos así — nunca usan variables globales.

### `partials/card-member.php`

El componente más complejo. Muestra diferente según el contexto en que se usa.

**Parámetros:**

```php
get_template_part('partials/card-member', null, [
    'user'     => $vx_user,      // instancia VX_User — obligatorio
    'context'  => 'directorio',  // string — obligatorio
    'max_tags' => 2,             // int — opcional, default 2
]);
```

**Valores de `context` y su comportamiento:**

| Context | Labels mostrados | Tags mostrados |
|---|---|---|
| `directorio` | "Ofrece" + "Busca" en una línea | Offer + Seek mezclados, máx `max_tags` de cada tipo, aleatorios |
| `favoritos` | "Ofrece" + "Busca" en una línea | Igual que directorio |
| `comunidad` | "Ofrece" + "Busca" en una línea | Igual que directorio |
| `seeks` | Solo "Ofrece" | Solo offer_tags, máx `max_tags`, aleatorios |
| `offers` | Solo "Busca" | Solo seek_tags, máx `max_tags`, aleatorios |
| `dashboard` | "Ofrece" + "Busca" en una línea | Máx 1 de cada tipo, aleatorios |

**Implementación interna:**

```php
// partials/card-member.php
$user    = $args['user'];
$context = $args['context'] ?? 'directorio';
$max     = $args['max_tags'] ?? 2;

$offer_tags = $user->get_offer_tags();
$seek_tags  = $user->get_seek_tags();

// Selección aleatoria
shuffle($offer_tags);
shuffle($seek_tags);
$offer_tags = array_slice($offer_tags, 0, $max);
$seek_tags  = array_slice($seek_tags, 0, $max);

// Renderizado condicional según context
if ($context === 'seeks') {
    // Solo labels y tags de oferta
} elseif ($context === 'offers') {
    // Solo labels y tags de búsqueda
} else {
    // Ambos mezclados (directorio, favoritos, comunidad, dashboard)
}
```

---

### `partials/empty-state.php`

**Parámetros:**

```php
get_template_part('partials/empty-state', null, [
    'type'      => 'favoritos',          // string — obligatorio, determina ícono/título/desc
    'cta_label' => 'Explorar directorio', // string — opcional
    'cta_url'   => '/directorio/',        // string — opcional
]);
```

**Tipos disponibles y su contenido:**

| Type | Ícono | Título | Descripción |
|---|---|---|---|
| `favoritos` | ti-heart | Aún no tienes favoritos | Cuando guardes un perfil aparecerá aquí |
| `conexiones-concretadas` | ti-network | Todavía no tienes conexiones concretadas | Cuando alguien acepte... |
| `conexiones-enviadas` | ti-send | No has enviado solicitudes aún | Cuando hagas clic en Conectar... |
| `conexiones-recibidas` | ti-inbox | No tienes solicitudes pendientes | Cuando alguien quiera conectar... |
| `matches` | ti-sparkles | Aún no hay matches para ti | Completa tus tags... |
| `notificaciones` | ti-bell | No tienes notificaciones | Aquí aparecerán... |
| `busqueda` | ti-search | No encontramos resultados | Intenta con otros términos... |

---

### `partials/modal-conectar.php`

**Parámetros:**

```php
get_template_part('partials/modal-conectar', null, [
    'receptor_id'     => $user_id,       // int — obligatorio
    'receptor_nombre' => 'Ana García',   // string — obligatorio
]);
```

Internamente obtiene las empresas del emisor:

```php
// partials/modal-conectar.php
$receptor_id     = $args['receptor_id'];
$receptor_nombre = $args['receptor_nombre'];

// Empresas del usuario actual (emisor)
$emisor   = VX_User::get(get_current_user_id());
$empresas = $emisor->get_empresas();
// Las renderiza como checkboxes para que el emisor elija desde cuál contacta
```

---

### `partials/pagination.php`

Reutilizable en directorio, matches, favoritos, notificaciones.

**Parámetros:**

```php
get_template_part('partials/pagination', null, [
    'total'    => $result['total'],    // int — total de items
    'per_page' => 20,                  // int
    'current'  => absint($_GET['page'] ?? 1), // int
    'base_url' => strtok($_SERVER['REQUEST_URI'], '?'), // string — URL sin query params
]);
```

Internamente usa `VX_Pagination_Helper::build()` y renderiza con Bootstrap `.pagination`.

---

## 3. Sistema de shortcodes

### Estructura de archivos

```
vitrinexo-core/
└── shortcodes/
    ├── shortcodes-public.php      # Páginas sin auth
    ├── shortcodes-auth.php        # Páginas autenticadas
    ├── shortcodes-flow.php        # Flujos de verificación y onboarding
    └── shortcodes-fragments.php   # Fragmentos pequeños (empty_state, etc.)
```

### Anatomía de un shortcode

**Páginas públicas** — solo cargan el template:

```php
add_shortcode('vx_landing', function() {
    get_template_part('templates/front-page');
});

add_shortcode('vx_landing_4dinner', function() {
    get_template_part('templates/page-4dinner-landing');
});
```

**Páginas autenticadas** — verifican sesión y cargan el template:

```php
add_shortcode('vx_directorio', function() {
    if (!is_user_logged_in()) return '';
    // El guard de template_redirect en VX_Auth ya redirigió
    // si el usuario no es miembro activo. Aquí solo cargamos.
    get_template_part('templates/page-directorio');
});
```

**Shortcode de perfil** — único que procesa atributos:

```php
add_shortcode('vx_perfil', function($atts) {
    if (!is_user_logged_in()) return '';

    $atts    = shortcode_atts(['user_id' => 0], $atts);
    $user_id = $atts['user_id'] ? (int) $atts['user_id'] : get_current_user_id();

    // Pasar el user_id al template via query var
    set_query_var('vx_perfil_user_id', $user_id);
    get_template_part('templates/page-perfil');
});
```

**Shortcodes de comunidades** — tres templates separados, un shortcode con switch:

```php
add_shortcode('vx_comunidad', function($atts) {
    if (!is_user_logged_in()) return '';
    $atts = shortcode_atts(['community' => ''], $atts);

    switch ($atts['community']) {
        case 'out2b':
            get_template_part('templates/page-comunidad-out2b');
            break;
        case 'woman':
            get_template_part('templates/page-comunidad-woman');
            break;
        case 'senior':
            get_template_part('templates/page-comunidad-senior');
            break;
    }
});
```

Cada template de comunidad es independiente con sus propios colores y copy. Consultan `VX_Community::get_members('out2b')` etc.

### URL del perfil con slug — rewrite rule

La URL `/perfil/felipe-munoz` usa un rewrite rule custom. El shortcode `[vx_perfil]` en la página de WordPress lo recibe via query var:

```php
// En vitrinexo-core/modules/users/class-vx-auth.php o class-vx-rewrite.php
add_action('init', function() {
    add_rewrite_rule(
        '^perfil/([^/]+)/?$',
        'index.php?pagename=perfil&vx_perfil_slug=$matches[1]',
        'top'
    );
});

add_filter('query_vars', function($vars) {
    $vars[] = 'vx_perfil_slug';
    return $vars;
});
```

En el template, resolver el slug a user_id:

```php
// templates/page-perfil.php
$slug = get_query_var('vx_perfil_slug');
if ($slug) {
    $users = get_users([
        'meta_key'   => VX_User_Meta::PERFIL_SLUG,
        'meta_value' => $slug,
        'number'     => 1,
        'fields'     => 'ID',
    ]);
    $user_id = !empty($users) ? (int) $users[0] : 0;
} else {
    $user_id = get_query_var('vx_perfil_user_id') ?: get_current_user_id();
}
```

---

## 4. JavaScript del frontend

### Principio rector

**Menos JS = menos bugs.** WordPress renderiza en servidor. JS solo para lo que no tiene alternativa razonable.

### Qué hace JS y qué hace reload

| Acción | Implementación |
|---|---|
| Filtros del directorio | Form submit → reload con query params |
| Aceptar/rechazar conexión | Form POST → redirect a página de resultado |
| Agregar/quitar favorito | Form POST → reload de página actual |
| Marcar notificaciones como leídas | Form POST → reload |
| Tabs (conexiones, matches) | Bootstrap puro — sin JS custom |
| Navegación entre pasos del onboarding | JS (wizard necesita estado sin reload) |
| Upload foto/logo con preview | JS (preview inmediato + fetch al endpoint) |
| Badge de notificaciones no leídas | JS fetch al cargar página |
| Toggle de tags en onboarding | JS |
| Toggle de comunidades en onboarding | JS |

### `main.js` — carga en todas las páginas

Hace tres cosas solamente:

1. Toggle del nav mobile (Bootstrap ya lo maneja, revisar si se necesita algo custom)
2. Fetch al cargar para el badge de notificaciones no leídas
3. Inicialización de tooltips de Bootstrap si se usan

```javascript
// Badge de notificaciones
document.addEventListener('DOMContentLoaded', async function() {
    if (!document.querySelector('.notif-dot')) return;

    const res  = await fetch(vx_data.api_url + 'notificaciones/unread-count', {
        headers: { 'X-WP-Nonce': vx_data.nonce }
    });
    const json = await res.json();

    const dot = document.querySelector('.notif-dot');
    if (json.count > 0) {
        dot.classList.add('notif-dot--visible');
        dot.textContent = json.count > 9 ? '9+' : json.count;
    }
});
```

### `onboarding.js` — solo en `/onboarding/`

**Función principal `goTo(step)`:**

```javascript
async function goTo(step) {
    const goingBack = step < current;
    const datos     = collectStepData(current);

    // Guardar siempre — tanto al avanzar como al retroceder
    // Al retroceder no se valida (partial: true)
    const res = await fetch(vx_data.api_url + 'onboarding/paso', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce':   vx_data.nonce,
        },
        body: JSON.stringify({
            paso:    current,
            datos:   datos,
            partial: goingBack, // true = no validar campos obligatorios
        }),
    });

    // Manejar nonce expirado (sesión larga)
    if (res.status === 403) {
        window.location.reload();
        return;
    }

    const json = await res.json();

    // Al avanzar: si hay errores no navegar
    if (!goingBack && !json.success) {
        showErrors(json.errors);
        return;
    }

    // Navegar
    document.getElementById('panel-' + current).classList.remove('ob-panel--active');
    current = step;
    document.getElementById('panel-' + current).classList.add('ob-panel--active');
    updateIndicators();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
```

**Función `collectStepData(paso)`** — lee el DOM y construye el objeto de datos:

```javascript
function collectStepData(paso) {
    switch(paso) {
        case 2: return {
            nombre:             document.querySelector('#panel-2 [name="nombre"]')?.value ?? '',
            apellido:           document.querySelector('#panel-2 [name="apellido"]')?.value ?? '',
            bio:                document.querySelector('#panel-2 [name="bio"]')?.value ?? '',
            ciudad:             document.querySelector('#panel-2 [name="ciudad"]')?.value ?? '',
            pais:               document.querySelector('#panel-2 [name="pais"]')?.value ?? '',
            contacto_preferido: document.querySelector('#panel-2 [name="contacto_preferido"]')?.value ?? '',
            foto_id:            document.getElementById('foto-attachment-id')?.value ?? '',
        };
        case 3: return {
            empresa_nombre:   document.querySelector('#panel-3 [name="empresa_nombre"]')?.value ?? '',
            empresa_cargo:    document.querySelector('#panel-3 [name="empresa_cargo"]')?.value ?? '',
            empresa_web:      document.querySelector('#panel-3 [name="empresa_web"]')?.value ?? '',
            empresa_linkedin: document.querySelector('#panel-3 [name="empresa_linkedin"]')?.value ?? '',
            empresa_logo_id:  document.getElementById('logo-empresa-attachment-id')?.value ?? '',
        };
        case 4: return {
            offer_tags: [...document.querySelectorAll('.tag-option--selected-offer')]
                            .map(el => el.textContent.trim()),
            seek_tags:  [...document.querySelectorAll('.tag-option--selected-seek')]
                            .map(el => el.textContent.trim()),
        };
        case 5: return {
            out2b:  document.querySelector('[data-community="out2b"]')
                        ?.classList.contains('community-toggle--selected') ?? false,
            woman:  document.querySelector('[data-community="woman"]')
                        ?.classList.contains('community-toggle--selected') ?? false,
            senior: document.querySelector('[data-community="senior"]')
                        ?.classList.contains('community-toggle--selected') ?? false,
        };
        default: return {};
    }
}
```

**Carga del estado al iniciar** — para retomar donde se quedó:

```javascript
async function loadState() {
    const res  = await fetch(vx_data.api_url + 'onboarding/estado', {
        headers: { 'X-WP-Nonce': vx_data.nonce }
    });
    const json = await res.json();

    if (json.paso_actual > 1) {
        current = json.paso_actual;
        populateStep(json.paso_actual, json.datos);
        document.getElementById('panel-' + current).classList.add('ob-panel--active');
        updateIndicators();
    }
}

document.addEventListener('DOMContentLoaded', loadState);
```

**`populateStep(paso, datos)`** — repuebla el DOM con los datos guardados:

```javascript
function populateStep(paso, datos) {
    if (paso >= 2 && datos[2]) {
        document.querySelector('#panel-2 [name="nombre"]').value  = datos[2].nombre  ?? '';
        document.querySelector('#panel-2 [name="apellido"]').value = datos[2].apellido ?? '';
        // ... resto de campos
    }
    if (paso >= 4 && datos[4]) {
        // Re-seleccionar los tags guardados
        datos[4].offer_tags?.forEach(tag => {
            document.querySelectorAll('.tag-option').forEach(el => {
                if (el.textContent.trim() === tag) {
                    el.classList.add('tag-option--selected-offer');
                }
            });
        });
    }
    // etc.
}
```

### `directorio.js` — filtros y búsqueda

Prácticamente vacío. Los filtros son un form HTML que hace submit normal (reload con query params). El único JS necesario es mantener el estado de los filtros activos:

```javascript
// Los filtros del form ya persisten via PHP (value="<?php echo esc_attr($_GET['q'] ?? '') ?>")
// Solo se necesita JS para el botón "limpiar filtros" individual
document.querySelectorAll('.filter-remove').forEach(btn => {
    btn.addEventListener('click', function() {
        const param  = this.dataset.param;
        const url    = new URL(window.location.href);
        url.searchParams.delete(param);
        window.location.href = url.toString();
    });
});
```

### `conexiones.js` — prácticamente eliminado

Con el enfoque de reload, `conexiones.js` ya no existe como archivo significativo. Los botones de aceptar/rechazar son forms HTML:

```html
<!-- En templates/page-conexiones.php y en dashboard -->
<form method="POST" action="<?php echo rest_url('vitrinexo/v1/conexiones/aceptar') ?>">
    <input type="hidden" name="conexion_id" value="<?php echo $conexion_id ?>">
    <?php wp_nonce_field('vx_conexiones', '_wpnonce') ?>
    <input type="hidden" name="redirect_to" value="/conexion-aceptada/">
    <button type="submit" class="btn-vx btn-soft-primary btn-vx-sm">
        <i class="ti ti-check me-1"></i>Aceptar
    </button>
</form>
```

El endpoint al procesar hace `wp_safe_redirect()` al finalizar.

Las tabs (Enviadas/Recibidas/Concretadas) usan Bootstrap con `data-bs-toggle` — sin JS custom.

---

## 5. Nonces

### Flujo completo

El nonce se genera en PHP y se inyecta en el JS via `wp_localize_script()`:

```php
// vitrinexo-theme/functions.php
add_action('wp_enqueue_scripts', function() {

    wp_enqueue_script('vx-main',
        get_template_directory_uri() . '/assets/js/main.js',
        ['jquery'], VX_VERSION, true
    );

    if (is_user_logged_in()) {
        wp_localize_script('vx-main', 'vx_data', [
            'nonce'   => wp_create_nonce('wp_rest'),
            'api_url' => rest_url(VX_REST_NAMESPACE . '/'),
            'user_id' => get_current_user_id(),
        ]);
    }

    // Scripts adicionales solo en páginas específicas
    if (is_page('onboarding')) {
        wp_enqueue_script('vx-onboarding',
            get_template_directory_uri() . '/assets/js/onboarding.js',
            ['vx-main'], VX_VERSION, true
        );
    }

    if (is_page('directorio') || is_page('directorio/buscar')) {
        wp_enqueue_script('vx-directorio',
            get_template_directory_uri() . '/assets/js/directorio.js',
            ['vx-main'], VX_VERSION, true
        );
    }
});
```

### En llamadas fetch (JS → REST API)

```javascript
fetch(vx_data.api_url + 'onboarding/paso', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce':   vx_data.nonce,  // WordPress verifica este header automáticamente
    },
    body: JSON.stringify(datos),
});
```

WordPress verifica el header `X-WP-Nonce` automáticamente en todos los endpoints REST. No se necesita código extra en el `permission_callback`.

### En forms HTML (PHP → endpoint REST con redirect)

```php
// En el template
<form method="POST" action="<?php echo esc_url(rest_url('vitrinexo/v1/conexiones/aceptar')) ?>">
    <?php wp_nonce_field('vx_conexiones', '_wpnonce') ?>
    <input type="hidden" name="conexion_id" value="<?php echo absint($conexion_id) ?>">
    <input type="hidden" name="redirect_to" value="<?php echo esc_url(home_url('/conexion-aceptada/')) ?>">
    <button type="submit">Aceptar</button>
</form>
```

```php
// En el endpoint que recibe el POST
if (!wp_verify_nonce($_POST['_wpnonce'] ?? '', 'vx_conexiones')) {
    wp_die('Acción no autorizada.', 403);
}
// ... procesar
wp_safe_redirect($_POST['redirect_to'] ?? home_url('/conexiones/'));
exit;
```

### Nonce expirado (12 horas)

En JS, siempre manejar el 403 por nonce expirado:

```javascript
if (res.status === 403) {
    // Recargar para obtener un nonce fresco
    window.location.reload();
    return;
}
```

---

## 6. Manejo de imágenes

### Endpoint de upload

```
POST /wp-json/vitrinexo/v1/upload
Content-Type: multipart/form-data
X-WP-Nonce: {nonce}

file: [archivo de imagen]
tipo: 'foto' | 'logo' | 'banner'   ← para validar dimensiones según el tipo
```

**Respuesta:**
```json
{
    "success": true,
    "attachment_id": 317,
    "url": "https://vitrinexo.com/wp-content/uploads/2026/05/foto-felipe.jpg"
}
```

**Implementación:**

```php
class VX_Upload {
    const MAX_SIZE  = 2 * 1024 * 1024; // 2MB
    const ALLOWED   = ['image/jpeg', 'image/png', 'image/webp'];

    public static function handle(WP_REST_Request $request): WP_REST_Response {
        $file = $_FILES['file'] ?? null;
        if (!$file) {
            return new WP_REST_Response(['error' => 'no_file'], 400);
        }

        if (!in_array($file['type'], self::ALLOWED)) {
            return new WP_REST_Response(['error' => 'tipo_invalido'], 400);
        }

        if ($file['size'] > self::MAX_SIZE) {
            return new WP_REST_Response(['error' => 'archivo_muy_grande'], 400);
        }

        require_once ABSPATH . 'wp-admin/includes/image.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';

        $attachment_id = media_handle_upload('file', 0);

        if (is_wp_error($attachment_id)) {
            return new WP_REST_Response(['error' => 'upload_fallido'], 500);
        }

        // Asociar al usuario actual
        wp_update_post([
            'ID'          => $attachment_id,
            'post_author' => get_current_user_id(),
        ]);

        return new WP_REST_Response([
            'success'       => true,
            'attachment_id' => $attachment_id,
            'url'           => wp_get_attachment_image_url($attachment_id, 'medium'),
        ], 201);
    }
}
```

### Tamaños de imagen registrados

```php
// vitrinexo-theme/functions.php
add_action('after_setup_theme', function() {
    add_theme_support('post-thumbnails');
    add_image_size('vx-avatar', 200, 200, true);   // foto perfil — cuadrado
    add_image_size('vx-logo',   200, 200, true);   // logo empresa — cuadrado
    add_image_size('vx-banner', 1200, 375, true);  // banner — proporción 16:5
    add_image_size('vx-card',   400, 400, true);   // imagen en tarjeta directorio
});
```

### JS en el onboarding para el upload

```javascript
// Para foto de perfil (paso 2) — igual para logo empresa (paso 3)
document.getElementById('foto-input').addEventListener('change', async function() {
    const file = this.files[0];
    if (!file) return;

    // Preview inmediato sin esperar el upload
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('foto-preview').src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Subir a WordPress
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', 'foto');

    const res = await fetch(vx_data.api_url + 'upload', {
        method:  'POST',
        headers: { 'X-WP-Nonce': vx_data.nonce },
        // Sin Content-Type — el browser lo setea automáticamente con boundary
        body: formData,
    });

    if (res.status === 403) { window.location.reload(); return; }

    const json = await res.json();
    if (json.success) {
        // Guardar attachment_id en campo hidden para enviarlo al guardar el paso
        document.getElementById('foto-attachment-id').value = json.attachment_id;
    } else {
        // Mostrar error al usuario
        showUploadError(json.error);
    }
});
```

### Uso en templates PHP

```php
// En partials/card-member.php
$foto_id  = $user->get_foto();
$foto_url = $foto_id
    ? wp_get_attachment_image_url($foto_id, 'vx-card')
    : get_template_directory_uri() . '/assets/img/placeholder.webp';

// En templates/page-perfil.php — banner de empresa
$banner_id  = get_post_meta($empresa->ID, 'vx_banner', true);
$banner_url = $banner_id
    ? wp_get_attachment_image_url($banner_id, 'vx-banner')
    : null; // Sin banner → no renderizar la sección
```

---

## 7. Página de perfil público — `/perfil/{slug}`

### Resolución del usuario

```php
// templates/page-perfil.php

// 1. Intentar resolver por slug (URL /perfil/felipe-munoz)
$slug = get_query_var('vx_perfil_slug');
if ($slug) {
    $users = get_users([
        'meta_key'   => VX_User_Meta::PERFIL_SLUG,
        'meta_value' => sanitize_title($slug),
        'number'     => 1,
        'fields'     => 'ID',
    ]);
    $profile_id = !empty($users) ? (int) $users[0] : 0;
} else {
    // Fallback: shortcode con user_id o perfil propio
    $profile_id = get_query_var('vx_perfil_user_id') ?: get_current_user_id();
}

// 2. Verificar que el usuario existe
$profile_user = VX_User::get($profile_id);
if (!$profile_user) {
    get_template_part('templates/page-404');
    return;
}

$viewer_id = get_current_user_id();
$is_own    = $viewer_id === $profile_id;
```

### Estado del botón "Conectar"

```php
$btn_state = 'none'; // para perfil propio

if (!$is_own) {
    $conexion = VX_Connection::get_between($viewer_id, $profile_id);

    if (!$conexion) {
        $btn_state = 'disponible';

    } elseif ($conexion->get_estado() === 'pendiente') {
        $btn_state = $conexion->get_emisor_id() === $viewer_id
            ? 'enviada'    // yo la envié, espero respuesta
            : 'recibida';  // me la enviaron, puedo responder

    } elseif ($conexion->get_estado() === 'aceptado') {
        $btn_state = 'conectado';

    } elseif ($conexion->get_estado() === 'rechazado') {
        $btn_state = 'oculto'; // no mostrar nada — rechazo privado

    } elseif ($conexion->get_estado() === 'sin_respuesta') {
        $btn_state = 'disponible'; // permitir reintentar
    }
}
```

### Lo que renderiza cada estado del botón

| Estado | Qué se muestra |
|---|---|
| `none` | Nada (es el perfil propio) |
| `disponible` | Botón "Conectar" → abre `modal-conectar` |
| `enviada` | Badge "Solicitud enviada · esperando respuesta" |
| `recibida` | Botón "Ver solicitud" → link a `/conexiones/` tab Recibidas |
| `conectado` | Card verde con datos de contacto revelados (email, teléfono, LinkedIn, badge Preferido) |
| `oculto` | Nada — el rechazo es privado, el emisor no sabe que fue rechazado |

### Botón de favorito

```php
$es_favorito = !$is_own && VX_Favorites::is_favorite($viewer_id, $profile_id);
```

Renderizado como form HTML con redirect al mismo perfil:

```html
<form method="POST" action="<?php echo esc_url(rest_url('vitrinexo/v1/favoritos/' . $profile_id)) ?>">
    <?php wp_nonce_field('vx_favoritos', '_wpnonce') ?>
    <input type="hidden" name="_method" value="<?php echo $es_favorito ? 'DELETE' : 'POST' ?>">
    <input type="hidden" name="redirect_to" value="<?php echo esc_url(get_permalink()) ?>">
    <button type="submit" class="btn-vx btn-ghost-vx btn-vx-sm btn-vx-icon-sm">
        <i class="ti ti-heart<?php echo $es_favorito ? '-filled' : '' ?>"></i>
    </button>
</form>
```

### Tags en el perfil

En el perfil se muestran **todos** los tags, no el máximo de 2 de la tarjeta:

```php
$offer_tags = $profile_user->get_offer_tags(); // todos, sin shuffle
$seek_tags  = $profile_user->get_seek_tags();  // todos, sin shuffle
```

### Comunidades visibles

Solo se muestran comunidades confirmadas (Senior requiere verificación):

```php
$comunidades = [];
if ($profile_user->is_in_community('out2b'))  $comunidades[] = 'out2b';
if ($profile_user->is_in_community('woman'))  $comunidades[] = 'woman';

// Senior solo si está verificado — no si solo fue solicitado
if ($profile_user->is_in_community('senior') && $profile_user->is_senior_verified()) {
    $comunidades[] = 'senior';
}
```

### Empresa activa

```php
$empresa = $profile_user->get_empresa_activa();
// null → no renderizar la sección de empresa
// Si hay empresa → logo, nombre, cargo, web, linkedin, descripción, cliente ideal
```

### Búsqueda de perfiles 404

Si el slug no existe en la BD → `get_template_part('templates/page-404')`.

### Método nuevo requerido en `VX_Connection`

```php
/**
 * Busca una conexión entre dos usuarios en cualquier dirección.
 * Devuelve la más reciente si existe más de una (ej: sin_respuesta + nueva).
 */
public static function get_between(int $user_a, int $user_b): ?VX_Connection {
    $posts = get_posts([
        'post_type'      => 'vx_conexion',
        'post_status'    => 'publish',
        'posts_per_page' => 1,
        'orderby'        => 'date',
        'order'          => 'DESC',
        'meta_query'     => [
            'relation' => 'OR',
            [
                'relation' => 'AND',
                ['key' => 'vx_emisor_id',   'value' => $user_a],
                ['key' => 'vx_receptor_id', 'value' => $user_b],
            ],
            [
                'relation' => 'AND',
                ['key' => 'vx_emisor_id',   'value' => $user_b],
                ['key' => 'vx_receptor_id', 'value' => $user_a],
            ],
        ],
    ]);

    return $posts ? self::get($posts[0]->ID) : null;
}
```

---

## 8. Búsqueda multifactorial en el directorio

Los filtros se acumulan en la URL como query params. Todos se aplican simultáneamente — no son búsquedas separadas.

### URL de ejemplo

```
/directorio/?q=marketing&pais=Chile&rubro=tecnologia&fundador=1&page=2
```

### Cómo el template recoge y pasa los filtros

```php
// templates/page-directorio.php
$args = [
    'q'         => sanitize_text_field($_GET['q']        ?? ''),
    'pais'      => sanitize_text_field($_GET['pais']      ?? ''),
    'rubro'     => sanitize_text_field($_GET['rubro']     ?? ''),
    'comunidad' => sanitize_text_field($_GET['comunidad'] ?? ''),
    'fundador'  => !empty($_GET['fundador']),
    'page'      => absint($_GET['page'] ?? 1),
    'per_page'  => 20,
];

// Si hay query de texto, usar VX_Search; si no, VX_Directory
$result = !empty($args['q'])
    ? VX_Search::search($args['q'], $args)
    : VX_Directory::get_members($args);
```

### Persistir el estado de los filtros en el form

```php
<!-- Los campos del form muestran el valor actual de $_GET -->
<input type="text" name="q" 
       value="<?php echo esc_attr($_GET['q'] ?? '') ?>"
       placeholder="Buscar...">

<select name="pais">
    <option value="">Todos los países</option>
    <?php foreach ($paises as $pais): ?>
    <option value="<?php echo esc_attr($pais) ?>"
            <?php selected($_GET['pais'] ?? '', $pais) ?>>
        <?php echo esc_html($pais) ?>
    </option>
    <?php endforeach ?>
</select>
```

### Tags removibles de filtros activos

Cada filtro activo se muestra como tag con botón de cerrar. El botón es un link que reconstruye la URL sin ese parámetro — **sin JS**:

```php
<?php if (!empty($_GET['pais'])): ?>
<a href="<?php echo esc_url(remove_query_arg('pais')) ?>" class="filter-tag-active">
    <?php echo esc_html($_GET['pais']) ?>
    <i class="ti ti-x"></i>
</a>
<?php endif ?>
```

`remove_query_arg('pais')` es una función nativa de WordPress que devuelve la URL actual sin ese parámetro. No se necesita JS para esto.
