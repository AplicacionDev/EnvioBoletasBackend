# Envío Boletas Backend

API REST para el envío automatizado de boletas de pago de empleados. Genera PDFs personalizados por empresa y los envía por correo electrónico.

## Tecnologías

- **Node.js** + **Express 5**
- **SQL Server** (mssql + tedious, compatible con Linux)
- **Puppeteer** — Generación de PDF desde HTML
- **Nodemailer** — Envío de correo vía SMTP (Office 365)
- **node-cron** — Ejecución programada
- **pnpm** — Gestor de paquetes

## Arquitectura

Clean Architecture con 4 capas:

```
src/
├── config/                 # Variables de entorno
├── domain/                 # Interfaces (repositories, services)
├── application/            # Casos de uso
│   └── use-cases/
│       ├── GetEmpresas.js
│       ├── GetEmpleadosPendientes.js
│       ├── ValidarPlanilla.js
│       └── ProcesarBoletasPendientes.js
├── infrastructure/         # Implementaciones concretas
│   ├── database/           # Conexión SQL Server
│   ├── repositories/       # Queries y SPs
│   └── services/           # SMTP, PDF, Templates, Scheduler
└── presentation/           # Express (controllers, routes, middlewares)
```

## Instalación

```bash
pnpm install
```

## Configuración

Crear un archivo `.env` en la raíz:

```env
PORT=3500
NODE_ENV=development

# SQL Server
DB_SERVER=nombre_servidor
DB_PORT=1433
DB_DATABASE=nombre_base_datos
DB_USER=usuario
DB_PASSWORD=contraseña
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
DB_APP_NAME=EnvioBoletas
PRE_ENVIO_SP=APLICACIONES.dbo.sp_mover_boletas_pendientes

# SMTP (Office 365)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=correo@dominio.com
SMTP_PASSWORD=contraseña
SMTP_FROM=notificaciones@dominio.com

# Proveedor y control de cola (recomendado para alto volumen)
MAIL_PROVIDER=smtp
MAIL_THROTTLE_MS=3000
MAIL_BATCH_SIZE=100
MAIL_BATCH_PAUSE_MS=120000
MAIL_MAX_RETRIES=2
MAIL_RETRY_BASE_MS=2000

# Microsoft Graph (opcional)
GRAPH_CLIENT_ID=
GRAPH_CLIENT_SECRET=
GRAPH_TENANT_ID=
GRAPH_SEND_AS=
```

Notas:
- `MAIL_PROVIDER` acepta `smtp` o `graph`.
- `DB_APP_NAME` define el Application Name reportado a SQL Server (útil para pruebas con triggers de login).
- `PRE_ENVIO_SP` es opcional; si se define, la API ejecuta ese procedimiento almacenado antes de consultar boletas pendientes.
- Con 1000 correos por corrida, iniciar con `MAIL_THROTTLE_MS=3000` y lotes de 100 reduce picos de salida.

## Ejecución

```bash
# Desarrollo (con hot reload)
pnpm dev

# Producción
pnpm start
```

## Endpoints

### Nómina — `/api/nomina`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/empresas` | Listar empresas |
| `GET` | `/pendientes` | Empleados con boletas pendientes |
| `GET` | `/validar-planilla?fecha=YYYY-MM-DD` | Validar planilla por fecha |
| `POST` | `/procesar` | Ejecutar flujo completo de envío |

### Scheduler — `/api/scheduler`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Estado actual del scheduler |
| `PUT` | `/` | Actualizar configuración (cron, timezone, habilitar/deshabilitar) |
| `POST` | `/run` | Ejecutar a demanda |
| `GET` | `/history?limit=20` | Historial de ejecuciones |

### Health Check

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/health` | Estado del servicio |
| `GET` | `/api/health/db-diagnostics` | Diagnóstico detallado de conectividad a SQL Server |

## Scheduler

El scheduler permite programar la ejecución automática del proceso de envío. La configuración se persiste en `config/scheduler-config.json`.

**Ejemplos de expresiones cron:**

| Expresión | Descripción |
|-----------|-------------|
| `0 7 15 * *` | Día 15 de cada mes a las 7:00 AM |
| `0 7 1,15 * *` | Día 1 y 15 de cada mes a las 7:00 AM |
| `30 6 * * 1,5` | Lunes y viernes a las 6:30 AM |
| `0 */2 * * *` | Cada 2 horas |

**Activar:**
```bash
curl -X PUT http://localhost:3500/api/scheduler \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "cronExpression": "0 7 15 * *"}'
```

**Ejecutar a demanda:**
```bash
curl -X POST http://localhost:3500/api/scheduler/run
```

## Plantillas por empresa

Cada empresa tiene su propia plantilla HTML con paleta de colores única:

| Empresa | Plantilla | Paleta |
|---------|-----------|--------|
| Pralcasa | `boleta-pralcasa.html` | Verde / Amarillo |
| Advert Talent | `boleta-advert.html` | Azul |
| Alimenti | `boleta-alimenti.html` | Café / Negro |
| Altoplast | `boleta-altoplast.html` | Celeste / Gris |
| Disalto | `boleta-disalto.html` | Minimalista |
| Maqusa Rent | `boleta-maqusa.html` | Rojo |
| Salinas y Minerva | `boleta-salinas.html` | Verde oscuro |

Las plantillas se ubican en `templates/` y los logos en `public/images/`.

## Flujo de procesamiento

1. Consulta empleados con boletas pendientes en SQL Server
2. Por cada empleado, obtiene datos vía stored procedure
3. Selecciona la plantilla HTML según la empresa
4. Inyecta los datos y genera el PDF con Puppeteer
5. Envía el correo con el PDF adjunto vía SMTP
6. Registra el envío en la base de datos y elimina el pendiente

## Postman

Importar `EnvioBoletas.postman_collection.json` en Postman. La variable `baseUrl` apunta a `http://localhost:3500`.

## Scripts de prueba

```bash
# Enviar boleta de prueba por cada empresa
node scripts/test-envio-empresas.js
```
