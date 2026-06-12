# Análisis de Costos por Servicio — HUB Digital IHP (MVP)

**Región:** Mexico Central
**Estrategia:** MVP para validar funcionalidad sobre crédito gratuito de Azure.

Este documento detalla qué estamos pagando, por qué es necesario y cuánto cuesta cada pieza.
Las cifras son **aproximadas**; confirmar en el [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)
para Mexico Central, ya que el precio varía por región y por consumo real.

> **Importante:** el costo del MVP **no** predice el costo de producción. Producción incorpora
> Front Door/App Gateway, HA, SKUs mayores y Private Endpoints, y será de otro orden de
> magnitud. Preséntense ambos números por separado.

---

## 1. Cómputo: el "cerebro" del sistema

### **App Service Plan (SKU: B3, Linux)**
*   **Costo:** ~$53 USD/mes
*   **¿Qué es?:** El servidor (virtualizado) donde viven los **cuatro** microservicios
    (`api-gateway`, `comunidad-hp`, `reportes-lms`, `e-learning`) como Apps independientes.
*   **¿Por qué B3 y no algo más chico?:** Aloja 2 JVMs Java 21 (Gateway y Comunidad) más
    Reportes (Python) y el placeholder de E-Learning. Las JVM consumen RAM, y B3 ofrece 7 GB /
    4 vCPU para que los cuatro contenedores convivan en pruebas sin tráfico.
*   **Nota:** los cuatro servicios comparten **un solo plan**; no se multiplica el costo por
    servicio. La VNet Integration funciona desde tier Basic, así que **no** se necesita
    PremiumV3 (corrige una suposición previa).

---

## 2. Datos y persistencia

### **PostgreSQL Flexible Server (SKU: B1ms + 32 GB)**
*   **Costo total:** ~$16 USD/mes (cómputo ~$12.41 + almacenamiento ~$3.68)
*   **¿Qué es?:** El corazón transaccional. Un **único servidor** que hospeda **cuatro bases
    lógicas**: `gateway`, `comunidad`, `reportes` y `elearning`.
*   **¿Por qué?:** El tier Burstable es ideal para MVP: barato y permite picos. Las bases
    adicionales **no cuestan extra**; se paga por el cómputo y el disco del servidor, no por
    base. 32 GB sobran para pruebas internas.

### **Azure Cache for Redis (SKU: Basic C1)**
*   **Costo:** ~$41 USD/mes (Basic C0 ~$16 si se requiere recortar)
*   **¿Qué es?:** Base de datos en memoria, ultrarrápida.
*   **¿Por qué es obligatorio?:** No es opcional. Tras la migración V10, los **refresh tokens**
    viven en Redis (la tabla `refresh_tokens` se eliminó), el **rate-limit distribuido** y la
    **caché de queries y feeds** dependen de él. Sin Redis, el login/refresh del Gateway no
    funciona. El tier Basic no persiste datos (un reinicio = relogin masivo), trade-off ya
    aceptado para el MVP (ADR-007).

---

## 3. Almacenamiento y archivos

### **Storage Account (SKU: Standard LRS)**
*   **Costo:** Variable (~$1.84 por cada 100 GB)
*   **¿Qué es?:** Disco en la nube para archivos masivos (videos de capacitación, imágenes).
*   **¿Por qué?:** Acceso público **deshabilitado**; el contenido se sirve con **SAS URLs
    firmadas**. En la base se guarda el blob path, no la URL.

### **Container Registry (SKU: Basic)**
*   **Costo:** ~$5 USD/mes
*   **¿Qué es?:** Bodega privada para las imágenes Docker de los microservicios.

---

## 4. Seguridad, frontend y observabilidad

### **Azure Key Vault (SKU: Standard)**
*   **Costo:** Por consumo (~$0.03 por cada 10,000 operaciones; típicamente <$1/mes)
*   **¿Qué es?:** Caja fuerte para secretos (password de Postgres, clave de Redis, connection
    string de Storage, pepper de tokens, secreto interno). Las Apps los leen con su Managed
    Identity; ningún secreto se hardcodea.

### **Static Web Apps (SKU: Free)**
*   **Costo:** $0 USD/mes
*   **¿Qué es?:** Hosting del frontend React (aún por construir). El tier Free basta para el MVP.

### **Log Analytics + Application Insights**
*   **Costo:** Por ingesta (~$0–3/mes con volumen de pruebas)
*   **¿Qué es?:** Telemetría centralizada y Application Map. El código ya propaga W3C Trace
    Context entre servicios.

---

## Resumen de inversión mensual (MVP)

| Servicio | Rol | Costo Est. |
| :--- | :--- | :--- |
| **App Service Plan (B3)** | Hosting de los 4 microservicios | ~$53 |
| **PostgreSQL (B1ms, 4 bases)** | Base de datos principal | ~$16 |
| **Redis (Basic C1)** | Tokens, rate-limit y caché (obligatorio) | ~$41 |
| **Storage (LRS)** | Media (SAS URLs) | ~$2 |
| **Container Registry (Basic)** | Imágenes Docker | ~$5 |
| **Static Web App (Free)** | Frontend | $0 |
| **Key Vault + Observabilidad** | Secretos y monitoreo | ~$2 |
| **TOTAL ESTIMADO** | | **~$120 USD/mes** |

*Cabe holgado en el crédito gratuito (~$200 USD / 30 días). Recomendación: desplegar todo en
un solo resource group, validar, capturar el costo real desde "Cost Analysis" y borrar el
grupo al terminar (con Bicep, redesplegar es trivial).*
