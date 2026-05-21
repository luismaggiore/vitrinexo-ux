# Flujo de conexiones — Vitrinexo

**Implementación en WordPress**

---

## Resumen del flujo

```
Usuario A presiona "Conectar" en el perfil de Usuario B
        ↓
Modal: selecciona empresa (si tiene >1) + escribe pitch
        ↓
Formulario enviado vía WP Forms / Formspree
        ↓
WordPress registra la solicitud (CPT: conexion)
        ↓
Email automático llega al correo de Usuario B
  [Botón: Aceptar] [Botón: Rechazar]
        ↓
B hace clic en Aceptar → página intermedia en Vitrinexo
  → registra aceptación en WordPress
  → revela datos de contacto de Usuario A
        ↓
Si no hay respuesta en 72h → email de recordatorio a B
```

---

## 1. El modal de conexión (frontend)

El modal existe en el HTML estático (`directorio.html`, `dashboard.html`, `match-seeks.html`, `match-offers.html`).

### Campos del formulario

| Campo                           | Tipo              | Condición                                                |
| ------------------------------- | ----------------- | -------------------------------------------------------- |
| Empresa desde la que contacta   | `select` múltiple | Solo si el usuario tiene más de una empresa en su perfil |
| Pitch (por qué quiero conectar) | `textarea`        | Siempre, texto libre sin límite                          |
| — campos ocultos —              | `hidden`          | Siempre                                                  |

### Campos ocultos que viajan en el formulario

Estos campos no los ve el usuario pero se envían junto al formulario para que WordPress pueda registrar la conexión completa:

```html
<input type="hidden" name="emisor_id" value="{{ usuario_actual.id }}" />
<input type="hidden" name="emisor_nombre" value="{{ usuario_actual.nombre }}" />
<input
  type="hidden"
  name="emisor_empresa"
  value="{{ empresa_seleccionada.nombre }}"
/>
<input type="hidden" name="emisor_email" value="{{ usuario_actual.email }}" />
<input
  type="hidden"
  name="emisor_telefono"
  value="{{ usuario_actual.telefono }}"
/>
<input
  type="hidden"
  name="emisor_linkedin"
  value="{{ usuario_actual.linkedin }}"
/>
<input
  type="hidden"
  name="emisor_contacto_preferido"
  value="{{ usuario_actual.contacto_preferido }}"
/>
<input type="hidden" name="receptor_id" value="{{ perfil_visto.id }}" />
<input type="hidden" name="receptor_nombre" value="{{ perfil_visto.nombre }}" />
<input type="hidden" name="receptor_email" value="{{ perfil_visto.email }}" />
<input type="hidden" name="fecha_envio" value="{{ fecha_actual }}" />
<input type="hidden" name="token_unico" value="{{ uuid_generado }}" />
<!-- para los botones del email -->
```

---

## 2. Registro en WordPress

### Custom Post Type: `vx_conexion`

Cada solicitud de conexión crea un CPT con los siguientes campos (ACF o meta):

```
post_title:          "Conexión: [emisor] → [receptor]"
post_status:         publish

meta:
  vx_emisor_id
  vx_emisor_nombre
  vx_emisor_empresa
  vx_emisor_email
  vx_emisor_telefono
  vx_emisor_linkedin
  vx_emisor_contacto_preferido
  vx_receptor_id
  vx_receptor_nombre
  vx_receptor_email
  vx_pitch
  vx_estado              → "pendiente" | "aceptado" | "rechazado" | "sin_respuesta"
  vx_fecha_envio
  vx_fecha_respuesta
  vx_token_aceptar       → UUID único para el botón Aceptar del email
  vx_token_rechazar      → UUID único para el botón Rechazar del email
  vx_recordatorio_enviado → true | false
```

### Cómo se crea el registro

**Opción A — WP Forms con webhook:**
WP Forms recibe el submit → dispara un webhook a una función PHP custom → la función crea el CPT y genera los tokens.

**Opción B — Formspree + Zapier/Make:**
Formspree recibe el submit → dispara Zapier/Make → crea el CPT via REST API de WordPress.

**Opción C — Endpoint REST custom (recomendado a futuro):**

```
POST /wp-json/vitrinexo/v1/conexiones
Body: { emisor_id, receptor_id, empresa_id, pitch }
```

La función PHP crea el CPT, genera tokens y dispara el email. Más limpio, sin terceros.

---

## 3. El email al receptor

Se envía desde WordPress usando `wp_mail()` o un plugin de transaccional (FluentSMTP, Postmark, SendGrid).

### Estructura del email

```
Asunto: [Nombre emisor] quiere conectar contigo en Vitrinexo

────────────────────────────────────────
  [Logo Vitrinexo]

  Hola [Nombre receptor],

  [Nombre emisor] de [Empresa emisor] quiere conectar contigo.

  ── Su mensaje ──────────────────────────
  [Pitch completo]

  ── Quién te contacta ───────────────────
  Nombre:   [emisor_nombre]
  Empresa:  [emisor_empresa]
  País:     [emisor_pais]

  ── Sus datos de contacto ───────────────
  (se revelan solo si aceptas)

  ────────────────────────────────────────

  [  ✓ Aceptar conexión  ]   [  ✗ Rechazar  ]

  Botón Aceptar → https://vitrinexo.com/conexion-aceptada?token=[vx_token_aceptar]
  Botón Rechazar → https://vitrinexo.com/conexion-rechazada?token=[vx_token_rechazar]

────────────────────────────────────────
```

> **Nota de privacidad:** Los datos de contacto del emisor (email, teléfono, LinkedIn) NO aparecen en el email. Solo se revelan en la página de aceptación. Esto obliga a que la aceptación ocurra dentro de Vitrinexo y queda registrada.

---

## 4. Página de aceptación (`conexion-aceptada.html`)

URL: `https://vitrinexo.com/conexion-aceptada?token=abc123`

### Lógica PHP en WordPress

```php
$token = sanitize_text_field($_GET['token']);
$conexion = get_posts([
    'post_type'  => 'vx_conexion',
    'meta_query' => [['key' => 'vx_token_aceptar', 'value' => $token]]
]);

if (!$conexion) {
    // Mostrar error: token inválido o ya usado
}

$post_id = $conexion[0]->ID;
$estado  = get_post_meta($post_id, 'vx_estado', true);

if ($estado !== 'pendiente') {
    // Ya fue procesado — mostrar estado actual
}

// Actualizar estado
update_post_meta($post_id, 'vx_estado', 'aceptado');
update_post_meta($post_id, 'vx_fecha_respuesta', current_time('mysql'));

// Recuperar datos del emisor para mostrarlos
$datos_contacto = [
    'email'    => get_post_meta($post_id, 'vx_emisor_email', true),
    'telefono' => get_post_meta($post_id, 'vx_emisor_telefono', true),
    'linkedin' => get_post_meta($post_id, 'vx_emisor_linkedin', true),
    'preferido'=> get_post_meta($post_id, 'vx_emisor_contacto_preferido', true),
];

// Mostrar la página con los datos
```

La página muestra una confirmación de aceptación + los datos de contacto completos del emisor.

---

## 5. Página de rechazo (`conexion-rechazada.html`)

URL: `https://vitrinexo.com/conexion-rechazada?token=xyz789`

Misma lógica que la aceptación pero actualiza `vx_estado` a `"rechazado"`. No revela datos. Muestra un mensaje de cierre elegante.

> El emisor **no recibe notificación de rechazo** (decisión de diseño: evitar fricciones y malestares en la red).

---

## 6. Recordatorio automático a las 72h

### Con WP Cron

```php
// Registrar el cron al activar el plugin/tema
add_action('wp', function() {
    if (!wp_next_scheduled('vx_check_conexiones_pendientes')) {
        wp_schedule_event(time(), 'hourly', 'vx_check_conexiones_pendientes');
    }
});

add_action('vx_check_conexiones_pendientes', function() {
    $hace_72h = date('Y-m-d H:i:s', strtotime('-72 hours'));

    $pendientes = get_posts([
        'post_type'  => 'vx_conexion',
        'meta_query' => [
            ['key' => 'vx_estado',               'value' => 'pendiente'],
            ['key' => 'vx_recordatorio_enviado', 'value' => 'false'],
            ['key' => 'vx_fecha_envio',          'value' => $hace_72h, 'compare' => '<=', 'type' => 'DATETIME'],
        ]
    ]);

    foreach ($pendientes as $conexion) {
        $receptor_email  = get_post_meta($conexion->ID, 'vx_receptor_email', true);
        $emisor_nombre   = get_post_meta($conexion->ID, 'vx_emisor_nombre', true);
        $token_aceptar   = get_post_meta($conexion->ID, 'vx_token_aceptar', true);
        $token_rechazar  = get_post_meta($conexion->ID, 'vx_token_rechazar', true);

        // Enviar email de recordatorio
        wp_mail(
            $receptor_email,
            "Recordatorio: {$emisor_nombre} sigue esperando tu respuesta",
            vx_template_recordatorio($conexion->ID, $token_aceptar, $token_rechazar)
        );

        update_post_meta($conexion->ID, 'vx_recordatorio_enviado', 'true');

        // Si pasan 7 días sin respuesta, marcar como sin_respuesta
        $hace_7d = date('Y-m-d H:i:s', strtotime('-7 days'));
        $fecha_envio = get_post_meta($conexion->ID, 'vx_fecha_envio', true);
        if ($fecha_envio <= $hace_7d) {
            update_post_meta($conexion->ID, 'vx_estado', 'sin_respuesta');
        }
    }
});
```

---

## 7. Dashboard del usuario — datos de conexiones

Con el CPT `vx_conexion` poblado, el dashboard puede hacer queries y mostrar:

```php
// Enviadas por el usuario actual
$enviadas = get_posts([
    'post_type'  => 'vx_conexion',
    'meta_query' => [['key' => 'vx_emisor_id', 'value' => get_current_user_id()]]
]);

// Recibidas por el usuario actual
$recibidas = get_posts([
    'post_type'  => 'vx_conexion',
    'meta_query' => [['key' => 'vx_receptor_id', 'value' => get_current_user_id()]]
]);

// Stats
$aceptadas    = count(array_filter($enviadas, fn($c) => get_post_meta($c->ID, 'vx_estado', true) === 'aceptado'));
$pendientes   = count(array_filter($enviadas, fn($c) => get_post_meta($c->ID, 'vx_estado', true) === 'pendiente'));
$sin_respuesta = count(array_filter($enviadas, fn($c) => get_post_meta($c->ID, 'vx_estado', true) === 'sin_respuesta'));
```

Estos valores alimentan las stats del dashboard y la página `conexiones.html`.

---

## 8. Página de conexiones (`conexiones.html`)

Pestañas: **Enviadas** / **Recibidas**

### Columnas de la tabla

| Columna           | Enviadas         | Recibidas                         |
| ----------------- | ---------------- | --------------------------------- |
| Perfil            | ✓ (receptor)     | ✓ (emisor)                        |
| Empresa           | ✓                | ✓                                 |
| Fecha             | ✓                | ✓                                 |
| Estado            | ✓                | ✓                                 |
| Pitch enviado     | ✓ (expandible)   | ✓ (expandible)                    |
| Datos de contacto | Solo si aceptado | Solo si aceptado                  |
| Acciones          | —                | Aceptar / Rechazar (si pendiente) |

### Estados y colores

| Estado          | Color                          | Descripción           |
| --------------- | ------------------------------ | --------------------- |
| `pendiente`     | Amarillo / `badge-neutral`     | Esperando respuesta   |
| `aceptado`      | Verde / `badge-primary`        | Conexión establecida  |
| `rechazado`     | Rojo / `badge-accent`          | Contacto declinado    |
| `sin_respuesta` | Gris / `badge-neutral` apagado | +7 días sin respuesta |

---

## 9. Stack recomendado para WordPress

| Necesidad                     | Plugin / solución                                  |
| ----------------------------- | -------------------------------------------------- |
| Registro del CPT              | ACF Pro + CPT UI, o código en `functions.php`      |
| Envío del formulario          | WP Forms (Lite es suficiente para el modal)        |
| Email transaccional           | FluentSMTP + Postmark o SendGrid                   |
| Automatización del cron       | WP Cron nativo (o Action Scheduler si hay volumen) |
| Endpoint REST                 | `register_rest_route()` en `functions.php`         |
| Páginas de aceptación/rechazo | Página de WordPress con template custom PHP        |

---

## 10. Consideraciones de seguridad

- Los **tokens son UUID v4 de un solo uso** — una vez procesados se invalidan cambiando el estado.
- Los **datos de contacto del emisor nunca viajan en el email** — solo se revelan después de la aceptación registrada.
- Las páginas de aceptación/rechazo **verifican que el token exista y esté en estado `pendiente`** antes de procesar.
- Los formularios deben incluir **nonce de WordPress** si se procesan vía AJAX interno, o verificación de origen si se usan via REST.
