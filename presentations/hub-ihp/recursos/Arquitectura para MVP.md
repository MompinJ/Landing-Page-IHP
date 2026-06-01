Arquitectura Ultra-Esencial (MVP) - HUB Hutchison Ports

Para arrancar el HUB en su versión más pura, rápida y económica, nos centraremos únicamente en los componentes vitales.

El objetivo es que el código viva, la base de datos responda y los usuarios puedan interactuar con la plataforma.

1. El Motor Principal (Lógica y Datos)

Estos son los componentes donde realmente vive el negocio:

Cómputo (App Service):

Qué necesitas: Un único App Service Plan (tier B1 o P0V3).

Por qué: Alojará los 4 microservicios (API Gateway, Comunidad HP, Reportes LMS, E-Learning) como Apps independientes. Al no usar Front Door, los usuarios y el frontend se comunicarán directamente a las URLs .azurewebsites.net de estos servicios.

Base de Datos (PostgreSQL):

Qué necesitas: Azure Database for PostgreSQL Flexible Server en versión 16. Tier Standard_B1ms (Burstable).

Por qué: Es el corazón de los datos. El tier Burstable es el más económico para el MVP. Lo conectaremos a la red virtual mediante "VNet Integration" nativa (Subnet Delegation).

Caché (Redis):

Qué necesitas: Azure Cache for Redis en tier Basic C0 o C1.

Por qué: Vital para que el API Gateway maneje las sesiones y el rate-limiting. En este MVP, se accederá a través de su endpoint público, asegurado por la contraseña generada por Azure y conexión TLS.

Archivos (Blob Storage):

Qué necesitas: Un Storage Account estándar con redundancia local (LRS).

Por qué: Aquí vivirán todos los videos e imágenes. Se servirá el contenido directamente desde las URLs públicas de los blobs.

2. El "Pegamento" Indispensable

Componentes mínimos requeridos para que la aplicación encienda:

Observabilidad (Log Analytics + App Insights):

Por qué es vital: Fundamental para depurar microservicios. Permite ver el "Application Map" (mapa de dependencias) y rastrear errores distribuidos entre las APIs sin costo inicial elevado.

Container Registry (ACR) - Tier Basic:

Por qué es vital: Tus microservicios están hechos en Docker. Aquí se almacenan las imágenes. Tendrá su acceso público habilitado para que GitHub Actions/Azure DevOps pueda hacer push fácilmente.

Key Vault:

Por qué es vital: Guardará la contraseña de Postgres y Redis. Los App Services usarán su Managed Identity para leer estos secretos de forma segura en tiempo de ejecución.

Red Virtual (VNet) Básica:

Por qué es vital: Únicamente necesitamos 2 subredes: una para que los App Services salgan a Internet/Azure, y otra dedicada exclusivamente a inyectar el servidor de PostgreSQL (Subnet Delegation).

3. La Cara al Usuario

Static Web Apps (Tier Free o Standard):

Por qué es vital: Aquí se sube el código frontend (HTML/JS/CSS). Al no tener Front Door, esta será la URL principal que compartirás con tus usuarios para que entren a la plataforma.

¿Qué dejamos fuera intencionalmente?

Para mantener la simplicidad y el bajo costo, en esta fase no incluimos:

Front Door / Application Gateway: Sin balanceadores, CDN global ni WAF.

Private Endpoints: Se elimina la complejidad de zonas DNS privadas.

Azure Functions (Transcodificación): Los videos se sirven como se suben.

Log Analytics / App Insights: Depuración mediante logs de contenedor nativos en disco.
