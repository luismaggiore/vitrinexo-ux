# Orden de implementación — vitrinexo-core

Secuencia de construcción con dependencias entre módulos. Seguir este orden evita tener que reescribir código por dependencias faltantes.

---

## Principio general

Construir de adentro hacia afuera:
1. **Infraestructura** — lo que no depende de nada (helpers, registro de CPTs y meta keys)
2. **Modelos** — abstracción sobre los datos (VX_User, VX_Membership, VX_Connection)
3. **Flujos** — lógica de negocio (VX_Verification, VX_Connection_Flow, VX_Onboarding)
4. **Comunicación** — email y notificaciones (VX_Mailer, VX_Notification_Triggers)
5. **API** — endpoints REST
6. **Admin** — vistas en WP Admin
7. **Theme** — templates PHP

Nunca empezar un módulo sin que sus dependencias estén completas y probadas.

---

## Fase 0 — Setup del repositorio WordPress

**Objetivo:** Tener un WordPress funcionando con el plugin registrado.

- [ ] Crear estructura de carpetas del plugin (`vitrinexo-core/`)
- [ ] Crear `vitrinexo-core.php` con el bootstrap mínimo (solo define constantes y el array de archivos a cargar — sin cargar nada aún)
- [ ] Crear estructura de carpetas del theme (`vitrinexo-theme/`)
- [ ] Crear `vitrinexo-theme/style.css` con los metadatos del theme
- [ ] Crear `vitrinexo-theme/functions.php` con el enqueue de assets mínimo
- [ ] Copiar `src/style.css` del repo de maquetas a `vitrinexo-theme/assets/css/`
- [ ] Verificar: el theme se activa en WordPress sin errores

**Sin esto no se puede continuar nada.**

---

## Fase 1 — Infraestructura base

**Objetivo:** Los cimientos del plugin. Sin lógica de negocio, solo registros y helpers.

### 1.1 Helpers

- [ ] `helpers/helper-tokens.php` — `VX_Token_Helper::generate()` y `::validate()`
  - Genera UUID v4 con `wp_generate_uuid4()` o implementación propia
  - Validar: formato correcto, 36 caracteres, guiones en posición correcta
- [ ] `helpers/helper-domains.php` — `VX_Domain_Helper::is_generic(string $email): bool`
  - Lista hardcodeada de dominios genéricos (ver `docs/flujo-onboarding.md`)
  - Validar: gmail.com → true, brandlab.com → false
- [ ] `helpers/helper-tags.php` — `VX_Tag_Helper::normalize(array $tags): array`
  - Lowercase, trim, eliminar duplicados, máximo 5 elementos
- [ ] `helpers/helper-pagination.php` — `VX_Pagination::build(int $total, int $per_page, int $current): array`
  - Devuelve datos para renderizar la paginación: total_pages, has_prev, has_next, etc.
- [ ] `helpers/helper-slugs.php` — `VX_Slug_Helper::generate(string $nombre, string $apellido): string`
  - Usa `sanitize_title()` + verifica duplicados en BD + agrega sufijo numérico si necesario

### 1.2 Meta keys

- [ ] `modules/users/class-vx-user-meta.php` — todas las constantes + `VX_User_Meta::register()`
- [ ] `modules/membership/class-vx-membership-meta.php` — constantes de membresía

### 1.3 CPTs

- [ ] `cpts/cpt-empresa.php` — `register_post_type('vx_empresa', [...])`
- [ ] `cpts/cpt-conexion.php` — `register_post_type('vx_conexion', [...])`
- [ ] `cpts/cpt-dinner.php` — `register_post_type('vx_dinner', [...])`
- [ ] `cpts/cpt-notification.php` — `register_post_type('vx_notification', [...])`
- [ ] Verificar: los 4 CPTs aparecen en el menú de WP Admin sin errores

**Dependencias:** nada  
**Verificación:** `php -l` en cada archivo sin errores. Los CPTs aparecen en WP Admin.

---

## Fase 2 — Modelos

**Objetivo:** Abstracción sobre los datos. Ninguna lógica de negocio, solo lectura y escritura.

### 2.1 VX_User

- [ ] `modules/users/class-vx-user.php`
  - Implementar factory `::get(int $user_id): ?VX_User`
  - Todos los getters de identidad
  - Getters de estado y membresía
  - Getters de tags
  - `get_empresa_activa()` y `get_empresas()`
  - `to_card_array()`
  - Setters básicos (estado, tags, onboarding)

- [ ] Test manual: crear un usuario en WP Admin, asignarle meta manualmente via `update_user_meta()`, verificar que `VX_User::get($id)->get_nombre()` devuelve el valor correcto.

### 2.2 VX_Membership

- [ ] `modules/membership/class-vx-membership.php`
  - Factory `::get(int $user_id)`
  - `is_active()`, `is_founder()`, `has_lifetime_price()`
  - `activate()`, `cancel()`, `mark_expired()`

### 2.3 VX_Plans

- [ ] `modules/membership/class-vx-plans.php`
  - Constante `PLANS` con la definición de planes

### 2.4 VX_Connection (modelo)

- [ ] `modules/connections/class-vx-connection.php`
  - Factory `::get(int $post_id)`
  - `::get_by_token(string $token, string $tipo)`
  - `::get_sent_by(int $user_id)`
  - `::get_received_by(int $user_id)`
  - `::get_accepted(int $user_id)`
  - `->get_contact_data()`
- [ ] `modules/connections/class-vx-connection-meta.php` — constantes de meta keys

### 2.5 VX_Dinner (modelo)

- [ ] `modules/dinner/class-vx-dinner.php`
  - Factory `::get(int $post_id)`
  - `::get_upcoming()`
  - `->get_assigned_users()`, `->get_interested_users()`
  - `->has_space()`
  - `->add_interest(int $user_id)`, `->remove_interest(int $user_id)`
- [ ] `modules/dinner/class-vx-dinner-meta.php` — constantes de meta keys

### 2.6 VX_Notification (modelo)

- [ ] `modules/notifications/class-vx-notification.php`
  - `::create()`
  - `::get_for_user()`
  - `::mark_read()`, `::mark_all_read()`
  - `::count_unread()`

**Dependencias:** Fase 1 completa  
**Verificación:** Test manual de cada modelo con datos reales en BD.

---

## Fase 3 — Email

**Objetivo:** Poder enviar emails antes de construir los flujos que los necesitan.

- [ ] `modules/email/class-vx-email-templates.php`
  - Implementar los 8 templates (ver `emails/` en el repo de maquetas como referencia)
  - Cada template es un método que recibe datos y devuelve HTML con CSS inline
  - Verificar que el HTML de cada template es válido enviando un email de prueba

- [ ] `modules/email/class-vx-mailer.php`
  - `::send()` wrapper sobre `wp_mail()`
  - `::send_bulk()` para envío múltiple
  - Configurar headers (From, Content-Type)

- [ ] Configurar FluentSMTP con Postmark en el WordPress de desarrollo

- [ ] Test: `VX_Mailer::send('test@dominio.com', 'Test', 'bienvenida', ['nombre' => 'Test'])` → email llega correctamente

**Dependencias:** Fase 1 completa  
**Verificación:** Los 8 templates se renderizan sin errores. Al menos 1 email enviado y recibido correctamente.

---

## Fase 4 — Flujos de usuario

**Objetivo:** La lógica de negocio central.

### 4.1 Verificación y auth

- [ ] `modules/users/class-vx-verification.php`
  - `is_institutional()`, `generate_token()`, `validate_token()`
  - `activate_account()`, `send_confirmation_email()`
  - `notify_admin_pending()`, `approve_manual()`

- [ ] `modules/users/class-vx-auth.php`
  - `check_access()` con el guard completo
  - `block_admin()` para no-admins
  - `hide_admin_bar()`

- [ ] Verificar usando los casos de prueba 1-5 de `docs/casos-prueba.md`

### 4.2 Onboarding

- [ ] `modules/onboarding/class-vx-onboarding.php`
  - `save_step()` con validación por paso
  - `get_state()`
  - `complete()`

- [ ] Verificar usando casos de prueba 6-8

### 4.3 Directorio y matches

- [ ] `modules/directory/class-vx-directory.php`
  - `get_members()` con todos los filtros
  - `get_filters()`
  - `format_for_card()`

- [ ] `modules/directory/class-vx-search.php`
  - `search()` con búsqueda full-text

- [ ] `modules/directory/class-vx-matches.php`
  - `get_seeks_matches()` y `get_offers_matches()`
  - `calculate_score()`
  - `get_new_since()`

### 4.4 Conexiones

- [ ] `modules/connections/class-vx-connection-flow.php`
  - `create()`, `accept()`, `reject()`, `mark_no_response()`

- [ ] Verificar usando casos de prueba 9-13

### 4.5 Comunidades

- [ ] `modules/communities/class-vx-community.php`
- [ ] `modules/communities/class-vx-senior-verification.php`

### 4.6 4Dinner

- [ ] `modules/dinner/class-vx-dinner-assignment.php`
  - `assign()`, `unassign()`, `send_confirmations()`

- [ ] Verificar usando casos de prueba 14-15

**Dependencias:** Fases 1, 2 y 3 completas  
**Verificación:** Todos los casos de prueba de `docs/casos-prueba.md` pasan.

---

## Fase 5 — Notificaciones y Cron

- [ ] `modules/notifications/class-vx-notification-triggers.php`
  - Registrar hooks para: connection_received, connection_accepted, account_activated

- [ ] `modules/email/class-vx-cron.php`
  - `schedule()` y `unschedule()`
  - `check_pending_connections()` (cron horario)
  - `send_weekly_matches()` (cron lunes)
  - `check_expired_memberships()` (cron diario)

- [ ] `modules/membership/class-vx-membership-hooks.php`
  - Estructura preparada, métodos vacíos hasta conectar gateway

**Dependencias:** Fase 4 completa

---

## Fase 6 — REST API

Construir los endpoints en el mismo orden que los flujos.

- [ ] `rest/rest-auth.php` — `/activar`, `/reenviar-token`
- [ ] `rest/rest-onboarding.php` — `/onboarding/paso`, `/onboarding/estado`
- [ ] `rest/rest-directory.php` — `/directorio`, `/directorio/buscar`, `/perfil/{slug}`
- [ ] `rest/rest-connections.php` — todos los endpoints de conexiones
- [ ] `rest/rest-favorites.php` — `/favoritos`
- [ ] `rest/rest-notifications.php` — `/notificaciones` y sus variantes
- [ ] `rest/rest-dinner.php` — `/dinners` y sus variantes

Para cada endpoint:
1. Registrar con `register_rest_route()`
2. Implementar el `permission_callback` correcto
3. Declarar y sanitizar todos los `args`
4. Probar con Postman o el cliente REST de preferencia
5. Verificar que los casos de error devuelven los códigos HTTP correctos (400, 401, 403, 404, 500)

**Dependencias:** Fases 4 y 5 completas

---

## Fase 7 — Admin WP

- [ ] `modules/admin/class-vx-admin-users.php`
  - Columna Estado en lista de usuarios
  - Columna Plan
  - Botones de Aprobar / Rechazar / Verificar Senior

- [ ] `modules/admin/class-vx-admin-connections.php`
  - Vista de conexiones en WP Admin (opcional, las conexiones se gestionan desde el frontend)

- [ ] `modules/admin/class-vx-admin-dinner.php`
  - Meta boxes de Interesados y Mesa Confirmada en el CPT vx_dinner
  - Buscador de miembros para invitar directamente

- [ ] `modules/admin/class-vx-admin-membership.php`
  - Activar plan Fundador manualmente
  - Vista de estado de membresías

**Dependencias:** Fases 4, 5 y 6 completas

---

## Fase 8 — Theme WordPress

Traducir las maquetas HTML del repo `vitrinexo-ux` a templates PHP del theme.

**Orden sugerido dentro del theme:**

1. Partials reutilizables primero (nav, footer, card-member, modal-conectar, empty-state)
2. Páginas del flujo de auth (login, confirmar-correo, verificacion-pendiente)
3. Onboarding
4. Dashboard
5. Directorio y search-results
6. Matches
7. Perfil y editor de perfil
8. Conexiones, favoritos, notificaciones
9. Configuración
10. 4Dinner (landing pública y vista autenticada)
11. Comunidades
12. Blog

Para cada template:
1. Copiar el HTML de la maqueta correspondiente
2. Reemplazar los datos hardcodeados por llamadas a funciones del plugin
3. Agregar el shortcode `[vx_*]` correspondiente
4. Crear la página en WordPress con ese shortcode
5. Verificar que el guard de acceso funciona correctamente para esa página

**Dependencias:** Todas las fases anteriores completas

---

## Resumen de dependencias

```
Fase 0 (Setup)
    ↓
Fase 1 (Infraestructura: helpers, meta keys, CPTs)
    ↓
Fase 2 (Modelos: VX_User, VX_Membership, VX_Connection, VX_Dinner, VX_Notification)
    ↓
Fase 3 (Email: templates + mailer)
    ↓
Fase 4 (Flujos: verificación, auth, onboarding, directorio, conexiones, 4Dinner)
    ↓
Fase 5 (Notificaciones + Cron)
    ↓
Fase 6 (REST API)
    ↓
Fase 7 (Admin WP)
    ↓
Fase 8 (Theme)
```

Fases 2, 3 y sus partes dentro de Fase 4 se pueden paralelizar si hay más de un desarrollador. Dentro de cada fase, los módulos sin dependencias entre sí también se pueden construir en paralelo.
