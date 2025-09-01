# MPD Dashboard Monitor - Archivo Fuente de Verdad

## 📋 Resumen del Proyecto
Sistema de administración de concursos para el Ministerio Público de la Defensa (MPD).
Dashboard web con funcionalidades de gestión de postulaciones, validación de documentos y reportes administrativos.

## 🔧 Tecnologías
- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS
- **UI:** shadcn/ui components, Lucide icons
- **Backend:** APIs RESTful integradas
- **Tema:** Dark mode por defecto (forzado en layout)

## 🎯 Estado Actual de Desarrollo

### ✅ COMPLETADO - Problemas de Estilos y Layout

#### 1. **Problema de Login Descentrado - RESUELTO**
- **Issue:** Login aparecía en lado izquierdo por interferencia del SidebarProvider
- **Solución:** Reestructuración de layouts
  - Removido `SidebarProvider` de `src/app/layout.tsx` 
  - Movido `SidebarProvider` a `src/app/(dashboard)/layout.tsx`
- **Resultado:** Login centrado correctamente

#### 2. **Problema de Tema Claro - RESUELTO** 
- **Issue:** Login mostraba fondo claro inconsistente con el sistema
- **Solución:** Forzado tema oscuro en `src/app/layout.tsx`
  ```tsx
  <html lang="es" className="dark">
  ```
- **Resultado:** Tema oscuro consistente en toda la aplicación

### 🚧 EN DESARROLLO - Optimización de Carga de Postulaciones

#### **Problemas Identificados:**
1. **Timeouts en API** - Llamadas que excedían 60 segundos
2. **Loops infinitos** - useEffect ejecutándose múltiples veces
3. **Re-renders excesivos** - Fast Refresh constante
4. **Performance pobre** - Carga de 300 elementos simultáneos

#### **Optimizaciones Implementadas:**
1. **Control de inicialización única**
   ```typescript
   let hasInitialized = false;
   let isLoadingData = false;
   ```

2. **Timeouts optimizados**
   - Estadísticas: 10 segundos (antes 45s)
   - Postulaciones: 15 segundos (antes 60s)

3. **Paginación eficiente**
   - Tamaño de página: 25 elementos (antes 300)
   - Carga incremental con botón "Cargar más"

4. **UseEffect sin dependencias**
   ```typescript
   useEffect(() => {
     if (hasInitialized) return;
     // ... carga inicial
   }, []); // Sin dependencias problemáticas
   ```

#### **Estado Actual:**
- ✅ **Estadísticas:** Cargan correctamente (292 total, 32 pendientes, 171 completadas, 49 rechazadas)
- ✅ **Listado:** Implementado con paginación optimizada
- ✅ **Filtros:** Funcionales (búsqueda, estado, validación, ordenamiento)
- ✅ **UI/UX:** Loading states, error handling, tema oscuro

#### **Archivos Modificados:**
1. `src/app/layout.tsx` - Layout principal sin SidebarProvider + tema oscuro forzado
2. `src/app/(dashboard)/layout.tsx` - Layout dashboard con SidebarProvider
3. `src/app/(dashboard)/postulations/page.tsx` - Componente optimizado de postulaciones

#### **Backups Creados:**
- `src/app/layout.tsx.backup`
- `src/app/(dashboard)/layout.tsx.backup` 
- `src/app/(dashboard)/postulations/page.tsx.backup`

## 🔄 PRÓXIMOS PASOS REQUERIDOS

### **Correcciones Pendientes:**
1. **Validar performance real** - Probar con datos de producción
2. **Optimizar carga inicial** - Reducir tiempo de primera carga
3. **Mejorar error handling** - Casos edge específicos
4. **Refinar filtros** - Agregar más opciones de filtrado si es necesario

### **Funcionalidades Adicionales:**
- Implementar cache de postulaciones para navegación más rápida
- Agregar indicadores de progreso más granulares
- Optimizar PostulationCard para mejor performance
- Considerar virtualización para listas muy grandes

## 🛠️ Arquitectura de Componentes

### **Layouts:**
- `src/app/layout.tsx` - Layout raíz (sin sidebar, tema oscuro)
- `src/app/(dashboard)/layout.tsx` - Layout dashboard (con sidebar y AuthGuard)

### **Componentes Clave:**
- `src/app/(dashboard)/postulations/page.tsx` - Página principal de postulaciones
- `src/components/postulations/PostulationCard.tsx` - Card individual de postulación
- `src/components/dashboard-sidebar.tsx` - Sidebar de navegación
- `src/components/ui/*` - Componentes base (Button, Card, Input, etc.)

### **APIs Utilizadas:**
- `GET /api/postulations/management?onlyStats=true` - Estadísticas rápidas
- `GET /api/postulations/management?page=X&pageSize=Y` - Listado paginado

## 🎨 Sistema de Estilos

### **Configuración:**
- **Tailwind CSS** con modo oscuro por defecto
- **Variables CSS** en `src/app/globals.css`
- **Componentes shadcn/ui** para consistencia

### **Tema Oscuro:**
```css
:root {
  --background: 224 71% 4%;
  --foreground: 213 31% 91%;
  /* ... más variables */
}
```

## 📁 Estructura de Archivos Relevantes
```
src/
├── app/
│   ├── layout.tsx                    # Layout principal (tema oscuro forzado)
│   ├── login/page.tsx               # Página de login (centrada)
│   ├── (dashboard)/
│   │   ├── layout.tsx               # Layout dashboard (con sidebar)
│   │   └── postulations/page.tsx    # Gestión de postulaciones (optimizada)
│   └── globals.css                  # Estilos globales y variables
├── components/
│   ├── dashboard-sidebar.tsx        # Sidebar principal
│   ├── postulations/
│   │   └── PostulationCard.tsx      # Card de postulación
│   └── ui/                          # Componentes base shadcn/ui
└── lib/
    └── utils.ts                     # Utilidades (apiUrl, routeUrl, etc.)
```

## 🔍 Para Retomar Desarrollo

### **Comandos Útiles:**
```bash
# Verificar estado actual
npm run build

# Revisar logs en desarrollo
npm run dev

# Backup de seguridad
cp './src/app/(dashboard)/postulations/page.tsx' './src/app/(dashboard)/postulations/page.tsx.backup'
```

### **URLs de Testing:**
- Login: `/login` (centrado, tema oscuro)
- Dashboard: `/` (con sidebar)
- Postulaciones: `/postulations` (optimizado, funcional)

### **Debugging:**
- Logs de consola con emojis para seguimiento: 🚀 📊 📡 ✅ ⚠️ 🔍
- Variables globales para control de estado: `hasInitialized`, `isLoadingData`
- Error handling con toast notifications

---
**Última actualización:** 2025-09-01 - Estado: Funcional con optimizaciones de performance implementadas

## 🔍 IMPLEMENTADO - Búsqueda Híbrida de Postulaciones

### **Problema Resuelto:**
- ❌ **Anterior:** Búsqueda limitada solo a postulaciones cargadas en memoria (25-50 elementos)
- ✅ **Nuevo:** Búsqueda completa en toda la base de datos con fallback inteligente

### **Características de la Búsqueda Híbrida:**

#### **1. Modo Dual de Operación:**
- **Modo Local:** Navegación paginada rápida (25 elementos por página)
- **Modo Global:** Búsqueda completa en toda la BD cuando es necesario

#### **2. Lógica Inteligente:**
```typescript
// Algoritmo de búsqueda híbrida:
1. Usuario escribe término de búsqueda
2. Verificar cache de búsquedas anteriores
3. Buscar primero en datos locales cargados
4. Si encuentra resultados → usar modo local
5. Si NO encuentra → consultar servidor (modo global)
6. Cachear resultados para futuras búsquedas
```

#### **3. Optimizaciones Implementadas:**
- **Debounce:** 500ms para evitar múltiples llamadas
- **Cache inteligente:** Resultados de búsqueda almacenados en memoria
- **Fallback robusto:** Si falla búsqueda global, usar resultados locales
- **Timeouts optimizados:** 10s para búsqueda vs 15s para paginación

#### **4. Indicadores Visuales:**
- 🌐 **Badge "Búsqueda Global"** cuando se consulta el servidor
- 💾 **Badge "Datos Locales"** para navegación paginada
- ⏳ **"Buscando en servidor..."** durante consultas globales
- 🔄 **Botón "Volver a vista paginada"** para limpiar búsqueda

#### **5. API Endpoints Utilizados:**
- **Paginación:** `GET /api/postulations/management?page=X&pageSize=Y`
- **Búsqueda:** `GET /api/postulations/search?search=term&statusFilter=X&validationFilter=Y&sortBy=Z`

### **Beneficios Obtenidos:**

#### **Performance:**
- ✅ Carga inicial rápida mantenida (25 elementos)
- ✅ Navegación fluida con paginación
- ✅ Búsqueda rápida en datos locales
- ✅ Cache inteligente evita consultas repetidas

#### **Funcionalidad:**
- ✅ Búsqueda completa en toda la base de datos
- ✅ Puede encontrar postulaciones no cargadas aún
- ✅ Filtros funcionan en ambos modos
- ✅ Ordenamiento mantiene consistencia

#### **UX/UI:**
- ✅ Indicadores claros del modo de búsqueda activo
- ✅ Estados de carga informativos
- ✅ Mensajes de feedback apropiados
- ✅ Fácil limpieza de búsqueda y retorno a vista paginada

### **Casos de Uso Resueltos:**

#### **Escenario 1: Navegación Normal**
```
Usuario navega → Modo local → Carga paginada rápida
```

#### **Escenario 2: Búsqueda de Postulación Visible**
```
Usuario busca "Juan" → Encuentra en datos locales → Modo local → Resultado inmediato
```

#### **Escenario 3: Búsqueda de Postulación No Cargada**
```
Usuario busca "DNI específico" → No encuentra localmente → Consulta servidor → Modo global → Muestra resultado
```

#### **Escenario 4: Búsqueda Repetida**
```
Usuario busca término previo → Cache hit → Resultado inmediato sin consulta servidor
```

### **Archivos Modificados:**
- `src/app/(dashboard)/postulations/page.tsx` - Implementación completa de búsqueda híbrida
- `src/app/(dashboard)/postulations/page.tsx.backup-hybrid-search` - Backup de seguridad

### **Funciones Clave Implementadas:**

#### **searchAPI():**
- Consulta endpoint `/api/postulations/search`
- Timeout de 10s optimizado
- Fallback a búsqueda local en caso de error
- Manejo robusto de errores

#### **handleSearch():**
- Lógica híbrida inteligente
- Cache de resultados con clave compuesta
- Debounce de 500ms
- Feedback visual apropiado

#### **clearSearch():**
- Limpieza completa de estado de búsqueda
- Retorno a modo local
- Reaplicación de filtros locales

### **Logs de Debug Implementados:**
```
🔍 Búsqueda local encontró: X resultados
🌐 Realizando búsqueda global en servidor: término
✅ Búsqueda global completada: X resultados  
💾 Usando resultado de cache para: término
🔄 Fallback: búsqueda en datos locales
```

---
**Actualización:** 2025-09-01 - **Búsqueda Híbrida Implementada** - Sistema dual que mantiene performance de carga paginada con capacidad de búsqueda completa en toda la base de datos.

