Arquitectura de Produccion HUB Digital IHP

Arquitectura objetivo para produccion: blindaje de seguridad al 100% y rendimiento
dimensionado a la escala real (~5,000 usuarios, 11 unidades de negocio en Mexico).
La fuente de verdad ejecutable es Produccion.bicep.

Principio rector: produccion blindada NO es "todo al maximo". Se endurece toda la seguridad,
pero el computo se dimensiona a la escala real para no sobre-aprovisionar.

Alcance de esta fase: red privada + WAF + HA + Entra ID. Service Bus (async) y Functions
(transcoding) quedan como roadmap posterior.

================================================
1. El Borde: Azure Front Door Premium (WAF + CDN)
================================================

Front Door Premium es el unico punto de entrada Y el CDN de la plataforma.

Por que Front Door y no Application Gateway: ya no existe un CDN como servicio aparte
(Azure CDN de Edgio se retiro en ene-2025; el de Microsoft classic se retira en sep-2027 y
no admite recursos nuevos desde ago-2025). El reemplazo oficial de CDN + WAF + edge es Front
Door. Como la plataforma es una red social con media pesada y videos de e-learning, se
necesita caché en el edge; Front Door cubre app y media en un solo producto. App Gateway
habria obligado a sumar un CDN que ya no existe standalone.

Funciones:
- WAF gestionado (OWASP Default Rule Set 2.1 en modo Prevention + Bot Manager).
- Private Link a los origenes privados (los App Services y el Blob no tienen cara publica).
- Caché de media en el edge (los videos de e-learning son el caso ideal de caché).

Rutas configuradas:
- /api/*   -> API Gateway (origen privado por Private Link).
- /media/* -> Blob Storage (origen privado por Private Link, con caché y compresion).
- /*       -> Static Web App (frontend React).

Costo: base Premium ~$330/mo + egress (~$0.083/GB hacia usuarios, primeros 100 GB/mes gratis;
el trafico origen Azure -> Front Door no se cobra). La media es el componente mas variable;
conviene medirlo los primeros meses.

================================================
2. Red privada (Private Endpoints + DNS)
================================================

La VNet tiene tres subredes: subnet-computo (App Services), subnet-datos (PostgreSQL
delegado) y subnet-endpoints (todos los Private Endpoints).

Pasan a 100% privados, cada uno con su Private Endpoint y su zona DNS privada enlazada a
la VNet:
- Redis (privatelink.redis.cache.windows.net)
- Key Vault (privatelink.vaultcore.azure.net)
- Container Registry (privatelink.azurecr.io)
- Blob Storage (privatelink.blob.<suffix>)

PostgreSQL se mantiene inyectado en la VNet (subnet-datos delegada) con su zona DNS privada.

Inbound de los App Services:
- API Gateway: publicNetworkAccess deshabilitado. Solo lo alcanza Front Door por Private Link.
- Comunidad, Reportes, E-Learning: internos. Su inbound se restringe a la subnet de computo
  (ipSecurityRestrictions); el Gateway los consume por la VNet, nadie mas.

================================================
3. Computo: App Service Plan P1V3
================================================

- SKU P1V3 (PremiumV3), zona-redundante.
- Autoscale 2 a 6 instancias por CPU (>70% escala out, <30% escala in).
- Los 4 microservicios comparten el plan, cada uno como App Service independiente con
  Managed Identity.
- Pull de imagenes desde el ACR privado por Managed Identity (acrUseManagedIdentityCreds),
  sin usuario admin.

================================================
4. Datos
================================================

PostgreSQL Flexible Server:
- SKU General Purpose D2ds_v5 (dimensionado a ~5,000 usuarios; subir si la carga lo pide).
- 128 GB de almacenamiento, version 16.
- Backups geo-redundantes, retencion 14 dias.
- 4 bases logicas (gateway, comunidad, reportes, elearning) en un servidor.
- HA zona-redundante PARAMETRIZABLE (flag postgresHA). El HA duplica el computo de la BD;
  es la unica decision de HA con peso real de costo y la define corporativo (SLA).

Redis Cache:
- Standard C1 (primario + replica para HA). Acceso solo por Private Endpoint.

Blob Storage:
- Standard ZRS (redundancia de zona). Acceso solo por Private Endpoint.
- La media se sirve a traves de Front Door (CDN). En la base se guarda el blob path.

================================================
5. Identidad y secretos
================================================

- Entra ID (SSO) PARAMETRIZABLE (flags entraIdHabilitado + entraClientId). El Bicep deja
  cableado el Easy Auth del Gateway; el registro de la app en Entra lo hace un admin del
  tenant (es del directorio, no de Resource Manager) y aporta el clientId.
- Key Vault privado con RBAC. Cada App Service lee los secretos con su Managed Identity
  (rol Key Vault Secrets User) via referencias @Microsoft.KeyVault(...). Ningun secreto se
  hardcodea.

================================================
6. Observabilidad
================================================

- Log Analytics (retencion 90 dias) + Application Insights.
- El codigo ya propaga W3C Trace Context entre servicios (Application Map listo).
- Recomendado: Diagnostic Settings de todos los recursos al workspace + alertas de latencia,
  tasa de errores y cuellos de botella de BD.

================================================
HA por servicio (resumen)
================================================

El HA es practicamente gratis en todos lados menos en PostgreSQL:

| Servicio        | HA        | Mecanismo                       | Costo del HA            |
| App Services    | Si        | Plan zona-redundante, >=2 inst. | Incluido (ya pagas 2)   |
| Redis           | Si        | Standard = primario + replica   | Incluido en Standard    |
| Storage         | Si        | ZRS                             | ~25% mas que LRS        |
| Front Door      | Si        | Global/multi-zona               | Incluido                |
| Container Reg.  | Si        | Premium zona-redundante         | Incluido en Premium     |
| PostgreSQL      | DECISION  | HA zona-redundante (standby)    | DUPLICA el computo BD   |

================================================
Pasos posteriores al despliegue
================================================

1. Aprobar las conexiones de Private Link de Front Door en api-gateway y en el Storage
   (Networking > Private endpoint connections).
2. Si Entra ID se activa: registrar la app en el tenant y pasar el clientId.
3. Ajustar Comunidad para que sirva la media con URLs cacheables a traves del dominio de
   Front Door (el hook "si hay Front Door, usar ese dominio" ya existe en el codigo). Las
   SAS por-usuario con TTL corto cachean mal.
4. Pipelines CI/CD con self-hosted runners dentro de la VNet (obligatorio porque el ACR es
   privado; ADR-004 esta pendiente).

================================================
Costo estimado de produccion
================================================

Bien dimensionado: ~$900-1,400 USD/mes (el HA de Postgres es el que mas pesa). Confirmar en
el Azure Pricing Calculator para Mexico Central. Este costo es de otro orden que el del MVP
(~$120/mo); preséntense por separado.

Roadmap posterior (fuera de esta fase):
- Azure Service Bus: reemplaza el patron "Database as a Queue" para reportes pesados (ADR-006).
- Azure Functions: transcoding de video de Comunidad.
- Microsoft Defender for Cloud: postura de seguridad y deteccion de amenazas.
