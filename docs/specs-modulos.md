# Especificaciones de módulos PHP — vitrinexo-core

Contratos de implementación para cada clase del plugin. Define qué recibe, qué devuelve, qué escribe en la base de datos, qué hooks dispara y qué errores puede lanzar.

---

## Convención general

Cada módulo es una clase PHP con el prefijo `VX_`. Las clases que representan modelos (User, Connection, Dinner) usan el patrón factory `::get($id)` que devuelve una instancia o `null`. Las clases de flujo (Connection_Flow, Verification) son estáticas o se instancian con `new`.

```php
// Patrón factory
$user = VX_User::get(42);
if (!$user) { /* usuario no existe */ }
echo $user->get_nombre_completo();

// Patrón estático
VX_Verification::send_confirmation_email($user_id);
```

---

## modules/users/class-vx-user.php

**Responsabilidad:** Modelo del usuario. Abstracción sobre `get_user_meta()` y `WP_User`. Es el único lugar donde se leen y escriben los meta del usuario.

### Métodos

```php
// Factory — devuelve instancia o null si no existe el usuario
public static function get(int $user_id): ?VX_User

// Getters de identidad
public function get_id(): int
public function get_nombre(): string               // vx_nombre
public function get_apellido(): string             // vx_apellido
public function get_nombre_completo(): string      // "{vx_nombre} {vx_apellido}"
public function get_email(): string                // email nativo de WP
public function get_perfil_slug(): string          // vx_perfil_slug
public function get_foto(): ?int                   // attachment_id o null
public function get_bio(): string
public function get_ciudad(): string
public function get_pais(): string
public function get_contacto_preferido(): string   // 'email' | 'telefono' | 'linkedin'
public function get_telefono(): string
public function get_linkedin(): string

// Estado de cuenta
public function get_estado(): string              // 'pendiente' | 'activo' | 'rechazado'
public function get_tipo_verificacion(): string   // 'automatica' | 'manual'
public function is_onboarding_completo(): bool
public function get_onboarding_paso(): int        // 1-6

// Membresía
public function get_plan(): string                // 'fundador' | 'mensual' | 'anual' | 'gratuito'
public function is_founder(): bool
public function is_active(): bool                 // estado=activo AND onboarding=true
public function get_plan_vencimiento(): ?int      // timestamp o null

// Comunidades
public function is_in_community(string $community): bool  // 'out2b' | 'woman' | 'senior'
public function is_senior_verified(): bool

// Tags
public function get_offer_tags(): array           // array de strings
public function get_seek_tags(): array            // array de strings
public function get_offer_texto(): string
public function get_seek_texto(): string

// Empresas
public function get_empresas(): array             // array de WP_Post (vx_empresa)
public function get_empresa_activa(): ?WP_Post    // la empresa con vx_empresa_activa=true

// Setters — todos devuelven bool (éxito/fallo)
public function set_nombre(string $v): bool
public function set_apellido(string $v): bool
public function set_estado(string $v): bool       // valida contra enum
public function set_offer_tags(array $tags): bool // máximo 5 elementos
public function set_seek_tags(array $tags): bool  // máximo 5 elementos
public function set_onboarding_completo(bool $v): bool

// Formateo para UI
public function to_card_array(): array            // datos para renderizar tarjeta
// Devuelve: ['id', 'nombre', 'empresa', 'ciudad', 'pais', 'foto_url',
//            'offer_tags', 'seek_tags', 'is_founder', 'is_senior',
//            'perfil_slug', 'empresa_logo_url']
```

### Errores
- `get()` con user_id inválido devuelve `null`, nunca lanza excepción
- Los setters devuelven `false` si la validación falla, loguean con `error_log()`
- `set_estado()` rechaza valores fuera del enum y devuelve `false`

### Escribe en BD
- Todos los setters usan `update_user_meta($this->id, VX_User_Meta::KEY, $value)`
- Nunca hace `$wpdb->query()` directamente

---

## modules/users/class-vx-user-meta.php

**Responsabilidad:** Registro centralizado de todas las meta keys. Define constantes para evitar typos.

```php
class VX_User_Meta {
    // Identidad
    const NOMBRE              = 'vx_nombre';
    const APELLIDO            = 'vx_apellido';
    const PERFIL_SLUG         = 'vx_perfil_slug';
    const FOTO                = 'vx_foto';
    const BIO                 = 'vx_bio';
    const CIUDAD              = 'vx_ciudad';
    const PAIS                = 'vx_pais';
    const CONTACTO_PREFERIDO  = 'vx_contacto_preferido';
    const TELEFONO            = 'vx_telefono';
    const LINKEDIN            = 'vx_linkedin';

    // Verificación
    const ESTADO              = 'vx_estado';
    const TIPO_VERIFICACION   = 'vx_tipo_verificacion';
    const TOKEN_CONFIRMACION  = 'vx_token_confirmacion';
    const TOKEN_EXPIRA        = 'vx_token_expira';
    const ONBOARDING_COMPLETO = 'vx_onboarding_completo';
    const ONBOARDING_PASO     = 'vx_onboarding_paso';

    // Membresía
    const PLAN                    = 'vx_plan';
    const PLAN_ESTADO             = 'vx_plan_estado';
    const PLAN_INICIO             = 'vx_plan_inicio';
    const PLAN_VENCIMIENTO        = 'vx_plan_vencimiento';
    const PRECIO_PREFERENTE       = 'vx_precio_preferente';
    const GATEWAY_CUSTOMER_ID     = 'vx_gateway_customer_id';
    const GATEWAY_SUBSCRIPTION_ID = 'vx_gateway_subscription_id';

    // Comunidades
    const COMUNIDAD_OUT2B    = 'vx_comunidad_out2b';
    const COMUNIDAD_WOMAN    = 'vx_comunidad_woman';
    const COMUNIDAD_SENIOR   = 'vx_comunidad_senior';
    const SENIOR_SOLICITADO  = 'vx_senior_solicitado';
    const SENIOR_VERIFICADO  = 'vx_senior_verificado';

    // Tags
    const OFFER_TAGS  = 'vx_offer_tags';
    const SEEK_TAGS   = 'vx_seek_tags';
    const OFFER_TEXTO = 'vx_offer_texto';
    const SEEK_TEXTO  = 'vx_seek_texto';

    // 4Dinner
    const DINNERS_ASIGNADO   = 'vx_dinners_asignado';
    const DINNERS_INTERESADO = 'vx_dinners_interesado';

    // Valores del enum vx_estado
    const ESTADO_PENDIENTE  = 'pendiente';
    const ESTADO_ACTIVO     = 'activo';
    const ESTADO_RECHAZADO  = 'rechazado';

    // Valores del enum vx_plan
    const PLAN_FUNDADOR = 'fundador';
    const PLAN_MENSUAL  = 'mensual';
    const PLAN_ANUAL    = 'anual';
    const PLAN_GRATUITO = 'gratuito';

    // Registra todos los meta con register_meta() — llamado en init
    public static function register(): void
}
```

---

## modules/users/class-vx-auth.php

**Responsabilidad:** Guard de acceso. Hook en `template_redirect`. Bloqueo de wp-admin.

```php
class VX_Auth {
    // Inicializa los hooks — llamado desde vitrinexo-core.php en 'init'
    public static function init(): void

    // Hook en template_redirect — evalúa y redirige según estado
    // Orden: admin → no logueado → pendiente → onboarding → activo
    public static function check_access(): void

    // Devuelve true si la página actual requiere autenticación
    // Se basa en la lista de slugs de páginas protegidas
    private static function is_protected_page(): bool

    // Devuelve la URL de redirect según el tipo de verificación del usuario
    // 'automatica' → home_url('/confirmar-correo/')
    // 'manual'     → home_url('/verificacion-pendiente/')
    public static function get_redirect_for_pending(int $user_id): string

    // Bloquea wp-admin para no-admins — hook en admin_init
    public static function block_admin(): void

    // Oculta la barra de admin para no-admins — filtro show_admin_bar
    public static function hide_admin_bar(bool $show): bool
}
```

### Páginas protegidas (requieren auth)
```php
private static array $protected_slugs = [
    'dashboard', 'directorio', 'directorio/buscar',
    'matches', 'matches/ofrecen', 'matches/buscan',
    'perfil', 'editar-perfil', 'favoritos',
    'conexiones', 'conexion-aceptada', 'conexion-rechazada',
    'notificaciones', 'configuracion',
    'comunidad', 'events/4dinner', 'onboarding',
];
```

### Hooks registrados
```php
add_action('template_redirect', ['VX_Auth', 'check_access']);
add_action('admin_init',        ['VX_Auth', 'block_admin']);
add_filter('show_admin_bar',    ['VX_Auth', 'hide_admin_bar']);
```

---

## modules/users/class-vx-verification.php

**Responsabilidad:** Flujo completo de verificación de cuentas.

```php
class VX_Verification {
    // Devuelve true si el dominio NO está en la lista negra de dominios genéricos
    // Usa helper-domains.php para la lista
    public static function is_institutional(string $email): bool

    // Genera UUID v4, lo guarda en user meta, devuelve el token
    // $expiry_hours: 24 para automático, 72 para manual
    public static function generate_token(int $user_id, int $expiry_hours = 24): string

    // Valida que el token exista, pertenezca al usuario y no haya expirado
    // Devuelve true y borra el token si es válido
    // Devuelve false si inválido o expirado (NO borra el token en ese caso)
    public static function validate_token(int $user_id, string $token): bool

    // Cambia vx_estado a 'activo', borra tokens, dispara do_action('vx_account_activated')
    public static function activate_account(int $user_id): bool

    // Genera token + envía email de confirmación (flujo automático)
    // Llamado justo después del registro si el email es institucional
    public static function send_confirmation_email(int $user_id): bool

    // Notifica al admin de una cuenta manual pendiente
    // Envía email a get_option('admin_email')
    public static function notify_admin_pending(int $user_id): bool

    // Genera token (72h) + envía email de aprobación al usuario (flujo manual)
    // Llamado desde class-vx-admin-users.php cuando el admin aprueba
    public static function approve_manual(int $user_id): bool
}
```

### Escribe en BD
- `generate_token()`: `update_user_meta($id, VX_User_Meta::TOKEN_CONFIRMACION, $token)` y `update_user_meta($id, VX_User_Meta::TOKEN_EXPIRA, time() + $expiry_hours * 3600)`
- `validate_token()`: si válido, `delete_user_meta($id, VX_User_Meta::TOKEN_CONFIRMACION)` y `delete_user_meta($id, VX_User_Meta::TOKEN_EXPIRA)`
- `activate_account()`: `update_user_meta($id, VX_User_Meta::ESTADO, 'activo')`

### Hooks disparados
- `do_action('vx_account_activated', $user_id)` — escuchado por `VX_Mailer` para enviar email de bienvenida

---

## modules/membership/class-vx-membership.php

**Responsabilidad:** Modelo de membresía. Abstracción sobre los meta de plan.

```php
class VX_Membership {
    public static function get(int $user_id): VX_Membership

    public function is_active(): bool
    // true si vx_plan_estado = 'activo' AND (vx_plan_vencimiento > time() OR vx_plan = 'fundador')

    public function is_founder(): bool
    // true si vx_plan = 'fundador'

    public function has_lifetime_price(): bool
    // true si vx_precio_preferente = 'true'

    public function get_plan(): string
    public function get_estado(): string
    public function get_expiry(): ?int           // timestamp o null si no vence
    public function get_days_remaining(): ?int   // null si no vence
    public function get_gateway_customer_id(): string
    public function get_gateway_subscription_id(): string

    // Activa un plan — escribe todos los meta de membresía
    // $plan: 'fundador' | 'mensual' | 'anual'
    // $expiry_timestamp: null para fundador (no vence en período gratuito)
    public function activate(string $plan, ?int $expiry_timestamp = null): bool

    // Cancela la membresía — estado → 'cancelado'
    public function cancel(): bool

    // Marca como vencida — estado → 'vencido' — llamado por el cron
    public function mark_expired(): bool

    // Actualiza el ID del cliente en el gateway
    public function set_gateway_customer_id(string $id): bool
    public function set_gateway_subscription_id(string $id): bool
}
```

---

## modules/membership/class-vx-membership-hooks.php

**Responsabilidad:** Capa de integración con el gateway de pago. Este es el ÚNICO archivo que cambia cuando se conecta Stripe, PayU u otro gateway.

```php
class VX_Membership_Hooks {
    public static function init(): void
    // Registra los hooks del gateway cuando estén disponibles

    // Llamado cuando el gateway confirma un pago exitoso
    // $data: array con user_id, plan, amount, gateway_subscription_id
    public static function handle_payment_success(array $data): void
    // → VX_Membership::get($data['user_id'])->activate($data['plan'], $expiry)
    // → VX_Mailer::send(...) email confirmación de pago

    // Llamado cuando falla un cobro de renovación
    public static function handle_payment_failed(array $data): void
    // → VX_Mailer::send(...) email de fallo de pago

    // Llamado cuando el usuario cancela desde el gateway
    public static function handle_cancellation(array $data): void
    // → VX_Membership::get($data['user_id'])->cancel()
}
```

**Nota:** En la fase de Socios Fundadores este archivo existe pero sus métodos no se conectan a ningún gateway. Las activaciones se hacen manualmente desde `class-vx-admin-membership.php`.

---

## modules/onboarding/class-vx-onboarding.php

**Responsabilidad:** Lógica del wizard de 6 pasos.

```php
class VX_Onboarding {
    // Guarda el progreso de un paso
    // $paso: 1-6
    // $datos: array con los campos del paso (ver esquema en docs/esquema-datos.md)
    // Devuelve ['success' => bool, 'errors' => array]
    public static function save_step(int $user_id, int $paso, array $datos): array

    // Devuelve el estado actual del onboarding
    // Devuelve: ['paso_actual' => int, 'completado' => bool, 'datos' => array]
    public static function get_state(int $user_id): array

    // Marca el onboarding como completo, dispara acciones
    public static function complete(int $user_id): bool
    // → update_user_meta(vx_onboarding_completo = true)
    // → do_action('vx_onboarding_completed', $user_id)

    // Valida los campos obligatorios de un paso
    // Devuelve array de errores (vacío si válido)
    public static function validate_step(int $paso, array $datos): array

    // Campos obligatorios por paso
    private static array $required_fields = [
        2 => ['nombre', 'apellido', 'pais'],
        3 => ['empresa_nombre', 'empresa_cargo'],
        4 => [],  // tags no son obligatorios
        5 => [],  // comunidades no son obligatorias
    ];
}
```

### Qué hace cada paso al guardarse

| Paso | Acción en BD |
|---|---|
| 2 | `update_user_meta` para nombre, apellido, foto, bio, ciudad, país, contacto_preferido, teléfono, LinkedIn |
| 3 | `wp_insert_post` de tipo `vx_empresa` + sus meta + genera `vx_perfil_slug` |
| 4 | `update_user_meta` para offer_tags, seek_tags, offer_texto, seek_texto |
| 5 | `update_user_meta` para comunidades. Si Senior solicitado: `VX_Senior_Verification::request()` |
| 6 | `VX_Onboarding::complete()` |

---

## modules/directory/class-vx-directory.php

**Responsabilidad:** Queries del directorio con filtros y paginación.

```php
class VX_Directory {
    // Query principal
    // $args permitidos: pais, rubro, comunidad ('out2b'|'woman'|'senior'),
    //                   fundador (bool), page (int), per_page (int, default 20)
    // Devuelve: ['users' => VX_User[], 'total' => int, 'pages' => int]
    public static function get_members(array $args = []): array

    // Devuelve las opciones disponibles para los filtros (sin usuarios vacíos)
    // Devuelve: ['paises' => string[], 'rubros' => string[]]
    public static function get_filters(): array

    // Formatea un usuario para renderizar su tarjeta
    // Usa VX_User::to_card_array() internamente
    public static function format_for_card(int $user_id): array
}
```

### La query interna

```php
// WP_User_Query base — solo usuarios activos con onboarding completo
$query_args = [
    'meta_query' => [
        ['key' => 'vx_estado',              'value' => 'activo'],
        ['key' => 'vx_onboarding_completo', 'value' => 'true'],
    ],
    'number'  => $per_page,
    'offset'  => ($page - 1) * $per_page,
    'orderby' => 'registered',
    'order'   => 'DESC',
];
// Filtros adicionales se agregan al meta_query según $args
```

---

## modules/directory/class-vx-matches.php

**Responsabilidad:** Algoritmo de matches basado en intersección de tags.

```php
class VX_Matches {
    // Usuarios cuyo offer_tags intersecta con mis seek_tags
    // Devuelve: ['users' => VX_User[], 'total' => int, 'pages' => int]
    public static function get_seeks_matches(int $user_id, array $args = []): array

    // Usuarios cuyo seek_tags intersecta con mis offer_tags
    public static function get_offers_matches(int $user_id, array $args = []): array

    // Calcula score de coincidencia (0.0 a 1.0)
    // score = intersección / unión (Jaccard similarity)
    public static function calculate_score(array $tags_a, array $tags_b): float

    // Devuelve los matches nuevos desde una fecha dada (para el resumen semanal)
    // $since: timestamp
    public static function get_new_since(int $user_id, int $since): array
}
```

---

## modules/connections/class-vx-connection-flow.php

**Responsabilidad:** Ciclo de vida completo de una conexión.

```php
class VX_Connection_Flow {
    // Crea la solicitud
    // $emisor_id:   user_id del que inicia
    // $receptor_id: user_id del receptor
    // $pitch:       texto del mensaje
    // $empresas:    array de nombres de empresa(s) desde las que contacta
    // Devuelve post_id de la conexión creada, o false en caso de error
    public static function create(
        int $emisor_id,
        int $receptor_id,
        string $pitch,
        array $empresas
    ): int|false

    // Procesa la aceptación via token (desde email, sin sesión)
    // Devuelve array con datos de contacto del emisor, o false si token inválido
    public static function accept(string $token): array|false

    // Procesa el rechazo via token (desde email, sin sesión)
    // Devuelve true si OK, false si token inválido
    public static function reject(string $token): bool

    // Marca como sin_respuesta — llamado por el cron
    public static function mark_no_response(int $conexion_id): bool
}
```

### Qué hace `create()`

1. Obtiene snapshot de datos del emisor via `VX_User::get($emisor_id)`
2. `wp_insert_post(['post_type' => 'vx_conexion', 'post_status' => 'publish', ...])`
3. Guarda todos los meta de la conexión
4. Genera dos tokens UUID via `VX_Token_Helper::generate()`
5. `VX_Mailer::send()` con template `conexion_recibida`
6. `do_action('vx_connection_received', $receptor_id, $conexion_id)`

### Qué hace `accept()`

1. `VX_Connection::get_by_token($token, 'aceptar')`
2. Valida que el estado sea 'pendiente' — si no, devuelve false
3. `update_post_meta($id, 'vx_estado', 'aceptado')`
4. `update_post_meta($id, 'vx_fecha_respuesta', current_time('mysql'))`
5. `VX_Mailer::send()` con template `conexion_aceptada` al emisor (con datos del receptor)
6. `do_action('vx_connection_accepted', $emisor_id, $conexion_id)`
7. Devuelve array con datos de contacto del emisor (para mostrar en la página)

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

---

## modules/dinner/class-vx-dinner-assignment.php

**Responsabilidad:** Asignación de usuarios a un evento 4Dinner.

```php
class VX_Dinner_Assignment {
    // Asigna un usuario a un evento
    // Actualiza vx_dinner_asignados en el CPT
    // Actualiza vx_dinners_asignado en el usuario
    // Si hay 4 asignados → llama automáticamente a send_confirmations()
    // Devuelve false si el evento ya está completo (4 asignados)
    public static function assign(int $dinner_id, int $user_id): bool

    // Desasigna un usuario
    // Solo funciona si el evento no está en estado 'realizado'
    public static function unassign(int $dinner_id, int $user_id): bool

    // Envía email de confirmación a los 4 comensales
    // Cada email incluye los datos de los otros 3
    // Solo puede llamarse cuando hay exactamente 4 asignados
    public static function send_confirmations(int $dinner_id): bool

    // Construye el array de datos para el template de confirmación
    // Devuelve: ['evento' => [...], 'comensales' => [['nombre', 'empresa', 'foto_url'], ...]]
    private static function build_confirmation_data(int $dinner_id): array
}
```

### Lógica de sincronización de meta

```php
// Al asignar:
$asignados = get_post_meta($dinner_id, 'vx_dinner_asignados', true) ?: [];
$asignados[] = $user_id;
update_post_meta($dinner_id, 'vx_dinner_asignados', $asignados);

$dinners = get_user_meta($user_id, VX_User_Meta::DINNERS_ASIGNADO, true) ?: [];
$dinners[] = $dinner_id;
update_user_meta($user_id, VX_User_Meta::DINNERS_ASIGNADO, $dinners);

if (count($asignados) === 4) {
    update_post_meta($dinner_id, 'vx_dinner_estado', 'completo');
    self::send_confirmations($dinner_id);
}
```

---

## modules/email/class-vx-mailer.php

**Responsabilidad:** Wrapper sobre `wp_mail()`. Único punto de envío de emails.

```php
class VX_Mailer {
    // Envía un email
    // $to:       email destino
    // $subject:  asunto
    // $template: nombre del template ('confirmacion', 'bienvenida', etc.)
    // $data:     array de datos para el template
    // Devuelve bool (éxito/fallo de wp_mail)
    public static function send(
        string $to,
        string $subject,
        string $template,
        array $data = []
    ): bool

    // Envío múltiple — para los 4Dinner (4 emails a la vez)
    // $recipients: array de ['email' => string, 'data' => array]
    public static function send_bulk(
        string $subject,
        string $template,
        array $recipients
    ): array  // devuelve ['sent' => int, 'failed' => int]
}
```

### Headers estándar

```php
$headers = [
    'Content-Type: text/html; charset=UTF-8',
    'From: Vitrinexo <hola@vitrinexo.com>',
];
```

---

## modules/email/class-vx-cron.php

**Responsabilidad:** Registro y ejecución de tareas programadas.

```php
class VX_Cron {
    // Registra todas las tareas — llamado en plugin activation
    public static function schedule(): void

    // Desregistra todas las tareas — llamado en plugin deactivation
    public static function unschedule(): void

    // Cron cada hora: busca conexiones pendientes +72h sin recordatorio
    public static function check_pending_connections(): void
    // Lógica:
    // 1. WP_Query de vx_conexion con estado='pendiente' AND recordatorio_enviado=false
    //    AND fecha_envio <= now() - 72h
    // 2. Para cada una: VX_Mailer::send(recordatorio) + marcar recordatorio_enviado=true
    // 3. Si fecha_envio <= now() - 7 días: VX_Connection_Flow::mark_no_response()

    // Cron cada lunes: resumen semanal de matches
    public static function send_weekly_matches(): void
    // Lógica:
    // 1. WP_User_Query de usuarios activos con notificación de matches activada
    // 2. Para cada uno: VX_Matches::get_new_since($user_id, strtotime('last monday'))
    // 3. Si hay matches nuevos: VX_Mailer::send(match_semanal)

    // Cron diario: verificar membresías vencidas
    public static function check_expired_memberships(): void
    // Lógica:
    // 1. WP_User_Query con vx_plan_estado='activo' AND vx_plan_vencimiento <= now()
    //    AND vx_plan != 'fundador'  (fundadores no vencen en fase gratuita)
    // 2. Para cada uno: VX_Membership::get($id)->mark_expired()
    // 3. Si vx_plan_vencimiento - now() <= 30 días: VX_Mailer::send(aviso_vencimiento)
}
```

### Frecuencias de WP Cron

```php
// Agrega frecuencia 'hourly' si no existe (WP no la tiene por defecto)
add_filter('cron_schedules', function($schedules) {
    $schedules['hourly'] = ['interval' => 3600, 'display' => 'Cada hora'];
    return $schedules;
});
```

---

## modules/notifications/class-vx-notification-triggers.php

**Responsabilidad:** Centraliza cuándo se crean las notificaciones. Es el único lugar que llama `VX_Notification::create()`.

```php
class VX_Notification_Triggers {
    // Registra todos los hooks — llamado en init
    public static function init(): void

    // do_action('vx_connection_received', $receptor_id, $conexion_id)
    // → VX_Notification::create($receptor_id, 'conexion_nueva', '/conexiones', $emisor_id, ...)
    public static function on_connection_received(int $receptor_id, int $conexion_id): void

    // do_action('vx_connection_accepted', $emisor_id, $conexion_id)
    // → VX_Notification::create($emisor_id, 'conexion_aceptada', '/conexiones', $receptor_id, ...)
    public static function on_connection_accepted(int $emisor_id, int $conexion_id): void

    // do_action('vx_account_activated', $user_id)
    // (no crea notificación — solo dispara el email de bienvenida via VX_Mailer)
    public static function on_account_activated(int $user_id): void

    // do_action('vx_onboarding_completed', $user_id)
    // (no crea notificación — el usuario ya está en el dashboard)
    public static function on_onboarding_completed(int $user_id): void
}
```
