# Sistema de Gestión de Backups - Dashboard Monitor

## Descripción General

El sistema de gestión de backups del Dashboard Monitor proporciona una interfaz completa para crear, gestionar y restaurar copias de seguridad de la base de datos `mpd_concursos` y los documentos almacenados en el sistema.

## Características Principales

### 1. Creación de Backups
- **Backup de Base de Datos**: Utiliza `mysqldump` para crear copias completas de la base de datos
- **Backup de Documentos**: Opcionalmente incluye archivos del volumen `mpd_concursos_document_storage_prod`
- **Metadatos**: Almacena información detallada sobre cada backup (fecha, tamaño, integridad)
- **Verificación de Integridad**: Valida automáticamente la integridad de los backups creados

### 2. Gestión de Backups
- **Listado Completo**: Visualiza todos los backups disponibles con información detallada
- **Filtrado y Búsqueda**: Organiza backups por fecha, tamaño y estado de integridad
- **Estadísticas**: Muestra métricas de uso de almacenamiento y cantidad de backups

### 3. Restauración de Backups
- **Restauración Segura**: Requiere confirmación explícita antes de restaurar
- **Validación de Integridad**: Solo permite restaurar backups verificados
- **Proceso Controlado**: Maneja errores y proporciona retroalimentación detallada

### 4. Eliminación de Backups
- **Eliminación Segura**: Requiere confirmación antes de eliminar
- **Limpieza Automática**: Elimina tanto archivos de base de datos como de documentos
- **Actualización de Metadatos**: Mantiene consistencia en el registro de backups

## Arquitectura Técnica

### API Endpoints

#### `GET /api/backups`
Obtiene la lista de todos los backups disponibles.

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "backup_1234567890",
      "name": "Backup Semanal",
      "description": "Backup automático semanal",
      "date": "2024-01-15T02:00:00.000Z",
      "size": "2.5 GB",
      "sizeBytes": 2684354560,
      "integrity": "verified",
      "type": "full",
      "includesDocuments": true,
      "path": "/backup/path/backup_1234567890.sql"
    }
  ],
  "total": 1
}
```

#### `POST /api/backups`
Crea un nuevo backup.

**Parámetros:**
```json
{
  "name": "string (requerido)",
  "description": "string (opcional)",
  "includeDocuments": "boolean (default: true)"
}
```

#### `PUT /api/backups`
Restaura un backup existente.

**Parámetros:**
```json
{
  "backupId": "string (requerido)",
  "confirmRestore": "boolean (debe ser true)"
}
```

#### `DELETE /api/backups?id={backupId}`
Elimina un backup específico.

### Almacenamiento

Los backups se almacenan en el volumen Docker `mpd_concursos_backup_data_prod`:

```
/var/lib/docker/volumes/mpd_concursos_backup_data_prod/_data/
├── backup_metadata.json          # Metadatos de todos los backups
├── backup_1234567890.sql         # Backup de base de datos
├── backup_1234567890_docs.tar.gz # Backup de documentos (opcional)
└── ...
```

### Verificación de Integridad

El sistema implementa verificación automática de integridad:

- **Backups SQL**: Verifica que el archivo contenga marcadores válidos de mysqldump
- **Backups de Documentos**: Verifica que el archivo tar.gz sea válido y no esté corrupto
- **Estados**: `verified`, `pending`, `failed`

## Interfaz de Usuario

### Dashboard de Backups

La página `/backups` proporciona:

1. **Estadísticas Generales**
   - Total de backups
   - Espacio total utilizado
   - Backups verificados

2. **Tabla de Backups**
   - Lista completa con información detallada
   - Indicadores visuales de integridad
   - Acciones disponibles (restaurar, eliminar)

3. **Creación de Backups**
   - Formulario modal con validación
   - Opciones configurables
   - Retroalimentación en tiempo real

### Características de UX

- **Confirmaciones de Seguridad**: Diálogos de confirmación para operaciones críticas
- **Estados de Carga**: Indicadores visuales durante operaciones largas
- **Notificaciones**: Toast notifications para feedback inmediato
- **Responsive Design**: Funciona en dispositivos móviles y desktop

## Seguridad

### Medidas Implementadas

1. **Validación de Entrada**: Uso de Zod para validar todos los datos de entrada
2. **Confirmaciones Explícitas**: Requiere confirmación para operaciones destructivas
3. **Verificación de Integridad**: Valida backups antes de permitir restauración
4. **Manejo de Errores**: Logging detallado y manejo seguro de errores

### Consideraciones de Seguridad

- Los backups contienen datos sensibles de producción
- El acceso debe estar restringido a administradores autorizados
- Se recomienda implementar autenticación adicional para operaciones críticas
- Los backups deben ser almacenados en ubicaciones seguras

## Configuración

### Variables de Entorno

```bash
# Configuración de base de datos (heredada del sistema principal)
DB_HOST=mpd-concursos-mysql
DB_USER=root
DB_PASSWORD=root1234
DB_DATABASE=mpd_concursos
DB_PORT=3306
```

### Volúmenes Docker

```yaml
volumes:
  mpd_concursos_backup_data_prod:
    external: true
  mpd_concursos_document_storage_prod:
    external: true
```

## Monitoreo y Logs

### Logging

El sistema registra todas las operaciones importantes:

- Creación de backups
- Restauraciones
- Eliminaciones
- Errores y excepciones

### Métricas

- Tiempo de creación de backups
- Tamaño de backups generados
- Tasa de éxito/fallo de operaciones
- Uso de almacenamiento

## Mantenimiento

### Tareas Recomendadas

1. **Limpieza Periódica**: Eliminar backups antiguos según política de retención
2. **Verificación de Integridad**: Ejecutar verificaciones periódicas de backups existentes
3. **Monitoreo de Espacio**: Supervisar el uso de almacenamiento
4. **Pruebas de Restauración**: Verificar periódicamente que los backups son restaurables

### Automatización

Se puede integrar con sistemas de cron para:
- Backups automáticos programados
- Limpieza automática de backups antiguos
- Verificaciones de integridad programadas

## Troubleshooting

### Problemas Comunes

1. **Error de Conexión a Base de Datos**
   - Verificar que el contenedor MySQL esté ejecutándose
   - Comprobar credenciales y conectividad de red

2. **Falta de Espacio en Disco**
   - Limpiar backups antiguos
   - Verificar espacio disponible en volúmenes

3. **Backups Corruptos**
   - Verificar integridad del sistema de archivos
   - Revisar logs de Docker y sistema

4. **Permisos Insuficientes**
   - Verificar permisos de volúmenes Docker
   - Comprobar configuración de usuario en contenedores

### Comandos Útiles

```bash
# Verificar volúmenes de backup
docker volume inspect mpd_concursos_backup_data_prod

# Listar backups en el sistema de archivos
docker run --rm -v mpd_concursos_backup_data_prod:/backup alpine ls -la /backup

# Verificar espacio utilizado
docker run --rm -v mpd_concursos_backup_data_prod:/backup alpine du -sh /backup

# Probar conectividad a MySQL
docker exec mpd-concursos-mysql mysql -u root -proot1234 -e "SHOW DATABASES;"
```

## Roadmap

### Mejoras Futuras

1. **Backups Incrementales**: Implementar backups incrementales para optimizar espacio
2. **Compresión Avanzada**: Mejorar algoritmos de compresión
3. **Backup Remoto**: Integración con servicios de almacenamiento en la nube
4. **Programación Avanzada**: Interface para programar backups automáticos
5. **Notificaciones**: Sistema de alertas por email/webhook
6. **Métricas Avanzadas**: Dashboard de métricas y rendimiento

### Integraciones Planificadas

- Integración con sistemas de monitoreo (Prometheus/Grafana)
- API webhooks para notificaciones externas
- Integración con servicios de almacenamiento en la nube (AWS S3, Google Cloud Storage)
- Sistema de políticas de retención automática