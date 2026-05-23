# Convenciones PHP — vitrinexo-core

Estándares de código para el plugin. Seguir estas convenciones en cada archivo para mantener consistencia y facilitar el troubleshooting.

---

## Estructura de una clase

```php
<?php
/**
 * Clase VX_Connection_Flow
 *
 * Gestiona el ciclo de vida completo de una solicitud de conexión.
 * Crear, aceptar, rechazar y marcar sin respuesta.
 *
 * @package VitrinexoCore
 * @since   1.0.0
 */

// Evitar acceso directo
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class VX_Connection_Flow {

    /**
     * Crea una solicitud de conexión.
     *
     * @param int    $emisor_id   ID del usuario que inicia la solicitud.
     * @param int    $receptor_id ID del usuario receptor.
     * @param string $pitch       Mensaje del emisor.
     * @param array  $empresas    Nombres de empresa(s) desde las que contacta.
     * @return int|false          Post ID de la conexión creada, o false en error.
     */
    public static function create(
        int $emisor_id,
        int $receptor_id,
        string $pitch,
        array $empresas
    ): int|false {

        // Validar que los usuarios existen
        $emisor   = VX_User::get( $emisor_id );
        $receptor = VX_User::get( $receptor_id );

        if ( ! $emisor || ! $receptor ) {
            error_log( "[VX_Connection_Flow::create] Usuario no encontrado. emisor=$emisor_id receptor=$receptor_id" );
            return false;
        }

        // Verificar que no exista ya una solicitud pendiente
        if ( self::exists_pending( $emisor_id, $receptor_id ) ) {
            return false;
        }

        // Crear el post
        $post_id = wp_insert_post( [
            'post_type'   => 'vx_conexion',
            'post_title'  => 'Conexión: ' . $emisor->get_nombre_completo() . ' → ' . $receptor->get_nombre_completo(),
            'post_status' => 'publish',
        ] );

        if ( is_wp_error( $post_id ) ) {
            error_log( '[VX_Connection_Flow::create] wp_insert_post falló: ' . $post_id->get_error_message() );
            return false;
        }

        // Guardar meta
        update_post_meta( $post_id, 'vx_emisor_id',    $emisor_id );
        update_post_meta( $post_id, 'vx_receptor_id',  $receptor_id );
        // ...resto de meta

        // Generar tokens
        $token_aceptar  = VX_Token_Helper::generate();
        $token_rechazar = VX_Token_Helper::generate();
        update_post_meta( $post_id, 'vx_token_aceptar',  $token_aceptar );
        update_post_meta( $post_id, 'vx_token_rechazar', $token_rechazar );

        // Enviar email
        VX_Mailer::send(
            $receptor->get_email(),
            $receptor->get_nombre_completo() . ', alguien quiere conectar contigo',
            'conexion_recibida',
            [
                'receptor_nombre' => $receptor->get_nombre_completo(),
                'emisor_nombre'   => $emisor->get_nombre_completo(),
                'pitch'           => $pitch,
                'token_aceptar'   => $token_aceptar,
                'token_rechazar'  => $token_rechazar,
            ]
        );

        // Disparar hook para notificaciones
        do_action( 'vx_connection_received', $receptor_id, $post_id );

        return $post_id;
    }


    /**
     * Verifica si ya existe una conexión pendiente entre dos usuarios.
     *
     * @param int $emisor_id
     * @param int $receptor_id
     * @return bool
     */
    private static function exists_pending( int $emisor_id, int $receptor_id ): bool {
        $posts = get_posts( [
            'post_type'      => 'vx_conexion',
            'post_status'    => 'publish',
            'posts_per_page' => 1,
            'fields'         => 'ids',
            'meta_query'     => [
                [ 'key' => 'vx_emisor_id',   'value' => $emisor_id ],
                [ 'key' => 'vx_receptor_id', 'value' => $receptor_id ],
                [ 'key' => 'vx_estado',      'value' => 'pendiente' ],
            ],
        ] );
        return ! empty( $posts );
    }

}
```

---

## Convenciones de nombrado

### Clases
```php
// Prefijo VX_ siempre en mayúsculas
class VX_User { }
class VX_Connection_Flow { }
class VX_Dinner_Assignment { }
```

### Métodos
```php
// snake_case, verbos descriptivos
public function get_nombre(): string { }
public function is_active(): bool { }
public static function create(int $id): int|false { }
private static function exists_pending(): bool { }
```

### Variables
```php
// snake_case
$user_id   = 42;
$post_meta = get_post_meta( $post_id, 'vx_estado', true );
$is_valid  = VX_Token_Helper::validate( $token );
```

### Constantes
```php
// SCREAMING_SNAKE_CASE
const ESTADO_ACTIVO   = 'activo';
const PLAN_FUNDADOR   = 'fundador';
define( 'VX_VERSION', '1.0.0' );
```

### Archivos
```php
// kebab-case con prefijo de tipo
class-vx-user.php
class-vx-connection-flow.php
helper-tokens.php
cpt-conexion.php
rest-connections.php
```

---

## Sanitización de inputs

**Regla:** Todo input externo (POST, GET, usuario) se sanitiza antes de usarse. Nunca confiar en datos que vienen del cliente.

```php
// Strings genéricos
$nombre = sanitize_text_field( $_POST['nombre'] ?? '' );

// Emails
$email = sanitize_email( $_POST['email'] ?? '' );
if ( ! is_email( $email ) ) {
    return new WP_Error( 'email_invalido', 'El email no es válido.' );
}

// URLs
$web = esc_url_raw( $_POST['web'] ?? '' );

// Integers
$user_id = absint( $_POST['user_id'] ?? 0 );
if ( $user_id === 0 ) {
    return false; // ID inválido
}

// Arrays (ej: tags)
$tags = array_map( 'sanitize_text_field', (array) ( $_POST['tags'] ?? [] ) );
$tags = array_filter( $tags ); // eliminar vacíos
$tags = array_slice( $tags, 0, 5 ); // máximo 5

// Texto largo (bio, pitch)
$bio = sanitize_textarea_field( $_POST['bio'] ?? '' );

// Booleanos desde POST
$activo = filter_var( $_POST['activo'] ?? false, FILTER_VALIDATE_BOOLEAN );
```

---

## Queries seguras con $wpdb

Nunca interpolar variables directamente en queries. Siempre usar `$wpdb->prepare()`.

```php
global $wpdb;

// MAL — vulnerable a SQL injection
$result = $wpdb->get_results(
    "SELECT * FROM wp_usermeta WHERE user_id = $user_id"  // ❌
);

// BIEN — con prepare()
$result = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT meta_key, meta_value FROM {$wpdb->usermeta} WHERE user_id = %d",
        $user_id
    )
);

// Múltiples parámetros
$result = $wpdb->get_row(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->usermeta} WHERE user_id = %d AND meta_key = %s",
        $user_id,
        'vx_estado'
    )
);

// Insert directo (más seguro que query manual)
$wpdb->insert(
    $wpdb->usermeta,
    [
        'user_id'    => $user_id,
        'meta_key'   => 'vx_estado',
        'meta_value' => 'activo',
    ],
    [ '%d', '%s', '%s' ]  // tipos de datos
);
```

**Preferir siempre las funciones de WP** (`get_user_meta`, `update_user_meta`, `get_posts`, `WP_User_Query`) sobre queries directas con `$wpdb`. Solo usar `$wpdb` cuando las funciones de WP no son suficientes.

---

## Manejo de errores

### En métodos que pueden fallar
```php
// Devolver false o null para fallos simples
public static function get(int $id): ?VX_User {
    $wp_user = get_userdata( $id );
    if ( ! $wp_user ) {
        return null;
    }
    return new self( $wp_user );
}

// Devolver WP_Error para errores con mensaje
public static function create_connection(...): int|WP_Error {
    if ( ! $emisor ) {
        return new WP_Error(
            'usuario_no_encontrado',
            'El usuario emisor no existe.',
            [ 'status' => 404 ]
        );
    }
    // ...
}

// Loguear errores inesperados
if ( is_wp_error( $post_id ) ) {
    error_log( sprintf(
        '[VX][%s] %s — contexto: user_id=%d',
        __CLASS__ . '::' . __FUNCTION__,
        $post_id->get_error_message(),
        $user_id
    ) );
    return false;
}
```

### En endpoints REST
```php
public static function handle_create_connection( WP_REST_Request $request ): WP_REST_Response {
    // Verificar nonce
    if ( ! wp_verify_nonce( $request->get_header( 'X-WP-Nonce' ), 'wp_rest' ) ) {
        return new WP_REST_Response( [ 'error' => 'nonce_invalido' ], 403 );
    }

    // Verificar autenticación
    if ( ! is_user_logged_in() ) {
        return new WP_REST_Response( [ 'error' => 'no_autenticado' ], 401 );
    }

    $result = VX_Connection_Flow::create(
        get_current_user_id(),
        absint( $request->get_param( 'receptor_id' ) ),
        sanitize_textarea_field( $request->get_param( 'pitch' ) ),
        array_map( 'sanitize_text_field', (array) $request->get_param( 'empresas' ) )
    );

    if ( ! $result ) {
        return new WP_REST_Response( [ 'success' => false, 'error' => 'error_al_crear' ], 500 );
    }

    return new WP_REST_Response( [ 'success' => true, 'conexion_id' => $result ], 201 );
}
```

---

## Registrar un endpoint REST

```php
// En rest/rest-connections.php
add_action( 'rest_api_init', function() {

    register_rest_route( VX_REST_NAMESPACE, '/conexiones', [
        'methods'             => 'POST',
        'callback'            => [ 'VX_Connection_Rest', 'handle_create' ],
        'permission_callback' => function() {
            return is_user_logged_in();
        },
        'args' => [
            'receptor_id' => [
                'required'          => true,
                'validate_callback' => fn($v) => is_numeric( $v ) && $v > 0,
                'sanitize_callback' => 'absint',
            ],
            'pitch' => [
                'required'          => true,
                'validate_callback' => fn($v) => ! empty( trim( $v ) ),
                'sanitize_callback' => 'sanitize_textarea_field',
            ],
            'empresas' => [
                'required'          => false,
                'default'           => [],
                'sanitize_callback' => fn($v) => array_map( 'sanitize_text_field', (array) $v ),
            ],
        ],
    ] );

} );
```

---

## Registrar un CPT

```php
// En cpts/cpt-conexion.php
add_action( 'init', function() {

    register_post_type( 'vx_conexion', [
        'labels' => [
            'name'          => 'Conexiones',
            'singular_name' => 'Conexión',
        ],
        'public'       => false,     // No tiene URL pública propia
        'show_ui'      => true,      // Visible en WP Admin
        'show_in_menu' => true,
        'show_in_rest' => false,     // No exponer via REST de WP (tiene su propio endpoint)
        'supports'     => [ 'title' ],
        'menu_icon'    => 'dashicons-networking',
        'capability_type' => 'post',
        'map_meta_cap'    => true,
    ] );

} );
```

---

## Hooks: registrar y disparar

```php
// DISPARAR un hook (en la clase que origina el evento)
// Siempre documentar qué parámetros recibe
do_action( 'vx_connection_received', $receptor_id, $conexion_id );
// @param int $receptor_id  ID del usuario receptor
// @param int $conexion_id  Post ID de la conexión

// ESCUCHAR un hook (en la clase que reacciona)
// En el método init() de la clase
add_action( 'vx_connection_received', [ __CLASS__, 'on_connection_received' ], 10, 2 );

public static function on_connection_received( int $receptor_id, int $conexion_id ): void {
    VX_Notification::create(
        $receptor_id,
        'conexion_nueva',
        home_url( '/conexiones/' ),
        // ...
    );
}
```

---

## Filtros: cómo usarlos

```php
// Ejemplo: permitir filtrar los tags antes de guardarlos
$tags = apply_filters( 'vx_before_save_offer_tags', $tags, $user_id );
update_user_meta( $user_id, VX_User_Meta::OFFER_TAGS, $tags );

// Alguien puede hookear:
add_filter( 'vx_before_save_offer_tags', function( $tags, $user_id ) {
    return array_unique( $tags ); // eliminar duplicados
}, 10, 2 );
```

---

## Bootstrap del plugin (vitrinexo-core.php)

```php
<?php
/**
 * Plugin Name: Vitrinexo Core
 * Description: Lógica de negocio de la plataforma Vitrinexo
 * Version:     1.0.0
 * Author:      Maggiore Marketing
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'VX_VERSION',       '1.0.0' );
define( 'VX_PLUGIN_DIR',    plugin_dir_path( __FILE__ ) );
define( 'VX_PLUGIN_URL',    plugin_dir_url( __FILE__ ) );
define( 'VX_REST_NAMESPACE', 'vitrinexo/v1' );

// Autoload de clases (orden importa — primero los helpers y meta, luego los modelos, luego los flujos)
$modules = [
    // Helpers (sin dependencias)
    'helpers/helper-domains.php',
    'helpers/helper-tokens.php',
    'helpers/helper-tags.php',
    'helpers/helper-pagination.php',
    'helpers/helper-slugs.php',

    // Meta keys (sin dependencias)
    'modules/users/class-vx-user-meta.php',
    'modules/membership/class-vx-membership-meta.php',

    // Modelos (dependen de meta keys y helpers)
    'modules/users/class-vx-user.php',
    'modules/membership/class-vx-membership.php',
    'modules/membership/class-vx-plans.php',
    'cpts/cpt-empresa.php',
    'cpts/cpt-conexion.php',
    'cpts/cpt-dinner.php',
    'cpts/cpt-notification.php',

    // CPT models
    'modules/connections/class-vx-connection.php',
    'modules/dinner/class-vx-dinner.php',
    'modules/notifications/class-vx-notification.php',

    // Flujos (dependen de modelos)
    'modules/users/class-vx-verification.php',
    'modules/users/class-vx-auth.php',
    'modules/membership/class-vx-membership-hooks.php',
    'modules/onboarding/class-vx-onboarding.php',
    'modules/directory/class-vx-directory.php',
    'modules/directory/class-vx-search.php',
    'modules/directory/class-vx-matches.php',
    'modules/connections/class-vx-connection-flow.php',
    'modules/communities/class-vx-community.php',
    'modules/communities/class-vx-senior-verification.php',
    'modules/dinner/class-vx-dinner-assignment.php',

    // Email (depende de todo lo anterior)
    'modules/email/class-vx-email-templates.php',
    'modules/email/class-vx-mailer.php',
    'modules/email/class-vx-cron.php',

    // Notificaciones (depende de modelos y flujos)
    'modules/notifications/class-vx-notification-triggers.php',

    // REST (depende de flujos y modelos)
    'rest/rest-auth.php',
    'rest/rest-onboarding.php',
    'rest/rest-directory.php',
    'rest/rest-connections.php',
    'rest/rest-favorites.php',
    'rest/rest-notifications.php',
    'rest/rest-dinner.php',

    // Admin (depende de todo)
    'modules/admin/class-vx-admin-users.php',
    'modules/admin/class-vx-admin-connections.php',
    'modules/admin/class-vx-admin-dinner.php',
    'modules/admin/class-vx-admin-membership.php',
    'modules/onboarding/class-vx-onboarding-rest.php',
    'modules/connections/class-vx-connection-meta.php',
    'modules/connections/class-vx-connection-rest.php',
];

foreach ( $modules as $file ) {
    require_once VX_PLUGIN_DIR . $file;
}

// Inicializar los módulos que necesitan hooks
add_action( 'init', function() {
    VX_User_Meta::register();
    VX_Auth::init();
    VX_Notification_Triggers::init();
} );

// Activation / deactivation hooks
register_activation_hook(   __FILE__, [ 'VX_Cron', 'schedule' ] );
register_deactivation_hook( __FILE__, [ 'VX_Cron', 'unschedule' ] );
```

---

## Estilo de código — reglas rápidas

```php
// Espacios alrededor de operadores
$a = $b + $c;
$arr = [ 'key' => 'value' ];  // array con espacios internos

// Llaves en línea nueva para clases y funciones
class VX_User
{
    public function get_nombre(): string
    {
        return $this->nombre;
    }
}

// Llaves en la misma línea para if/else
if ( $condition ) {
    // ...
} else {
    // ...
}

// Espacios después de palabras clave
if ( ... )
while ( ... )
foreach ( $arr as $key => $value )

// Sin espacios en llamadas a funciones
sanitize_text_field( $input );
get_user_meta( $user_id, 'vx_estado', true );

// Siempre usar el tercer parámetro true en get_user_meta para arrays
$tags = get_user_meta( $user_id, VX_User_Meta::OFFER_TAGS, true );
// → devuelve el array deserializado, no la cadena serializada

// Yoda conditions (evitar asignaciones accidentales)
if ( 'activo' === $estado ) { }   // bien
if ( $estado === 'activo' ) { }   // también aceptable
if ( $estado = 'activo' ) { }     // ERROR silencioso — nunca hacer esto
```
