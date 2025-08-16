# 🧪 Testing de Integración - Sistema de Validación MPD

Este documento describe cómo probar la integración completa entre el dashboard Next.js y el backend Spring Boot.

## 🎯 Objetivo

Verificar que todas las APIs de integración funcionan correctamente:
- ✅ Conexión con backend Spring Boot
- ✅ APIs proxy (usuarios, documentos, inscripciones)
- ✅ APIs de validación específicas
- ✅ APIs de decisión (aprobar/rechazar/comentar)
- ✅ Sistema de documentos locales
- ✅ Componentes de visualización

## 🚀 Preparación para Testing

### 1. Backend Spring Boot
Asegurar que el backend esté corriendo con la configuración correcta:

```bash
# Opción 1: Usar script PowerShell (Recomendado)
cd B:\CODE\PROYECTOS\concursos-mpd
.\start-backend-local.ps1

# Opción 2: Usar script BAT
.\start-backend-local.bat

# Opción 3: Configurar manualmente
$env:DOCUMENTS_BASE_PATH = "B:/concursos_situacion_post_gracia/descarga_administracion_20250814_191745"
$env:SPRING_PROFILES_ACTIVE = "local"
cd concurso-backend
mvn spring-boot:run
```

### 2. Dashboard Next.js
En otra terminal, ejecutar el dashboard:

```bash
cd B:\CODE\PROYECTOS\mpd-dashboard
npm run dev
```

El dashboard estará disponible en: http://localhost:9002

## 🧪 Ejecutar Tests de Integración

### Opción 1: Script Automatizado
```bash
npm run test:integration
```

### Opción 2: Testing Manual
1. **Test de Backend Connection**
   - URL: http://localhost:9002/api/backend/test
   - Verificar: `success: true`

2. **Test de Estadísticas**
   - URL: http://localhost:9002/api/backend/statistics
   - Verificar: datos de documentos

3. **Test de Usuarios**
   - URL: http://localhost:9002/api/backend/users?page=0&size=5
   - Verificar: lista paginada de usuarios

4. **Test de Documentos**
   - URL: http://localhost:9002/api/backend/documents?page=0&size=5
   - Verificar: lista paginada de documentos

5. **Test de Inscripciones**
   - URL: http://localhost:9002/api/backend/inscriptions?page=0&size=5
   - Verificar: lista paginada de inscripciones

6. **Test de Postulantes para Validación**
   - URL: http://localhost:9002/api/validation/postulants?page=0&size=10
   - Verificar: datos combinados usuario+inscripción+documentos

7. **Test de Acceso a Documentos Locales**
   - URL: http://localhost:9002/api/validation/documents/[DNI_REAL]
   - Verificar: lista de documentos PDF o error 404 (esperado si no existe)

## 📊 Interpretación de Resultados

### ✅ Tests Exitosos
- **Backend Connection**: El backend Spring Boot responde correctamente
- **APIs Proxy**: Las APIs de proxy funcionan y pueden comunicarse con el backend
- **Validation APIs**: Las APIs específicas de validación procesan las peticiones
- **Document Access**: El sistema puede acceder a documentos locales

### ❌ Tests Fallidos Comunes

#### Backend No Disponible
```
Error: HTTP 500: Internal Server Error
```
**Solución**: Verificar que el backend Spring Boot esté corriendo en puerto 8080

#### Variables de Entorno Incorrectas
```
Error: Backend integration is disabled
```
**Solución**: Verificar `.env.local`:
```
BACKEND_API_URL=http://localhost:8080/api
BACKEND_JWT_SECRET=RcmUR2yePNGr5pjZ9bXL_dx7h_xeIliI4iS4ESXDMMs
ENABLE_BACKEND_INTEGRATION=true
```

#### Path de Documentos Incorrecto
```
Error: Document access test failed
```
**Solución**: Verificar que `DOCUMENTS_PATH` en `.env.local` apunte al directorio correcto

#### Base de Datos No Accesible
```
Error: Failed to connect to database
```
**Solución**: Verificar conexión MySQL en el backend

## 🔍 Testing de Componentes UI

### 1. Componente PDFViewer
```typescript
import PDFViewer from '@/components/validation/PDFViewer';

// Test básico de visualización
<PDFViewer 
  pdfUrl="/api/validation/documents/12345678?file=documento.pdf"
  dni="12345678"
  fileName="documento.pdf"
/>
```

### 2. Componente PostulantCard
```typescript
import PostulantCard from '@/components/validation/PostulantCard';

// Test con datos de muestra
const samplePostulant = {
  user: { id: '1', name: 'Juan Pérez', username: '12345678', email: 'juan@example.com', status: 'ACTIVE' },
  inscription: { id: '1', status: 'COMPLETED_WITH_DOCS', currentStep: 'COMPLETED', centroDeVida: 'Capital', documentosCompletos: true, createdAt: '2024-01-15' },
  documents: { total: 5, pending: 2, approved: 3, rejected: 0 },
  validationStatus: 'PENDING' as const
};

<PostulantCard postulant={samplePostulant} />
```

### 3. Componente ValidationDecision
```typescript
import ValidationDecision from '@/components/validation/ValidationDecision';

const handleApprove = async (data) => {
  console.log('Approving:', data);
  // Llamar a /api/validation/approve
};

<ValidationDecision 
  postulant={samplePostulant}
  validatedBy="Test User"
  onApprove={handleApprove}
  onReject={handleReject}
  onComment={handleComment}
/>
```

## 📈 Criterios de Éxito

### ✅ Integración Completa (80%+ tests passing)
- Backend responde correctamente
- Todas las APIs proxy funcionan
- APIs de validación procesan peticiones
- Acceso a documentos operativo
- Componentes UI renderizan sin errores

### 🟡 Integración Parcial (50-80% tests passing)
- Backend conectado pero algunas APIs fallan
- Problemas de configuración menores
- Algunos documentos no accesibles

### 🔴 Integración Crítica (<50% tests passing)
- Backend no disponible
- Configuración incorrecta
- Problemas de base de datos o acceso a archivos

## 🛠️ Troubleshooting

### Logs Importantes
1. **Backend Spring Boot**: Verificar logs por errores de conexión DB o paths
2. **Dashboard Next.js**: Ver consola del navegador por errores de JavaScript
3. **Network Tab**: Verificar requests HTTP y responses

### Comandos de Diagnóstico
```bash
# Verificar puertos ocupados
netstat -an | findstr :8080
netstat -an | findstr :9002

# Verificar variables de entorno
echo $env:DOCUMENTS_BASE_PATH
echo $env:SPRING_PROFILES_ACTIVE

# Test directo del backend
curl http://localhost:8080/api/admin/documentos/estadisticas
```

## 🎯 Siguientes Pasos

Una vez que la integración esté funcionando:

1. **Desarrollo de UI**: Crear páginas de validación completas
2. **Testing con Datos Reales**: Usar DNIs reales de postulantes
3. **Optimización**: Mejorar performance y UX
4. **Deployment**: Preparar para producción

---

**Fecha de creación**: 15 de agosto de 2025  
**Versión**: 1.0  
**Mantenido por**: Equipo de desarrollo MPD
