# ESTRUCTURA DEL PROYECTO - DASHBOARD MONITOR MPD

## Fecha de Auditoría: 2025-08-18

## ESTRUCTURA DE DIRECTORIOS

### 📁 Directorio Raíz
- **Next.js 14** con TypeScript
- **Configuración Docker** completa
- **Sistema de CI/CD** con scripts de deployment

### 📁 `/src` - Código Fuente Principal

#### 🌐 `/src/app` - App Router de Next.js 14
- **(dashboard)** - Páginas protegidas del dashboard
- **api** - Endpoints de la API REST
- **layout.tsx** - Layout principal de la aplicación

#### 🔌 `/src/app/api` - Endpoints API
- **auth** - Autenticación y autorización
- **postulations** - Gestión de postulaciones y validaciones
- **dashboard** - Métricas y estadísticas del dashboard
- **documents** - Gestión de documentos
- **database** - Consultas directas a BD
- **users** - Gestión de usuarios
- **contests** - Gestión de concursos
- **backups** - Sistema de respaldos
- **validation** - Endpoints de validación

#### 🎨 `/src/components` - Componentes React
- **ui** - Componentes base del sistema de diseño
- **dashboard** - Componentes específicos del dashboard
- **postulations** - Componentes para gestión de postulaciones
- **validation** - Componentes del sistema de validación

#### 🔧 `/src/lib` - Utilidades y Servicios
- **auth.ts** - Lógica de autenticación
- **backend-client.ts** - Cliente para comunicación con backend
- **database-utils.ts** - Utilidades de base de datos
- **validations** - Sistema de validaciones

#### 🤖 `/src/ai` - Sistema de IA Integrado
- **embeddings** - Sistema de embeddings semánticos
- **providers** - Proveedores de IA (OpenAI, Claude, Gemini)
- **flows** - Flujos de procesamiento de IA

### 📁 Configuración y Deployment
- **docker-compose.yml** - Configuración Docker
- **Dockerfile** - Imagen Docker del microservicio
- **nginx** - Configuración proxy reverso
- **scripts** - Scripts de deployment y mantenimiento

### 📁 Documentación
- **docs** - Documentación técnica detallada
- **AUDITORIA_TECNICA** - Nueva carpeta de auditoría (fuente de verdad)

## TECNOLOGÍAS PRINCIPALES

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **React 18**
- **Tailwind CSS**
- **shadcn/ui** (componentes)

### Backend/API
- **Next.js API Routes**
- **MySQL** (conexión directa)
- **Redis** (caché opcional)

### Base de Datos
- **MySQL 8.0** (contenedor Docker)
- **Base de datos**: `mpd_concursos`
- **Host**: `172.19.0.2:3306`

### IA y ML
- **Sentence Transformers** (embeddings)
- **OpenAI, Claude, Gemini** (proveedores LLM)
- **Vector Store** personalizado

## ARQUITECTURA GENERAL

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Dashboard     │────│  Dashboard       │────│   MySQL DB      │
│   Frontend      │    │  Monitor API     │    │ (mpd_concursos) │
│  (Next.js UI)   │    │ (Next.js API)    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ├── Backend Spring Boot
                                │   (172.19.0.3:8080)
                                │
                                └── Sistema de IA
                                    (Embeddings + LLM)
```

