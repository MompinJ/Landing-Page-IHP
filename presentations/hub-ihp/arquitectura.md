# Arquitectura HUB Hutchison Ports

Documento de referencia técnica para el equipo. Describe la infraestructura del HUB en lenguaje natural, microservicio por microservicio. La fuente de verdad ejecutable es [main.bicep](main.bicep); este documento es la traducción legible.

## Vista rápida

El HUB es una plataforma web con cuatro funciones de negocio (puerta de entrada, comunidad, reportes LMS y e-learning) detrás de un único punto de entrada global. Todo corre en Azure, en la región **México Central (Querétaro)**, salvo el CDN (es global por naturaleza) y el frontend estático (East US 2, porque Static Web Apps no está disponible en MX Central; los datos siguen viviendo en MX).

El flujo típico de una petición: el usuario abre una URL pública, esa URL la atiende **Azure Front Door** (termina TLS, sirve contenido cacheado del CDN, aplica el WAF en producción), y para todo lo que es API o pantallas dinámicas Front Door redirige el tráfico a los **App Services** que corren en una red privada en MX Central. Los App Services leen y escriben en **PostgreSQL**, **Redis** y **Blob Storage**, y todo lo sensible (passwords, cadenas de conexión, claves) vive en **Key Vault**.

## Topología de red

Todo el cómputo y los datos viven dentro de una **Virtual Network (VNet)** privada con cuatro subnets, cada una con su rol bien definido:

```
VNet 10.0.0.0/16
|
+-- subnet-acceso     10.0.1.0/24   Capa de entrada (reservada por si entra App Gateway u otro)
+-- subnet-computo    10.0.2.0/24   App Services (los 4 microservicios) + Function App
+-- subnet-datos      10.0.3.0/24   PostgreSQL + Redis (Private Endpoints)
+-- subnet-soporte    10.0.4.0/24   Key Vault + Container Registry (Private Endpoints)
```

Entre subnets el tráfico está controlado por **NSGs**. La regla general: el tráfico fluye de izquierda a derecha (acceso → computo → datos / soporte), nunca al revés ni saltándose pasos. Si alguien comprometiera un microservicio, no podría escanear la red ni hablar con Postgres por puertos arbitrarios.

## Los cuatro microservicios

Los cuatro microservicios corren sobre el **mismo App Service Plan** (Linux, PremiumV3). Comparten el plan pero cada uno es una App Service independiente. Esto permite escalar horizontalmente (más instancias del plan) y desplegar versiones independientes por microservicio sin tocar a los otros.

Cada App Service tiene en común:

- Corre un **contenedor Docker**; las imágenes vienen del Container Registry interno.
- Tiene **Managed Identity propia**: se autentica en Key Vault, ACR y Storage sin guardar credenciales en archivos de configuración.
- Solo acepta tráfico **HTTPS**, TLS 1.2 mínimo, FTP deshabilitado.
- Está integrado a `subnet-computo` por VNet Integration: el tráfico saliente sale por la red privada y puede hablar con Postgres / Redis por endpoint privado.
- Tiene `alwaysOn: true` (no se duerme entre requests).

### 1. API Gateway (`api-gateway`)

**Función de negocio**: Punto de entrada único para las APIs internas. Autentica usuarios, valida tokens, aplica rate-limiting y enruta cada llamada al microservicio correspondiente.

**Qué consume**:

- **PostgreSQL**: **BD propia del gateway**. Almacena usuarios, roles, permisos y unidad de negocio. Es la fuente de verdad de identidad y autorización del HUB.
- **Redis**: cache de sesiones y contadores de rate-limiting.
- **Key Vault**: secretos de firma de JWT, claves de APIs upstream.
- **Los otros 3 microservicios**: les pasa el tráfico ya autenticado, con un **JWT firmado** que contiene la info esencial del usuario (id, nombre, rol, permisos, unidad de negocio).

**Notas**:

- Punto único de autenticación y autorización del HUB. Los microservicios downstream **confían en el JWT** del gateway y no consultan la BD de usuarios por su cuenta.
- Crítico para latencia: una llamada lenta aquí se siente en todo el HUB.

### 2. Comunidad HP (`comunidad-hp`)

**Función de negocio**: Funcionalidades de comunidad interna: publicaciones, comentarios, noticias, interacciones sociales, dinamicas, etc.

**Qué consume**:

- **PostgreSQL**: tablas de publicaciones, comentarios, usuarios, reacciones, noticias.
- **Redis**: cache de consultas concurrentes.
- **Blob Storage**: containers `imagenes-publicaciones`, `imagenes-noticias`, `imagenes-jigsaw`.
- **Key Vault**: cadena de conexión a Postgres, claves de servicios externos (si los hay).
- **Azure Functions** (de forma indirecta, ver sección Transcoding): cuando un admin sube un video en 1080p, una Function lo detecta y genera la versión en 420p automáticamente.

**Notas**:

- Genera el tráfico de subida de archivos más alto (imágenes adjuntas a publicaciones / noticias).
- Es el que dispara el flujo de transcoding al subir videos.
- Los videos se sirven al usuario final **a través de Front Door** (CDN), no atacando directo al App Service.

### 3. Reportes LMS (`reportes-lms`)

**Función de negocio**: Generación y entrega de reportes del Learning Management System (avance de cursos, completados, calificaciones, certificados).

**Qué consume**:

- **PostgreSQL**: lectura intensiva del esquema LMS (avance, evaluaciones, asistencia).
- **Key Vault**: cadenas de conexión.

**Notas**:

- Carga pesada de queries de lectura. Candidato a usar réplica de lectura de Postgres si crece la base de usuarios.
- **Los reportes NO se almacenan en Blob Storage**. Se generan **on-demand** al momento de la petición y se entregan al usuario autorizado como **descarga directa** (PDF / Excel en la respuesta HTTP). Razón: almacenar reportes pasados o únicos comería espacio para datos que el usuario típicamente consume una sola vez.
- Si en el futuro aparecen reportes muy pesados que necesiten procesamiento en background (ej. consolidados anuales), se evaluará un esquema con cola (Service Bus + Function) y almacenamiento temporal con TTL corto.
- Los reportes son datos privados por usuario. **No deben cachearse en CDN** (se configura con cache rules en Front Door para los paths autenticados de este servicio).

### 4. E-Learning (`e-learning`)

**Función de negocio**: Plataforma de cursos: catálogo, lecciones, videos, progreso del alumno, evaluaciones.

**Qué consume**:

- **PostgreSQL**: catálogo de cursos, progreso, evaluaciones, resultados.
- **Blob Storage**: container `videos-elearning` (videos de las lecciones, subidos por personal administrativo en su resolución final) y `imagenes-elearning` (thumbnails, recursos).
- **Key Vault**: cadenas de conexión.

**Notas**:

- Microservicio con los archivos más pesados. Los videos se sirven al usuario final **a través de Front Door** (CDN), no atacando directo al App Service.
- **Los videos de e-learning NO pasan por transcoding**. Al ser subidos por personal administrativo en resolución controlada, no hay riesgo de que se llene el storage con originales sin optimizar. Esto los diferencia de los videos de `comunidad-hp`, donde sí se transcodifica porque cualquier usuario puede publicar.

## Servicios compartidos

### Capa de entrada — Front Door

Front Door es el único punto de entrada desde Internet, en MVP y en producción. Ya cumple el rol que antes hacía Azure CDN (que está en proceso de retiro) más el de WAF y termina TLS.

- **MVP**: tier **Standard**. Sirve como CDN (cachea contenido estático), termina TLS y enruta al App Service directamente. La protección de origen es por validación del header `X-Azure-FDID`: los App Services rechazan cualquier tráfico que no venga firmado por nuestro Front Door.

- **Producción**: tier **Premium**. Mismo rol, pero suma **WAF global**, **geo-filtering** (restringir a Norteamérica) y **conexión por Private Link** a los App Services. En este modo el tráfico Front Door → App Service nunca sale de la red privada de Microsoft.

**Decisión arquitectónica**: no hay Application Gateway en ningún ambiente. Front Door cubre los roles de CDN, WAF y entrada única. Mantener una capa adicional de App Gateway sería duplicación de balanceo / TLS y un costo recurrente sin valor agregado para una sola región.

### Bases de datos

**PostgreSQL Flexible Server**

- Versión 16.
- **Integrado a `subnet-datos` por VNet Integration** (modo `delegatedSubnetResourceId`). El acceso es por nombre privado; no hay endpoint público.

- **MVP**: D2ds_v5 (2 vCPU / 8 GB RAM), 128 GB storage, HA deshabilitado.

- **Producción**: D4ds_v5 (4 vCPU / 16 GB RAM), 128 GB storage, HA por evaluar (suma costo no menor; decisión en la sesión de costos).
- Backups automáticos retenidos 7 días.

- **Credenciales en Key Vault**, no en el bicep. El bicep referencia el secret, no lo contiene.

**Redis Cache**

- Acceso solo por endpoint privado (`publicNetworkAccess: Disabled`).
- **Private Endpoint en `subnet-datos` para ambos ambientes**, MVP y producción.
- **MVP**: Basic C1.
- **Producción**: Standard C1.
- Usado principalmente por el API Gateway (sesiones, rate-limiting) y por cualquier microservicio que necesite cache de lectura.

### Almacenamiento — Blob Storage

Un único **Storage Account de aplicación** (`st<sufijo>`) con **un container por dominio de negocio** (esquema: permisos finos por dominio):

| Container                | Para qué                                        | Quién escribe                          |
|--------------------------|-------------------------------------------------|----------------------------------------|
| `videos-elearning`       | Videos originales   | E-Learning   |
| `imagenes-elearning`     | Thumbnails y recursos visuales de cursos        | E-Learning                             |
| `imagenes-publicaciones` | Imágenes adjuntas a publicaciones de comunidad  | Comunidad HP                           |
| `videos-publicaciones` | Videos adjuntos a publicaciones de comunidad y transcodeados  | Comunidad HP  + Function de transcoding  |
| `imagenes-noticias`      | Imágenes y media de noticias                    | Comunidad HP                           |
| `imagenes-jigsaw`        | Piezas e imágenes de jigsaw                     | Comunidad HP                           |



Características del Storage Account:

- Tier estándar, **LRS** (Local Redundant Storage: tres copias en el mismo datacenter de MX Central).
- **Soft delete habilitado, retención de 7 días**: si alguien borra un blob por accidente, se puede recuperar dentro de esa ventana sin recurrir a backups externos. Retención corta para contener costos.
- Sin acceso público a blobs (`allowBlobPublicAccess: false`). Todo se sirve a través de Front Door (cuando es contenido público, ej. videos e imágenes de comunidad o e-learning) o por **SAS URLs firmadas** (cuando es contenido privado o de acceso temporal).
- Firewall denegando por default; solo servicios de Azure pasan (`bypass: AzureServices`).
- Cada microservicio recibe permisos solo a los containers que le tocan vía **RBAC por scope de container** (no a todo el storage account).

### Seguridad y secretos — Key Vault

- Un único Key Vault por ambiente (`kv-<sufijo>`).
- Acceso solo por **endpoint privado** (`publicNetworkAccess: Disabled`).
- Private Endpoint en `subnet-soporte`.
- **RBAC nativo** (no access policies; más limpio, basado en roles de Entra ID).
- Cada microservicio tiene su propia Managed Identity y, por RBAC, recibe el rol `Key Vault Secrets User` solo sobre los secretos que necesita. Granularidad por secreto, no por vault.

### Imágenes de contenedores — Container Registry (ACR)

- Un único ACR por ambiente.
- **MVP**: Basic SKU, endpoint público habilitado (para que el equipo y los pipelines puedan hacer push desde fuera de la VNet).
- **Producción**: Standard SKU, endpoint público deshabilitado, acceso solo por Private Endpoint en `subnet-soporte`. Los pipelines de Prod deben pasar por agente self-hosted dentro de la VNet o por Azure DevOps con runners VNet-integrados.
- `adminUserEnabled: false`. Los App Services hacen pull con su **Managed Identity** (rol `AcrPull`), no con usuario/password.

### Frontend — Static Web Apps

- Aplicación SPA desplegada en Azure Static Web Apps.
- Región **East US 2** (Static Web Apps tiene regiones limitadas; no está en MX Central). Esto **no afecta residencia de datos**: solo se sirven archivos estáticos (HTML / JS / CSS / imágenes). Los datos reales viven en MX Central.
- Tier Standard (permite custom domains y APIs vinculadas).
- Build automático desde GitHub al hacer push a `main`.

### Transcoding — Azure Functions

Cuando un usuario sube un video en 1080p a la plataforma de comunidad-HP, una Function se dispara automáticamente al detectar el nuevo blob, lee el video original, genera la versión en 420p y la guarda en el mismo container `videos-publicaciones`. Esto evita que el App Service de comunidad-hp tenga que hacer trabajo pesado de CPU (transcoding podría bloquear instancias durante minutos) y permite pagar solo cuando hay videos por procesar (Consumption Plan: cobro por ejecución).

**Punto importante: la Function App usa DOS Storage Accounts**:

- `st<sufijo>` — Storage de **datos de la aplicación**. Aquí lee el video original y escribe la versión 420p. **Es el mismo Storage que usan los microservicios.** Compartirlo es intencional y correcto: el video sube una vez y se lee desde donde está, sin copiar entre cuentas.
- `stfunc<sufijo>` — Storage **interno del runtime de Functions**. Aquí no hay datos de negocio; solo metadata del runtime (locks, claves de funciones, leases entre instancias). **Es un requisito de la plataforma Azure Functions.**

**¿Por qué dos cuentas y no una?** Microsoft recomienda no compartir el storage del runtime con el de aplicación por tres razones prácticas:

1. **Lifecycle distinto**: si se aplica una política de retención o limpieza al storage de videos, podría borrar accidentalmente metadata del runtime.
2. **Performance**: subir un video de 8 GB compite con el I/O que el runtime necesita para mantener locks. En picos, esto causa "frozen functions" sin causa aparente.
3. **Permisos**: la identidad del runtime necesita más permisos de control (delete, list); la de datos solo lee/escribe en containers específicos. Separar cuentas separa scopes.

**¿Hay que contratar otro servicio?** No. Un "Storage Account" en Azure es solo un recurso, puedes tener N en la misma suscripción. El nuevo `stfunc<sufijo>` es **otro recurso del mismo producto**. El costo del storage del runtime es trivial (céntimos a 1-2 USD al mes, guarda metadata, no datos pesados).

### Observabilidad — Log Analytics + Application Insights

- **Log Analytics Workspace** (`log-<sufijo>`): repositorio central de logs y métricas. Retención 30 días en MVP (configurable).
- **Application Insights** (`appi-<sufijo>`): instrumentación de los App Services. Telemetría de requests, dependencias, excepciones, traces. Workspace-based: manda todo al Log Analytics anterior.
- **Diagnostic Settings**: cada recurso relevante (App Services, Postgres, Front Door, Key Vault, Storage, ACR, App Gateway si entrara) tiene una "tubería" que dirige sus logs al Log Analytics.

**¿Hay que contratar otro servicio para los diagnosticSettings?** No. Son solo recursos de **configuración**: el equivalente a decir "conecta los logs de A al destino B". El Log Analytics ya está creado y es el único servicio facturable de esta capa. Lo que cobra Log Analytics es el **ingest por GB** y la retención más allá del default; eso ya se estima como parte del presupuesto de observabilidad, independientemente de cuántos servicios manden logs.


### Seguridad de red — NSGs

**NSGs (Network Security Groups)** son firewalls a nivel de subnet, **incluidos sin costo extra en Azure Virtual Network**. No es un servicio aparte, no se contrata. Es configuración que se agrega al recurso de red que ya tienes.

Cada subnet tiene un NSG con reglas explícitas:

- **subnet-acceso**: solo permite tráfico entrante desde Front Door (service tag `AzureFrontDoor.Backend`) en puerto 443.
- **subnet-computo**: solo acepta tráfico desde `subnet-acceso`. Outbound permitido hacia `subnet-datos` (Postgres 5432, Redis 6380) y `subnet-soporte` (Key Vault 443, ACR 443).
- **subnet-datos**: solo acepta tráfico desde `subnet-computo` en los puertos de Postgres y Redis. **Sin outbound a Internet** (los datos no salen).
- **subnet-soporte**: solo acepta tráfico desde `subnet-computo` en puerto 443.

Esto es **defense in depth**: aunque alguien comprometa una capa, no puede moverse libremente entre subnets ni hablar con servicios para los que no tiene autorización a nivel de red.

## MVP vs Producción — resumen

| Componente              | MVP                                     | Producción                                  |
|-------------------------|-----------------------------------------|---------------------------------------------|
| Front Door              | Standard (CDN + entrada única)          | Premium (CDN + WAF + Private Link)          |
| Application Gateway     | No                                      | No                                          |
| App Service Plan        | P0V3, autoscale 2-4                     | P1V3, autoscale 2-6                         |
| PostgreSQL              | D2ds_v5, HA off                         | D4ds_v5, HA por evaluar (de momento no)                     |
| Redis                   | Basic C1 + Private Endpoint             | Standard C1 + Private Endpoint              |
| Container Registry      | Basic, endpoint público                 | Standard, solo Private Endpoint             |
| Static Web Apps         | Standard (East US 2)                    | Standard (East US 2)                        |
| Function (transcoding)  | Consumption Plan (Y1)                   | Consumption Plan (Y1)                       |
| Soft delete en Storage  | 7 días                                  | 7 días                                      |
| NSGs                    | Sí, por subnet                          | Sí, por subnet                              |
| Diagnostic Settings     | Sí, en todos los recursos               | Sí, en todos los recursos                   |

**Principio**: misma topología, distintos SKUs. El parámetro `ambiente` del bicep elige qué perfil aplicar. El código de los microservicios no cambia entre ambientes.

## Lo que NO está cubierto en este documento

- **Costos**: el cálculo de TCO por SKU y región va en la sesión aparte (ver slide 11 de la presentación).
- **Disaster recovery**: estrategia de backups largos, restauración en otra región, RPO / RTO. Decisión pendiente.
- **CI/CD**: cómo se despliegan las imágenes al ACR y se hace `azd deploy` / pipeline de App Service. Se documenta aparte.
- **Custom domains y certificados**: dominio público, vinculación al Front Door, gestión de certificados. Pendiente de la decisión de naming.
- **Detalles de cache rules en Front Door**: qué paths cachear, qué TTL, qué paths no cachear (privados). Pendiente de inventariar endpoints de los microservicios.


---

*Última actualización: 2026-05-28*
