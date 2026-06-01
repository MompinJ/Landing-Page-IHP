Arquitectura de Producción HUB Hutchison Ports

Este documento describe la arquitectura objetivo para el entorno de producción, incorporando todos los componentes necesarios para garantizar seguridad corporativa, rendimiento y observabilidad.

Visión General de la Transición (MVP a Producción). Los cambios principales son:

Azure Front Door Premium: Se convierte en el único punto de entrada global.

Private Endpoints: Todos los servicios PaaS (Redis, Key Vault, Container Registry, Blob Storage) se aíslan dentro de la red privada.

VNet Integration Completa: Los App Services pierden sus URLs públicas.

Alta Disponibilidad y Escalamiento: Incremento de capacidades (SKUs) en base de datos y cómputo.

Observabilidad: Integración con Log Analytics y Application Insights.

Componentes de la Arquitectura de Producción

1. El Borde Global (Edge)

Azure Front Door Premium

Rol: CDN global, acelerador web, balanceador de carga global y única puerta de entrada.

WAF (Web Application Firewall): Filtrado activo contra ataques (SQLi, XSS) y protección DDoS gestionada.

Geo-Filtering: Reglas explícitas para bloquear o permitir tráfico basado en la ubicación geográfica (ej. restringir a Norteamérica).

Private Link Integration: Se conecta a los App Services en México Central mediante Private Link. El tráfico nunca atraviesa el internet público, asegurando que los App Services no necesiten IPs públicas.

2. Capa de Cómputo

App Service Plan (PremiumV3)

SKU Recomendado: P1V3 (mínimo 2 instancias para SLA de alta disponibilidad).

Escalamiento: Configurado con reglas de autoscale (ej. 2 a 6 instancias) basadas en métricas de CPU y memoria.

Aislamiento de Red:

Inbound: Solo recibe tráfico desde Azure Front Door a través de Private Endpoints. La restricción de acceso rechaza cualquier petición externa directa.

Outbound: VNet Integration habilita que los contenedores hablen con los recursos internos (BBDD, Cache, Key Vault).

Microservicios (App Services)
Se mantienen los cuatro servicios (API Gateway, Comunidad HP, Reportes LMS, E-Learning), ahora beneficiándose de los recursos dedicados del plan Premium y el aislamiento total.

3. Capa de Datos

PostgreSQL Flexible Server

SKU Recomendado: D4ds_v5 (o superior, según carga).

Alta Disponibilidad (HA): Configurado con Zona Redundante (Zone Redundant HA). Esto asegura que haya una réplica en espera en una zona de disponibilidad diferente dentro de la misma región.

Red: Mantiene su integración vía Subnet Delegation. Totalmente aislado.

Redis Cache

SKU Recomendado: Standard C1 (o superior). El nivel Standard incluye un nodo primario y uno de réplica para alta disponibilidad.

Red: Conectado a la VNet exclusivamente mediante Private Endpoint. El acceso público está explícitamente deshabilitado.

Blob Storage

SKU: Standard_ZRS (Zone-Redundant Storage) recomendado para protección contra fallos en el centro de datos.

Red: Conectado mediante Private Endpoint (para subidas de archivos desde los App Services). La lectura pública se gestiona a través de Azure Front Door (CDN) configurando reglas de origen seguro (Private Link para Storage).

4. Soporte y Seguridad

Azure Container Registry (ACR)

SKU Recomendado: Standard o Premium.

Red: Acceso público deshabilitado. Conectado vía Private Endpoint. Los pipelines de CI/CD (GitHub Actions/Azure DevOps) deben utilizar agentes/runners alojados dentro de la VNet (Self-hosted runners) para poder empujar (push) las nuevas imágenes.

Azure Key Vault

Red: Acceso público deshabilitado. Conectado vía Private Endpoint. Todos los secretos (cadenas de conexión, claves de API) se consumen de manera segura a través de la red privada.

5. Observabilidad Completa

Log Analytics & Application Insights

Rol: Recolección centralizada de telemetría.

Implementación: Todos los recursos de la arquitectura envían sus Diagnostic Settings a un único Log Analytics Workspace.

Monitoreo Proactivo: Configuración de alertas en Application Insights para latencia, tasa de errores y cuellos de botella en la base de datos.

6. Transcodificación en Background

Azure Functions (Consumption Plan)

Se reintegra la Azure Function para la transcodificación de videos de Comunidad HP.

Seguridad: Su cuenta de almacenamiento interno se asegura mediante Private Endpoints si es requerido por políticas de red corporativas.

Diagrama Lógico Simplificado de Red (Producción)

Usuario -> (Internet) -> Azure Front Door Premium (WAF + CDN)

Front Door -> (Microsoft Backbone / Private Link) -> App Services (VNet Injected)

App Services -> (VNet / Subnets Privadas) -> PostgreSQL (Delegated), Redis (PE), Key Vault (PE), Storage (PE)

(PE = Private Endpoint)
