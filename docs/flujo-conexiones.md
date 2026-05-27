# Flujo de conexiones — Vitrinexo
**Implementación en WordPress**

---

## Resumen del flujo

```
Usuario A hace clic en "Conectar" en el perfil de Usuario B
        ↓
Modal: selecciona empresa(s) desde la que contacta + escribe pitch
        ↓
POST /wp-json/vitrinexo/v1/conexiones
  → VX_Connection_Flow::create() crea CPT vx_conexion
  → Genera tokens UUID (aceptar y rechazar)
  → Envía email al receptor con pitch + botones
  → Crea notificación para el receptor
        ↓
¿Qué hace el receptor?
   ├─ Acepta ──────────────────────────────────────────────────────┐
   │  POST /wp-json/vitrinexo/v1/conexiones/aceptar               │
   │  (desde email via token, sin sesión)                         │
   │  → vx_estado = 'aceptado'                                   │
   │  → Email al emisor con datos de contacto del receptor        │
   │  → Notificación al emisor                                    │
   │  → Redirect a /conexion-aceptada/ (muestra datos del emisor) │
   │                                                               │
   ├─ Rechaza ─────────────────────────────────────────────────── ┤
   │  POST /wp-json/vitrinexo/v1/conexiones/rechazar              │
   │  → vx_estado = 'rechazado'                                  │
   │  → Sin email ni notificación al emisor (rechazo privado)    │
   │  → Redirect a /conexion-rechazada/                          │
   │                                                               │
   └─ No responde ──────────────────────────────────────────────── ┘
      WP Cron (cada hora):
      → A las 72h: envía recordatorio único al receptor
      → A los 7 días: vx_estado = 'sin_respuesta'
```

---

## 1. El modal de conexión

Aparece en: `directorio.html`, `perfil.html`, `dashboard.html`, `matches.html`, `mis-favoritos.html`, `comunidad-*.html`.

### Campos visibles

| Campo | Tipo | Condición |
|---|---|---|
| Empresa desde la que contacta | checkboxes | Solo si el usuario tiene más de 1 empresa |
| Pitch | textarea | Siempre, texto libre sin límite |

### Cómo se envía

Form HTML con POST al endpoint REST. No usa AJAX — hace submit y redirige:

```html
<form method="POST" action="/wp-json/vitrinexo/v1/conexiones">
    <?php wp_nonce_field('vx_conexiones', '_wpnonce') ?>
    <input type="hidden" name="receptor_id" value="<?php echo $receptor_id ?>">
    <input type="hidden" name="redirect_to" value="/directorio/">
    <!-- checkboxes de empresas y textarea de pitch -->
</form>
```

---

## 2. Creación de la conexión — VX_Connection_Flow::create()

```php
public static function create(
    int $emisor_id,
    int $receptor_id,
    string $pitch,
    array $empresas  // nombres de empresa(s) seleccionadas
): int|false
```

### Qué hace internamente

1. Obtiene snapshot de datos del emisor via `VX_User::get($emisor_id)`
   — los datos se copian en el momento del envío para que no cambien si el usuario edita su perfil después
2. `wp_insert_post(['post_type' => 'vx_conexion', ...])`
3. Guarda todos los meta (emisor, receptor, pitch, estado='pendiente')
4. Genera dos tokens UUID via `VX_Token_Helper::generate()`
5. `VX_Mailer::send()` template `conexion_recibida` al receptor
6. `do_action('vx_connection_received', $receptor_id, $post_id)`
   — escuchado por `VX_Notification_Triggers` para crear la notificación

### Por qué snapshots de los datos del emisor

Los datos (email, teléfono, LinkedIn, empresa) se copian al momento del envío. Si el emisor cambia su email o empresa después, el receptor siempre ve los datos correctos al momento de la solicitud.

---

## 3. El email al receptor

Template: `email-conexion-recibida.html`

**Contiene:**
- Nombre y empresa del emisor
- El pitch completo
- Botón "Aceptar conexión" → link con `vx_token_aceptar`
- Botón "Rechazar" → link con `vx_token_rechazar`
- Nota de privacidad: "Sus datos de contacto están ocultos"

**No contiene:** email, teléfono ni LinkedIn del emisor. Esos datos solo se revelan al aceptar.

Los botones del email funcionan **sin sesión activa** — el receptor puede responder directo desde el email aunque no esté logueado en Vitrinexo.

---

## 4. Aceptar — VX_Connection_Flow::accept()

```php
public static function accept(string $token): array|false
```

### Puede ser llamado desde dos contextos

**Desde el email** (sin sesión):
```
POST /wp-json/vitrinexo/v1/conexiones/aceptar
Body: { token: "uuid-token" }
```

**Desde la app** (con sesión):
```
POST /wp-json/vitrinexo/v1/conexiones/aceptar
Body: { conexion_id: 73, _wpnonce: "nonce" }
// El endpoint verifica que get_current_user_id() === vx_receptor_id
```

### Qué hace

1. Busca la conexión por token (o por conexion_id + verifica que el receptor sea el usuario actual)
2. Valida que `vx_estado === 'pendiente'` — si ya fue procesada devuelve false
3. `update_post_meta($id, 'vx_estado', 'aceptado')`
4. `update_post_meta($id, 'vx_fecha_respuesta', current_time('mysql'))`
5. Invalida ambos tokens (los borra del meta)
6. `VX_Mailer::send()` template `conexion_aceptada` al **emisor** con datos de contacto del receptor
7. `do_action('vx_connection_accepted', $emisor_id, $post_id)`
8. Devuelve array con datos de contacto del emisor (para mostrar en `/conexion-aceptada/`)

### Datos de contacto revelados al aceptar

```php
return [
    'nombre'             => get_post_meta($id, 'vx_emisor_nombre', true),
    'empresa'            => get_post_meta($id, 'vx_emisor_empresas', true),
    'email'              => get_post_meta($id, 'vx_emisor_email', true),
    'telefono'           => get_post_meta($id, 'vx_emisor_telefono', true),
    'linkedin'           => get_post_meta($id, 'vx_emisor_linkedin', true),
    'contacto_preferido' => get_post_meta($id, 'vx_emisor_contacto_preferido', true),
];
```

Al mismo tiempo, el email que recibe el emisor contiene los datos del receptor.

---

## 5. Rechazar — VX_Connection_Flow::reject()

```php
public static function reject(string $token): bool
```

1. Busca la conexión por token
2. `update_post_meta($id, 'vx_estado', 'rechazado')`
3. Invalida ambos tokens
4. **Sin email al emisor** — el rechazo es privado
5. **Sin notificación** al emisor
6. Redirect a `/conexion-rechazada/`

---

## 6. Recordatorio y sin_respuesta — WP Cron

```php
// En VX_Cron::check_pending_connections() — ejecuta cada hora

$cutoff_72h = time() - (72 * HOUR_IN_SECONDS);
$cutoff_7d  = time() - (7  * DAY_IN_SECONDS);

$pendientes = get_posts([
    'post_type'  => 'vx_conexion',
    'post_status'=> 'publish',
    'meta_query' => [
        ['key' => 'vx_estado',               'value' => 'pendiente'],
        ['key' => 'vx_recordatorio_enviado',  'value' => 'false'],
        ['key' => 'vx_fecha_envio', 'value' => $cutoff_72h,
         'compare' => '<=', 'type' => 'NUMERIC'],
    ],
]);

foreach ($pendientes as $conexion) {
    // Enviar recordatorio
    VX_Mailer::send(
        get_post_meta($conexion->ID, 'vx_receptor_email', true),
        'Recordatorio: tienes una solicitud pendiente',
        'recordatorio_conexion',
        ['conexion_id' => $conexion->ID]
    );
    update_post_meta($conexion->ID, 'vx_recordatorio_enviado', 'true');
}

// Marcar sin_respuesta si llevan más de 7 días
$viejas = get_posts([
    'post_type'  => 'vx_conexion',
    'post_status'=> 'publish',
    'meta_query' => [
        ['key' => 'vx_estado', 'value' => 'pendiente'],
        ['key' => 'vx_fecha_envio', 'value' => $cutoff_7d,
         'compare' => '<=', 'type' => 'NUMERIC'],
    ],
]);
foreach ($viejas as $conexion) {
    VX_Connection_Flow::mark_no_response($conexion->ID);
}
```

---

## 7. Página /conexion-aceptada/

El shortcode `[vx_conexion_aceptada]` recibe los datos del emisor vía query var (set por el endpoint REST antes del redirect) y los renderiza mostrando:

- Nombre y empresa del emisor
- Card verde con datos de contacto completos
- Badge "Preferido" en el medio de contacto preferente del emisor
- Links a `/conexiones/` y al directorio

---

## 8. Página /conexion-rechazada/

Muestra un mensaje de cierre elegante. Nota de privacidad: "El emisor no recibe notificación del rechazo."

---

## 9. La página /conexiones/

Tres tabs: **Concretadas** / **Enviadas** / **Recibidas**

**Tab Concretadas (default):** todas las conexiones aceptadas en cualquier dirección, con datos de contacto completos visibles, badge "Yo contacté" o "Me contactó".

**Tab Enviadas:** solicitudes enviadas por el usuario con sus estados (pendiente, aceptado, sin_respuesta).

**Tab Recibidas:** solicitudes recibidas con botones Aceptar/Rechazar para las pendientes.

### Query para conexiones concretadas

```php
$concretadas = get_posts([
    'post_type'  => 'vx_conexion',
    'post_status'=> 'publish',
    'meta_query' => [
        'relation' => 'AND',
        ['key' => 'vx_estado', 'value' => 'aceptado'],
        [
            'relation' => 'OR',
            ['key' => 'vx_emisor_id',   'value' => get_current_user_id()],
            ['key' => 'vx_receptor_id', 'value' => get_current_user_id()],
        ],
    ],
]);
```
