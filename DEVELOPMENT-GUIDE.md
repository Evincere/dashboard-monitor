# 🚀 Guía de Desarrollo - Dashboard Monitor

## ❌ Problema que solucionamos

Los problemas de **cache y sincronización** que experimentamos:
- Cambios en código no se reflejaban inmediatamente
- Cache de Next.js (.next/) con versiones obsoletas  
- Necesidad de `rm -rf .next && npm run build` manualmente
- Reiniciar PM2 después de cada cambio

## ✅ Soluciones Implementadas

### 1. **Modo Desarrollo (RECOMENDADO)**
```bash
# Para desarrollo activo con hot-reload instantáneo
npm run dev              # Next.js con Turbopack
npm run dev:memory       # Con más memoria RAM
npm run dev:clean        # Limpia cache y inicia dev

# Con PM2 (si necesitas logs persistentes)
npm run dev:pm2          # Inicia en PM2 modo desarrollo
npm run dev:pm2:logs     # Ver logs en tiempo real
npm run dev:pm2:restart  # Reiniciar servicio dev
```

### 2. **Modo Producción**
```bash
# Solo para testing de producción
npm run build            # Compilar
npm run start            # Iniciar producción

# Con PM2 (para servidores)
npm run prod:pm2         # Build + PM2 producción
npm run prod:restart     # Rebuild + restart
```

## 🔥 Ventajas del Modo Desarrollo

| Característica | Modo Dev | Modo Prod |
|---------------|----------|-----------|
| **Hot Reload** | ✅ Instantáneo | ❌ Manual |
| **Compilación** | ✅ Solo cambios | ❌ Completa |
| **Cache Issues** | ✅ Eliminados | ❌ Frecuentes |
| **Debugging** | ✅ Source maps | ❌ Minificado |
| **Velocidad cambio** | ✅ < 1 segundo | ❌ 30+ segundos |
| **Error Overlay** | ✅ En browser | ❌ Solo consola |

## 🛠️ Flujo Recomendado

### Durante Desarrollo:
1. **Nunca uses** `npm run build` en desarrollo
2. **Usa siempre** `npm run dev` 
3. Los cambios se reflejan automáticamente
4. No necesitas reiniciar nada

### Para Testing Pre-Deploy:
1. `npm run build` - Solo para verificar que compila
2. `npm run start` - Testing final
3. Si todo OK → deploy

### En Servidor de Producción:
1. `npm run prod:pm2` - Deploy completo
2. `npm run prod:restart` - Actualizar código

## 🚨 Nunca Más:
- ❌ `rm -rf .next` durante desarrollo
- ❌ `pm2 restart` después de cada cambio  
- ❌ `npm run build` en desarrollo activo
- ❌ Editar archivos con PM2 en modo producción

## 💡 Tips Adicionales:

```bash
# Si el hot-reload se "rompe":
npm run dev:clean

# Para debugging avanzado:
npm run dev:debug  # Habilita Chrome DevTools

# Ver logs de desarrollo:
npm run dev:pm2:logs
```

## 🎯 Resultado:
- ⚡ Desarrollo 10x más rápido
- 🔄 Cambios instantáneos  
- 🐛 Menos bugs por cache
- 😊 Experiencia de desarrollo fluida
