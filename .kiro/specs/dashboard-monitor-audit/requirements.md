# Auditoría Completa del Microservicio Dashboard-Monitor

## Introducción

Este documento presenta una auditoría técnica completa del microservicio **dashboard-monitor** (MPD Insights), un panel de control inteligente diseñado para la gestión y análisis de datos del sistema de concursos del Ministerio Público de la Defensa. El microservicio funciona como una aplicación accesoria que se conecta a la base de datos principal `mpd_concursos` desplegada en una red Docker externa, y está diseñado para ejecutarse en el mismo servidor de cloud hosting de DonWeb donde opera la aplicación principal, proporcionando capacidades avanzadas de consulta, análisis y administración de datos.

La aplicación combina una interfaz de usuario moderna con funcionalidades de inteligencia artificial para permitir a los administradores explorar, consultar y entender la información de manera intuitiva y eficiente, manteniendo la integridad y seguridad de los datos de producción.

## Requisitos de Auditoría

### Requisito 1: Análisis de Arquitectura y Stack Tecnológico

**Historia de Usuario:** Como auditor técnico, quiero documentar completamente la arquitectura y tecnologías utilizadas en el dashboard-monitor, para que pueda evaluar la solidez técnica y las decisiones de diseño del microservicio.

#### Criterios de Aceptación

1. CUANDO se analice la arquitectura ENTONCES el sistema SHALL estar documentado como una aplicación Next.js 15 con App Router
2. CUANDO se evalúe el stack tecnológico ENTONCES el sistema SHALL utilizar TypeScript como lenguaje principal
3. CUANDO se revise la interfaz de usuario ENTONCES el sistema SHALL implementar Tailwind CSS con componentes shadcn/ui
4. CUANDO se analicen las capacidades de IA ENTONCES el sistema SHALL integrar Genkit con Google Gemini AI
5. CUANDO se examine la conectividad de datos ENTONCES el sistema SHALL conectarse a MySQL 8.0 usando mysql2
6. CUANDO se revise la configuración de despliegue ENTONCES el sistema SHALL estar configurado para despliegue en el servidor de cloud hosting de DonWeb
7. CUANDO se evalúe el puerto de desarrollo ENTONCES el sistema SHALL ejecutarse en el puerto 9002

### Requisito 2: Documentación de Funcionalidades Principales

**Historia de Usuario:** Como auditor de sistemas, quiero documentar todas las funcionalidades principales del dashboard-monitor, para que pueda verificar que cumple con los objetivos de gestión y análisis de datos del sistema de concursos.

#### Criterios de Aceptación

1. CUANDO se analice el dashboard principal ENTONCES el sistema SHALL mostrar métricas en tiempo real de usuarios, concursos, documentos e inscripciones
2. CUANDO se evalúen las capacidades de consulta ENTONCES el sistema SHALL proporcionar dos modos de consulta con IA: natural y contextual
3. CUANDO se revise la gestión de datos ENTONCES el sistema SHALL incluir módulos para usuarios, concursos, documentos y backups
4. CUANDO se examine el análisis de base de datos ENTONCES el sistema SHALL mostrar estado de conexión, estadísticas de tablas y sugerencias de consultas
5. CUANDO se evalúe la interfaz de usuario ENTONCES el sistema SHALL implementar un diseño responsivo con tema glassmorphism dark
6. CUANDO se analicen los gráficos ENTONCES el sistema SHALL utilizar Recharts para visualizaciones interactivas
7. CUANDO se revise la navegación ENTONCES el sistema SHALL implementar una barra lateral con acceso a todas las funcionalidades

### Requisito 3: Evaluación de Seguridad y Conectividad

**Historia de Usuario:** Como auditor de seguridad, quiero evaluar las medidas de seguridad y la conectividad del dashboard-monitor con la base de datos de producción, para que pueda garantizar que se mantiene la integridad y protección de los datos sensibles.

#### Criterios de Aceptación

1. CUANDO se analice la conectividad ENTONCES el sistema SHALL conectarse a la base de datos `mpd_concursos` usando el host `mpd-concursos-mysql` (IP: 172.18.0.2) en el puerto 3307 del host (mapeado al 3306 del contenedor)
2. CUANDO se evalúe la configuración ENTONCES el sistema SHALL utilizar variables de entorno para credenciales de base de datos
3. CUANDO se revise la autenticación de IA ENTONCES el sistema SHALL implementar un mecanismo agnóstico que permita conexión con múltiples modelos y proveedores de IA (Gemini, OpenAI, Claude, etc.)
4. CUANDO se examine el manejo de errores ENTONCES el sistema SHALL implementar manejo robusto de errores en consultas de base de datos
5. CUANDO se evalúe el cache ENTONCES el sistema SHALL implementar cache de esquema de base de datos con duración de 1 hora
6. CUANDO se analice la validación ENTONCES el sistema SHALL utilizar Zod para validación de esquemas y datos
7. CUANDO se revise la configuración de build ENTONCES el sistema SHALL ignorar errores de TypeScript y ESLint durante el build

### Requisito 4: Análisis de Sistema de Memoria Vectorial

**Historia de Usuario:** Como auditor de IA, quiero documentar y evaluar el sistema de memoria vectorial del dashboard-monitor, para que pueda verificar cómo el sistema utiliza sus recuerdos para mejorar las respuestas y proporcionar contexto histórico.

#### Criterios de Aceptación

1. CUANDO se analice la base de datos vectorial ENTONCES el sistema SHALL utilizar el volumen `dashboard-monitor_vector_store` para almacenar embeddings y memoria del sistema
2. CUANDO se evalúe la memoria del sistema ENTONCES el sistema SHALL almacenar consultas previas, respuestas y contexto para mejorar futuras interacciones
3. CUANDO se revise el aprendizaje ENTONCES el sistema SHALL utilizar la memoria vectorial para proporcionar respuestas más precisas basadas en experiencias anteriores
4. CUANDO se examine la búsqueda semántica ENTONCES el sistema SHALL implementar búsqueda por similitud en la base vectorial para encontrar contexto relevante
5. CUANDO se analice la persistencia ENTONCES el sistema SHALL mantener la memoria vectorial entre reinicios del sistema
6. CUANDO se evalúe la optimización ENTONCES el sistema SHALL utilizar la memoria para evitar recálculos de consultas similares ya procesadas
7. CUANDO se revise la configuración ENTONCES el sistema SHALL permitir configurar el tamaño y comportamiento de la base de datos vectorial

### Requisito 5: Análisis de Capacidades de Inteligencia Artificial

**Historia de Usuario:** Como auditor técnico, quiero documentar y evaluar las capacidades de inteligencia artificial del dashboard-monitor, para que pueda verificar la implementación correcta de los flujos de consulta inteligente y su integración con la base de datos.

#### Criterios de Aceptación

1. CUANDO se analice el sistema de consultas ENTONCES el sistema SHALL implementar un mecanismo unificado de chat que analice automáticamente el input del usuario y determine si requiere consultas simples o complejas
2. CUANDO se evalúe la inteligencia del sistema ENTONCES el sistema SHALL utilizar prompts especializados para determinar automáticamente la complejidad de la consulta y el enfoque de resolución más adecuado
3. CUANDO se evalúe el proceso iterativo ENTONCES el sistema SHALL realizar peticiones iterativas al modelo hasta resolver completamente las consultas SQL necesarias para obtener la información requerida
4. CUANDO se examine la respuesta final ENTONCES el sistema SHALL proporcionar respuestas eficientes, completas, fidedignas y humanizadas al usuario
5. CUANDO se analice la configuración de IA ENTONCES el sistema SHALL utilizar prompting especializado para crear diferentes comportamientos del modelo (descubrimiento de intención, generación SQL, análisis de contexto, etc.)
6. CUANDO se evalúe la generación de sugerencias ENTONCES el sistema SHALL generar sugerencias inteligentes de consultas basadas en el esquema de la base de datos y el contexto del usuario
7. CUANDO se revise el rendimiento ENTONCES el sistema SHALL medir y reportar tiempos de procesamiento del flujo completo de consultas

### Requisito 6: Evaluación de Estructura de Base de Datos y Conectividad

**Historia de Usuario:** Como auditor de datos, quiero documentar la estructura de la base de datos y las capacidades de conectividad del dashboard-monitor, para que pueda verificar la correcta integración con el sistema principal de concursos.

#### Criterios de Aceptación

1. CUANDO se analice la estructura de datos ENTONCES el sistema SHALL tener conocimiento completo e irrestricto de toda la base de datos mpd_concursos, incluyendo todas las tablas, vistas, procedimientos y funciones
2. CUANDO se evalúe la introspección ENTONCES el sistema SHALL utilizar INFORMATION_SCHEMA y otros mecanismos para descubrir dinámicamente toda la estructura de la base de datos sin restricciones
3. CUANDO se revise el cache de esquema ENTONCES el sistema SHALL cachear la información del esquema por 1 hora para optimizar rendimiento
4. CUANDO se examine las relaciones ENTONCES el sistema SHALL mapear automáticamente las relaciones de claves foráneas
5. CUANDO se analicen los índices ENTONCES el sistema SHALL identificar y documentar índices y claves primarias
6. CUANDO se evalúe la ejecución de consultas ENTONCES el sistema SHALL proporcionar acceso completo para ejecutar cualquier consulta SQL necesaria para el análisis y gestión de datos
7. CUANDO se revise la configuración de conexión ENTONCES el sistema SHALL utilizar pool de conexiones MySQL con configuración de entorno

### Requisito 7: Análisis de Gestión de Usuarios y Permisos

**Historia de Usuario:** Como auditor de acceso, quiero documentar las capacidades de gestión de usuarios del dashboard-monitor, para que pueda verificar que se implementan controles adecuados para la administración de usuarios del sistema de concursos.

#### Criterios de Aceptación

1. CUANDO se analice la gestión de usuarios ENTONCES el sistema SHALL permitir visualizar, buscar, editar y eliminar usuarios
2. CUANDO se evalúen los roles ENTONCES el sistema SHALL manejar roles ROLE_ADMIN y ROLE_USER
3. CUANDO se revisen los estados ENTONCES el sistema SHALL gestionar estados ACTIVE, INACTIVE y BLOCKED
4. CUANDO se examine la búsqueda ENTONCES el sistema SHALL permitir filtrar usuarios por nombre y email
5. CUANDO se analice la edición ENTONCES el sistema SHALL permitir modificar nombre, email y rol de usuarios
6. CUANDO se evalúe la integración ENTONCES el sistema SHALL proporcionar acceso directo a documentos de usuarios específicos
7. CUANDO se revise la interfaz ENTONCES el sistema SHALL mostrar avatares, información de contacto y fechas de registro

### Requisito 8: Evaluación de Gestión de Documentos y Backups

**Historia de Usuario:** Como auditor de operaciones, quiero documentar las capacidades completas de gestión de documentos y backups del dashboard-monitor, para que pueda verificar que se implementan controles adecuados para la administración, búsqueda, filtrado y respaldo de archivos del sistema de concursos.

#### Criterios de Aceptación

1. CUANDO se analice la gestión de documentos ENTONCES el sistema SHALL proporcionar un explorador completo para buscar, filtrar y administrar todos los archivos cargados por los postulantes
2. CUANDO se evalúe la búsqueda de documentos ENTONCES el sistema SHALL permitir filtrar documentos por usuario, tipo, fecha, concurso y estado de validación
3. CUANDO se revise la visualización de documentos ENTONCES el sistema SHALL mostrar metadatos completos: nombre, tamaño, tipo, fecha de carga, usuario propietario y estado
4. CUANDO se examine la administración ENTONCES el sistema SHALL permitir descargar, eliminar y cambiar el estado de validación de documentos
5. CUANDO se analice el almacenamiento ENTONCES el sistema SHALL mostrar estadísticas actuales: 15,829 documentos totales ocupando 25.3 GB en el volumen `mpd_concursos_document_storage_prod`
6. CUANDO se evalúe la gestión de backups ENTONCES el sistema SHALL mostrar información de backups recientes almacenados en `mpd_concursos_backup_data_prod` con fechas y tamaños
7. CUANDO se revise la interfaz de backups ENTONCES el sistema SHALL permitir crear nuevos backups y restaurar desde backups existentes con confirmación de seguridad

### Requisito 9: Auditoría de Infraestructura Docker y Red Externa

**Historia de Usuario:** Como auditor de infraestructura, quiero documentar completamente la configuración actual de la red Docker externa donde se ejecuta el sistema de concursos, para que pueda verificar la correcta integración del dashboard-monitor con la infraestructura existente.

#### Criterios de Aceptación

1. CUANDO se analice la red Docker ENTONCES el sistema SHALL documentar la red `mpd_concursos_mpd-concursos-network` (172.18.0.0/16) con gateway 172.18.0.1
2. CUANDO se evalúen los contenedores ENTONCES el sistema SHALL identificar los contenedores activos: mpd-concursos-mysql (172.18.0.2), mpd-concursos-backend (172.18.0.3), mpd-concursos-frontend (172.18.0.4), y dashboard-backend (172.18.0.5)
3. CUANDO se revisen las imágenes ENTONCES el sistema SHALL documentar las imágenes: mysql:8.0, mpd_concursos-backend, mpd_concursos-frontend
4. CUANDO se examinen los volúmenes ENTONCES el sistema SHALL identificar los volúmenes: mpd_concursos_mysql_data_prod, mpd_concursos_document_storage_prod, mpd_concursos_backup_data_prod, mpd_concursos_storage_data_prod
5. CUANDO se analice la base de datos ENTONCES el sistema SHALL conectarse al contenedor `mpd-concursos-mysql` con credenciales root/root1234 en puerto 3307, garantizando permisos completos de lectura, escritura y administración
6. CUANDO se evalúen los puertos ENTONCES el sistema SHALL documentar los puertos expuestos: MySQL (3307), Backend (8080), Frontend (8000), Dashboard Backend (3001)
7. CUANDO se revise la configuración ENTONCES el sistema SHALL verificar que la base de datos tiene 800MB de memoria asignada y política de reinicio unless-stopped

### Requisito 10: Análisis de Opciones de Despliegue y Configuración

**Historia de Usuario:** Como auditor de infraestructura, quiero evaluar y documentar las diferentes opciones de despliegue del dashboard-monitor en el servidor de DonWeb, para que pueda recomendar la estrategia más adecuada considerando seguridad, rendimiento y mantenibilidad.

#### Criterios de Aceptación

1. CUANDO se evalúe el despliegue containerizado ENTONCES el sistema SHALL considerar la opción de crear un contenedor Docker integrado a la red `mpd_concursos_mpd-concursos-network` existente
2. CUANDO se analice el despliegue directo ENTONCES el sistema SHALL evaluar la opción de ejecutar como proceso directo en el servidor usando PM2 o systemd
3. CUANDO se revise la integración con Docker Compose ENTONCES el sistema SHALL considerar agregar el servicio al docker-compose.yml existente de mpd_concursos
4. CUANDO se examine la configuración de red ENTONCES el sistema SHALL garantizar acceso a la base de datos MySQL en 172.18.0.2:3306 desde cualquier opción de despliegue
5. CUANDO se evalúe el puerto de servicio ENTONCES el sistema SHALL ejecutarse en puerto 9002 sin conflictos con los servicios existentes (8000, 8080, 3001)
6. CUANDO se analicen las variables de entorno ENTONCES el sistema SHALL configurar DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE y claves de API según la opción de despliegue elegida
7. CUANDO se revise la persistencia ENTONCES el sistema SHALL garantizar que el volumen `dashboard-monitor_vector_store` sea accesible desde cualquier opción de despliegue