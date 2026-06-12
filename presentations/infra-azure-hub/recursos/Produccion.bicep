// ============================================
// HUB Digital IHP — Infraestructura Azure (PRODUCCION)
// Region: Mexico Central
// ============================================
// Blindaje sobre el MVP:
//  - Azure Front Door Premium = unico punto de entrada (WAF + CDN) con Private
//    Link a los App Services y al Blob (origenes privados, sin cara publica).
//  - Private Endpoints + Private DNS para Redis, Key Vault, ACR y Storage.
//  - PostgreSQL inyectado en la VNet, HA parametrizable.
//  - ACR Premium privado; los App Services jalan imagenes por Managed Identity.
//  - Observabilidad, autoscale y secretos en Key Vault.
//
// Decisiones de corporativo dejadas como FLAGS (no bloquean el despliegue):
//  - postgresHA     : HA zona-redundante de la BD (decision de SLA).
//  - entraIdHabilitado + entraClientId : SSO con Entra ID (decision de tenant).
//
// Despliegue de ejemplo:
//   az deployment group create -g rg-hub-prod -f Produccion.bicep \
//     -p adminPassword='<pwd>' postgresHA=true entraIdHabilitado=true \
//        entraClientId='<guid>'
// ============================================

targetScope = 'resourceGroup'

// ============================================
// PARAMETROS
// ============================================

@description('Region de Azure')
param ubicacion string = 'mexicocentral'

@description('Prefijo para nombrar recursos')
param prefijo string = 'hubihp'

@description('Password del administrador de PostgreSQL. Pasar via linea de comandos.')
@secure()
param adminPassword string

@description('Pepper para hash de refresh tokens del Gateway (>= 32 chars).')
@secure()
param jwtRefreshPepper string = '${uniqueString(resourceGroup().id, 'pepper')}${uniqueString(subscription().id, 'pepper')}${uniqueString(resourceGroup().id)}'

@description('Secreto compartido Gateway <-> microservicios internos.')
@secure()
param internalSharedSecret string = '${uniqueString(resourceGroup().id, 'internal')}${uniqueString(subscription().id, 'internal')}'

@description('FLAG (corporativo): activa el HA zona-redundante de PostgreSQL. Duplica el computo de la BD.')
param postgresHA bool = false

@description('SKU de computo de PostgreSQL. Para ~5000 usuarios, D2ds_v5 suele bastar.')
param postgresSku string = 'Standard_D2ds_v5'

@description('Almacenamiento de PostgreSQL en GB.')
param postgresStorageGB int = 128

@description('FLAG (corporativo): activa el SSO con Entra ID (Easy Auth) en el Gateway.')
param entraIdHabilitado bool = false

@description('Client ID de la app registrada en Entra ID (lo aporta el admin del tenant).')
param entraClientId string = ''

@description('Tenant ID para Entra ID.')
param entraTenantId string = subscription().tenantId

@description('Capacidad minima de autoscale del plan.')
param autoscaleMin int = 2

@description('Capacidad maxima de autoscale del plan.')
param autoscaleMax int = 6

param imagenGateway string = 'mcr.microsoft.com/azuredocs/aci-helloworld'
param imagenComunidad string = 'mcr.microsoft.com/azuredocs/aci-helloworld'
param imagenReportes string = 'mcr.microsoft.com/azuredocs/aci-helloworld'
param imagenElearning string = 'mcr.microsoft.com/azuredocs/aci-helloworld'

// ============================================
// VARIABLES
// ============================================

var ambiente = 'prod'
var sufijo = '${prefijo}-${ambiente}'

var config = {
  appServiceSku: 'P1V3'
  redisSku: 'Standard'
  redisFamily: 'C'
  redisCapacidad: 1
  acrSku: 'Premium'
}

var computoSubnetId = '${vnet.id}/subnets/subnet-computo'
var datosSubnetId = '${vnet.id}/subnets/subnet-datos'
var endpointsSubnetId = '${vnet.id}/subnets/subnet-endpoints'

// Roles
var rolKeyVaultSecretsUser = '4633458b-17de-408a-b874-0445c86b69e6'
var rolAcrPull = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

// ============================================
// VIRTUAL NETWORK Y SUBNETS
// ============================================

resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' = {
  name: 'vnet-${sufijo}'
  location: ubicacion
  properties: {
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
    subnets: [
      {
        name: 'subnet-computo' // VNet Integration de los App Services
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
        name: 'subnet-datos' // PostgreSQL (delegacion)
        properties: {
          addressPrefix: '10.0.2.0/24'
          delegations: [
            {
              name: 'postgres'
              properties: {
                serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers'
              }
            }
          ]
        }
      }
      {
        name: 'subnet-endpoints' // Todos los Private Endpoints (Redis, KV, ACR, Storage)
        properties: {
          addressPrefix: '10.0.3.0/24'
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}

// ============================================
// ZONAS DNS PRIVADAS + ENLACES A LA VNET
// ============================================

resource dnsPostgres 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: '${prefijo}.private.postgres.database.azure.com'
  location: 'global'
}
resource dnsRedis 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.redis.cache.windows.net'
  location: 'global'
}
resource dnsKeyVault 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.vaultcore.azure.net'
  location: 'global'
}
resource dnsAcr 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.azurecr.io'
  location: 'global'
}
resource dnsBlob 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.blob.${environment().suffixes.storage}'
  location: 'global'
}

resource linkPostgres 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: dnsPostgres
  name: 'link'
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: { id: vnet.id }
  }
}
resource linkRedis 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: dnsRedis
  name: 'link'
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: { id: vnet.id }
  }
}
resource linkKeyVault 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: dnsKeyVault
  name: 'link'
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: { id: vnet.id }
  }
}
resource linkAcr 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: dnsAcr
  name: 'link'
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: { id: vnet.id }
  }
}
resource linkBlob 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: dnsBlob
  name: 'link'
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: { id: vnet.id }
  }
}

// ============================================
// OBSERVABILIDAD
// ============================================

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${sufijo}'
  location: ubicacion
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 90
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${sufijo}'
  location: ubicacion
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// ============================================
// KEY VAULT (privado) + SECRETOS + PRIVATE ENDPOINT
// ============================================

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-${sufijo}'
  location: ubicacion
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    publicNetworkAccess: 'Disabled'
  }
}

resource peKeyVault 'Microsoft.Network/privateEndpoints@2023-09-01' = {
  name: 'pe-kv-${sufijo}'
  location: ubicacion
  properties: {
    subnet: { id: endpointsSubnetId }
    privateLinkServiceConnections: [
      {
        name: 'kv'
        properties: {
          privateLinkServiceId: keyVault.id
          groupIds: ['vault']
        }
      }
    ]
  }
}
resource peKeyVaultDns 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-09-01' = {
  parent: peKeyVault
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'vault'
        properties: { privateDnsZoneId: dnsKeyVault.id }
      }
    ]
  }
}

// ============================================
// CONTAINER REGISTRY (Premium, privado)
// ============================================

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: replace('acr${sufijo}', '-', '')
  location: ubicacion
  sku: { name: config.acrSku }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Disabled'
    zoneRedundancy: 'Enabled'
  }
}

resource peAcr 'Microsoft.Network/privateEndpoints@2023-09-01' = {
  name: 'pe-acr-${sufijo}'
  location: ubicacion
  properties: {
    subnet: { id: endpointsSubnetId }
    privateLinkServiceConnections: [
      {
        name: 'acr'
        properties: {
          privateLinkServiceId: acr.id
          groupIds: ['registry']
        }
      }
    ]
  }
}
resource peAcrDns 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-09-01' = {
  parent: peAcr
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'acr'
        properties: { privateDnsZoneId: dnsAcr.id }
      }
    ]
  }
}

// ============================================
// REDIS (Standard, privado)
// ============================================

resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: 'redis-${sufijo}'
  location: ubicacion
  properties: {
    sku: {
      name: config.redisSku
      family: config.redisFamily
      capacity: config.redisCapacidad
    }
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'
  }
}

resource peRedis 'Microsoft.Network/privateEndpoints@2023-09-01' = {
  name: 'pe-redis-${sufijo}'
  location: ubicacion
  properties: {
    subnet: { id: endpointsSubnetId }
    privateLinkServiceConnections: [
      {
        name: 'redis'
        properties: {
          privateLinkServiceId: redis.id
          groupIds: ['redisCache']
        }
      }
    ]
  }
}
resource peRedisDns 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-09-01' = {
  parent: peRedis
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'redis'
        properties: { privateDnsZoneId: dnsRedis.id }
      }
    ]
  }
}

// ============================================
// BLOB STORAGE (ZRS, privado) + PRIVATE ENDPOINT
// ============================================

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: replace('st${sufijo}', '-', '')
  location: ubicacion
  sku: { name: 'Standard_ZRS' }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    publicNetworkAccess: 'Disabled'
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
  properties: { publicAccess: 'None' }
}
resource containerVideos 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'videos'
  properties: { publicAccess: 'None' }
}

resource peStorage 'Microsoft.Network/privateEndpoints@2023-09-01' = {
  name: 'pe-storage-${sufijo}'
  location: ubicacion
  properties: {
    subnet: { id: endpointsSubnetId }
    privateLinkServiceConnections: [
      {
        name: 'blob'
        properties: {
          privateLinkServiceId: storage.id
          groupIds: ['blob']
        }
      }
    ]
  }
}
resource peStorageDns 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-09-01' = {
  parent: peStorage
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'blob'
        properties: { privateDnsZoneId: dnsBlob.id }
      }
    ]
  }
}

// ============================================
// POSTGRESQL (VNet injected, HA parametrizable)
// ============================================

resource postgresql 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: 'pg-${sufijo}'
  location: ubicacion
  sku: {
    name: postgresSku
    tier: 'GeneralPurpose'
  }
  dependsOn: [
    linkPostgres
  ]
  properties: {
    version: '16'
    administratorLogin: 'pgadmin'
    administratorLoginPassword: adminPassword
    storage: {
      storageSizeGB: postgresStorageGB
    }
    backup: {
      backupRetentionDays: 14
      geoRedundantBackup: 'Enabled'
    }
    highAvailability: {
      mode: postgresHA ? 'ZoneRedundant' : 'Disabled'
    }
    network: {
      delegatedSubnetResourceId: datosSubnetId
      privateDnsZoneArmResourceId: dnsPostgres.id
    }
  }
}

resource dbGateway 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresql
  name: 'gateway'
}
resource dbComunidad 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresql
  name: 'comunidad'
}
resource dbReportes 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresql
  name: 'reportes'
}
resource dbElearning 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresql
  name: 'elearning'
}

// ============================================
// SECRETOS EN KEY VAULT
// ============================================

resource secretPgPassword 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'pg-admin-password'
  properties: { value: adminPassword }
}
resource secretRedis 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'redis-primary-key'
  properties: { value: redis.listKeys().primaryKey }
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
  properties: { value: jwtRefreshPepper }
}
resource secretInternal 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'internal-shared-secret'
  properties: { value: internalSharedSecret }
}
resource secretReportesDbUrl 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'reportes-database-url'
  properties: {
    value: 'postgresql://pgadmin:${adminPassword}@${postgresql.properties.fullyQualifiedDomainName}:5432/reportes?sslmode=require'
  }
}

// ============================================
// APP SERVICE PLAN (P1V3, zona-redundante)
// ============================================

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'asp-${sufijo}'
  location: ubicacion
  sku: {
    name: config.appServiceSku
    tier: 'PremiumV3'
    capacity: autoscaleMin
  }
  kind: 'linux'
  properties: {
    reserved: true
    zoneRedundant: true
  }
}

resource autoscale 'Microsoft.Insights/autoscalesettings@2022-10-01' = {
  name: 'autoscale-${sufijo}'
  location: ubicacion
  properties: {
    enabled: true
    targetResourceUri: appServicePlan.id
    profiles: [
      {
        name: 'cpu'
        capacity: {
          minimum: string(autoscaleMin)
          maximum: string(autoscaleMax)
          default: string(autoscaleMin)
        }
        rules: [
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: appServicePlan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT5M'
              timeAggregation: 'Average'
              operator: 'GreaterThan'
              threshold: 70
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: appServicePlan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT10M'
              timeAggregation: 'Average'
              operator: 'LessThan'
              threshold: 30
            }
            scaleAction: {
              direction: 'Decrease'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT10M'
            }
          }
        ]
      }
    ]
  }
}

// ============================================
// APP SERVICES (4 microservicios)
// ============================================

var pgFqdn = postgresql.properties.fullyQualifiedDomainName

var settingsInfra = [
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

var settingsReportes = concat(settingsInfra, [
  {
    name: 'DATABASE_URL'
    value: '@Microsoft.KeyVault(SecretUri=${secretReportesDbUrl.properties.secretUri})'
  }
])

var settingsElearning = settingsInfra

// Restriccion de inbound de los servicios internos: solo desde la VNet de computo.
var restriccionesInternas = [
  {
    vnetSubnetResourceId: computoSubnetId
    action: 'Allow'
    priority: 100
    name: 'allow-vnet-computo'
  }
]

var servicios = [
  {
    nombre: 'api-gateway'
    imagen: imagenGateway
    esGateway: true
    healthPath: '/actuator/health'
  }
  {
    nombre: 'comunidad-hp'
    imagen: imagenComunidad
    esGateway: false
    healthPath: '/actuator/health'
  }
  {
    nombre: 'reportes-lms'
    imagen: imagenReportes
    esGateway: false
    healthPath: '/health'
  }
  {
    nombre: 'e-learning'
    imagen: imagenElearning
    esGateway: false
    healthPath: '/'
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
      // El Gateway queda 100% privado (lo alcanza Front Door por Private Link).
      // Los internos cierran su inbound a la VNet de computo.
      publicNetworkAccess: svc.esGateway ? 'Disabled' : 'Enabled'
      virtualNetworkSubnetId: computoSubnetId
      vnetRouteAllEnabled: true
      siteConfig: {
        linuxFxVersion: 'DOCKER|${svc.imagen}'
        alwaysOn: true
        healthCheckPath: svc.healthPath
        acrUseManagedIdentityCreds: true // Pull desde ACR privado por Managed Identity
        ipSecurityRestrictions: svc.esGateway ? [] : restriccionesInternas
        appSettings: svc.nombre == 'api-gateway' ? settingsGateway : (svc.nombre == 'comunidad-hp' ? settingsComunidad : (svc.nombre == 'reportes-lms' ? settingsReportes : settingsElearning))
      }
    }
  }
]

// Entra ID (Easy Auth) en el Gateway, gated por flag de corporativo.
resource gatewayAuth 'Microsoft.Web/sites/config@2023-01-01' = if (entraIdHabilitado) {
  parent: appServices[0]
  name: 'authsettingsV2'
  properties: {
    globalValidation: {
      requireAuthentication: true
      unauthenticatedClientAction: 'RedirectToLoginPage'
      redirectToProvider: 'azureactivedirectory'
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        registration: {
          openIdIssuer: '${environment().authentication.loginEndpoint}${entraTenantId}/v2.0'
          clientId: entraClientId
        }
        validation: {
          allowedAudiences: [
            'api://${entraClientId}'
          ]
        }
      }
    }
  }
}

// ============================================
// RBAC: identidades de los App Services
// ============================================

resource rbacKvSecrets 'Microsoft.Authorization/roleAssignments@2022-04-01' = [
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

resource rbacAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = [
  for (svc, i) in servicios: {
    name: guid(acr.id, svc.nombre, rolAcrPull)
    scope: acr
    properties: {
      roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', rolAcrPull)
      principalId: appServices[i].identity.principalId
      principalType: 'ServicePrincipal'
    }
  }
]

// ============================================
// STATIC WEB APP (frontend React)
// ============================================

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: 'swa-${sufijo}'
  location: 'eastus2' // SWA no esta en mexicocentral
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {}
}

// ============================================
// AZURE FRONT DOOR PREMIUM (borde + WAF + CDN)
// ============================================

resource frontDoor 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: 'fd-${sufijo}'
  location: 'global'
  sku: {
    name: 'Premium_AzureFrontDoor'
  }
}

resource fdEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2023-05-01' = {
  parent: frontDoor
  name: 'ep-${sufijo}'
  location: 'global'
  properties: {
    enabledState: 'Enabled'
  }
}

// WAF gestionado (OWASP DRS + Bot Manager)
resource waf 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2022-05-01' = {
  name: replace('waf${sufijo}', '-', '')
  location: 'global'
  sku: {
    name: 'Premium_AzureFrontDoor'
  }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: 'Prevention'
    }
    managedRules: {
      managedRuleSets: [
        {
          ruleSetType: 'Microsoft_DefaultRuleSet'
          ruleSetVersion: '2.1'
          ruleSetAction: 'Block'
        }
        {
          ruleSetType: 'Microsoft_BotManagerRuleSet'
          ruleSetVersion: '1.0'
        }
      ]
    }
  }
}

resource securityPolicy 'Microsoft.Cdn/profiles/securityPolicies@2023-05-01' = {
  parent: frontDoor
  name: 'secpol-${sufijo}'
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: {
        id: waf.id
      }
      associations: [
        {
          domains: [
            {
              id: fdEndpoint.id
            }
          ]
          patternsToMatch: ['/*']
        }
      ]
    }
  }
}

// --- Origen: API Gateway (Private Link, /api/*) ---
resource ogGateway 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: frontDoor
  name: 'og-gateway'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/actuator/health'
      probeRequestType: 'GET'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 60
    }
  }
}

resource originGateway 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  parent: ogGateway
  name: 'origin-gateway'
  properties: {
    hostName: appServices[0].properties.defaultHostName
    originHostHeader: appServices[0].properties.defaultHostName
    httpPort: 80
    httpsPort: 443
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    sharedPrivateLinkResource: {
      privateLink: {
        id: appServices[0].id
      }
      privateLinkLocation: ubicacion
      groupId: 'sites'
      requestMessage: 'Front Door a api-gateway'
    }
  }
}

// --- Origen: Static Web App (frontend, default /*) ---
resource ogFrontend 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: frontDoor
  name: 'og-frontend'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/'
      probeRequestType: 'HEAD'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 120
    }
  }
}

resource originFrontend 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  parent: ogFrontend
  name: 'origin-frontend'
  properties: {
    hostName: staticWebApp.properties.defaultHostname
    originHostHeader: staticWebApp.properties.defaultHostname
    httpPort: 80
    httpsPort: 443
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
  }
}

// --- Origen: Blob media (Private Link, /media/* con cache) ---
resource ogMedia 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: frontDoor
  name: 'og-media'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
  }
}

resource originMedia 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  parent: ogMedia
  name: 'origin-media'
  properties: {
    hostName: '${storage.name}.blob.${environment().suffixes.storage}'
    originHostHeader: '${storage.name}.blob.${environment().suffixes.storage}'
    httpPort: 80
    httpsPort: 443
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    sharedPrivateLinkResource: {
      privateLink: {
        id: storage.id
      }
      privateLinkLocation: ubicacion
      groupId: 'blob'
      requestMessage: 'Front Door a blob media'
    }
  }
}

// --- Rutas ---
resource routeApi 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: fdEndpoint
  name: 'route-api'
  dependsOn: [
    originGateway
  ]
  properties: {
    originGroup: {
      id: ogGateway.id
    }
    supportedProtocols: ['Https']
    patternsToMatch: ['/api/*']
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
  }
}

resource routeMedia 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: fdEndpoint
  name: 'route-media'
  dependsOn: [
    originMedia
  ]
  properties: {
    originGroup: {
      id: ogMedia.id
    }
    supportedProtocols: ['Https']
    patternsToMatch: ['/media/*']
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
    cacheConfiguration: {
      queryStringCachingBehavior: 'IgnoreQueryString'
      compressionSettings: {
        isCompressionEnabled: true
        contentTypesToCompress: [
          'application/json'
          'image/svg+xml'
          'text/css'
          'text/html'
        ]
      }
    }
  }
}

resource routeFrontend 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: fdEndpoint
  name: 'route-frontend'
  dependsOn: [
    originFrontend
  ]
  properties: {
    originGroup: {
      id: ogFrontend.id
    }
    supportedProtocols: ['Https']
    patternsToMatch: ['/*']
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
  }
}

// ============================================
// OUTPUTS
// ============================================

output frontDoorEndpoint string = fdEndpoint.properties.hostName
output postgresEndpoint string = postgresql.properties.fullyQualifiedDomainName
output redisEndpoint string = redis.properties.hostName
output acrLoginServer string = acr.properties.loginServer
output postgresHaActivo bool = postgresHA
output entraIdActivo bool = entraIdHabilitado
output notaPrivateLink string = 'Tras desplegar, aprobar las conexiones de Private Link de Front Door en api-gateway y en el Storage (Networking > Private endpoint connections).'
