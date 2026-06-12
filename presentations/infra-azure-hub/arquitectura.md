# Arquitectura HUB Digital IHP

Documento de referencia técnica para el equipo. Describe la infraestructura del HUB en
lenguaje natural, servicio por servicio. La fuente de verdad ejecutable es el archivo
[MVP.bicep](recursos/MVP.bicep). El diseño de producción se definirá en una fase posterior.

## Estrategia de Despliegue

El proyecto sigue un camino evolutivo de dos etapas:

1. **MVP**: arquitectura esencial para validar funcionalidad sobre crédito gratuito de Azure.
   Sin tráfico real, solo pruebas internas y validación con corporativo, TI y gerencia.
   Se eliminan los componentes de borde (Front Door) y el aislamiento extremo (Private
   Endpoints) para reducir costo y complejidad.
2. **Producción** (pendiente): una vez aprobado el proyecto, se diseñará la arquitectura
   corporativa con red privada, WAF, alta disponibilidad e integración con Entra ID,
   alineada a las políticas de Hutchison Ports.

---

## Topología de Red (MVP)

La red virtual (VNet) `10.0.0.0/16` tiene dos subredes:

- **subnet-computo** (`10.0.1.0/24`): delegada a App Services. Da salida privada de los
  microservicios hacia PostgreSQL vía VNet Integration.
- **subnet-datos** (`10.0.2.0/24`): delegada exclusivamente a PostgreSQL Flexible Server.

*Nota: Redis, Storage, ACR y Key Vault operan con endpoints públicos protegidos por
credenciales y TLS en el MVP. El aislamiento por Private Endpoints es una decisión de
producción.*

> La VNet Integration funciona desde el tier **Basic** de App Service; **no** requiere
> PremiumV3. El plan se dimensiona por la RAM que consumen las JVM, no por la red.

---

## Los cuatro microservicios

Los cuatro microservicios corren sobre el mismo App Service Plan (Linux, **B3**). Comparten
el plan, pero cada uno es una App Service independiente con su propia Managed Identity.

**Estado real del código:** hoy existen como código el API Gateway y Comunidad-HP.
Reportes-LMS existe pero debe readaptarse, y E-Learning se construirá próximamente. Mientras
tanto, sus App Services apuntan a una imagen placeholder.

### 1. API Gateway (`api-gateway`)
Único punto de entrada e Identity Broker. **Java 21, Spring WebFlux (reactivo) + R2DBC.**
Autentica usuarios, valida y rota tokens JWT, aplica rate-limiting distribuido y enruta hacia
los microservicios internos (proxy reverso con `StripPrefix`). Usa su base de datos `gateway`
y depende de Redis para sesiones y rate-limit.

### 2. Comunidad HP (`comunidad-hp`)
Red social, comunicación y gamificación. **Java 21, Spring MVC (bloqueante) + JPA/Hibernate.**
Organizada por módulos (muro, perfil, noticias, formularios, eventos, foros, dinámicas,
soporte, unity points). Usa la base `comunidad` (schema `comunidad`, migraciones Flyway
V1..V18), Redis (caché de feeds, rate-limit, folios de soporte) y Azure Blob para media.

### 3. Reportes LMS (`reportes-lms`)
Generación on-demand de reportes y certificados. **Python / FastAPI + SQLAlchemy.** El código
existe pero debe readaptarse al HUB. Lectura intensiva sobre su base `reportes`. Operaciones
largas se procesan en background (patrón "Database as a Queue", tabla `background_tasks`).

### 4. E-Learning (`e-learning`)
Plataforma de cursos, lecciones y evaluaciones. **Por construir** (stack por definir). Tiene
su base `elearning` aprovisionada de forma tentativa.

---

## Servicios Compartidos

### Capa de Entrada
Acceso directo a las URLs de **Static Web Apps** (frontend, aún por construir) y a las
`.azurewebsites.net` del Gateway. No se utiliza Front Door en el MVP para minimizar costos.

### Base de Datos (PostgreSQL Flexible Server)
- **Un único servidor** Flexible Server, versión 16, tier *Burstable* **B1ms** con 32 GB.
- **Cuatro bases lógicas** en ese servidor: `gateway`, `comunidad`, `reportes`, `elearning`.
  Las bases no tienen costo adicional; se paga por el cómputo y el disco del servidor.
- Inyectado en la VNet vía Subnet Delegation (subnet-datos) + zona DNS privada.

### Caché (Redis) — componente obligatorio
Azure Cache for Redis tier **Basic C1**, endpoint público con TLS y password. **Es
obligatorio**, no opcional: tras la migración V10, los refresh tokens viven en Redis (la
tabla `refresh_tokens` fue eliminada), el rate-limit distribuido (Bucket4j-Lettuce) y la
caché de queries y de feeds dependen de él. Redis es compartido por el Gateway y Comunidad,
con namespaces separados (`rt:`, `rl:`, `cache:`).

El tier Basic no persiste datos: un reinicio del nodo implica logout masivo de usuarios.
Es un trade-off explícitamente aceptado (ADR-007) y suficiente para el MVP.

### Almacenamiento (Blob Storage)
Storage Account **Standard LRS**, con **acceso público deshabilitado**. El contenido (videos
e imágenes de Comunidad) se sirve mediante **SAS URLs firmadas**; en la base de datos se
guarda el blob path, no la URL. Contenedores `imagenes` y `videos`, ambos privados.

### Container Registry (ACR) — Basic
Almacena las imágenes Docker de los microservicios. Acceso público habilitado y usuario
admin activado para facilitar el pull desde App Service y el push desde CI/CD en el MVP.

### Key Vault
Guarda los secretos (password de Postgres, clave de Redis, connection string de Storage,
pepper de tokens, secreto interno). Cada App Service los lee con su Managed Identity vía RBAC
(`Key Vault Secrets User`) y referencias `@Microsoft.KeyVault(...)` en sus app settings.
Ningún secreto se hardcodea en el Bicep.

### Observabilidad (Log Analytics + App Insights)
Recolección centralizada de telemetría. El código ya propaga W3C Trace Context
(`traceparent` + MDC) entre Gateway y Comunidad, lo que permite el Application Map y el
rastreo de errores distribuidos.

---

## Resumen de Capacidades (MVP)

| Componente              | MVP                                              |
|-------------------------|-------------------------------------------------|
| **Front Door / WAF**    | No (acceso directo)                             |
| **App Service Plan**    | B3 (Linux), 4 App Services                       |
| **PostgreSQL**          | B1ms 32 GB, HA Off, 4 bases lógicas              |
| **Redis**               | Basic C1, endpoint público con TLS (obligatorio) |
| **Storage**             | Standard LRS, privado, SAS URLs                  |
| **Container Registry**  | Basic, público (admin habilitado)               |
| **Key Vault**           | Público, RBAC + Managed Identity                 |
| **Observabilidad**      | Log Analytics + App Insights                     |
| **Seguridad de Red**    | VNet Integration (salida a Postgres)            |

---

## Evolución a Producción

Diseño definido en [Produccion.bicep](recursos/Produccion.bicep) y detallado en
[Arquitectura para Produccion.md](recursos/Arquitectura%20para%20Produccion.md). Blindaje de
seguridad al 100% y cómputo dimensionado a la escala real (~5,000 usuarios, 11 unidades).
Alcance de esta fase: red privada + WAF + HA + Entra ID.

### Lo que se actualiza (sube de tier)
| Componente | MVP | Producción |
|---|---|---|
| App Service Plan | B3 Basic, 1 instancia | P1V3 PremiumV3, zona-redundante, autoscale 2–6 |
| PostgreSQL | B1ms Burstable | General Purpose D2ds_v5, HA parametrizable, backup geo |
| Redis | Basic C1 (público) | Standard C1 (réplica) + Private Endpoint |
| Storage | LRS, privado | ZRS + Private Endpoint |
| Container Registry | Basic, público | Premium privado, pull por Managed Identity |
| Static Web App | Free | Standard |
| Key Vault | Público (RBAC) | Private Endpoint, acceso público off |

### Lo que se añade (el blindaje)
- **Azure Front Door Premium** = único punto de entrada y CDN. WAF (OWASP DRS + Bot Manager),
  Private Link a los App Services y al Blob. Rutas: `/api/*`→Gateway, `/media/*`→Blob (caché),
  `/*`→frontend. Es el CDN de la plataforma (ya no existe un CDN standalone en Azure).
- **Private Endpoints + Private DNS** para Redis, Key Vault, ACR y Storage; Postgres inyectado.
- **Inbound cerrado:** el Gateway solo lo alcanza Front Door (Private Link); los internos solo
  desde la VNet de cómputo.
- **Entra ID (SSO)** parametrizable por flag (el registro de la app lo hace el tenant).

### Decisiones de corporativo como flags (no bloquean el despliegue)
- `postgresHA` — HA zona-redundante de la BD (es lo único con peso real de costo; duplica el
  cómputo de Postgres).
- `entraIdHabilitado` + `entraClientId` — activa el SSO.

### HA por servicio
El HA es prácticamente gratis en todos lados menos en PostgreSQL (su HA duplica el cómputo de
la BD). App Services, Redis (Standard), Storage (ZRS), Front Door y ACR (Premium) traen HA
incluido al estar en sus tiers de producción.

### Roadmap posterior (fuera de esta fase)
Azure Service Bus (reemplaza Database-as-a-Queue para reportes), Azure Functions (transcoding
de video) y Microsoft Defender for Cloud.

**Costo estimado de producción:** ~$900–1,400 USD/mes bien dimensionado (vs ~$120 del MVP).

---
*Última actualización: 5 de junio de 2026 (alineado con MVP.bicep, Produccion.bicep y el código real).*
