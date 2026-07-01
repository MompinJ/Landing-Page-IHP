# Arquitectura HUB Digital IHP — Infraestructura Azure

Documento de referencia tecnica para el equipo. Describe la infraestructura del HUB en
lenguaje natural, servicio por servicio. La fuente de verdad ejecutable es el Bicep del
repo principal en `InstitutoHutchisonPorts/infra/` (orquestador `main.bicep` +
`params/prod.bicepparam`); el runbook de despliegue es `InstitutoHutchisonPorts/DEPLOY-AZURE.md`.
La referencia conceptual completa vive en
`InstitutoHutchisonPorts/hub-digital-api-contracts/Infraestructura/`.

## Principio rector

El codigo de aplicacion ya estaba listo para Azure: todo es parametrizable por variables de
entorno, hay perfiles `prod` endurecidos, hooks de Azure Front Door, Redis TLS y dependencias
`azure-storage-blob` integradas. La migracion es de **infraestructura y configuracion**, no de
logica de negocio.

La filosofia de tier es la del ADR-006: **fase 1 economica pero ya capaz** (con borde y
aislamiento reales), codigo stateless listo para escalar horizontalmente, y endurecimiento
**incremental** cuando las metricas o el negocio lo justifiquen. No es un MVP de juguete ni es
"todo al maximo": es la base economica que ya se puede operar, con palancas para subir.

---

## Ejes parametrizados (decisiones con doble opcion)

El Bicep expone las decisiones que no tienen una unica respuesta correcta; el default es la
base economica de fase 1:

| Eje | Parametro | Default | Alternativa |
|---|---|---|---|
| App Service Plan | `planLayout` | `two` (Gateway aislado) | `one` (plan compartido, ~$120 menos) |
| Aislamiento de red | `networkIsolation` | `economic` (Access Restrictions) | `max` (Private Endpoints) |
| Media / CDN | `mediaMode` | `publicSas` (SAS + Front Door Standard) | `privateAfdPremium` |
| HA de PostgreSQL | `dbHighAvailability` | `none` (Burstable) | `zoneRedundant` (GP + standby) |

---

## Topologia de Red

VNet `10.20.0.0/16` con tres subredes:

- **snet-appsvc-integration**: VNet Integration de salida de los 4 Web Apps (`vnetRouteAll`),
  delegada a `Microsoft.Web/serverFarms`.
- **snet-private-endpoints**: Private Endpoints de datos/KV/apps internos (solo en modo de
  maximo aislamiento).
- **snet-postgres-flex**: VNet injection de PostgreSQL (subnet delegada), con su Private DNS.

> Gotcha que marca el diseno: **la VNet Integration de App Service es solo de salida (egress)**.
> No oculta el ingress. Por eso el Gateway se cierra con Access Restriction (solo Front Door) y
> los internos con Access Restrictions (solo la subnet del Gateway), o con Private Endpoints en
> el modo de maximo aislamiento.

---

## Los cuatro microservicios

Corren como Web App for Containers (Linux) sobre App Service Plan **P1v3**. Por default son
**dos planes** (Gateway aislado en el suyo + Comunidad/Elearning/Reportes compartiendo otro);
se puede colapsar a uno solo para ahorrar ~$120/mes a cambio de acoplar el login a los picos de
los internos. Cada app es independiente, con su propia Managed Identity.

> Por que P1v3 y no algo mas barato: son 3 JVM (Gateway WebFlux, Comunidad y Elearning MVC) mas
> Python (Reportes). La VNet Integration corre desde Basic, pero la **RAM** de las JVM con
> `MaxRAMPercentage=75` exige Premium v3.

### 1. API Gateway (`api-gateway`)
Unico punto de entrada e Identity Broker. **Java 21, Spring WebFlux (reactivo) + R2DBC.**
Unico servicio publico, y solo a traves de Front Door. Autentica, valida y rota JWT RS256 (2
claves: acceso de usuario + token interno), aplica rate-limit distribuido y enruta hacia los
internos (token exchange + proxy). Usa la base `gateway` y depende de Redis para refresh tokens,
rate-limit y sesiones.

### 2. Comunidad HP (`comunidad-hp`)
Red social, comunicacion y gamificacion. **Java 21, Spring MVC (bloqueante) + JPA/Hibernate.**
Modulos: muro, perfil, noticias, formularios, eventos, foros, dinamicas, soporte, unity points.
Usa la base `comunidad` (schema `comunidad`, Flyway V1..V19+), Redis (cache de feeds, rate-limit,
folios de soporte por INCR) y Blob (container `comunidad-media`).

### 3. Elearning HP (`elearning-hp`)
Plataforma de cursos, lecciones y evaluaciones. **Java 21, Spring MVC + JPA.** Base tecnica ya
creada (clon de Comunidad); la logica de negocio se completa por sprint. Usa la base `elearning`
(schema `elearning`) y Blob (container `elearning-media`).

### 4. Reportes LMS (`reportes-lms`)
Generacion on-demand de reportes y certificados. **Python / FastAPI + SQLAlchemy.** Ya migro a
**PostgreSQL** y se esta adaptando al HUB; valida el token interno del Gateway (aud
`reportes-service`). Lectura intensiva sobre su base `reportes`; operaciones largas en background
(patron "Database as a Queue", tabla `background_tasks`).

---

## Servicios Compartidos

### Borde — Azure Front Door (Standard)
Unico punto de entrada de la API y CDN de la plataforma. **Azure CDN clasico esta retirado**
(Edgio cerro ene-2025; Microsoft classic se retira sep-2027 y no admite recursos nuevos desde
ago-2025), asi que el unico camino de borde/CDN para un despliegue nuevo es Front Door. Rutas:
`/api/*` -> Gateway, `/*` -> Frontend. Solo Front Door alcanza al Gateway (service tag
`AzureFrontDoor.Backend` + match del header `X-Azure-FDID`).

### Frontend — Static Web App (Standard)
Hosting del frontend Navy Gate (React), bajo el mismo eTLD+1 que la API (ADR-010, para que
sobreviva la cookie de refresh host-only). La URL de la API se inyecta en build time
(`VITE_API_BASE_URL`).

### Base de Datos — PostgreSQL Flexible Server
- **Un unico servidor** Flexible, version 16, tier Burstable **B1ms** con 32 GB.
- **Cuatro bases logicas**: `gateway`, `comunidad`, `elearning`, `reportes`. Las bases no
  cuestan extra; se paga por el computo y el disco del servidor.
- Inyectado en la VNet (subnet delegada) + Private DNS. TLS `verify-full`.

### Cache — Redis (Standard C1) — componente obligatorio
Azure Cache for Redis **Standard C1** (primario + replica, con SLA), TLS 1.2 en puerto 6380,
`allkeys-lru`, sin persistencia. Es **obligatorio**: tras la migracion V10 los refresh tokens
viven en Redis (la tabla `refresh_tokens` se dropeo), igual que el rate-limit distribuido
(Bucket4j-Lettuce) y la cache de queries y feeds. Compartido por Gateway y los internos con
namespaces separados (`rt:`, `rl:`, `cache:`). Sin persistencia: un reinicio implica logout
masivo, trade-off aceptado en ADR-007.

### Almacenamiento — Blob Storage (Standard LRS)
Storage Account Standard LRS, **acceso publico deshabilitado**. La media (imagenes y video del
muro, noticias, revista Portuario, contenido educativo) se sirve por **SAS URLs firmadas**
(TTL 1 dia) con validacion magic-bytes (Apache Tika); en la BD se guarda el blob path, no la URL.
Containers `comunidad-media` y `elearning-media`.

### Container Registry — ACR (Basic)
Imagenes Docker de los microservicios. **Usuario admin deshabilitado**: cada Web App hace pull
con su Managed Identity (rol AcrPull). Push desde CI/CD (GitHub Actions OIDC).

### Key Vault (Standard)
Secretos (password de Postgres, clave de Redis, connection string de Storage, JWK de acceso y
de broker, pepper, secreto interno, hash del admin semilla, secreto del health probe de Front
Door). Cada Web App los lee con su Managed Identity (rol Key Vault Secrets User) via referencias
`@Microsoft.KeyVault(...)`. Ningun secreto en el codigo ni en el Bicep.

### Observabilidad — Log Analytics + Application Insights
Telemetria centralizada (Application Map, trazas distribuidas). El codigo ya propaga W3C Trace
Context (`traceparent` + traceId) entre servicios; sampling de tracing 0.1 en prod y daily cap
de 1-2 GB para contener la ingesta (el costo mas variable).

---

## Resumen de la fase 1

| Componente | Fase 1 |
|---|---|
| **Borde / CDN** | Azure Front Door Standard (Gateway via FD) |
| **App Service Plan** | P1v3 (2 planes default, o 1 compartido), 4 Web Apps |
| **PostgreSQL** | B1ms 32 GB, HA off, 4 bases logicas |
| **Redis** | Standard C1 (replica), TLS 6380 (obligatorio) |
| **Storage** | Standard LRS, privado, SAS URLs, 2 containers |
| **Container Registry** | Basic, admin off, pull por Managed Identity |
| **Key Vault** | RBAC + Managed Identity |
| **Frontend** | Static Web App Standard |
| **Observabilidad** | Log Analytics + Application Insights |
| **Red** | VNet (3 subnets), aislamiento por Access Restrictions |

Costo aproximado: **~$450/mes** (2 planes, Gateway aislado, recomendado) o **~$330/mes** con un
solo plan compartido. Detalle de costos fijos y variables/invisibles (egreso, hit/miss del blob,
ingesta de logs) en `Infraestructura/03-Costos.md`.

---

## Endurecimiento incremental hacia produccion

Cada palanca es incremental y el Bicep ya queda parametrizado para encenderla sin reescritura.
Se adopta por etapas cuando las metricas o el negocio lo justifiquen (ver consideraciones R1-R10
del plan):

- **Borde:** Front Door Standard -> Premium con WAF (OWASP + Bot Manager) + Private Link;
  ruta `/media/*` -> Blob cacheada.
- **Red:** `networkIsolation = max` — Private Endpoints en Redis, Key Vault, ACR, Storage e
  internos; backend sin IP publica.
- **Computo:** autoscale 2-6 + zona-redundante; deployment slots para swaps sin downtime.
- **Datos:** PostgreSQL Burstable -> General Purpose D2ds_v5; Redis Standard -> Premium con
  persistencia (AOF/RDB) + Private Link; Storage LRS -> GZRS.
- **Observabilidad y seguridad operativa:** Diagnostic Settings de todo + alertas; Microsoft
  Defender for Cloud; rotacion programada de secretos.

### Decisiones de corporativo (flags, no bloquean el despliegue)
- `dbHighAvailability` — HA zona-redundante de la BD. Es lo unico con peso real de costo
  (duplica el computo de Postgres). El HA es practicamente gratis en todos los demas servicios
  (App Services zona-redundante, Redis Standard, Storage ZRS, Front Door, ACR Premium lo traen
  incluido en su tier de produccion); solo en PostgreSQL es una decision de SLA.
- **Entra ID (SSO)** — a futuro: login corporativo Hutchison. Lo habilita el tenant (registro de
  la app en el directorio). Queda como idea para una fase posterior, no formalizado aun.

### Roadmap posterior (fuera de alcance)
Azure Service Bus (reemplaza "Database as a Queue" para reportes pesados), Azure Functions
(transcoding de video) y Key Vault Premium (HSM) para las claves JWT.

**Costo estimado endurecido:** ~$900-1,400 USD/mes bien dimensionado (el HA de Postgres es el
que mas pesa).

---
*Alineado con `InstitutoHutchisonPorts/infra/` y los docs de `hub-digital-api-contracts/Infraestructura/`.*
