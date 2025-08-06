# Sistema de Gestión de Usuarios - Dashboard Monitor

## Descripción General

El sistema de gestión de usuarios del Dashboard Monitor proporciona funcionalidades completas de CRUD (Crear, Leer, Actualizar, Eliminar) para la administración de usuarios del sistema MPD Concursos. Incluye capacidades avanzadas de búsqueda, filtrado, paginación y gestión de estados de usuario.

## Características Principales

### ✅ Funcionalidades Implementadas

1. **API REST Completa**
   - `GET /api/users` - Lista de usuarios con paginación y filtros
   - `POST /api/users` - Crear nuevo usuario
   - `GET /api/users/[id]` - Obtener usuario específico
   - `PUT /api/users/[id]` - Actualizar usuario
   - `DELETE /api/users/[id]` - Eliminar usuario
   - `PATCH /api/users/[id]` - Cambiar estado de usuario

2. **Búsqueda y Filtrado Avanzado**
   - Búsqueda por nombre, email o nombre de usuario
   - Filtrado por rol (ROLE_ADMIN, ROLE_USER)
   - Filtrado por estado (ACTIVE, INACTIVE, BLOCKED)
   - Ordenamiento configurable
   - Paginación con límites configurables

3. **Gestión de Estados de Usuario**
   - Activar usuarios (ACTIVE)
   - Desactivar usuarios (INACTIVE)
   - Bloquear usuarios (BLOCKED)
   - Transiciones de estado validadas

4. **Interfaz de Usuario Moderna**
   - Tabla responsiva con información completa
   - Modales para edición y creación
   - Botones de acción contextual
   - Indicadores visuales de estado
   - Paginación interactiva

5. **Validación y Seguridad**
   - Validación de datos con Zod
   - Prevención de duplicados (username/email)
   - Manejo robusto de errores
   - Cache inteligente para optimización

## Estructura de la API

### Endpoints Principales

#### `GET /api/users`
Obtiene lista de usuarios con filtros y paginación.

**Parámetros de consulta:**
- `search` - Búsqueda por nombre, email o username
- `role` - Filtrar por rol (ROLE_ADMIN, ROLE_USER)
- `status` - Filtrar por estado (ACTIVE, INACTIVE, BLOCKED)
- `page` - Número de página (default: 1)
- `limit` - Elementos por página (default: 10, max: 100)
- `sortBy` - Campo de ordenamiento (default: created_at)
- `sortOrder` - Orden ASC/DESC (default: DESC)

**Respuesta:**
```json
{
  "users": [
    {
      "id": "user-uuid",
      "name": "Juan Pérez",
      "username": "jperez",
      "email": "juan@example.com",
      "role": "ROLE_USER",
      "status": "ACTIVE",
      "registrationDate": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "lastLogin": null,
      "documentCount": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "search": "",
    "role": "",
    "status": "",
    "sortBy": "created_at",
    "sortOrder": "DESC"
  },
  "cached": false,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### `POST /api/users`
Crea un nuevo usuario.

**Cuerpo de la petición:**
```json
{
  "name": "María García",
  "username": "mgarcia",
  "email": "maria@example.com",
  "password": "password123",
  "role": "ROLE_USER",
  "status": "ACTIVE"
}
```

#### `PUT /api/users/[id]`
Actualiza un usuario existente.

**Cuerpo de la petición:**
```json
{
  "name": "María García López",
  "email": "maria.garcia@example.com",
  "role": "ROLE_ADMIN",
  "status": "ACTIVE"
}
```

#### `PATCH /api/users/[id]`
Cambia el estado de un usuario.

**Cuerpo de la petición:**
```json
{
  "action": "activate" | "deactivate" | "block"
}
```

#### `DELETE /api/users/[id]`
Elimina un usuario (con advertencia si tiene documentos asociados).

### Estadísticas de Usuario

#### `GET /api/dashboard/users?stats=true`
Obtiene estadísticas agregadas de usuarios.

**Respuesta:**
```json
{
  "total": 1250,
  "active": 1100,
  "recent": 45,
  "byRole": [
    { "role": "ROLE_USER", "count": 1200 },
    { "role": "ROLE_ADMIN", "count": 50 }
  ],
  "byStatus": [
    { "status": "ACTIVE", "count": 1100 },
    { "status": "INACTIVE", "count": 100 },
    { "status": "BLOCKED", "count": 50 }
  ],
  "growth": [
    { "month": "2024-01", "count": 100 },
    { "month": "2024-02", "count": 150 }
  ]
}
```

## Estructura de Base de Datos

### Tabla `users`

```sql
CREATE TABLE users (
  id BINARY(16) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('ROLE_ADMIN', 'ROLE_USER') DEFAULT 'ROLE_USER',
  status ENUM('ACTIVE', 'INACTIVE', 'BLOCKED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

## Componentes de la Interfaz

### Página Principal (`/users`)

**Características:**
- Tabla responsiva con información completa de usuarios
- Filtros avanzados (búsqueda, rol, estado)
- Paginación con navegación
- Botones de acción contextual
- Modales para edición y creación
- Indicadores visuales de estado

**Acciones Disponibles:**
- 👁️ Ver documentos del usuario
- ✏️ Editar información del usuario
- ✅ Activar usuario
- ⏸️ Desactivar usuario
- 🚫 Bloquear usuario
- 🗑️ Eliminar usuario (con confirmación)

### Modal de Edición

**Campos editables:**
- Nombre completo
- Nombre de usuario
- Correo electrónico
- Rol (Admin/Usuario)
- Estado (Activo/Inactivo/Bloqueado)

### Modal de Creación

**Campos requeridos:**
- Nombre completo
- Nombre de usuario (único)
- Correo electrónico (único)
- Contraseña (mínimo 6 caracteres)
- Rol
- Estado inicial

## Validaciones y Reglas de Negocio

### Validaciones de Entrada

1. **Nombre**: Requerido, máximo 255 caracteres
2. **Username**: Requerido, 3-50 caracteres, único
3. **Email**: Formato válido, máximo 255 caracteres, único
4. **Contraseña**: Mínimo 6 caracteres (solo para creación)
5. **Rol**: ROLE_ADMIN o ROLE_USER
6. **Estado**: ACTIVE, INACTIVE, o BLOCKED

### Reglas de Negocio

1. **Unicidad**: Username y email deben ser únicos en el sistema
2. **Transiciones de Estado**: Todas las transiciones de estado están permitidas
3. **Eliminación**: Se advierte si el usuario tiene documentos asociados
4. **Búsqueda**: Busca en nombre, email y username simultáneamente
5. **Paginación**: Máximo 100 elementos por página

## Cache y Optimización

### Estrategia de Cache

1. **Cache en Memoria**: 30 segundos para consultas frecuentes
2. **Invalidación**: Se limpia automáticamente al modificar usuarios
3. **Claves de Cache**: Incluyen todos los parámetros de filtrado
4. **Estadísticas**: Cache separado para métricas agregadas

### Optimizaciones de Base de Datos

1. **Índices**: En campos de búsqueda y filtrado frecuente
2. **Connection Pooling**: Gestión eficiente de conexiones
3. **Consultas Optimizadas**: JOINs eficientes para contar documentos
4. **Paginación**: LIMIT/OFFSET para grandes conjuntos de datos

## Manejo de Errores

### Códigos de Estado HTTP

- `200` - Operación exitosa
- `201` - Usuario creado exitosamente
- `400` - Error de validación o datos inválidos
- `404` - Usuario no encontrado
- `409` - Conflicto (username/email duplicado)
- `500` - Error interno del servidor

### Estructura de Errores

```json
{
  "error": "Descripción del error",
  "details": "Información adicional o array de errores de validación",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Seguridad

### Medidas Implementadas

1. **Validación de Entrada**: Zod schemas para todos los datos
2. **Sanitización**: Prevención de inyección SQL con parámetros
3. **Unicidad**: Verificación de duplicados antes de insertar/actualizar
4. **Manejo de Errores**: No exposición de información sensible

### Recomendaciones para Producción

1. **Hash de Contraseñas**: Implementar bcrypt o similar
2. **Autenticación**: JWT o sistema de sesiones
3. **Autorización**: Verificar permisos por rol
4. **Rate Limiting**: Limitar peticiones por IP
5. **Logs de Auditoría**: Registrar todas las operaciones críticas

## Testing

### Tests Implementados

1. **Validación de Datos**: Tests unitarios para schemas
2. **Lógica de Negocio**: Tests para transiciones de estado
3. **API Integration**: Tests básicos de estructura

### Tests Recomendados

1. **Tests de API**: Tests completos de endpoints
2. **Tests de UI**: Tests de componentes React
3. **Tests de Integración**: Tests con base de datos real
4. **Tests de Carga**: Rendimiento con grandes volúmenes

## Monitoreo y Métricas

### Métricas Disponibles

1. **Usuarios Totales**: Conteo total de usuarios
2. **Usuarios Activos**: Usuarios con estado ACTIVE
3. **Usuarios Recientes**: Registrados en últimos 30 días
4. **Distribución por Rol**: Conteo por tipo de usuario
5. **Distribución por Estado**: Conteo por estado
6. **Crecimiento Mensual**: Nuevos usuarios por mes

### Logs y Auditoría

- Todas las operaciones se registran en console
- Errores incluyen stack traces para debugging
- Timestamps en todas las respuestas
- Cache hits/misses para optimización

## Integración con Documentos

### Funcionalidades

1. **Conteo de Documentos**: Cada usuario muestra cantidad de documentos
2. **Acceso Directo**: Botón para ver documentos del usuario
3. **Advertencias**: Al eliminar usuarios con documentos
4. **Filtrado**: Posibilidad de filtrar por usuarios con/sin documentos

## Próximas Mejoras

### Funcionalidades Planificadas

1. **Importación Masiva**: Carga de usuarios desde CSV/Excel
2. **Exportación**: Descarga de listas de usuarios
3. **Historial de Cambios**: Auditoría de modificaciones
4. **Notificaciones**: Alertas por email en cambios críticos
5. **Roles Personalizados**: Sistema de permisos granular
6. **Autenticación 2FA**: Seguridad adicional para admins
7. **Dashboard de Actividad**: Métricas en tiempo real
8. **API GraphQL**: Consultas más flexibles

### Optimizaciones Técnicas

1. **Búsqueda Full-Text**: Índices de texto completo
2. **Cache Distribuido**: Redis para múltiples instancias
3. **Paginación Cursor**: Para mejor rendimiento
4. **Compresión**: Respuestas comprimidas para APIs
5. **WebSockets**: Updates en tiempo real
6. **Lazy Loading**: Carga progresiva de datos

## Conclusión

El sistema de gestión de usuarios del Dashboard Monitor proporciona una solución completa y robusta para la administración de usuarios del sistema MPD Concursos. Con funcionalidades avanzadas de búsqueda, filtrado, y gestión de estados, junto con una interfaz moderna y APIs bien diseñadas, el sistema está preparado para manejar las necesidades actuales y futuras de la plataforma.

La implementación sigue las mejores prácticas de desarrollo web moderno, con validación robusta, manejo de errores apropiado, y optimizaciones de rendimiento que garantizan una experiencia de usuario fluida y confiable.