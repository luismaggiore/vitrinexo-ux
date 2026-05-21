# Flujo de registro y verificación — Vitrinexo
**Implementación en WordPress**

---

## Resumen del flujo completo

```
Usuario llena formulario en login.html (tab Registrarse)
        ↓
WordPress crea la cuenta con estado "pendiente"
        ↓
¿El dominio del email es institucional?
   ├─ SÍ → Envía email de confirmación con link de activación
   │         → Usuario ve confirmar-correo.html
   │         → Usuario hace clic en el link → cuenta activada
   │         → Redirige a onboarding.html
   │
   └─ NO → Cuenta queda en verificación manual
             → Usuario ve verificacion-pendiente.html
             → Admin revisa y aprueba desde WordPress
             → Sistema envía email de bienvenida
             → Usuario hace clic → redirige a onboarding.html
        ↓
Usuario completa onboarding (6 pasos)
        ↓
Dashboard
```

---

## 1. Detección de dominio institucional

### Dominios genéricos bloqueados (lista negra)

```php
$dominios_genericos = [
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.es', 'yahoo.com.ar', 'yahoo.com.mx',
  'hotmail.com', 'hotmail.es', 'hotmail.com.ar',
  'outlook.com', 'outlook.es',
  'live.com', 'live.cl', 'live.com.ar',
  'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me',
  'aol.com',
];
```

Cualquier dominio que **no esté** en esta lista se considera institucional y activa el flujo automático.

### Función de detección

```php
function vx_es_correo_institucional( string $email ): bool {
  $dominios_genericos = [ /* lista de arriba */ ];
  $dominio = strtolower( substr( strrchr( $email, '@' ), 1 ) );
  return ! in_array( $dominio, $dominios_genericos, true );
}
```

---

## 2. Registro en WordPress

### Hook en el formulario de registro

```php
add_action( 'user_register', function( int $user_id ) {
  $user  = get_userdata( $user_id );
  $email = $user->user_email;

  // Estado inicial — siempre pendiente
  update_user_meta( $user_id, 'vx_estado', 'pendiente' );
  update_user_meta( $user_id, 'vx_tipo_verificacion',
    vx_es_correo_institucional( $email ) ? 'automatica' : 'manual'
  );

  if ( vx_es_correo_institucional( $email ) ) {
    vx_enviar_email_confirmacion( $user_id );
  } else {
    vx_notificar_admin_verificacion_pendiente( $user_id );
  }
});
```

### Meta fields del usuario

| Meta key | Valores posibles | Descripción |
|---|---|---|
| `vx_estado` | `pendiente` · `activo` · `rechazado` | Estado de la cuenta |
| `vx_tipo_verificacion` | `automatica` · `manual` | Tipo de verificación requerida |
| `vx_token_confirmacion` | UUID v4 | Token del link de activación |
| `vx_token_expira` | timestamp | Expiración del token (24h) |
| `vx_onboarding_completo` | `true` · `false` | Si completó los 6 pasos |
| `vx_senior_solicitado` | `true` · `false` | Si declaró ser Senior en onboarding |
| `vx_senior_verificado` | `true` · `false` | Si un admin aprobó el badge Senior |

---

## 3. Flujo A — Correo institucional (automático)

### 3.1 Email de confirmación

```php
function vx_enviar_email_confirmacion( int $user_id ): void {
  $token   = wp_generate_uuid4();
  $expira  = time() + DAY_IN_SECONDS; // 24 horas

  update_user_meta( $user_id, 'vx_token_confirmacion', $token );
  update_user_meta( $user_id, 'vx_token_expira', $expira );

  $user = get_userdata( $user_id );
  $link = add_query_arg([
    'accion' => 'confirmar',
    'uid'    => $user_id,
    'token'  => $token,
  ], home_url( '/activar-cuenta/' ) );

  wp_mail(
    $user->user_email,
    'Confirma tu cuenta en Vitrinexo',
    vx_template_confirmacion( $user->display_name, $link )
  );
}
```

### 3.2 Página que ve el usuario: `confirmar-correo.html`

- Mensaje: "Revisá tu bandeja — te enviamos un link de activación"
- Nota: revisar carpeta de spam
- Botón: **Reenviar correo** (llama a `vx_enviar_email_confirmacion()` de nuevo)
- El reenvío tiene un cooldown de 60 segundos para evitar spam

### 3.3 Activación del link

```php
// En la página /activar-cuenta/ de WordPress
add_action( 'template_redirect', function() {
  if ( get_query_var('pagename') !== 'activar-cuenta' ) return;

  $uid   = absint( $_GET['uid']   ?? 0 );
  $token = sanitize_text_field( $_GET['token'] ?? '' );

  $token_guardado = get_user_meta( $uid, 'vx_token_confirmacion', true );
  $token_expira   = (int) get_user_meta( $uid, 'vx_token_expira', true );

  if ( $token !== $token_guardado || time() > $token_expira ) {
    // Token inválido o expirado → mostrar error
    wp_redirect( home_url( '/confirmar-correo/?error=token_invalido' ) );
    exit;
  }

  // Activar cuenta
  update_user_meta( $uid, 'vx_estado', 'activo' );
  delete_user_meta( $uid, 'vx_token_confirmacion' );
  delete_user_meta( $uid, 'vx_token_expira' );

  // Login automático + redirect a onboarding
  wp_set_auth_cookie( $uid );
  wp_redirect( home_url( '/onboarding/' ) );
  exit;
});
```

---

## 4. Flujo B — Correo genérico (manual)

### 4.1 Notificación al admin

```php
function vx_notificar_admin_verificacion_pendiente( int $user_id ): void {
  $user = get_userdata( $user_id );
  wp_mail(
    get_option('admin_email'),
    'Nueva cuenta pendiente de verificación — Vitrinexo',
    "Nuevo usuario: {$user->display_name} ({$user->user_email})\n" .
    "Revisar en: " . admin_url( "user-edit.php?user_id={$user_id}" )
  );
}
```

### 4.2 Página que ve el usuario: `verificacion-pendiente.html`

- Mensaje: "Tu cuenta está siendo revisada por el equipo de Vitrinexo"
- Estimado: 24–48 horas hábiles
- Botón: **Reenviar correo de confirmación** (por si el usuario quiere ser contactado)
- El usuario **no puede acceder** al directorio ni al dashboard hasta que el admin apruebe

### 4.3 Aprobación por admin en WordPress

El admin ve una columna custom "Estado Vitrinexo" en la lista de usuarios de WP Admin:

```php
add_filter( 'manage_users_columns', function( $cols ) {
  $cols['vx_estado'] = 'Estado Vitrinexo';
  return $cols;
});

add_action( 'manage_users_custom_column', function( $val, $col, $uid ) {
  if ( $col !== 'vx_estado' ) return $val;
  $estado = get_user_meta( $uid, 'vx_estado', true );
  $badge  = $estado === 'activo' ? '✓ Activo' : '⏳ Pendiente';
  return $badge;
}, 10, 3 );
```

Cuando el admin aprueba, cambia `vx_estado` a `activo` y el sistema envía un email de bienvenida con link directo al onboarding.

---

## 5. Onboarding — 6 pasos

Una vez la cuenta está activa (`vx_estado = activo`), el usuario es redirigido a `onboarding.html`.

| Paso | Contenido | Obligatorio |
|---|---|---|
| 1 | Bienvenida — preview del proceso | — |
| 2 | Datos personales: foto, nombre, bio, ciudad, país, contacto preferido | Nombre, país |
| 3 | Empresa: logo, nombre, cargo, web, LinkedIn, descripción | Nombre, cargo |
| 4 | Ofrece / busca: selector de tags (máx. 5 cada uno) | Al menos 1 de cada uno |
| 5 | Comunidades: Out2B, Woman, Senior, 4Dinner (todas opcionales) | — |
| 6 | Confirmación con mini-preview de la tarjeta | — |

### Guardado progresivo

Cada paso guarda parcialmente vía AJAX para que no se pierda info si el usuario cierra el browser:

```php
add_action( 'wp_ajax_vx_guardar_paso_onboarding', function() {
  check_ajax_referer( 'vx_onboarding', 'nonce' );
  $user_id = get_current_user_id();
  $paso    = absint( $_POST['paso'] );
  $datos   = array_map( 'sanitize_text_field', $_POST['datos'] );

  update_user_meta( $user_id, "vx_onboarding_paso_{$paso}", $datos );

  wp_send_json_success();
});
```

### Completar onboarding

Al llegar al paso 6 y hacer clic en "Ir a mi dashboard":

```php
update_user_meta( $user_id, 'vx_onboarding_completo', 'true' );
```

Si `vx_onboarding_completo` es `false`, WordPress redirige al usuario al onboarding en vez del dashboard.

---

## 6. Verificación Senior

El usuario declara ser Senior en el paso 5 del onboarding. Eso no activa el badge — solo levanta una solicitud:

```php
update_user_meta( $user_id, 'vx_senior_solicitado', 'true' );
update_user_meta( $user_id, 'vx_senior_verificado',  'false' );
```

El admin ve la solicitud en WP Admin y aprueba manualmente cambiando `vx_senior_verificado` a `true`. En ese momento el badge Senior aparece en la tarjeta y el perfil del usuario.

---

## 7. Guard de acceso

Para proteger las páginas que requieren cuenta activa:

```php
add_action( 'template_redirect', function() {
  $paginas_protegidas = [ 'dashboard', 'directorio', 'perfil', 'editor-perfil', 'mis-favoritos' ];
  // ...
  if ( ! is_user_logged_in() ) {
    wp_redirect( home_url( '/login/' ) ); exit;
  }

  $estado = get_user_meta( get_current_user_id(), 'vx_estado', true );

  if ( $estado === 'pendiente' ) {
    $tipo = get_user_meta( get_current_user_id(), 'vx_tipo_verificacion', true );
    $redir = $tipo === 'automatica' ? '/confirmar-correo/' : '/verificacion-pendiente/';
    wp_redirect( home_url( $redir ) ); exit;
  }

  $onboarding_completo = get_user_meta( get_current_user_id(), 'vx_onboarding_completo', true );
  if ( $onboarding_completo !== 'true' && ! is_page( 'onboarding' ) ) {
    wp_redirect( home_url( '/onboarding/' ) ); exit;
  }
});
```

---

## 8. Stack recomendado

| Necesidad | Solución |
|---|---|
| Formulario de registro | WP Forms o registro nativo de WP con hooks |
| Detección de dominio | Función PHP custom en `functions.php` |
| Email transaccional | FluentSMTP + Postmark o SendGrid |
| Tokens de activación | `wp_generate_uuid4()` + user meta |
| Guardado progresivo del onboarding | `wp_ajax_*` + user meta por paso |
| Guard de acceso | `template_redirect` hook |
| Panel de admin | Columnas custom en lista de usuarios de WP |
