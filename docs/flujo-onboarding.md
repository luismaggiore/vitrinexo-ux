# Flujo de registro, verificación y onboarding — Vitrinexo
**Implementación en WordPress**

---

## Resumen del flujo completo

```
Usuario llena formulario en /login (tab Registrarse)
  Campos: nombre, apellido, email, contraseña, país, empresa (nombre)
        ↓
WordPress crea la cuenta con estado "pendiente"
El nombre de empresa se guarda temporalmente para:
  1. Pre-rellenar el paso 3 del onboarding
  2. Darle contexto al admin para verificación manual
        ↓
¿El dominio del email es institucional?
   ├─ SÍ  ── Flujo A (automático) ─────────────────────────────────┐
   │         → Genera token UUID (expira 24h)                      │
   │         → Envía email de confirmación con link de activación  │
   │         → Usuario ve /confirmar-correo                        │
   │         → Usuario hace clic → valida token → cuenta activa    │
   │         → Redirect a /onboarding                             │
   │                                                               │
   └─ NO  ── Flujo B (manual) ──────────────────────────────────── ┘
             → Usuario ve /verificacion-pendiente
             → Admin ve la cuenta en WP Admin con el nombre de empresa
               como contexto para verificar que existe
             → Admin aprueba → genera token UUID (expira 72h)
             → Envía email: "Tu cuenta fue aprobada" + link activación
             → Usuario hace clic → valida token → cuenta activa
             → Redirect a /onboarding
        ↓
Usuario completa onboarding (6 pasos)
        ↓
Paso 6: pantalla de cierre "Ya estás en la red"
  CTAs: Ir a mi dashboard / Explorar el directorio
        ↓
Dashboard
```

> **¿Por qué pedir empresa en el registro si ya se pide en el onboarding?**
> Dos razones: (1) le da contexto al admin para verificar cuentas manuales sin tener que esperar a que el usuario complete el onboarding, (2) pre-rellena el campo empresa en el paso 3 para reducir fricción.

> **¿Por qué el link de activación también en el flujo manual?**
> Garantiza que el dueño real del correo es quien activa la cuenta. Sin este paso, un admin podría aprobar una cuenta registrada con el correo de otra persona sin que esa persona lo sepa.

---

## 1. Formulario de registro

### Campos

| Campo | Tipo | Obligatorio |
|---|---|---|
| Nombre | text | Sí |
| Apellido | text | Sí |
| Email | email | Sí |
| Contraseña | password | Sí (mín. 8 caracteres) |
| País | select | Sí |
| Empresa | text | Sí |

### Qué hace WordPress al recibir el submit

```php
add_action('user_register', function(int $user_id) {
    $user  = get_userdata($user_id);
    $email = $user->user_email;

    // Estado inicial — siempre pendiente
    update_user_meta($user_id, 'vx_estado',            'pendiente');
    update_user_meta($user_id, 'vx_tipo_verificacion',
        VX_Verification::is_institutional($email) ? 'automatica' : 'manual'
    );

    // Guardar nombre de empresa del registro para pre-rellenar onboarding paso 3
    // y para contexto del admin en verificación manual
    $empresa_registro = sanitize_text_field($_POST['empresa'] ?? '');
    if ($empresa_registro) {
        update_user_meta($user_id, 'vx_empresa_registro', $empresa_registro);
    }

    if (VX_Verification::is_institutional($email)) {
        VX_Verification::send_confirmation_email($user_id);
    } else {
        VX_Verification::notify_admin_pending($user_id);
    }
});
```

### User meta adicional

```
vx_empresa_registro   → nombre de empresa ingresado en el registro
                         Se usa para pre-rellenar el onboarding paso 3
                         No reemplaza a vx_empresa (CPT) que se crea en el paso 3
```

---

## 2. Detección de dominio institucional

```php
// En helpers/helper-domains.php
function vx_es_correo_institucional(string $email): bool {
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
    $dominio = strtolower(substr(strrchr($email, '@'), 1));
    return !in_array($dominio, $dominios_genericos, true);
}
```

---

## 3. Flujo A — Correo institucional (automático)

1. `VX_Verification::generate_token($user_id, 24)` — genera UUID v4, expira en 24h
2. `VX_Mailer::send()` con template `confirmacion` al email del usuario
3. Usuario ve `/confirmar-correo/` con botón de reenvío (cooldown 30s)
4. Usuario hace clic en el link → `GET /wp-json/vitrinexo/v1/activar?uid=X&token=Y`
5. `VX_Verification::validate_token()` — valida y consume el token
6. `VX_Verification::activate_account()` — `vx_estado → 'activo'`
7. `VX_Mailer::send()` con template `bienvenida`
8. Login automático + redirect a `/onboarding/`

---

## 4. Flujo B — Correo genérico (manual)

1. `VX_Verification::notify_admin_pending()` — email al admin con nombre, email y **empresa** del usuario
2. Usuario ve `/verificacion-pendiente/` con botón de reenvío de solicitud
3. Admin ve la cuenta en WP Admin con columna "Estado Vitrinexo" = "⏳ Pendiente"
   — el nombre de empresa (`vx_empresa_registro`) aparece como contexto para verificar
4. Admin hace clic en "Aprobar" → `VX_Verification::approve_manual($user_id)`
5. Genera token UUID (expira 72h) + envía email `aprobacion` con link de activación
6. **La cuenta NO se activa aún** — espera que el usuario haga clic en el link
7. Usuario hace clic → mismo flujo que pasos 4-8 del Flujo A

---

## 5. Onboarding — 6 pasos

Una vez activada la cuenta, el guard en `template_redirect` detecta `vx_onboarding_completo = false` y redirige al usuario a `/onboarding/` en cualquier intento de acceder a otra página autenticada.

### Paso 1 — Bienvenida
Sin campos. Preview del proceso. Botón "Empezar".

### Paso 2 — Datos personales
| Campo | Meta key | Obligatorio |
|---|---|---|
| Foto de perfil | vx_foto (attachment_id) | No |
| Nombre | vx_nombre | Sí |
| Apellido | vx_apellido | Sí |
| Bio profesional | vx_bio | No |
| Ciudad | vx_ciudad | No |
| País | vx_pais | Sí |
| Preferencia de contacto | vx_contacto_preferido | No |

### Paso 3 — Tu empresa
Crea un CPT `vx_empresa` asociado al usuario.

**Pre-relleno:** el campo "Nombre de empresa" se pre-rellena con `vx_empresa_registro` guardado en el registro. El usuario puede modificarlo.

| Campo | Meta del CPT | Obligatorio |
|---|---|---|
| Logo | vx_logo (attachment_id) | No |
| Nombre de empresa | post_title | Sí |
| Tu cargo | vx_cargo | Sí |
| Sitio web | vx_web | No |
| LinkedIn empresa | vx_linkedin | No |
| Descripción | vx_descripcion | No |

Al guardar el paso 3, el sistema también genera `vx_perfil_slug` usando `sanitize_title($nombre . ' ' . $apellido)` con sufijo numérico si hay duplicado.

### Paso 4 — Ofreces / Buscas
| Campo | Meta key | Regla |
|---|---|---|
| Tags oferta | vx_offer_tags (array) | Máximo 5 |
| Tags búsqueda | vx_seek_tags (array) | Máximo 5 |
| Texto oferta | vx_offer_texto | No obligatorio |
| Texto búsqueda | vx_seek_texto | No obligatorio |

### Paso 5 — Comunidades (todas opcionales)
| Campo | Meta key | Verificación |
|---|---|---|
| Out2B | vx_comunidad_out2b | Automática (declaración) |
| Woman | vx_comunidad_woman | Automática (declaración) |
| Senior | vx_senior_solicitado | Manual por admin |

Si Senior solicitado: `VX_Senior_Verification::request($user_id)` — notifica al admin.

**4Dinner no aparece en el onboarding** — es un beneficio incluido para todos los miembros activos, no una comunidad que se activa.

### Paso 6 — Listo
Pantalla de cierre. No hay datos que guardar.

- Llama `VX_Onboarding::complete($user_id)` → `vx_onboarding_completo = 'true'`
- Muestra: "Ya estás en la red. Encuentra tus próximos nexos."
- CTAs: **Ir a mi dashboard** (`/dashboard/`) y **Explorar el directorio** (`/directorio/`)

### Guardado progresivo

Cada paso guarda vía REST al avanzar **y al retroceder**:

```
POST /wp-json/vitrinexo/v1/onboarding/paso
Body: { paso: 3, datos: {...}, partial: false }
```

- `partial: false` (avanzar) → valida campos obligatorios antes de guardar
- `partial: true` (retroceder) → guarda sin validar, no bloquea la navegación

Si el usuario cierra el browser, al volver el JS llama `GET /wp-json/vitrinexo/v1/onboarding/estado` y retoma en el último paso completado, repoblando los campos.

---

## 6. Guard de acceso

Un solo hook en `template_redirect` en `class-vx-auth.php`:

```php
add_action('template_redirect', function() {
    // 1. ¿Es admin? → acceso total
    if (current_user_can('manage_options')) return;

    // 2. ¿No está logueado intentando página protegida?
    if (!is_user_logged_in() && VX_Auth::is_protected_page()) {
        wp_redirect(home_url('/login/')); exit;
    }

    if (!is_user_logged_in()) return;

    $user_id = get_current_user_id();
    $estado  = get_user_meta($user_id, VX_User_Meta::ESTADO, true);

    // 3. ¿Pendiente?
    if ($estado === 'pendiente') {
        $tipo = get_user_meta($user_id, VX_User_Meta::TIPO_VERIFICACION, true);
        $url  = $tipo === 'automatica'
            ? home_url('/confirmar-correo/')
            : home_url('/verificacion-pendiente/');
        if (!is_page(['confirmar-correo', 'verificacion-pendiente'])) {
            wp_redirect($url); exit;
        }
        return;
    }

    // 4. ¿Onboarding incompleto?
    $onboarding = get_user_meta($user_id, VX_User_Meta::ONBOARDING_COMPLETO, true);
    if ($onboarding !== 'true' && !is_page('onboarding')) {
        wp_redirect(home_url('/onboarding/')); exit;
    }
});
```

---

## 7. Bloqueo de wp-admin para no-admins

```php
add_action('admin_init', function() {
    if (!current_user_can('manage_options')) {
        wp_redirect(home_url('/dashboard/')); exit;
    }
});
add_filter('show_admin_bar', fn($show) => current_user_can('manage_options') ? $show : false);
```
