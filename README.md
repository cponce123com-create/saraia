# SaraIA — Rendición de Cuentas con IA

Aplicación web para gestión y rendición de cuentas de gastos. Importa extractos YAPE, escanea facturas con OCR (DeepSeek) y reconcilia automáticamente.

## Tecnologías

| Frontend            | Calidad                  | Infraestructura    |
| ------------------- | ------------------------ | ------------------ |
| React 18            | ESLint + Prettier        | Vite 6             |
| Zustand (estado)    | Vitest + Testing Library | Docker             |
| TailwindCSS 4       | Husky + lint-staged      | GitHub Actions     |
| react-router-dom v6 | commitlint               | Nginx (producción) |

## Requisitos

- Node.js 20+
- npm 9+

## Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd saraia

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu API key de DeepSeek
```

## Variables de Entorno

| Variable                | Descripción                              |
| ----------------------- | ---------------------------------------- |
| `VITE_DEEPSEEK_API_KEY` | API key de DeepSeek para OCR de facturas |

## Scripts

| Comando                 | Descripción                      |
| ----------------------- | -------------------------------- |
| `npm run dev`           | Servidor de desarrollo con HMR   |
| `npm run build`         | Build de producción              |
| `npm run preview`       | Preview del build                |
| `npm test`              | Ejecutar pruebas unitarias       |
| `npm run test:coverage` | Pruebas con reporte de cobertura |
| `npm run lint`          | Verificar código con ESLint      |
| `npm run lint:fix`      | Corregir errores automáticamente |
| `npm run format`        | Formatear código con Prettier    |
| `npm run format:check`  | Verificar formato                |

## Docker

```bash
# Build y ejecutar
docker compose up -d

# La app estará disponible en http://localhost:3000
```

## Estructura del Proyecto

```
src/
├── components/       # Componentes reutilizables
│   ├── CamaraModal      # Cámara para escanear facturas
│   ├── ComprobanteModal # Vista de comprobante escaneado
│   ├── GastosLista      # Lista de gastos
│   ├── ResolverConflictos # Resolver matches ambiguos
│   └── SubirExcel       # Upload de extractos YAPE
├── hooks/            # Custom hooks
│   ├── useOCR           # OCR con DeepSeek API
│   └── useYapeImport    # Importación de YAPE
├── pages/            # Páginas/rutas
│   ├── Dashboard
│   ├── Escanear
│   ├── Exportacion
│   └── Gastos
├── store/            # Estado global (Zustand)
├── utils/            # Utilidades
│   ├── excelParser      # Parseo de archivos Excel
│   ├── formatFecha      # Formateo de fechas
│   ├── matchingAlgorithm # Algoritmo de reconciliación
│   └── envValidation    # Validación de variables de entorno
└── test/             # Setup de pruebas
```

## Flujo de Uso

1. **Importar gastos**: Sube un extracto YAPE (Excel) desde `SubirExcel`
2. **Escanear facturas**: Usa la cámara para escanear comprobantes
3. **Reconciliar**: El algoritmo de matching une gastos con facturas automáticamente
4. **Exportar**: Genera reportes de rendición de cuentas

## Calidad

### Hooks de Git (Husky)

- **Pre-commit**: Ejecuta `lint-staged` (ESLint + Prettier en archivos modificados)
- **Commit-msg**: Valida formato conventional commits (`feat:`, `fix:`, `chore:`, etc.)

### CI/CD (GitHub Actions)

Cada push ejecuta: Lint → Formato → Tests → Build

## Licencia

MIT

## Monitoreo (Sentry)

La app integra Sentry para capturar errores en producción.

1. Crea un proyecto en [sentry.io](https://sentry.io)
2. Copia el DSN a tu `.env`:

```bash
VITE_SENTRY_DSN=https://xxxxx@o000000.ingest.sentry.io/0000000
```

Incluye:

- **Tracing** automático de rutas (20% de sesiones)
- **Session Replay** para ver errores (100% en errores, 10% general)
- Datos enmascarados por privacidad (`maskAllText: true`)

## Optimización de Bundle

El proyecto usa code-splitting automático por ruta:

| Chunk                     | Tamaño | Contenido                          |
| ------------------------- | ------ | ---------------------------------- |
| `vendor.*.js`             | 163 KB | React, ReactDOM, React Router      |
| `xlsx.*.js`               | 424 KB | Parseo de Excel (solo al importar) |
| `ui.*.js`                 | 9 KB   | Iconos (lucide-react)              |
| `index.*.js`              | 30 KB  | App shell + layout                 |
| `Gastos.*.js`             | 19 KB  | Página de gastos                   |
| `Escanear.*.js`           | 11 KB  | Escáner de facturas                |
| `Exportacion.*.js`        | 7 KB   | Exportación de balance             |
| `ResolverConflictos.*.js` | 5 KB   | Resolución de conflictos           |
| `Dashboard.*.js`          | 4 KB   | Dashboard                          |

```bash
# Visualizar composición del bundle
npm run build && npx vite-bundle-visualizer
```
