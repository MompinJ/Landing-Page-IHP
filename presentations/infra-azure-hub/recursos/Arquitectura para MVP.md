Arquitectura MVP - HUB Digital IHP

Para arrancar el HUB en su versión de validación, rápida y económica, nos centramos en los
componentes vitales. El objetivo es que el código viva, la base de datos responda y se pueda
validar la plataforma con corporativo, TI y gerencia, sobre crédito gratuito y sin tráfico real.

La fuente de verdad ejecutable es MVP.bicep.

1. El motor principal (lógica y datos)

Cómputo (App Service):

Qué necesitas: Un único App Service Plan Linux, tier B3 (4 vCPU / 7 GB).

Por qué: Aloja los 4 microservicios (api-gateway, comunidad-hp, reportes-lms, e-learning)
como Apps independientes. Comparten el plan, así que no se multiplica el costo. Se eligió B3
por la RAM: hay 2 JVMs Java 21 (Gateway reactivo y Comunidad bloqueante) más Reportes (Python)
y el placeholder de E-Learning. Al no usar Front Door, los usuarios y el frontend se comunican
directo a las URLs .azurewebsites.net del Gateway.

Nota: la VNet Integration funciona desde el tier Basic; NO requiere PremiumV3. El plan se
dimensiona por memoria de las JVM, no por la red.

Base de datos (PostgreSQL):

Qué necesitas: Azure Database for PostgreSQL Flexible Server versión 16, tier Standard_B1ms
(Burstable) con 32 GB. Un solo servidor con 4 bases lógicas (gateway, comunidad, reportes,
elearning).

Por qué: Es el corazón de los datos. El tier Burstable es el más económico para el MVP. Las
bases adicionales no cuestan extra: se paga por el servidor, no por base. Se conecta a la red
virtual mediante VNet Integration nativa (Subnet Delegation) y zona DNS privada.

Caché (Redis) - OBLIGATORIO:

Qué necesitas: Azure Cache for Redis tier Basic C1, endpoint público con TLS y password.

Por qué: No es opcional. Tras la migración V10, los refresh tokens viven en Redis (la tabla
refresh_tokens fue eliminada), y el rate-limit distribuido y la caché de queries y feeds
dependen de él. Sin Redis, el login/refresh del Gateway no funciona. El tier Basic no persiste
datos (un reinicio implica relogin masivo): trade-off aceptado en ADR-007 para el MVP.

Archivos (Blob Storage):

Qué necesitas: Un Storage Account estándar con redundancia local (LRS), con acceso público
deshabilitado.

Por qué: Aquí viven videos e imágenes. El contenido se sirve con SAS URLs firmadas (en la base
se guarda el blob path, no la URL), no con acceso público.

2. El "pegamento" indispensable

Observabilidad (Log Analytics + App Insights):

Por qué es vital: Fundamental para depurar microservicios. El código ya propaga W3C Trace
Context entre Gateway y Comunidad, lo que habilita el Application Map y el rastreo de errores
distribuidos. Se incluye en el MVP (es barato).

Container Registry (ACR) - tier Basic:

Por qué es vital: Los microservicios son imágenes Docker. Aquí se almacenan. Acceso público y
usuario admin habilitados para que el push desde CI/CD y el pull desde App Service sean simples
en el MVP.

Key Vault:

Por qué es vital: Guarda los secretos (password de Postgres, clave de Redis, connection string
de Storage, pepper de tokens, secreto interno). Cada App Service los lee con su Managed
Identity (RBAC: Key Vault Secrets User) vía referencias @Microsoft.KeyVault(...). Ningún
secreto se hardcodea en el Bicep.

Red Virtual (VNet) básica:

Por qué es vital: Dos subredes: subnet-computo (salida de los App Services a Postgres vía VNet
Integration) y subnet-datos (delegada exclusivamente a PostgreSQL).

3. La cara al usuario

Static Web Apps (tier Free):

Por qué es vital: Aquí se sube el frontend React (aún por construir). Al no haber Front Door,
esta será la URL principal para los usuarios. El tier Free basta para el MVP.

¿Qué dejamos fuera intencionalmente?

Para mantener simplicidad y bajo costo, en esta fase no incluimos:

Front Door / Application Gateway: Sin balanceadores, CDN global ni WAF.

Private Endpoints: Se elimina la complejidad de zonas DNS privadas para Redis, KV, ACR y Storage.

Alta disponibilidad: Postgres sin HA, plan sin redundancia de zona.

Integración con Entra ID: Se difiere a producción.

Todo lo anterior se diseñará en la fase de producción, tras la aprobación del proyecto.
