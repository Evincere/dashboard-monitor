# Análisis de Arquitectura Técnica - Dashboard Monitor

## Resumen Ejecutivo

El **Dashboard Monitor** (MPD Insights) es un microservicio desarrollado como aplicación web moderna que funciona como panel de control inteligente para la gestión y análisis de datos del sistema de concursos del Ministerio Público de la Defensa. La aplicación está diseñada para ejecutarse como servicio accesorio que se conecta a la infraestructura existente del sistema principal.

## Stack Tecnológico

### Framework y Lenguaje Principal
- **Next.js 15.3.3** con App Router
- **TypeScript 5.x** como lenguaje principal
- **React 18.3.1** para la interfaz de usuario
- **Node.js** como runtime de servidor

### Interfaz de Usuario y Estilos
- **Tailwind CSS 3.4.1** como framework de estilos
- **shadcn/ui** como sistema de componentes base
- **Radix UI** como biblioteca de componentes primitivos
- **Lucide React** como biblioteca de iconos
- **Recharts 2.15.1** para visualizaciones y gráficos

### Inteligencia Artificial
- **Google Genkit 1.14.1** como framework de IA
- **Google Gemini 2.0 Flash** como modelo de lenguaje principal
- **Firebase** para servicios de backend de IA

### Base de Datos y Conectividad
- **MySQL 8.0** como base de datos principal
- **mysql2 3.10.1** como driver de conexión
- **Zod 3.24.2** para validación de esquemas

### Herramientas de Desarrollo
- **Turbopack** para desarrollo rápido
- **PostCSS** para procesamiento de CSS
- **ESLint** y **TypeScript** para calidad de código

## Arquitectura de la Aplicación

### Estructura de Directorios

```
src/
├── ai/                     # Sistema de Inteligencia Artificial
│   ├── flows/             # Flujos de procesamiento de IA
│   ├── genkit.ts          # Configuración de Genkit
│   └── dev.ts             # Configuración de desarrollo
├── app/                   # Aplicación Next.js (App Router)
│   ├── (dashboard)/       # Rutas del dashboard
│   ├── layout.tsx         # Layout principal
│   └── globals.css        # Estilos globales
├── components/            # Componentes React
│   ├── dashboard/         # Componentes específicos del dashboard
│   └── ui/               # Componentes de interfaz base (shadcn/ui)
├── hooks/                # Custom hooks de React
├── lib/                  # Utilidades y configuraciones
└── services/             # Servicios de backend
    └── database.ts       # Servicio de base de datos
```

### Patrones de Diseño Implementados

1. **App Router Pattern** (Next.js 15)
   - Utiliza el nuevo sistema de rutas basado en directorios
   - Layouts anidados para estructura modular
   - Server Components por defecto

2. **Component Composition Pattern**
   - Componentes reutilizables con shadcn/ui
   - Separación clara entre componentes de UI y lógica de negocio
   - Props drilling minimizado con context providers

3. **Service Layer Pattern**
   - Servicios dedicados para acceso a datos
   - Abstracción de la lógica de base de datos
   - Cache de esquema implementado

4. **Flow-based AI Architecture**
   - Flujos especializados para diferentes tipos de consultas
   - Separación de responsabilidades en procesamiento de IA
   - Prompting estructurado y reutilizable

## Configuración de Build y Desarrollo

### Scripts de NPM
```json
{
  "dev": "next dev --turbopack -p 9002",
  "genkit:dev": "genkit start -- tsx src/ai/dev.ts",
  "genkit:watch": "genkit start -- tsx --watch src/ai/dev.ts",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit"
}
```

### Configuración de Next.js
- **Puerto de desarrollo**: 9002
- **TypeScript**: Errores ignorados durante build
- **ESLint**: Errores ignorados durante build
- **Imágenes**: Configurado para placehold.co
- **Turbopack**: Habilitado para desarrollo rápido

### Configuración de TypeScript
- **Target**: ES2017
- **Module**: ESNext con bundler resolution
- **Strict mode**: Habilitado
- **Path mapping**: `@/*` apunta a `./src/*`

## Sistema de Inteligencia Artificial

### Arquitectura de IA

La aplicación implementa un sistema de IA modular basado en Google Genkit con los siguientes componentes:

1. **Genkit Configuration** (`src/ai/genkit.ts`)
   - Configuración centralizada del modelo Gemini 2.0 Flash
   - Plugin de Google AI integrado

2. **Flujos de IA Especializados** (`src/ai/flows/`)
   - `generate-sql-query.ts`: Generación de consultas SQL
   - `translate-natural-query.ts`: Traducción de lenguaje natural
   - `summarize-query-results.ts`: Resumen de resultados
   - `generate-query-suggestions.ts`: Sugerencias de consultas
   - `answer-complex-queries.ts`: Respuestas complejas

3. **Prompting Especializado**
   - Prompts estructurados para diferentes tipos de consultas
   - Soporte para español como idioma principal
   - Configuración de temperatura para consistencia

### Capacidades de IA Implementadas

1. **Traducción de Lenguaje Natural a SQL**
   - Análisis automático del esquema de base de datos
   - Generación de consultas SQL optimizadas
   - Manejo de errores y validación

2. **Sistema de Memoria Contextual**
   - Cache de esquema de base de datos (1 hora)
   - Reutilización de consultas similares
   - Optimización de rendimiento

3. **Respuestas Humanizadas**
   - Procesamiento de resultados SQL
   - Generación de respuestas en español
   - Formateo inteligente de datos

## Sistema de Base de Datos

### Configuración de Conexión
- **Host**: Configurable via `DB_HOST` (mpd-concursos-mysql)
- **Puerto**: 3306 (contenedor) / 3307 (host)
- **Usuario**: Configurable via `DB_USER`
- **Base de datos**: `mpd_concursos`

### Características del Servicio de Base de Datos

1. **Introspección Dinámica del Esquema**
   - Utiliza `INFORMATION_SCHEMA` para descubrimiento automático
   - Mapeo de tablas, columnas, relaciones e índices
   - Cache inteligente con duración configurable

2. **Pool de Conexiones**
   - Gestión eficiente de conexiones MySQL
   - Cierre automático de conexiones
   - Manejo robusto de errores

3. **Validación con Zod**
   - Esquemas tipados para validación de datos
   - Type safety en tiempo de compilación
   - Validación runtime de estructuras de datos

## Interfaz de Usuario

### Sistema de Diseño

1. **Tema Dark Glassmorphism**
   - Paleta de colores oscura con acentos azules
   - Efectos de transparencia y blur
   - Variables CSS personalizadas

2. **Tipografía**
   - **Inter** para texto de cuerpo
   - **Poppins** para títulos y encabezados
   - Fuente monospace para código

3. **Componentes Base**
   - Sistema completo de componentes shadcn/ui
   - Componentes Radix UI como primitivos
   - Animaciones con Tailwind CSS

### Estructura de Navegación

1. **Sidebar Principal**
   - Dashboard principal con métricas
   - Consulta con IA (compleja)
   - Consulta Natural (simple)
   - Gestión de Concursos
   - Base de Datos
   - Backups
   - Documentos
   - Usuarios
   - Configuración

2. **Layout Responsivo**
   - Sidebar colapsible
   - Diseño adaptativo para móviles
   - Grid system flexible

## Dependencias Principales

### Dependencias de Producción (42 paquetes)
- **Framework**: next@15.3.3, react@18.3.1
- **IA**: @genkit-ai/googleai@1.14.1, genkit@1.14.1
- **UI**: 20+ paquetes de @radix-ui, lucide-react@0.475.0
- **Base de datos**: mysql2@3.10.1
- **Validación**: zod@3.24.2
- **Estilos**: tailwindcss, class-variance-authority
- **Utilidades**: date-fns, clsx, dotenv

### Dependencias de Desarrollo (8 paquetes)
- **TypeScript**: typescript@5, @types/*
- **Herramientas**: genkit-cli@1.14.1, postcss, tailwindcss

## Configuración de Despliegue

### Configuración Actual
- **Puerto de desarrollo**: 9002
- **Firebase App Hosting**: Configurado con máximo 1 instancia
- **Variables de entorno**: DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE

### Características de Producción
- **Build optimizado**: Next.js con optimizaciones automáticas
- **Manejo de errores**: TypeScript y ESLint ignorados en build
- **Imágenes**: Soporte para dominios externos configurado

## Métricas y Rendimiento

### Optimizaciones Implementadas
1. **Cache de esquema de base de datos**: 1 hora de duración
2. **Turbopack**: Desarrollo rápido habilitado
3. **Server Components**: Renderizado del lado del servidor por defecto
4. **Connection pooling**: Gestión eficiente de conexiones MySQL

### Métricas del Dashboard
- Usuarios registrados: 150
- Concursos activos: 1
- Documentos procesados: ~499 (actualización en tiempo real)
- Inscripciones: 87
- Almacenamiento: 25.3 GB

## Consideraciones de Seguridad

### Implementadas
1. **Variables de entorno**: Credenciales externalizadas
2. **Validación de datos**: Zod para validación de esquemas
3. **Manejo de errores**: Logging y manejo robusto de excepciones

### Recomendaciones Pendientes
1. **Autenticación**: No implementada actualmente
2. **HTTPS**: Configuración pendiente para producción
3. **Rate limiting**: No implementado
4. **Logs de auditoría**: Implementación básica

## Conclusiones y Recomendaciones

### Fortalezas Identificadas
1. **Arquitectura moderna**: Next.js 15 con App Router
2. **Sistema de IA robusto**: Genkit con flujos especializados
3. **UI consistente**: shadcn/ui con diseño profesional
4. **Base de datos flexible**: Introspección dinámica del esquema

### Áreas de Mejora Identificadas
1. **Seguridad**: Implementar autenticación y autorización
2. **Monitoreo**: Agregar métricas de rendimiento y logs
3. **Testing**: Implementar suite de pruebas automatizadas
4. **Documentación**: Expandir documentación técnica y de usuario

### Recomendaciones de Refactorización
1. **Unificar sistema de consultas**: Eliminar duplicación entre consulta natural y compleja
2. **Sistema agnóstico de proveedores**: Soporte para múltiples modelos de IA
3. **Memoria vectorial**: Implementar sistema de embeddings para contexto histórico
4. **Containerización**: Crear configuración Docker para despliegue