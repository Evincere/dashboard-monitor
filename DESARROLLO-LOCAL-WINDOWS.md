# 🏠 DESARROLLO LOCAL - MPD Dashboard (Windows)

## 🚀 Comandos Esenciales

### **Iniciar Desarrollo Local:**
```powershell
# Servidor de desarrollo con Turbopack (puerto 3000)
npm run dev:local

# Con más memoria si es necesario
npm run dev:memory
```

### **Verificaciones Previas:**
```powershell
# Verificar dependencias
npm list genkit @genkit-ai/firebase @genkit-ai/googleai @genkit-ai/next

# Verificar configuración
Get-Content .env.local | Select-String "NODE_ENV|PORT|DB_HOST"

# Verificar que el puerto esté libre
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
```

### **Build y Testing:**
```powershell
# Verificar tipos
npm run typecheck

# Linting
npm run lint  

# Build local para testing
npm run build

# Tests
npm run test
```

## 🌐 URLs Locales

- **Desarrollo**: http://localhost:3000
- **Después de build**: http://localhost:3000 (con npm start)

## ⚙️ Configuración Actual

### **Entorno (.env.local):**
- `NODE_ENV=development`
- `PORT=3000` 
- `HOSTNAME=localhost`
- Base de datos: MySQL local puerto 3306
- Backend API: http://localhost:8080/api

### **Scripts Disponibles:**
- `dev:local` - Desarrollo puerto 3000 (localhost)
- `dev` - Desarrollo puerto 9002 (como VPS)
- `dev:memory` - Con más memoria asignada
- `build` - Build de producción
- `typecheck` - Solo verificar TypeScript
- `lint` - Solo verificar ESLint

## 🔄 Workflow Recomendado

### **Desarrollo Diario:**
1. Abrir terminal en proyecto
2. `npm run dev:local`  
3. Desarrollar en http://localhost:3000
4. Hot reload automático con Turbopack (~10x más rápido)

### **Antes de hacer Push:**
```powershell
# Verificaciones
npm run typecheck
npm run lint
npm run build

# Si todo OK, hacer commit
git add .
git commit -m "feat: nueva funcionalidad"
git push origin feature/reportes-administrativos
```

### **Sincronizar con VPS:**
```powershell
# Obtener últimos cambios del VPS
git fetch origin
git merge origin/feature/reportes-administrativos

# Si hay conflictos, resolverlos y continuar
```

## 🛠️ Solución de Problemas Comunes

### **Puerto ocupado:**
```powershell
# Ver qué usa el puerto 3000
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

# Matar procesos Node.js si es necesario
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force
```

### **Problemas de dependencias:**
```powershell
# Limpiar e instalar
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue
npm install
```

### **Problemas de memoria:**
```powershell
# Usar script con más memoria
npm run dev:memory

# O configurar manualmente
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run dev:local
```

### **Problemas de compilación:**
```powershell
# Limpiar caché Next.js
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev:local
```

## 📁 Estructura de Desarrollo

```
mpd-dashboard/                     # Tu proyecto local
├── .env.local                    # Configuración local
├── .env.local.backup            # Backup de tu config anterior  
├── src/                         # Código fuente
├── storage/documents/           # Documentos locales
├── package.json                 # Scripts actualizados
└── DESARROLLO-LOCAL-WINDOWS.md  # Esta guía
```

## 🔗 Conexión con VPS

### **Bases de Datos:**
- **Local**: `localhost:3306` (MySQL local)
- **Remoto**: Cambiar en `.env.local` si necesitas conectar al VPS

### **Backend:**
- **Local**: `http://localhost:8080` (si tienes Spring Boot local)
- **Remoto**: Cambiar a IP del VPS si necesitas backend remoto

### **Documentos:**
- **Local**: `storage/documents/` (vacío inicialmente)
- **VPS**: Conectado a volúmenes Docker

## ✨ Características Habilitadas

- ✅ **Turbopack** - Build ~10x más rápido
- ✅ **Hot Reload** - Cambios instantáneos
- ✅ **TypeScript** - Verificación de tipos
- ✅ **Tailwind CSS** - Estilos responsivos
- ✅ **Dependencias Genkit** - IA compatible
- ✅ **Next.js 15** - Última versión
- ✅ **Windows Optimized** - Configurado para Windows

## 📞 Si Necesitas Ayuda

1. Verificar que el servidor VPS esté funcionando: `producción en puerto 9002`
2. Verificar tu entorno local: `npm run dev:local` debe funcionar
3. Comparar versiones: `npm list genkit` local vs VPS
4. Revisar logs: Errores en terminal durante `npm run dev:local`

**¡Tu entorno de desarrollo local está listo para usar!**
