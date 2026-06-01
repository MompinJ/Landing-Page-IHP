// ============================================
// HUB Hutchison Ports — Infraestructura Azure (PRODUCCIÓN)
// Region: Mexico Central (Querétaro)
// ============================================

targetScope = 'resourceGroup'

// ============================================
// PARÁMETROS
// ============================================

@description('Región de Azure')
param ubicacion string = 'mexicocentral'

@description('Prefijo para nombrar recursos')
param prefijo string = 'hubhph'

// ============================================
// VARIABLES
// ============================================

var ambiente = 'prod'
var sufijo = '${prefijo}-${ambiente}'

// Capacidades para Producción
var config = {
  appServiceSku: 'P1V3'
  redisSku: 'Standard'
  redisFamily: 'C'
  redisCapacidad: 1
  postgresSku: 'Standard_D4ds_v5'
  postgresStorageGB: 128
  postgresHA: 'ZoneRedundant' // HA habilitado para Producción
  acrSku: 'Premium' // Requerido para Private Endpoints en ACR
}

// ============================================
// VIRTUAL NETWORK Y SUBNETS
// ============================================

resource vnet 'Microsoft.Network/virtualNetworks@2023-04-01' = {
  name: 'vnet-${sufijo}'
  location: ubicacion
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.0.0.0/16'
      ]
    }
    subnets: [
      {
        name: 'subnet-computo' // Para VNet Integration de App Services
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
        name: 'subnet-datos' // Para Postgres (Delegation)
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
        name: 'subnet-endpoints' // Para todos los Private Endpoints (Redis, KV, ACR, Storage)
        properties: {
          addressPrefix: '10.0.3.0/24'
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}

// ============================================
// ZONAS DNS PRIVADAS (Requisito para Private Endpoints)
// ============================================

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

// Enlaces de DNS a la VNet
resource linkDnsRedis 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: dnsRedis
  name: 'link-redis'
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnet.id
    }
  }
}
// TODO (Se omiten los links de los otros DNS por brevedad, pero seguirían la misma estructura)

// ============================================
// LOG ANALYTICS Y APP INSIGHTS (Observabilidad)
// ============================================

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${sufijo}'
  location: ubicacion
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
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
// RECURSOS COMPARTIDOS Y PRIVADOS
// ============================================

// 1. Key Vault
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
    publicNetworkAccess: 'Disabled' // 100% Privado
  }
}

resource peKeyVault 'Microsoft.Network/privateEndpoints@2023-04-01' = {
  name: 'pe-kv-${sufijo}'
  location: ubicacion
  properties: {
    subnet: {
      id: '${vnet.id}/subnets/subnet-endpoints'
    }
    privateLinkServiceConnections: [
      {
        name: 'kv-connection'
        properties: {
          privateLinkServiceId: keyVault.id
          groupIds: [
            'vault'
          ]
        }
      }
    ]
  }
}

// 2. Container Registry
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: replace('acr${sufijo}', '-', '')
  location: ubicacion
  sku: {
    name: config.acrSku
  } // Premium
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Disabled' // 100% Privado
  }
}

resource peAcr 'Microsoft.Network/privateEndpoints@2023-04-01' = {
  name: 'pe-acr-${sufijo}'
  location: ubicacion
  properties: {
    subnet: {
      id: '${vnet.id}/subnets/subnet-endpoints'
    }
    privateLinkServiceConnections: [
      {
        name: 'acr-connection'
        properties: {
          privateLinkServiceId: acr.id
          groupIds: [
            'registry'
          ]
        }
      }
    ]
  }
}

// 3. Redis Cache
resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: 'redis-${sufijo}'
  location: ubicacion
  properties: {
    sku: {
      name: config.redisSku
      family: config.redisFamily
      capacity: config.redisCapacidad
    }
    publicNetworkAccess: 'Disabled' // 100% Privado
  }
}

resource peRedis 'Microsoft.Network/privateEndpoints@2023-04-01' = {
  name: 'pe-redis-${sufijo}'
  location: ubicacion
  properties: {
    subnet: {
      id: '${vnet.id}/subnets/subnet-endpoints'
    }
    privateLinkServiceConnections: [
      {
        name: 'redis-connection'
        properties: {
          privateLinkServiceId: redis.id
          groupIds: [
            'redisCache'
          ]
        }
      }
    ]
  }
}

// 4. Blob Storage
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: replace('st${sufijo}', '-', '')
  location: ubicacion
  sku: {
    name: 'Standard_ZRS'
  } // Zone Redundant para Prod
  kind: 'StorageV2'
  properties: {
    publicNetworkAccess: 'Disabled' // 100% Privado
  }
}

resource peStorage 'Microsoft.Network/privateEndpoints@2023-04-01' = {
  name: 'pe-storage-${sufijo}'
  location: ubicacion
  properties: {
    subnet: {
      id: '${vnet.id}/subnets/subnet-endpoints'
    }
    privateLinkServiceConnections: [
      {
        name: 'storage-connection'
        properties: {
          privateLinkServiceId: storage.id
          groupIds: [
            'blob'
          ]
        }
      }
    ]
  }
}

// 5. PostgreSQL (VNet Injected - Subnet Delegation)
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
    administratorLoginPassword: 'CAMBIAR_ESTO_EN_PROD_CON_KV'
    highAvailability: {
      mode: config.postgresHA
    } // HA Activado
    network: {
      delegatedSubnetResourceId: '${vnet.id}/subnets/subnet-datos'
    }
  }
}

// ============================================
// APP SERVICES (Cómputo)
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
    reserved: true
    zoneRedundant: true
  } // HA en el Plan
}

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
      virtualNetworkSubnetId: '${vnet.id}/subnets/subnet-computo' // Salida VNet
      vnetRouteAllEnabled: true
      siteConfig: {
        linuxFxVersion: 'DOCKER|mcr.microsoft.com/azuredocs/aci-helloworld'
        alwaysOn: true
        // IMPORTANTE: En producción real, aquí se configuran las 'ipSecurityRestrictions'
        // para permitir SOLO el tráfico proveniente de la IP del Front Door Premium
      }
    }
    identity: {
      type: 'SystemAssigned'
    }
  }
]

// ============================================
// AZURE FRONT DOOR PREMIUM (El Portero Global)
// ============================================

resource frontDoorProfile 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: 'fd-${sufijo}'
  location: 'global'
  sku: {
    name: 'Premium_AzureFrontDoor' // Requiere Premium para WAF y Private Link a App Services
  }
}

// Nota: La configuración completa de Front Door (Endpoints, Rutas, Origin Groups)
// y el enlace de Private Link hacia los App Services es extensa en Bicep y suele
// requerir un módulo separado o configuración post-despliegue tras validar dominios.

output mensaje string = 'Esqueleto Bicep de Producción generado. Se requiere configuración adicional de DNS Privados y Front Door Origins.'
