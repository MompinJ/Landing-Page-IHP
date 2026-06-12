// ============================================
// HUB Digital IHP — Infraestructura MVP
// ============================================
// Alineado al codigo real de hub-digital-api-contracts:
//  - Solo 2 servicios existen hoy: API Gateway (Java 21, WebFlux/R2DBC)
//    y Comunidad-HP (Java 21, Spring MVC/JPA). Reportes-LMS (Python) y
//    Frontend (React) aun no existen como codigo.
//  - Redis es OBLIGATORIO: refresh tokens, rate-limit distribuido y cache
//    viven en Redis (la tabla refresh_tokens se elimino en la migracion V10).
//  - Blob se sirve con SAS URLs firmadas, NO con acceso publico.
//  - 1 PostgreSQL Flexible con 2 bases logicas (gateway + comunidad).
//
// Objetivo: validar funcionalidad sobre credito gratuito. No es produccion.
//
// Despliegue de ejemplo:
//   az deployment group create -g rg-hub-mvp -f MVP.bicep \
//     -p adminPassword='<password-fuerte>'
// ============================================

targetScope = 'resourceGroup'

// ============================================
// PARAMETROS
// ============================================

@description('Region de Azure')
param ubicacion string = 'mexicocentral'

@description('Prefijo para nombrar recursos')
param prefijo string = 'hubihp'

@description('Password del administrador de PostgreSQL. Pasar via linea de comandos, NO hardcodear.')
@secure()
param adminPassword string

@description('Pepper para hash de refresh tokens del Gateway. Debe medir >= 32 chars (el @PostConstruct revienta si no).')
@secure()
param jwtRefreshPepper string = '${uniqueString(resourceGroup().id, 'pepper')}${uniqueString(subscription().id, 'pepper')}${uniqueString(resourceGroup().id)}'

@description('Secreto compartido para la comunicacion interna Gateway <-> Comunidad (InternalSecretFilter).')
@secure()
param internalSharedSecret string = '${uniqueString(resourceGroup().id, 'internal')}${uniqueString(subscription().id, 'internal')}'

@description('Imagen Docker del API Gateway. Reemplazar por la imagen del ACR cuando exista.')
param imagenGateway string = 'mcr.microsoft.com/azuredocs/aci-helloworld'

@description('Imagen Docker de Comunidad-HP. Reemplazar por la imagen del ACR cuando exista.')
param imagenComunidad string = 'mcr.microsoft.com/azuredocs/aci-helloworld'

@description('Imagen Docker de Reportes-LMS (Python/FastAPI). Reemplazar por la imagen del ACR cuando se readapte.')
param imagenReportes string = 'mcr.microsoft.com/azuredocs/aci-helloworld'

@description('Imagen Docker de E-Learning. Reemplazar por la imagen del ACR cuando exista.')
param imagenElearning string = 'mcr.microsoft.com/azuredocs/aci-helloworld'

// SKU del plan: B3 (4 vCPU / 7 GB) para alojar 4 contenedores (2 JVMs Java 21,
// 1 Python/FastAPI y 1 placeholder de e-learning) en pruebas sin trafico.
// NOTA: la VNet Integration funciona desde el tier Basic; NO requiere PremiumV3.
// El motivo de subir de B1 es la RAM que consumen las JVM, no la red.
// Si las 4 JVMs/servicios reales generan presion de memoria, subir a P1V3 (8 GB).
var planSkuNombre = 'B3'
var planSkuTier = 'Basic'

var sufijo = '${prefijo}-mvp'

// ============================================
// VIRTUAL NETWORK (solo lo esencial)
// ============================================

resource vnet 'Microsoft.Network/virtualNetworks@2023-04-01' = {
  name: 'vnet-${sufijo}'
  location: ubicacion
  properties: {
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
    subnets: [
      {
        name: 'subnet-computo' // VNet Integration de los App Services (salida)
        properties: {
          addressPrefix: '10.0.1.0/24'
          delegations: [
            {
              name: 'appservice'
              properties: {
                serviceName: 'Microsoft.Web/serverFarms'
              }
            }
          ]
        }
      }
      {
        name: 'subnet-datos' // Delegada exclusivamente a PostgreSQL Flexible
        properties: {
          addressPrefix: '10.0.2.0/24'
          delegations: [
            {
              name: 'postgresql'
              properties: {
                serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers'
              }
            }
          ]
        }
      }
    ]
  }
}

// ============================================
// OBSERVABILIDAD (Log Analytics + App Insights)
// ============================================
// El codigo ya propaga W3C Trace Context (traceparent + MDC) entre Gateway
// y Comunidad. App Insights aprovecha eso para el Application Map.

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'law-${sufijo}'
  location: ubicacion
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'ai-${sufijo}'
  location: ubicacion
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// ============================================
// POSTGRESQL FLEXIBLE SERVER (VNet Injected)
// 1 servidor, 2 bases logicas: gateway (R2DBC) y comunidad (JDBC)
// ============================================

resource privateDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: '${prefijo}.postgres.database.azure.com'
  location: 'global'
}

resource privateDnsZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: privateDnsZone
  name: '${prefijo}-link'
  location: 'global'
  properties: {
    virtualNetwork: {
      id: vnet.id
    }
    registrationEnabled: false
  }
}

resource postgresql 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: 'pg-${sufijo}'
  location: ubicacion
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  dependsOn: [
    privateDnsZoneLink
  ]
  properties: {
    version: '16'
    administratorLogin: 'pgadmin'
    administratorLoginPassword: adminPassword
    storage: {
      storageSizeGB: 32
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      delegatedSubnetResourceId: '${vnet.id}/subnets/subnet-datos'
      privateDnsZoneArmResourceId: privateDnsZone.id
    }
  }
}

// Base de datos del API Gateway (identidad, auth, usuarios fuente de verdad)
resource dbGateway 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresql
  name: 'gateway'
}

// Base de datos de Comunidad-HP (schema comunidad, Flyway V1..V18)
resource dbComunidad 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresql
  name: 'comunidad'
}

// Base de datos de Reportes-LMS (Python/FastAPI, SQLAlchemy)
resource dbReportes 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresql
  name: 'reportes'
}

// Base de datos de E-Learning (tentativa; ajustar cuando se defina el stack)
resource dbElearning 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresql
  name: 'elearning'
}

// ============================================
// REDIS CACHE (endpoint publico, TLS + password)
// Obligatorio: refresh tokens, rate-limit, cache de queries y feeds.
// Basic = sin persistencia; el restart implica logout masivo, trade-off
// ya aceptado en ADR-007. Suficiente para el MVP.
// ============================================

resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: 'redis-${sufijo}'
  location: ubicacion
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 1
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
  }
}

// ============================================
// BLOB STORAGE (privado, acceso via SAS URLs)
// El codigo guarda el blob path y firma SAS URLs; NO usa acceso publico.
// ============================================

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: replace('st${sufijo}', '-', '')
  location: ubicacion
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false // El acceso se sirve con SAS firmadas
    minimumTlsVersion: 'TLS1_2'
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storage
  name: 'default'
}

resource containerImagenes 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'imagenes'
  properties: {
    publicAccess: 'None'
  }
}

resource containerVideos 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'videos'
  properties: {
    publicAccess: 'None'
  }
}

// ============================================
// CONTAINER REGISTRY (Basic, admin habilitado para MVP)
// ============================================

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: replace('acr${sufijo}', '-', '')
  location: ubicacion
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true // Facilita el pull desde App Service en el MVP
    publicNetworkAccess: 'Enabled'
  }
}

// ============================================
// KEY VAULT + SECRETOS
// ============================================

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-${sufijo}'
  location: ubicacion
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    publicNetworkAccess: 'Enabled'
  }
}

resource secretPgPassword 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'pg-admin-password'
  properties: {
    value: adminPassword
  }
}

resource secretRedis 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'redis-primary-key'
  properties: {
    value: redis.listKeys().primaryKey
  }
}

resource secretStorage 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'storage-connection-string'
  properties: {
    value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
  }
}

resource secretJwtPepper 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'jwt-refresh-pepper'
  properties: {
    value: jwtRefreshPepper
  }
}

resource secretInternal 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'internal-shared-secret'
  properties: {
    value: internalSharedSecret
  }
}

// URL completa de conexion para Reportes-LMS (SQLAlchemy). Incluye el password
// porque Python suele leer un unico DATABASE_URL. Ajustar el driver
// (postgresql:// con psycopg2 o postgresql+asyncpg:// si es async) al readaptar.
resource secretReportesDbUrl 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'reportes-database-url'
  properties: {
    value: 'postgresql://pgadmin:${adminPassword}@${postgresql.properties.fullyQualifiedDomainName}:5432/reportes?sslmode=require'
  }
}

// ============================================
// APP SERVICE PLAN (Linux, B3 — RAM para 2 JVMs)
// ============================================

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'asp-${sufijo}'
  location: ubicacion
  sku: {
    name: planSkuNombre
    tier: planSkuTier
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// ============================================
// APP SERVICES (los 2 servicios que existen hoy)
// ============================================

var pgFqdn = postgresql.properties.fullyQualifiedDomainName

// Settings de infraestructura, AGNOSTICOS al lenguaje (ACR, App Insights,
// secreto interno). Aplican a los 4 servicios (Java, Python o el que sea).
// Las referencias a Key Vault se resuelven con la Managed Identity de cada App.
var settingsInfra = [
  {
    name: 'DOCKER_REGISTRY_SERVER_URL'
    value: 'https://${acr.properties.loginServer}'
  }
  {
    name: 'DOCKER_REGISTRY_SERVER_USERNAME'
    value: acr.listCredentials().username
  }
  {
    name: 'DOCKER_REGISTRY_SERVER_PASSWORD'
    value: acr.listCredentials().passwords[0].value
  }
  {
    name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
    value: appInsights.properties.ConnectionString
  }
  {
    name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
    value: '~3'
  }
  {
    name: 'INTERNAL_SHARED_SECRET'
    value: '@Microsoft.KeyVault(SecretUri=${secretInternal.properties.secretUri})'
  }
]

// Settings de Redis con claves de Spring Boot (solo para los servicios Java).
var settingsRedisSpring = [
  {
    name: 'SPRING_DATA_REDIS_HOST'
    value: redis.properties.hostName
  }
  {
    name: 'SPRING_DATA_REDIS_PORT'
    value: '6380'
  }
  {
    name: 'SPRING_DATA_REDIS_SSL_ENABLED'
    value: 'true'
  }
  {
    name: 'SPRING_DATA_REDIS_PASSWORD'
    value: '@Microsoft.KeyVault(SecretUri=${secretRedis.properties.secretUri})'
  }
]

// Gateway: WebFlux usa R2DBC en runtime; Flyway necesita la URL JDBC para migrar.
var settingsGateway = concat(settingsInfra, settingsRedisSpring, [
  {
    name: 'SPRING_R2DBC_URL'
    value: 'r2dbc:postgresql://${pgFqdn}:5432/gateway?sslMode=require'
  }
  {
    name: 'SPRING_R2DBC_USERNAME'
    value: 'pgadmin'
  }
  {
    name: 'SPRING_R2DBC_PASSWORD'
    value: '@Microsoft.KeyVault(SecretUri=${secretPgPassword.properties.secretUri})'
  }
  {
    name: 'SPRING_FLYWAY_URL'
    value: 'jdbc:postgresql://${pgFqdn}:5432/gateway?sslmode=require'
  }
  {
    name: 'SPRING_FLYWAY_USER'
    value: 'pgadmin'
  }
  {
    name: 'SPRING_FLYWAY_PASSWORD'
    value: '@Microsoft.KeyVault(SecretUri=${secretPgPassword.properties.secretUri})'
  }
  {
    name: 'JWT_REFRESH_PEPPER'
    value: '@Microsoft.KeyVault(SecretUri=${secretJwtPepper.properties.secretUri})'
  }
])

// Comunidad: Spring MVC/JPA sobre JDBC + Azure Blob (azure.storage.connection-string).
var settingsComunidad = concat(settingsInfra, settingsRedisSpring, [
  {
    name: 'SPRING_DATASOURCE_URL'
    value: 'jdbc:postgresql://${pgFqdn}:5432/comunidad?sslmode=require'
  }
  {
    name: 'SPRING_DATASOURCE_USERNAME'
    value: 'pgadmin'
  }
  {
    name: 'SPRING_DATASOURCE_PASSWORD'
    value: '@Microsoft.KeyVault(SecretUri=${secretPgPassword.properties.secretUri})'
  }
  {
    name: 'AZURE_STORAGE_CONNECTION_STRING'
    value: '@Microsoft.KeyVault(SecretUri=${secretStorage.properties.secretUri})'
  }
])

// Reportes-LMS: Python/FastAPI con SQLAlchemy. Lee un unico DATABASE_URL.
// El codigo existe pero debe readaptarse; verificar nombres de variables al hacerlo.
var settingsReportes = concat(settingsInfra, [
  {
    name: 'DATABASE_URL'
    value: '@Microsoft.KeyVault(SecretUri=${secretReportesDbUrl.properties.secretUri})'
  }
])

// E-Learning: stack aun por definir. Por ahora solo infra; agregar DB/Redis al implementarlo.
var settingsElearning = settingsInfra

// NOTA: los nombres de las variables de los servicios Java siguen la
// relaxed-binding de Spring Boot (SPRING_DATASOURCE_URL -> spring.datasource.url)
// y los de Reportes la convencion comun de FastAPI/SQLAlchemy (DATABASE_URL).
// Verificar contra la config real de cada servicio y ajustar si difieren.

// Array ESTATICO (calculable al inicio): solo nombre e imagen, sin valores
// en runtime. Los settings (que dependen de listKeys/listCredentials) se
// seleccionan dentro del cuerpo del recurso, no en la for-expression.
var servicios = [
  {
    nombre: 'api-gateway'
    imagen: imagenGateway
  }
  {
    nombre: 'comunidad-hp'
    imagen: imagenComunidad
  }
  {
    nombre: 'reportes-lms'
    imagen: imagenReportes
  }
  {
    nombre: 'e-learning'
    imagen: imagenElearning
  }
]

resource appServices 'Microsoft.Web/sites@2023-01-01' = [
  for svc in servicios: {
    name: '${svc.nombre}-${sufijo}'
    location: ubicacion
    identity: {
      type: 'SystemAssigned'
    }
    properties: {
      serverFarmId: appServicePlan.id
      httpsOnly: true
      virtualNetworkSubnetId: '${vnet.id}/subnets/subnet-computo'
      siteConfig: {
        linuxFxVersion: 'DOCKER|${svc.imagen}'
        alwaysOn: true
        healthCheckPath: '/actuator/health'
        appSettings: svc.nombre == 'api-gateway' ? settingsGateway : (svc.nombre == 'comunidad-hp' ? settingsComunidad : (svc.nombre == 'reportes-lms' ? settingsReportes : settingsElearning))
      }
    }
  }
]

// ============================================
// RBAC: cada App Service lee secretos del Key Vault con su Managed Identity
// ============================================

var rolKeyVaultSecretsUser = '4633458b-17de-408a-b874-0445c86b69e6'

resource kvRoleAssignments 'Microsoft.Authorization/roleAssignments@2022-04-01' = [
  for (svc, i) in servicios: {
    name: guid(keyVault.id, svc.nombre, rolKeyVaultSecretsUser)
    scope: keyVault
    properties: {
      roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', rolKeyVaultSecretsUser)
      principalId: appServices[i].identity.principalId
      principalType: 'ServicePrincipal'
    }
  }
]

// ============================================
// STATIC WEB APP (Free) — placeholder del frontend React (aun no existe)
// ============================================

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: 'swa-${sufijo}'
  location: 'eastus2' // SWA tiene regiones limitadas; no esta en mexicocentral
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

// ============================================
// OUTPUTS
// ============================================

output postgresEndpoint string = postgresql.properties.fullyQualifiedDomainName
output redisEndpoint string = redis.properties.hostName
output storageAccountName string = storage.name
output acrLoginServer string = acr.properties.loginServer
output gatewayUrl string = appServices[0].properties.defaultHostName
output comunidadUrl string = appServices[1].properties.defaultHostName
output reportesUrl string = appServices[2].properties.defaultHostName
output elearningUrl string = appServices[3].properties.defaultHostName
output frontendUrl string = staticWebApp.properties.defaultHostname
