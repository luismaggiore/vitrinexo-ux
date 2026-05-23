# Esquema de datos — Vitrinexo

Estructura real de los datos en la base de datos de WordPress. Cómo se ven los registros, qué queries hace cada módulo y cuáles son los valores esperados.

---

## Tablas de WordPress usadas

Vitrinexo no crea tablas custom. Usa las tablas nativas de WordPress:

| Tabla | Uso |
|---|---|
| `wp_users` | Usuarios registrados |
| `wp_usermeta` | Todos los meta del usuario (estado, tags, membresía, etc.) |
| `wp_posts` | CPTs: vx_empresa, vx_conexion, vx_dinner, vx_notification |
| `wp_postmeta` | Meta de los CPTs |
| `wp_options` | Configuración global del plugin |

---

## Usuarios — `wp_usermeta`

### Ejemplo de un miembro activo completo

```sql
SELECT meta_key, meta_value FROM wp_usermeta WHERE user_id = 42;
```

```
meta_key                    meta_value
────────────────────────────────────────────────────────────
vx_nombre                   Felipe
vx_apellido                 Muñoz
vx_perfil_slug              felipe-munoz
vx_foto                     317                         ← attachment_id
vx_bio                      Director de marketing B2B con 12 años de experiencia
vx_ciudad                   Santiago
vx_pais                     Chile
vx_contacto_preferido       email
vx_telefono                 +56912345678
vx_linkedin                 https://linkedin.com/in/felipemunoz

vx_estado                   activo
vx_tipo_verificacion        automatica
vx_onboarding_completo      true
vx_onboarding_paso          6

vx_plan                     fundador
vx_plan_estado              activo
vx_plan_inicio              1716400000                  ← timestamp Unix
vx_plan_vencimiento                                     ← vacío = no vence
vx_precio_preferente        true
vx_gateway_customer_id                                  ← vacío hasta conectar gateway

vx_comunidad_out2b
vx_comunidad_woman
vx_comunidad_senior         true
vx_senior_solicitado        true
vx_senior_verificado        true

vx_offer_tags               a:3:{i:0;s:18:"marketing digital";i:1;s:8:"branding";i:2;s:6:"CRM";}
vx_seek_tags                a:2:{i:0;s:20:"alianzas comerciales";i:1;s:19:"partners tecnológicos";}
vx_offer_texto              Ofrezco consultoría en marketing B2B y estrategia de marca...
vx_seek_texto               Busco socios tecnológicos para integrar soluciones CRM...

vx_dinners_asignado         a:1:{i:0;i:89;}             ← array de dinner_ids
vx_dinners_interesado       a:2:{i:0;i:89;i:1;i:92;}
```

**Nota sobre arrays serializados:** WordPress serializa los arrays al guardarlos con `update_user_meta()`. Para leerlos correctamente usar siempre `get_user_meta($id, $key, true)` (el tercer parámetro `true` devuelve el valor deserializado).

### Ejemplo de usuario pendiente (correo genérico)

```
vx_estado                   pendiente
vx_tipo_verificacion        manual
vx_token_confirmacion       a4b2c3d4-e5f6-7890-abcd-ef1234567890
vx_token_expira             1716486400                  ← timestamp Unix (72h desde registro)
vx_onboarding_completo
vx_plan                     gratuito
```

---

## CPT: vx_empresa

### Estructura de un post

```sql
SELECT * FROM wp_posts WHERE post_type = 'vx_empresa' AND ID = 55;
```

```
ID             55
post_author    42                  ← user_id del dueño
post_title     Maggiore Marketing
post_status    publish
post_type      vx_empresa
```

```sql
SELECT meta_key, meta_value FROM wp_postmeta WHERE post_id = 55;
```

```
meta_key            meta_value
────────────────────────────────────────────────────
vx_user_id          42
vx_cargo            Director General
vx_logo             318             ← attachment_id
vx_banner           319             ← attachment_id
vx_web              https://maggiore.cl
vx_linkedin         https://linkedin.com/company/maggiore
vx_descripcion      Agencia de marketing B2B especializada en LATAM
vx_cliente_ideal    Empresas medianas que quieren expandirse regionalmente
vx_empresa_activa   true
```

### Query: obtener empresa activa de un usuario

```php
$empresa = get_posts([
    'post_type'  => 'vx_empresa',
    'meta_query' => [
        ['key' => 'vx_user_id',        'value' => $user_id],
        ['key' => 'vx_empresa_activa', 'value' => 'true'],
    ],
    'posts_per_page' => 1,
    'post_status'    => 'publish',
]);
```

### Query: obtener todas las empresas de un usuario

```php
$empresas = get_posts([
    'post_type'      => 'vx_empresa',
    'meta_key'       => 'vx_user_id',
    'meta_value'     => $user_id,
    'posts_per_page' => -1,
    'post_status'    => 'publish',
]);
```

---

## CPT: vx_conexion

### Estructura de un post

```sql
SELECT * FROM wp_posts WHERE post_type = 'vx_conexion' AND ID = 73;
```

```
ID             73
post_title     Conexión: Felipe Muñoz → Ana García
post_status    publish
post_type      vx_conexion
post_date      2026-05-20 14:32:00
```

```sql
SELECT meta_key, meta_value FROM wp_postmeta WHERE post_id = 73;
```

```
meta_key                        meta_value
───────────────────────────────────────────────────────────────
vx_emisor_id                    42
vx_emisor_nombre                Felipe Muñoz
vx_emisor_email                 felipe@maggiore.cl
vx_emisor_telefono              +56912345678
vx_emisor_linkedin              https://linkedin.com/in/felipemunoz
vx_emisor_contacto_preferido    email
vx_emisor_empresas              a:1:{i:0;s:19:"Maggiore Marketing";}
vx_receptor_id                  58
vx_receptor_nombre              Ana García
vx_receptor_email               ana@brandlab.com    ← solo para envío, no se muestra
vx_pitch                        Vi tu perfil y creo que hay mucha complementariedad...
vx_estado                       aceptado
vx_fecha_envio                  1716214320          ← timestamp
vx_fecha_respuesta              1716297600          ← timestamp
vx_token_aceptar                               ← borrado al procesar
vx_token_rechazar                              ← borrado al procesar
vx_recordatorio_enviado         false
```

### Query: conexiones de un usuario (cualquier dirección)

```php
// Enviadas por el usuario
$enviadas = get_posts([
    'post_type'      => 'vx_conexion',
    'meta_key'       => 'vx_emisor_id',
    'meta_value'     => $user_id,
    'posts_per_page' => -1,
    'post_status'    => 'publish',
]);

// Recibidas por el usuario
$recibidas = get_posts([
    'post_type'      => 'vx_conexion',
    'meta_key'       => 'vx_receptor_id',
    'meta_value'     => $user_id,
    'posts_per_page' => -1,
    'post_status'    => 'publish',
]);

// Concretadas (aceptadas) en cualquier dirección
$concretadas = get_posts([
    'post_type'  => 'vx_conexion',
    'post_status'=> 'publish',
    'meta_query' => [
        'relation' => 'AND',
        ['key' => 'vx_estado', 'value' => 'aceptado'],
        [
            'relation' => 'OR',
            ['key' => 'vx_emisor_id',   'value' => $user_id],
            ['key' => 'vx_receptor_id', 'value' => $user_id],
        ],
    ],
]);
```

### Query: buscar por token

```php
// Busca la conexión con este token de aceptación
$posts = get_posts([
    'post_type'  => 'vx_conexion',
    'meta_key'   => 'vx_token_aceptar',
    'meta_value' => $token,
    'posts_per_page' => 1,
]);
```

### Query: conexiones pendientes sin recordatorio (+72h) — para el cron

```php
$cutoff = time() - (72 * HOUR_IN_SECONDS);
$pendientes = get_posts([
    'post_type'  => 'vx_conexion',
    'post_status'=> 'publish',
    'meta_query' => [
        ['key' => 'vx_estado',               'value' => 'pendiente'],
        ['key' => 'vx_recordatorio_enviado',  'value' => 'false'],
        ['key' => 'vx_fecha_envio',           'value' => $cutoff, 'compare' => '<=', 'type' => 'NUMERIC'],
    ],
]);
```

---

## CPT: vx_dinner

### Estructura de un post

```sql
SELECT * FROM wp_posts WHERE post_type = 'vx_dinner' AND ID = 89;
```

```
ID             89
post_title     4Dinner Santiago · 11 junio 2026
post_status    publish
post_type      vx_dinner
```

```sql
SELECT meta_key, meta_value FROM wp_postmeta WHERE post_id = 89;
```

```
meta_key                    meta_value
───────────────────────────────────────────────────────
vx_dinner_ciudad            Santiago
vx_dinner_pais              Chile
vx_dinner_fecha             1749686400          ← timestamp Unix (11 jun 2026 20:00 CLT)
vx_dinner_restaurante       La Favorita
vx_dinner_direccion         Av. Italia 1234, Providencia, Santiago
vx_dinner_cupos_total       4
vx_dinner_estado            completo
vx_dinner_asignados         a:4:{i:0;i:42;i:1;i:58;i:2;i:63;i:3;i:71;}
vx_dinner_interesados       a:6:{i:0;i:42;i:1;i:58;i:2;i:63;i:3;i:71;i:4;i:77;i:5;i:83;}
vx_dinner_notas_admin       Perfiles muy complementarios, buen mix de sectores
```

### Query: eventos activos con cupos disponibles

```php
$dinners = get_posts([
    'post_type'  => 'vx_dinner',
    'post_status'=> 'publish',
    'meta_query' => [
        ['key' => 'vx_dinner_estado', 'value' => 'abierto'],
        ['key' => 'vx_dinner_fecha',  'value' => time(), 'compare' => '>=', 'type' => 'NUMERIC'],
    ],
    'orderby'        => 'meta_value_num',
    'meta_key'       => 'vx_dinner_fecha',
    'order'          => 'ASC',
    'posts_per_page' => -1,
]);
```

### Query: verificar si usuario ya está en el evento

```php
$asignados = get_post_meta($dinner_id, 'vx_dinner_asignados', true) ?: [];
$esta_asignado = in_array($user_id, $asignados);

$interesados = get_post_meta($dinner_id, 'vx_dinner_interesados', true) ?: [];
$esta_interesado = in_array($user_id, $interesados);
```

---

## CPT: vx_notification

### Estructura de un post

```sql
SELECT * FROM wp_posts WHERE post_type = 'vx_notification' AND ID = 201;
```

```
ID             201
post_title     Conexión nueva de Felipe Muñoz
post_status    publish
post_type      vx_notification
post_date      2026-05-20 14:32:00
```

```sql
SELECT meta_key, meta_value FROM wp_postmeta WHERE post_id = 201;
```

```
meta_key            meta_value
──────────────────────────────────────────────────────
vx_notif_user_id    58                      ← destinatario
vx_notif_tipo       conexion_nueva
vx_notif_leida      false
vx_notif_fecha      1716214320
vx_notif_link       /conexiones
vx_notif_actor_id   42                      ← quien generó la notif
vx_notif_data       {"conexion_id":73,"emisor_nombre":"Felipe Muñoz","empresa":"Maggiore"}
```

### Query: notificaciones de un usuario (más recientes primero)

```php
$notifs = get_posts([
    'post_type'      => 'vx_notification',
    'post_status'    => 'publish',
    'meta_key'       => 'vx_notif_user_id',
    'meta_value'     => $user_id,
    'posts_per_page' => 20,
    'orderby'        => 'date',
    'order'          => 'DESC',
]);
```

### Query: conteo de no leídas (para el badge)

```php
$count = (new WP_Query([
    'post_type'      => 'vx_notification',
    'post_status'    => 'publish',
    'posts_per_page' => -1,
    'fields'         => 'ids',
    'meta_query'     => [
        ['key' => 'vx_notif_user_id', 'value' => $user_id],
        ['key' => 'vx_notif_leida',   'value' => 'false'],
    ],
]))->found_posts;
```

---

## Generación del perfil_slug

El slug del perfil se genera al completar el paso 2 del onboarding:

```php
function vx_generate_perfil_slug(string $nombre, string $apellido): string {
    $base = sanitize_title($nombre . ' ' . $apellido);
    // Ejemplo: "Felipe Muñoz" → "felipe-munoz"

    // Verificar si ya existe
    $existing = get_users([
        'meta_key'   => VX_User_Meta::PERFIL_SLUG,
        'meta_value' => $base,
        'number'     => 1,
        'fields'     => 'ID',
    ]);

    if (empty($existing)) {
        return $base; // "felipe-munoz"
    }

    // Agregar sufijo numérico
    $i = 2;
    do {
        $candidate = $base . '-' . $i;
        $existing  = get_users([
            'meta_key'   => VX_User_Meta::PERFIL_SLUG,
            'meta_value' => $candidate,
            'number'     => 1,
            'fields'     => 'ID',
        ]);
        $i++;
    } while (!empty($existing));

    return $candidate; // "felipe-munoz-2"
}
```

---

## wp_options — configuración del plugin

```php
// Guardadas con update_option() al activar el plugin
get_option('vx_version')              // '1.0.0'
get_option('vx_db_version')           // '1.0.0' (para migraciones futuras)
get_option('vx_pages_created')        // true (indica que las páginas WP ya existen)
get_option('vx_smtp_configured')      // true/false
```

---

## Datos del directorio — query principal

La query del directorio que ejecuta `VX_Directory::get_members()`:

```php
$args = [
    'meta_query' => [
        'relation' => 'AND',
        [
            'key'   => VX_User_Meta::ESTADO,
            'value' => VX_User_Meta::ESTADO_ACTIVO,
        ],
        [
            'key'   => VX_User_Meta::ONBOARDING_COMPLETO,
            'value' => 'true',
        ],
    ],
    'number'     => 20,
    'offset'     => 0,
    'orderby'    => 'registered',
    'order'      => 'DESC',
    'count_total'=> true,
];

// Filtro por país
if (!empty($args['pais'])) {
    $query_args['meta_query'][] = [
        'key'   => VX_User_Meta::PAIS,
        'value' => $args['pais'],
    ];
}

// Filtro por comunidad
if (!empty($args['comunidad'])) {
    $query_args['meta_query'][] = [
        'key'   => 'vx_comunidad_' . $args['comunidad'],
        'value' => 'true',
    ];
}

// Filtro por fundador
if (!empty($args['fundador'])) {
    $query_args['meta_query'][] = [
        'key'   => VX_User_Meta::PLAN,
        'value' => VX_User_Meta::PLAN_FUNDADOR,
    ];
}

$query  = new WP_User_Query($query_args);
$users  = $query->get_results();
$total  = $query->get_total();
```

---

## Datos del algoritmo de matches

El algoritmo de matches en `VX_Matches::get_seeks_matches()`:

```php
// Obtener mis seek_tags
$mis_seeks = get_user_meta($user_id, VX_User_Meta::SEEK_TAGS, true) ?: [];
// Ej: ['alianzas comerciales', 'partners tecnológicos']

// Query: usuarios cuyo offer_tags tenga al menos un elemento en común
// WordPress no soporta búsqueda en arrays serializados directamente,
// se usa LIKE para cada tag buscado
$meta_query = ['relation' => 'AND',
    // Solo usuarios activos con onboarding completo
    ['key' => VX_User_Meta::ESTADO,              'value' => 'activo'],
    ['key' => VX_User_Meta::ONBOARDING_COMPLETO, 'value' => 'true'],
    // Al menos un offer_tag coincide con mis seek_tags
    [
        'relation' => 'OR',
        // Una sub-cláusula por cada seek_tag
        ...array_map(fn($tag) => [
            'key'     => VX_User_Meta::OFFER_TAGS,
            'value'   => $tag,
            'compare' => 'LIKE',
        ], $mis_seeks),
    ],
];

// Excluir al usuario actual
$query_args['exclude'] = [$user_id];
```

**Nota de rendimiento:** La búsqueda LIKE en arrays serializados es poco eficiente a gran escala. Para fase inicial (< 1000 usuarios) es aceptable. A mayor escala se puede optimizar desnormalizando los tags en una tabla dedicada.
