# Análisis técnico HUB Digital IHP

## 1. Visión general

HUB Digital IHP es una **plataforma de capacitación y comunidad** para Instituto
Hutchison Ports, construida como un **conjunto de microservicios** detrás de una
única puerta de entrada (API Gateway).

Idea central: **un solo punto valida la identidad** (el Gateway), y todos los demás
servicios confían en él. Esto evita duplicar lógica de login/seguridad en cada
módulo y centraliza el control.

Componentes principales:

| Componente | Para qué sirve |
|---|---|
| **API Gateway** | Puerta de entrada única. Login, validación de identidad, enrutamiento, límites de uso. |
| **Comunidad-HP** | Red social interna: muro, foros, eventos, noticias, dinámicas/juegos, normativa, repositorio, soporte, gamificación. |
| **Campus-HP** | E-learning propio (base técnica lista, lógica de negocio en construcción). |
| **Reportes-LMS** ("Smart Reports v3") | Cruce y explotación de datos del LMS externo; genera reportes en Excel/PDF. |
| **Frontend Navy Gate** | Aplicación web que consume todo a través del Gateway. |
| **Redis** | Memoria compartida: sesiones, límites de uso y caché. |
| **PostgreSQL** | Base de datos (una por servicio). |

---

## 2. Tecnologías usadas

### Backend
- **API Gateway, Comunidad-HP, Campus-HP**: Java 21 + Spring Boot 3.4.
  - El Gateway es **reactivo** (no bloqueante, alto rendimiento, Spring WebFlux).
  - Comunidad y Campus son **tradicionales** (Spring MVC, modelo más simple de
    desarrollar; se escalan agregando más instancias).
- **Reportes-LMS**: Node.js 22 + Fastify (servidor ligero) + un **worker en
  segundo plano** que procesa la generación de reportes pesados sin bloquear la API.

### Frontend (Navy Gate)
- **React 18 + TypeScript** (tipado estricto, menos errores en producción).
- **Vite** como empaquetador, **Tailwind CSS** para estilos.
- Carga por módulos ("lazy loading"): solo se descarga la pantalla que el usuario
  abre, no toda la app de golpe.

### Datos e infraestructura
- **PostgreSQL 15** como base de datos relacional.
- **Redis 7** para sesiones, límites de uso y caché.
- **Docker / Docker Compose** para levantar el entorno; **Azure** como nube de
  producción.

### Punto clave para TI
El proyecto usa **estándares de la industria, no tecnología propietaria ni
exótica**: Java/Spring, Node, React, PostgreSQL, Redis, Docker, Azure. Esto
facilita mantenimiento, contratación y soporte a largo plazo.

---

## 3. Seguridad

La seguridad está **concentrada en el Gateway**, que actúa como único guardián.

### 3.1 Autenticación (¿quién eres?)
- Al iniciar sesión, el Gateway entrega un **token firmado digitalmente (JWT con
  firma RSA / RS256)**.
- La firma usa un par de llaves: una **privada** (solo el Gateway puede firmar) y
  una **pública** (los demás servicios la usan para verificar que el token es
  legítimo). Las llaves nunca se guardan en la base de datos ni en el código, solo
  en variables de entorno seguras.
- Los microservicios **no tienen login propio**: reciben el token y lo validan
  contra la llave pública del Gateway. Si el token no es válido, rechazan la
  petición.

### 3.2 Autorización (¿qué puedes hacer?)
- El token incluye los **roles** (SYSADMIN, ADMIN, USUARIO) y **permisos
  granulares** del usuario (crear noticia, moderar soporte, gestionar normativa,
  etc.).
- Cada servicio decide qué se puede hacer según esos roles/permisos.

### 3.3 Protección contra ataques
- **Límite de intentos de login**: máximo ~5 intentos por minuto por usuario;
  tras varios fallos la cuenta se bloquea temporalmente (~15 min).
- **Anti-adivinación de usuarios**: el sistema responde igual exista o no el
  usuario, y siempre tarda un mínimo fijo, para que un atacante no pueda deducir
  qué cuentas existen.
- **Límite de uso general** (rate limiting): cada usuario tiene un tope de
  peticiones por minuto a los servicios internos, para evitar abusos y saturación.
- **Contraseñas cifradas** con BCrypt (estándar de la industria, no reversible).
- **Cabeceras de seguridad web** activas (HSTS, política de contenido CSP,
  restricciones de cámara/micrófono/ubicación, etc.) y **CORS restringido** a
  orígenes autorizados.
- **Comunicación cifrada (HTTPS)** en producción.

### 3.4 En el frontend
- El token de acceso vive **solo en memoria**, no en el navegador de forma
  persistente, lo que reduce el riesgo ante ataques de robo de sesión (XSS).
- El token de renovación viaja en una **cookie httpOnly** (inaccesible para el
  código JavaScript), que es la práctica recomendada.

---

## 4. Manejo de sesiones

El sistema usa **dos tipos de token**, un patrón estándar y seguro:

| Token | Duración | Para qué |
|---|---|---|
| **Token de acceso** | ~15 minutos | Acompaña cada petición. Corto a propósito: si se roba, expira rápido. |
| **Token de renovación** | ~7 días | Permite obtener nuevos tokens de acceso sin volver a escribir la contraseña. |

### Cómo funciona
- Las sesiones (tokens de renovación) viven en **Redis**, no en la base de datos.
- Cada inicio de sesión crea una **"familia" de sesión**. Cada vez que se renueva
  el token, el anterior se invalida y se emite uno nuevo (**rotación**).
- **Detección de robo de token**: si alguien intenta reutilizar un token ya usado,
  el sistema lo interpreta como robo y **revoca toda la familia de sesión
  automáticamente** (cierra esa sesión por completo).
- El frontend **renueva el token solo, en segundo plano**, antes de que expire, de
  forma transparente para el usuario.

### Cierre de sesión
- **Logout normal**: cierra la sesión actual.
- **Logout global** ("cerrar sesión en todos los dispositivos"): revoca todas las
  sesiones del usuario de una sola operación.

### Nota operativa para TI
Las sesiones están en Redis **sin persistencia en disco** (decisión de costo/
arquitectura). Esto significa que **un reinicio del Redis cierra todas las sesiones
activas** y los usuarios deben volver a iniciar sesión. Es un comportamiento
aceptado y documentado, no un error.

---

## 5. Auditoría

El sistema registra **quién hizo qué y cuándo**, en dos niveles:

### 5.1 Eventos de seguridad (en el Gateway)
Tabla dedicada que registra todo lo relacionado con accesos:
- Inicios de sesión exitosos y fallidos (con el motivo: credenciales inválidas,
  cuenta bloqueada, límite de intentos superado, usuario inexistente).
- Bloqueos de cuenta.
- Detección de reutilización de token (posible robo).
- Cierres de sesión globales y revocaciones.

Por cada evento se guarda: usuario, identificador intentado, tipo de evento,
resultado, motivo, **dirección IP**, navegador (user-agent) y fecha.

### 5.2 Auditoría de acciones de negocio (en Comunidad-HP)
Cada módulo (muro, normativa, repositorio, soporte, eventos, gamificación, etc.)
tiene su **propia tabla de auditoría**, en lugar de una sola tabla central
gigante. Esto mantiene las consultas rápidas y ordenadas.

Cada registro guarda: **quién** lo hizo (actor), **qué acción** (crear, editar,
eliminar, publicar, moderar, restaurar...), **sobre qué** (tipo y ID del objeto),
**detalle** del cambio (antes/después en formato JSON), un **identificador de
rastreo** y la fecha.

Criterios aplicados:
- **No se registra todo**: las acciones de alto volumen y bajo valor (ej. dar
  "me gusta", jugadas de juegos) se omiten para no inundar la auditoría.
- **Sí se registran** las acciones importantes: creación, edición, borrado,
  publicación, moderación, cambios de permisos/roles y cambios de configuración.
- **Tolerante a fallos**: si falla el registro de auditoría, la acción del usuario
  **no se cae**; los fallos en acciones críticas se elevan a nivel de alerta.

### 5.3 Trazabilidad de extremo a extremo
- Todas las peticiones llevan un **identificador de rastreo (traceId, estándar W3C
  traceparent)** que las acompaña desde el Gateway hasta cada microservicio.
- Los **logs son estructurados en JSON** (no texto plano), con el traceId y el
  usuario incluidos. Esto permite seguir una operación completa a través de todos
  los servicios y se integra con herramientas de observabilidad (OpenTelemetry).

---

## 6. Infraestructura y despliegue

### Local (desarrollo)
- Todo se levanta con **Docker Compose modular**: un núcleo siempre activo
  (Gateway + base de datos + Redis) y cada microservicio opcional en su propio
  archivo. Se enciende solo lo que se necesita.

### Producción (Azure)
- Infraestructura definida como **código (Bicep / Infrastructure as Code)**: el
  entorno se crea de forma reproducible, sin pasos manuales.
- Recursos principales:
  - **App Services** (contenedores) para cada servicio.
  - **PostgreSQL** gestionado (un servidor, una base de datos por servicio).
  - **Azure Cache for Redis** (tier Standard C1).
  - **Front Door** como punto de entrada/CDN.
  - **Key Vault** para todos los secretos (contraseñas, llaves, tokens).
  - **Container Registry** para las imágenes, **Application Insights** y **Log
    Analytics** para monitoreo.
  - **Red privada (VNet)**: las bases de datos y servicios internos no quedan
    expuestos directamente a internet.
- **Los secretos nunca están en el código**: se inyectan desde Key Vault.

---

## 7. Decisiones de arquitectura documentadas (ADR)

El equipo mantiene **decisiones de arquitectura documentadas (ADR)**, lo que da
trazabilidad de por qué se eligió cada cosa. Las principales:

- Arquitectura de microservicios con Gateway como entrada única.
- Seguridad y cifrado (JWT RS256, HTTPS, BCrypt, rate limiting).
- Estrategia de autenticación (Gateway como único autenticador; SSO con Azure
  Entra ID previsto a futuro).
- Adopción de Redis para sesiones, límites y caché.
- Autorización por roles y permisos.
- Separación de llaves de firma de tokens.

---

## 8. Resumen ejecutivo (una diapositiva)

- **Arquitectura**: microservicios con un Gateway como única puerta y guardián de
  identidad. Tecnologías estándar de mercado (Java/Spring, Node, React,
  PostgreSQL, Redis, Docker, Azure).
- **Seguridad**: tokens firmados (RS256), contraseñas cifradas, límites anti-abuso,
  protección anti-adivinación, cabeceras de seguridad y HTTPS. Frontend que no
  guarda el token de forma persistente.
- **Sesiones**: esquema de token corto + token de renovación, con rotación y
  **detección automática de robo de sesión**; cierre de sesión global disponible.
- **Auditoría**: eventos de seguridad + auditoría de acciones de negocio por
  módulo, con trazabilidad completa de extremo a extremo y logs estructurados.
- **Infraestructura**: definida como código en Azure, secretos en Key Vault, red
  privada, monitoreo integrado.
- **Madurez**: decisiones documentadas (ADR), prácticas de seguridad alineadas a
  estándares (OWASP).
