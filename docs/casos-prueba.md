# Casos de prueba — Vitrinexo

Input, estado esperado de BD y emails esperados para cada flujo. Usar como referencia para verificar que la implementación funciona correctamente.

---

## Flujo 1: Registro con correo institucional

### Setup
- Usuario no existe en el sistema
- Email: `ana@brandlab.com` (dominio institucional)

### Acción
`POST /wp-json/vitrinexo/v1/registro` con `{nombre: "Ana", apellido: "García", email: "ana@brandlab.com", password: "Segura123", pais: "Colombia"}`

### Estado esperado en BD después de la acción

```sql
-- wp_users: usuario creado
SELECT * FROM wp_users WHERE user_email = 'ana@brandlab.com';
-- → 1 fila, user_registered = NOW()

-- wp_usermeta: meta iniciales
SELECT meta_key, meta_value FROM wp_usermeta WHERE user_id = {nuevo_id};
-- vx_nombre                  = 'Ana'
-- vx_apellido                = 'García'
-- vx_estado                  = 'pendiente'
-- vx_tipo_verificacion       = 'automatica'
-- vx_token_confirmacion      = [UUID v4, 36 chars]
-- vx_token_expira            = [timestamp actual + 86400 segundos]
-- vx_onboarding_completo     = '' (vacío, no 'false')
-- vx_plan                    = 'gratuito'
```

### Emails esperados
- **1 email** enviado a `ana@brandlab.com`
- Asunto: "Confirma tu cuenta en Vitrinexo"
- Body: contiene el token en el link de activación
- **0 emails** al admin

### Redirect esperado
Usuario ve `/confirmar-correo/`

---

## Flujo 2: Registro con correo genérico

### Setup
- Email: `carlos@gmail.com`

### Estado esperado en BD

```sql
-- vx_estado              = 'pendiente'
-- vx_tipo_verificacion   = 'manual'
-- vx_token_confirmacion  = '' (vacío — no se genera aún)
-- vx_token_expira        = '' (vacío)
```

### Emails esperados
- **0 emails** al usuario
- **1 email** al admin (`get_option('admin_email')`)
- Asunto del email admin: "Nueva cuenta pendiente de verificación — Vitrinexo"

### Redirect esperado
Usuario ve `/verificacion-pendiente/`

---

## Flujo 3: Activación de cuenta (flujo automático)

### Setup
- Usuario con `vx_estado = pendiente`, `vx_tipo_verificacion = automatica`
- Token válido: `abc-123-def-456` guardado en `vx_token_confirmacion`
- Token no expirado: `vx_token_expira > time()`

### Acción
`GET /wp-json/vitrinexo/v1/activar?uid={id}&token=abc-123-def-456&accion=confirmar`

### Estado esperado en BD

```sql
-- vx_estado              = 'activo'
-- vx_token_confirmacion  = '' (borrado)
-- vx_token_expira        = '' (borrado)
-- vx_onboarding_completo = '' (sigue vacío — no completó onboarding)
```

### Emails esperados
- **1 email** al usuario: email de bienvenida
- Asunto: "Bienvenida a Vitrinexo"

### Redirect esperado
`/onboarding/` (guard detecta onboarding incompleto)

---

## Flujo 4: Activación con token expirado

### Setup
- `vx_token_expira = time() - 3600` (hace 1 hora, expirado)

### Acción
`GET /wp-json/vitrinexo/v1/activar?uid={id}&token=abc-123-def-456`

### Estado esperado en BD
Sin cambios. Token no se consume.

### Emails esperados
Ninguno.

### Redirect esperado
`/confirmar-correo/?error=token_expirado`

---

## Flujo 5: Aprobación manual por admin

### Setup
- Usuario con `vx_estado = pendiente`, `vx_tipo_verificacion = manual`

### Acción
Admin hace clic en "Aprobar" en WP Admin (`class-vx-admin-users.php`)

### Estado esperado en BD

```sql
-- vx_estado              = 'pendiente'  (NO cambia aún — espera que el usuario active)
-- vx_token_confirmacion  = [UUID v4 nuevo]
-- vx_token_expira        = [timestamp actual + 259200 segundos (72h)]
```

### Emails esperados
- **1 email** al usuario
- Asunto: "¡Tu cuenta en Vitrinexo fue aprobada!"
- Body: contiene link con el nuevo token (expira en 72h)

---

## Flujo 6: Onboarding — guardado progresivo

### Setup
- Usuario con `vx_estado = activo`, `vx_onboarding_completo = ''`

### Acción paso 2
`POST /wp-json/vitrinexo/v1/onboarding/paso` con:
```json
{
  "paso": 2,
  "datos": {
    "nombre": "Ana",
    "apellido": "García",
    "bio": "Directora de marketing...",
    "ciudad": "Bogotá",
    "pais": "Colombia",
    "contacto_preferido": "email"
  }
}
```

### Estado esperado en BD

```sql
-- vx_nombre              = 'Ana'
-- vx_apellido            = 'García'
-- vx_bio                 = 'Directora de marketing...'
-- vx_ciudad              = 'Bogotá'
-- vx_pais                = 'Colombia'
-- vx_contacto_preferido  = 'email'
-- vx_onboarding_paso     = '2'
-- vx_perfil_slug         = 'ana-garcia'  (generado automáticamente)
```

### Respuesta esperada de la API
```json
{"success": true, "paso": 2}
```

---

## Flujo 7: Onboarding — paso 3 (empresa)

### Acción
`POST /wp-json/vitrinexo/v1/onboarding/paso` con:
```json
{
  "paso": 3,
  "datos": {
    "empresa_nombre": "BrandLab Internacional",
    "empresa_cargo": "Directora",
    "empresa_web": "https://brandlab.com",
    "empresa_linkedin": "https://linkedin.com/company/brandlab"
  }
}
```

### Estado esperado en BD

```sql
-- wp_posts: nuevo post creado
-- post_type    = 'vx_empresa'
-- post_title   = 'BrandLab Internacional'
-- post_author  = {user_id}
-- post_status  = 'publish'

-- wp_postmeta del nuevo post:
-- vx_user_id         = {user_id}
-- vx_cargo           = 'Directora'
-- vx_web             = 'https://brandlab.com'
-- vx_linkedin        = 'https://linkedin.com/company/brandlab'
-- vx_empresa_activa  = 'true'

-- wp_usermeta:
-- vx_onboarding_paso = '3'
```

---

## Flujo 8: Onboarding completado

### Acción
`POST /wp-json/vitrinexio/v1/onboarding/paso` con `{"paso": 6, "completar": true}`

### Estado esperado en BD

```sql
-- vx_onboarding_completo = 'true'
-- vx_onboarding_paso     = '6'
```

### Emails esperados
Ninguno adicional (el de bienvenida ya se envió al activar la cuenta).

### Comportamiento del guard
Próxima petición a `/dashboard/` ya no redirige a `/onboarding/`.

---

## Flujo 9: Solicitud de conexión

### Setup
- Usuario A (id: 42, emisor) hace clic en "Conectar" en el perfil del Usuario B (id: 58)
- Usuario A no ha enviado ya una solicitud pendiente a B

### Acción
`POST /wp-json/vitrinexo/v1/conexiones` con:
```json
{
  "receptor_id": 58,
  "pitch": "Vi tu perfil y creo que podemos colaborar...",
  "empresas": ["Maggiore Marketing"]
}
```

### Estado esperado en BD

```sql
-- wp_posts: nuevo post
-- post_type   = 'vx_conexion'
-- post_status = 'publish'
-- post_title  = 'Conexión: Felipe Muñoz → Ana García'

-- wp_postmeta:
-- vx_emisor_id                 = 42
-- vx_emisor_nombre             = 'Felipe Muñoz'   (snapshot)
-- vx_emisor_email              = 'felipe@maggiore.cl'  (snapshot)
-- vx_emisor_telefono           = '+56912345678'  (snapshot)
-- vx_emisor_linkedin           = 'https://...'  (snapshot)
-- vx_emisor_contacto_preferido = 'email'  (snapshot)
-- vx_emisor_empresas           = ['Maggiore Marketing']  (snapshot)
-- vx_receptor_id               = 58
-- vx_receptor_nombre           = 'Ana García'  (snapshot)
-- vx_receptor_email            = 'ana@brandlab.com'  (snapshot, no se revela)
-- vx_pitch                     = 'Vi tu perfil...'
-- vx_estado                    = 'pendiente'
-- vx_fecha_envio               = [timestamp actual]
-- vx_token_aceptar             = [UUID v4]
-- vx_token_rechazar            = [UUID v4]
-- vx_recordatorio_enviado      = 'false'

-- wp_posts: nueva notificación
-- post_type   = 'vx_notification'
-- vx_notif_user_id  = 58
-- vx_notif_tipo     = 'conexion_nueva'
-- vx_notif_leida    = 'false'
```

### Emails esperados
- **1 email** a `ana@brandlab.com` (receptor)
- Asunto: "Felipe Muñoz quiere conectar contigo en Vitrinexo"
- Body: pitch, nombre y empresa de Felipe. Botones Aceptar/Rechazar con tokens en URL.
- Los datos de contacto de Felipe NO aparecen en el email.

---

## Flujo 10: Aceptar conexión

### Setup
- Conexión id:73 en estado 'pendiente'
- `vx_token_aceptar = 'xyz-token-123'`

### Acción
Ana hace clic en "Aceptar" del email → `GET /wp-json/vitrinexo/v1/conexiones/aceptar?token=xyz-token-123`

### Estado esperado en BD

```sql
-- vx_estado          = 'aceptado'
-- vx_fecha_respuesta = [timestamp actual]
-- vx_token_aceptar   = ''  (borrado)
-- vx_token_rechazar  = ''  (borrado)

-- nueva notificación:
-- vx_notif_user_id = 42  (Felipe, el emisor)
-- vx_notif_tipo    = 'conexion_aceptada'
```

### Emails esperados
- **1 email** a `felipe@maggiore.cl` (emisor)
- Asunto: "¡Ana García aceptó tu solicitud!"
- Body: datos de contacto de Ana (email, teléfono, LinkedIn, badge "Preferido")

### Redirect esperado
Ana ve `/conexion-aceptada/` con los datos de contacto de Felipe.

---

## Flujo 11: Rechazar conexión

### Acción
Ana hace clic en "Rechazar" → `GET /wp-json/vitrinexo/v1/conexiones/rechazar?token=abc-token-456`

### Estado esperado en BD

```sql
-- vx_estado          = 'rechazado'
-- vx_fecha_respuesta = [timestamp actual]
-- vx_token_aceptar   = ''  (borrado)
-- vx_token_rechazar  = ''  (borrado)
```

### Emails esperados
**Ninguno.** El rechazo es silencioso — Felipe no se entera.

### Notificaciones creadas
**Ninguna.**

### Redirect esperado
Ana ve `/conexion-rechazada/` (mensaje de cierre elegante).

---

## Flujo 12: Cron — recordatorio de conexión a las 72h

### Setup
- Conexión con `vx_estado = pendiente`
- `vx_fecha_envio = time() - 80 * HOUR_IN_SECONDS` (hace 80 horas)
- `vx_recordatorio_enviado = false`

### Acción
WP Cron ejecuta `VX_Cron::check_pending_connections()`

### Estado esperado en BD

```sql
-- vx_recordatorio_enviado = 'true'
```

### Emails esperados
- **1 email** al receptor
- Asunto: "Recordatorio: tienes una solicitud pendiente"
- Body: datos del emisor + botones Aceptar/Rechazar

---

## Flujo 13: Cron — sin respuesta a los 7 días

### Setup
- Conexión con `vx_estado = pendiente`
- `vx_fecha_envio = time() - 8 * DAY_IN_SECONDS` (hace 8 días)
- `vx_recordatorio_enviado = true`

### Acción
WP Cron ejecuta `VX_Cron::check_pending_connections()`

### Estado esperado en BD

```sql
-- vx_estado = 'sin_respuesta'
```

### Emails esperados
**Ninguno.**

---

## Flujo 14: 4Dinner — expresar interés

### Setup
- Usuario id:77, evento id:89 en estado 'abierto' con 2 asignados
- Usuario no está en la lista de interesados ni asignados

### Acción
`POST /wp-json/vitrinexo/v1/dinners/89/interes`

### Estado esperado en BD

```sql
-- vx_dinner_interesados (post meta de dinner 89): array incluye ahora 77
-- vx_dinners_interesado (user meta de usuario 77): array incluye ahora 89
```

---

## Flujo 15: 4Dinner — asignación del cuarto comensal

### Setup
- Evento id:89 con 3 asignados: [42, 58, 63]
- Admin asigna al usuario id:71

### Acción
Admin hace clic en "Asignar" en WP Admin

### Estado esperado en BD

```sql
-- vx_dinner_asignados (post meta 89): [42, 58, 63, 71]
-- vx_dinner_estado    (post meta 89): 'completo'
-- vx_dinners_asignado (user meta 71): incluye 89
```

### Emails esperados
- **4 emails** — uno a cada comensal (42, 58, 63, 71)
- Asunto: "Tu mesa 4Dinner está confirmada"
- Body: restaurante, dirección, fecha, hora + foto y empresa de los otros 3 comensales
- Cada email es personalizado (cada uno ve a los otros 3, no a sí mismo)

---

## Casos de error esperados

### Token inválido
- Endpoint: `/activar` o `/conexiones/aceptar` con token incorrecto
- Respuesta: redirect a la página de error correspondiente con `?error=token_invalido`
- BD: sin cambios

### Conexión duplicada
- Usuario A intenta conectar con B cuando ya existe una conexión pendiente
- Respuesta: `{"success": false, "error": "ya_existe_solicitud_pendiente"}`
- BD: sin cambios, no se crea segundo post

### Onboarding con campos faltantes
- `POST /onboarding/paso` con paso 2 sin `nombre` o `pais`
- Respuesta: `{"success": false, "errors": {"nombre": "Campo requerido", "pais": "Campo requerido"}}`
- BD: sin cambios

### Dinner completo
- Usuario intenta expresar interés en un dinner con estado 'completo'
- Respuesta: `{"success": false, "error": "evento_completo"}`
- BD: sin cambios

### Asignar al quinto comensal
- Admin intenta asignar un quinto usuario a un dinner
- `VX_Dinner_Assignment::assign()` devuelve `false`
- BD: sin cambios
