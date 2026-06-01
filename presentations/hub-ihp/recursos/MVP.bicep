// ============================================
// HUB Hutchison Ports — Infraestructura Ultra-MVP
// ============================================

targetScope = 'resourceGroup'

@description('Región de Azure')
param ubicacion string = 'mexicocentral'

@description('Prefijo para nombrar recursos')
param prefijo string = 'hubhph'

var sufijo = '${prefijo}-mvp'

// ============================================
// VIRTUAL NETWORK (Solo lo esencial)
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
        name: 'subnet-computo'
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
        name: 'subnet-datos'
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
// APP SERVICE PLAN
// ============================================

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'asp-${sufijo}'
  location: ubicacion
  sku: {
    name: 'P0V3' // Necesario para VNet Integration
    tier: 'PremiumV3'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// ============================================
// OBSERVABILITY (Log Analytics + App Insights)
// ============================================

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
// APP SERVICES (4 microservicios)
// ============================================

var microservicios = [
  'api-gateway'
  'comunidad-hp'
  'reportes-lms'
  'e-learning'
]

resource appServices 'Microsoft.Web/sites@2023-01-01' = [
  for nombre in microservicios: {
    name: '${nombre}-${sufijo}'
    location: ubicacion
    properties: {
      serverFarmId: appServicePlan.id
      httpsOnly: true
      virtualNetworkSubnetId: '${vnet.id}/subnets/subnet-computo'
      siteConfig: {
        linuxFxVersion: 'DOCKER|mcr.microsoft.com/azuredocs/aci-helloworld'
        alwaysOn: true
        appSettings: [
          {
            name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
            value: appInsights.properties.InstrumentationKey
          }
          {
            name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
            value: appInsights.properties.ConnectionString
          }
          {
            name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
            value: '~3'
          }
        ]
      }
    }
    identity: {
      type: 'SystemAssigned'
    }
  }
]

// ============================================
// POSTGRESQL FLEXIBLE SERVER (VNet Injected)
// ============================================

// Se requiere zona DNS privada para VNet Integration de Postgres Flex
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
    administratorLoginPassword: 'usuarios!' // TODO: Vincular a AZ Key Vault
    storage: {
      storageSizeGB: 128
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

// ============================================
// REDIS CACHE (Public Endpoint)
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
// BLOB STORAGE
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
    allowBlobPublicAccess: true // Permitido para servir imagenes directo
  }
}

// Contenedores
resource containerVideos 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storage.name}/default/videos'
  properties: {
    publicAccess: 'Blob'
  }
}

resource containerImagenes 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storage.name}/default/imagenes'
  properties: {
    publicAccess: 'Blob'
  }
}

// ============================================
// CONTAINER REGISTRY
// ============================================

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: replace('acr${sufijo}', '-', '')
  location: ubicacion
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true // Activado para facilidad MVP
    publicNetworkAccess: 'Enabled'
  }
}

// ============================================
// KEY VAULT
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
    publicNetworkAccess: 'Enabled' // Acceso público seguro
  }
}

// ============================================
// STATIC WEB APPS
// ============================================

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: 'swa-${sufijo}'
  location: 'eastus2'
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    repositoryUrl: 'https://github.com/...' // TODO: Cambiar
    branch: 'main'
  }
}

// ============================================
// OUTPUTS
// ============================================

output postgresEndpoint string = postgresql.properties.fullyQualifiedDomainName
output redisEndpoint string = redis.properties.hostName
output storageAccountName string = storage.name
output acrLoginServer string = acr.properties.loginServer
output frontendUrl string = staticWebApp.properties.defaultHostname
