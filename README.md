# MPD Concursos - Sistema de Reportes Oficiales

**Sistema de Reportes Oficiales** es un módulo especializado del ecosistema MPD Concursos diseñado para generar reportes 100% confiables y oficiales basados en los datos reales de la base de datos `mpd_concursos`. Este sistema está enfocado en proporcionar a la administración del Ministerio Público de la Defensa documentación oficial y trazable de todos los procesos relacionados con concursos públicos.

---

## 🎯 Propósito

Este sistema está específicamente diseñado para generar reportes oficiales que documentan:

- **Proceso de Inscripción**: Registro detallado de postulantes, fechas, estados y documentación
- **Validación de Documentación**: Trazabilidad completa del proceso de revisión documental
- **Selección de Candidatos**: Reportes de evaluación, puntajes y rankings
- **Notificaciones Efectuadas**: Historial completo de comunicaciones oficiales
- **Publicación de Concursos**: Cronología y estados de publicación
- **Fechas y Plazos**: Documentación de todos los hitos temporales del proceso

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico
- **Backend Principal**: Spring Boot 3.x (Java 17)
- **Base de Datos**: MySQL 8.0 (Contenedor Docker)
- **Microservicio Dashboard**: Next.js 15 + TypeScript
- **Contenedores**: Docker Compose
- **Autenticación**: JWT + Spring Security

### Arquitectura de Datos
```
Base de Datos: mpd_concursos
├── Usuarios (users, user_entity)
├── Concursos (contests, contest_dates, contest_requirements)
├── Inscripciones (inscriptions, inscription_notes)
├── Documentos (documents, document_types, document_audit)
├── Notificaciones (notifications)
├── Exámenes (examinations, examination_sessions)
└── Auditoría (audit_logs, security_events)
```

---

## 📊 Tipos de Reportes Oficiales

### 1. Reportes de Inscripción
- **Registro de Postulantes**: Listado completo con datos personales y timestamps
- **Estados de Inscripción**: Progreso por etapas (inicial, documentación, completada)
- **Estadísticas por Concurso**: Métricas de participación y conversión
- **Reportes de Plazos**: Cumplimiento de fechas límite

### 2. Reportes de Documentación
- **Validación Documental**: Estado de revisión por tipo de documento
- **Documentos Pendientes**: Lista de validaciones requeridas
- **Historial de Aprobaciones/Rechazos**: Trazabilidad de decisiones administrativas
- **Integridad de Archivos**: Verificación de documentos físicos

### 3. Reportes de Selección
- **Ranking de Candidatos**: Ordenamiento por puntaje y méritos
- **Proceso de Evaluación**: Cronología de exámenes y calificaciones
- **Candidatos Aptos**: Lista oficial de postulantes habilitados
- **Exclusiones y Rechazos**: Justificación de eliminaciones del proceso

### 4. Reportes de Comunicaciones
- **Notificaciones Enviadas**: Registro completo de comunicaciones oficiales
- **Confirmaciones de Lectura**: Estado de recepción de notificaciones
- **Comunicaciones por Canal**: Distribución por tipo de notificación
- **Historial de Interacciones**: Timeline de comunicaciones bidireccionales

### 5. Reportes Administrativos
- **Cronología de Concursos**: Timeline completo del proceso
- **Métricas de Rendimiento**: KPIs del sistema y procesamiento
- **Reportes de Auditoría**: Registro de acciones administrativas
- **Backup y Recuperación**: Estado de respaldos de datos

---

## 🔧 Configuración

### Variables de Entorno
```bash
# Base de Datos
MYSQL_HOST=mpd-concursos-mysql
MYSQL_PORT=3306
MYSQL_DATABASE=mpd_concursos
MYSQL_USER=mpd_user
MYSQL_PASSWORD=[CONFIGURAR]

# Backend Principal
BACKEND_URL=http://mpd-concursos-backend:8080
API_BASE_PATH=/api

# Autenticación
JWT_SECRET=[CONFIGURAR]
JWT_EXPIRATION=86400

# Reportes
REPORTS_OUTPUT_PATH=/app/reports
REPORTS_TEMPLATE_PATH=/app/templates
PDF_GENERATOR_ENABLED=true
```

### Estructura de Directorios
```
dashboard-monitor/
├── docs/                    # Documentación oficial
│   ├── architecture/        # Arquitectura del sistema
│   ├── api/                # Documentación de APIs
│   ├── integration/        # Guías de integración
│   ├── reports/            # Especificaciones de reportes
│   ├── deployment/         # Guías de despliegue
│   └── security/           # Documentación de seguridad
├── src/
│   ├── app/
│   │   ├── reports/        # Módulo de reportes oficiales
│   │   ├── api/           # API routes para reportes
│   │   └── components/    # Componentes UI especializados
│   ├── lib/
│   │   ├── database/      # Conexiones y consultas a BD
│   │   ├── reports/       # Generadores de reportes
│   │   └── auth/          # Autenticación con backend
│   └── types/             # Tipos TypeScript para reportes
└── templates/             # Plantillas de reportes
    ├── pdf/              # Templates PDF oficiales
    ├── excel/            # Templates Excel para exportación
    └── email/            # Templates para notificaciones
```

---

## 🚀 Instalación y Despliegue

### Desarrollo Local
```bash
# Clonar repositorio
git clone [REPO_URL]
cd dashboard-monitor

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Ejecutar en modo desarrollo
npm run dev
```

### Producción con Docker
```bash
# Construir y ejecutar
docker-compose -f docker-compose.yml up -d

# Verificar servicios
docker ps | grep mpd
```

---

## 📝 Uso del Sistema

### Acceso Administrativo
1. Autenticación con credenciales administrativas
2. Navegación al módulo de "Reportes Oficiales"
3. Selección del tipo de reporte requerido
4. Configuración de parámetros y filtros
5. Generación y descarga del reporte oficial

### Tipos de Salida
- **PDF Oficiales**: Con membrete y firmas digitales
- **Excel Detallados**: Para análisis y procesamiento
- **CSV Exportables**: Para sistemas externos
- **JSON Estructurados**: Para integraciones API

---

## 🔒 Seguridad y Auditoría

- **Autenticación Obligatoria**: Solo usuarios administrativos autorizados
- **Trazabilidad Completa**: Registro de todas las consultas y generaciones
- **Integridad de Datos**: Verificación de checksums en reportes críticos
- **Backup Automático**: Respaldo de configuraciones y templates
- **Logs de Auditoría**: Registro detallado de accesos y operaciones

---

## 📞 Contacto y Soporte

**Desarrollado para**: Ministerio Público de la Defensa  
**Responsable Técnico**: [DEFINIR]  
**Email de Soporte**: [DEFINIR]  
**Versión**: 1.0.0  
**Fecha**: Agosto 2025  

---

## 📚 Documentación Adicional

- [Arquitectura del Sistema](./docs/architecture/README.md)
- [APIs Disponibles](./docs/api/README.md)
- [Guía de Integración](./docs/integration/README.md)
- [Especificaciones de Reportes](./docs/reports/README.md)
- [Guía de Despliegue](./docs/deployment/README.md)
- [Políticas de Seguridad](./docs/security/README.md)
