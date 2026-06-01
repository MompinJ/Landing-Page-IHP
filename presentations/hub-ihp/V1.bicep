// ============================================
// HUB Hutchison Ports — Infraestructura Azure
// Region: Mexico Central (Querétaro)
// ============================================

targetScope = 'resourceGroup'

// ============================================
// PARÁMETROS
// ============================================

@description('Ambiente: mvp o produccion')
@allowed(['mvp', 'produccion'])
param ambiente string = 'mvp'

@description('Región de Azure')
param ubicacion string = 'mexicocentral'

@description('Prefijo para nombrar recursos')
param prefijo string = 'hubhph'

// ============================================
// VARIABLES — configuración por ambiente
// ============================================

var configuracion = {
  mvp: {
    appServiceSku: 'P0V3'
    appServiceCapacidadMin: 2
    appServiceCapacidadMax: 4
    redisSku: 'Basic'
    redisFamily: 'C'
    redisCapacidad: 1
    postgresSku: 'Standard_D2ds_v5'
    postgresStorageGB: 128
    postgresHA: 'Disabled'
    acrSku: 'Basic'
    appGatewaySku: 'Basic_v2'
    appGatewayCapacidad: 2
  }
  produccion: {
    appServiceSku: 'P1V3'
    appServiceCapacidadMin: 2
    appServiceCapacidadMax: 6
    redisSku: 'Standard'
    redisFamily: 'C'
    redisCapacidad: 1
    postgresSku: 'Standard_D4ds_v5'
    postgresStorageGB: 128
    postgresHA: 'Disabled'
    acrSku: 'Standard'
    appGatewaySku: 'Basic_v2'
    appGatewayCapacidad: 3
  }
}

var config = configuracion[ambiente]
var sufijo = '${prefijo}-${ambiente}'

// ============================================
// VIRTUAL NETWORK
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
        name: 'subnet-acceso'
        properties: {
          addressPrefix: '10.0.1.0/24'
          // Application Gateway vive aquí
        }
      }
      {
        name: 'subnet-computo'
        properties: {
          addressPrefix: '10.0.2.0/24'
          // App Services se integran aquí via VNet Integration
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
          addressPrefix: '10.0.3.0/24'
          // PostgreSQL y Redis con Private Endpoints
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
      {
        name: 'subnet-soporte'
        properties: {
          addressPrefix: '10.0.4.0/24'
          // Key Vault y Container Registry
          privateEndpointNetworkPolicies: 'Disabled'
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
    name: config.appServiceSku
    tier: 'PremiumV3'
  }
  kind: 'linux'
  properties: {
    reserved: true  // Linux
    zoneRedundant: false
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

resource appServices 'Microsoft.Web/sites@2023-01-01' = [for nombre in microservicios: {
  name: '${nombre}-${sufijo}'
  location: ubicacion
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    virtualNetworkSubnetId: '${vnet.id}/subnets/subnet-computo'
    siteConfig: {
      linuxFxVersion: 'DOCKER|mcr.microsoft.com/azuredocs/aci-helloworld'  // placeholder
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
  }
  identity: {
    type: 'SystemAssigned'  // para acceder a Key Vault
  }
}]

// ============================================
// POSTGRESQL FLEXIBLE SERVER
// ============================================

resource postgresql 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: 'pg-${sufijo}'
  location: ubicacion
  sku: {
    name: config.postgresSku
    tier: 'GeneralPurpose'
  }
  properties: {
    version: '16'
    administratorLogin: 'pgadmin'
    administratorLoginPassword: 'TEMPORAL_USAR_KEY_VAULT'  // referenciar Key Vault
    storage: {
      storageSizeGB: config.postgresStorageGB
      autoGrow: 'Enabled'
      tier: 'P10'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: config.postgresHA
    }
    network: {
      delegatedSubnetResourceId: '${vnet.id}/subnets/subnet-datos'
    }
  }
}

// ============================================
// REDIS CACHE
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
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'  // solo via Private Endpoint
  }
}

// ============================================
// BLOB STORAGE
// ============================================

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: replace('st${sufijo}', '-', '')  // sin guiones, máx 24 chars
  location: ubicacion
  sku: {
    name: 'Standard_LRS'  // Locally Redundant Storage
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}

// Contenedores dentro del storage
resource containerVideos 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storage.name}/default/videos'
  properties: {
    publicAccess: 'None'
  }
}

resource containerImagenes 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storage.name}/default/imagenes'
  properties: {
    publicAccess: 'None'
  }
}

resource containerDocumentos 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storage.name}/default/documentos'
  properties: {
    publicAccess: 'None'
  }
}

// ============================================
// CONTAINER REGISTRY
// ============================================

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: replace('acr${sufijo}', '-', '')  // sin guiones
  location: ubicacion
  sku: {
    name: config.acrSku
  }
  properties: {
    adminUserEnabled: false  // usar Managed Identity
    publicNetworkAccess: ambiente == 'produccion' ? 'Disabled' : 'Enabled'
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
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    publicNetworkAccess: 'Disabled'  // solo via Private Endpoint
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}

// ============================================
// PUBLIC IP (para Application Gateway)
// ============================================

resource publicIP 'Microsoft.Network/publicIPAddresses@2023-04-01' = {
  name: 'pip-${sufijo}'
  location: ubicacion
  sku: {
    name: 'Standard'
  }
  properties: {
    publicIPAllocationMethod: 'Static'
  }
}

// ============================================
// APPLICATION GATEWAY
// ============================================

resource appGateway 'Microsoft.Network/applicationGateways@2023-04-01' = {
  name: 'agw-${sufijo}'
  location: ubicacion
  properties: {
    sku: {
      name: config.appGatewaySku
      tier: config.appGatewaySku
      capacity: config.appGatewayCapacidad
    }
    gatewayIPConfigurations: [
      {
        name: 'gatewayIPConfig'
        properties: {
          subnet: {
            id: '${vnet.id}/subnets/subnet-acceso'
          }
        }
      }
    ]
    frontendIPConfigurations: [
      {
        name: 'frontendIP'
        properties: {
          publicIPAddress: {
            id: publicIP.id
          }
        }
      }
    ]
    frontendPorts: [
      {
        name: 'port_443'
        properties: {
          port: 443
        }
      }
    ]
    // Aquí se configurarían backend pools, listeners, rules
    // Se completa después con el dominio y certificado real
  }
}

// ============================================
// AZURE FRONT DOOR
// ============================================

resource frontDoor 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: 'fd-${sufijo}'
  location: 'global'  // Front Door es global
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
  properties: {
    originResponseTimeoutSeconds: 60
  }
}

// ============================================
// PRIVATE ENDPOINTS
// ============================================

// PostgreSQL Private Endpoint
resource pePostgres 'Microsoft.Network/privateEndpoints@2023-04-01' = {
  name: 'pe-postgres-${sufijo}'
  location: ubicacion
  properties: {
    subnet: {
      id: '${vnet.id}/subnets/subnet-datos'
    }
    privateLinkServiceConnections: [
      {
        name: 'postgres-connection'
        properties: {
          privateLinkServiceId: postgresql.id
          groupIds: ['postgresqlServer']
        }
      }
    ]
  }
}

// Key Vault Private Endpoint
resource peKeyVault 'Microsoft.Network/privateEndpoints@2023-04-01' = {
  name: 'pe-keyvault-${sufijo}'
  location: ubicacion
  properties: {
    subnet: {
      id: '${vnet.id}/subnets/subnet-soporte'
    }
    privateLinkServiceConnections: [
      {
        name: 'keyvault-connection'
        properties: {
          privateLinkServiceId: keyVault.id
          groupIds: ['vault']
        }
      }
    ]
  }
}

// Redis Private Endpoint (solo en Producción)
resource peRedis 'Microsoft.Network/privateEndpoints@2023-04-01' = if (ambiente == 'produccion') {
  name: 'pe-redis-${sufijo}'
  location: ubicacion
  properties: {
    subnet: {
      id: '${vnet.id}/subnets/subnet-datos'
    }
    privateLinkServiceConnections: [
      {
        name: 'redis-connection'
        properties: {
          privateLinkServiceId: redis.id
          groupIds: ['redisCache']
        }
      }
    ]
  }
}

// ACR Private Endpoint (solo en Producción)
resource peAcr 'Microsoft.Network/privateEndpoints@2023-04-01' = if (ambiente == 'produccion') {
  name: 'pe-acr-${sufijo}'
  location: ubicacion
  properties: {
    subnet: {
      id: '${vnet.id}/subnets/subnet-soporte'
    }
    privateLinkServiceConnections: [
      {
        name: 'acr-connection'
        properties: {
          privateLinkServiceId: acr.id
          groupIds: ['registry']
        }
      }
    ]
  }
}

// ============================================
// LOG ANALYTICS WORKSPACE
// ============================================

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${sufijo}'
  location: ubicacion
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// ============================================
// APPLICATION INSIGHTS
// ============================================

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
// STATIC WEB APPS
// ============================================

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: 'swa-${sufijo}'
  location: 'eastus2'  // Static Web Apps tiene regiones limitadas
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    repositoryUrl: 'https://github.com/tu-org/hub-frontend'
    branch: 'main'
    buildProperties: {
      appLocation: '/'
      outputLocation: 'build'
    }
  }
}

// ============================================
// AZURE FUNCTIONS
// ============================================

resource functionAppPlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'fa-plan-${sufijo}'
  location: ubicacion
  sku: {
    name: 'Y1'  // Consumption plan
    tier: 'Dynamic'
  }
}

resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: 'fa-encoding-${sufijo}'
  location: ubicacion
  kind: 'functionapp,linux'
  properties: {
    serverFarmId: functionAppPlan.id
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.11'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'python'
        }
      ]
    }
  }
  identity: {
    type: 'SystemAssigned'
  }
}

// ============================================
// OUTPUTS — datos útiles después del deploy
// ============================================

output ambiente string = ambiente
output appGatewayPublicIP string = publicIP.properties.ipAddress
output frontDoorEndpoint string = frontDoor.properties.frontDoorId
output postgresEndpoint string = postgresql.properties.fullyQualifiedDomainName
output keyVaultUri string = keyVault.properties.vaultUri
output storageAccountName string = storage.name
output acrLoginServer string = acr.properties.loginServer
