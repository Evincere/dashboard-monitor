
# MPD Insights - Panel de Control Inteligente

**MPD Insights** es un panel de control avanzado diseñado para la gestión y el análisis de datos del sistema de concursos del Ministerio Público de la Defensa. La aplicación combina una interfaz de usuario moderna y reactiva con potentes funcionalidades de inteligencia artificial para permitir a los administradores explorar, consultar y entender la información de la base de datos de una manera intuitiva y eficiente.

---

## 🚀 Funcionalidades Principales

### 1. **Dashboard Principal**
Un centro de control visual que ofrece una visión general del estado del sistema con métricas y gráficos clave:
- **Tarjetas de Métricas**: Estadísticas en tiempo real de usuarios registrados, concursos activos, documentos procesados e inscripciones totales.
- **Gráficos Interactivos**: Visualizaciones sobre el crecimiento de usuarios, el estado de los concursos y la distribución de documentos por categoría.
- **Widget de Actividad Reciente**: Un feed en vivo que muestra los últimos usuarios que se han registrado y las inscripciones más recientes a los concursos.

### 2. **Consultas con Inteligencia Artificial**
MPD Insights cuenta con un motor de IA (potenciado por Genkit y Google Gemini) que permite dos modos de consulta:
- **Consulta Natural**: Permite a los usuarios hacer preguntas en español (ej: "¿Cuántos usuarios se inscribieron el último mes?"). La IA traduce la pregunta a una consulta SQL, la ejecuta y devuelve una respuesta clara y concisa.
- **Consulta con IA (Contextual)**: Para preguntas más complejas y abiertas (ej: "Analiza el perfil de los postulantes con mayor puntaje"). La IA descompone la pregunta en múltiples subconsultas, las ejecuta en orden y sintetiza los resultados en un informe detallado.

### 3. **Gestión de Datos**
La aplicación proporciona módulos dedicados para la administración de las entidades principales del sistema:
- **Gestión de Usuarios**: Permite ver, buscar, editar (nombre, email, rol) y eliminar usuarios. Incluye un acceso directo para ver todos los documentos subidos por un usuario específico.
- **Gestión de Concursos**: Facilita la creación, edición (estado, fechas) y eliminación de concursos.
- **Gestión de Documentos**: Un explorador para buscar, filtrar y administrar todos los archivos cargados por los postulantes.
- **Gestión de Backups**: Una interfaz para crear y administrar copias de seguridad de la base de datos.

### 4. **Análisis de la Base de Datos**
Una sección técnica que ofrece herramientas para interactuar directamente con la base de datos:
- **Estado de Conexión**: Muestra información en tiempo real sobre la conexión a la base de datos MySQL.
- **Estadísticas de Tablas**: Presenta un resumen del número de filas en las tablas más importantes.
- **Sugerencias de Consultas por IA**: Un asistente que genera ejemplos de consultas SQL útiles basadas en el esquema actual de la base de datos.

---

## 🛠️ Stack Tecnológico

- **Framework**: **Next.js 15** (con App Router)
- **Lenguaje**: **TypeScript**
- **Estilos**: **Tailwind CSS**
- **Componentes UI**: **shadcn/ui**
- **Iconografía**: **Lucide React**
- **Gráficos**: **Recharts**
- **Inteligencia Artificial**: **Genkit (Google AI)**
- **Base de Datos**: **MySQL 8.0**

---

## ⚙️ Configuración del Entorno

Para ejecutar este proyecto localmente, sigue estos pasos:

1.  **Clonar el Repositorio**:
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd <NOMBRE_DEL_PROYECTO>
    ```

2.  **Instalar Dependencias**:
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno**:
    Crea un archivo `.env.local` en la raíz del proyecto y añade las credenciales de tu base de datos MySQL y tu clave de API de Google Gemini:
    ```env
    # Credenciales de la Base de Datos MySQL
    DB_HOST=tu_host_de_bd
    DB_USER=tu_usuario_de_bd
    DB_PASSWORD=tu_contraseña_de_bd
    DB_DATABASE=mpd_concursos

    # Clave de API de Google (para Genkit)
    GEMINI_API_KEY=tu_clave_de_api_de_gemini
    ```

4.  **Ejecutar la Aplicación**:
    Inicia el servidor de desarrollo de Next.js.
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:9002`.

---

## 🗂️ Estructura de la Base de Datos

El sistema se conecta a una base de datos `mpd_concursos` que contiene la lógica de negocio para la gestión de usuarios, concursos, inscripciones, exámenes y documentos. Las tablas principales incluyen:

- `user_entity`: Almacena la información de los usuarios.
- `contests`: Define los concursos disponibles.
- `inscriptions`: Registra las inscripciones de los usuarios a los concursos.
- `documents`: Gestiona los archivos subidos por los usuarios.
- `examinations`, `questions`, `answers`: Estructuran el sistema de exámenes.

El servicio de IA utiliza el `INFORMATION_SCHEMA` de la base de datos para descubrir dinámicamente la estructura de las tablas, columnas y relaciones, lo que le permite generar consultas SQL complejas y precisas de forma automática.
