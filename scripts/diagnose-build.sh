#!/bin/bash

# =============================================================================
# Script de Diagnóstico para Build Issues
# =============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔍 DIAGNÓSTICO DE BUILD - Dashboard Monitor"
echo "============================================="
echo ""

# 1. Verificar estructura de archivos
echo -e "${BLUE}📁 Verificando estructura de archivos...${NC}"

# Verificar componentes UI específicos que fallan
MISSING_FILES=()

if [ ! -f "src/components/ui/button.tsx" ]; then
    MISSING_FILES+=("src/components/ui/button.tsx")
fi

if [ ! -f "src/components/ui/textarea.tsx" ]; then
    MISSING_FILES+=("src/components/ui/textarea.tsx")
fi

if [ ! -f "src/components/ui/card.tsx" ]; then
    MISSING_FILES+=("src/components/ui/card.tsx")
fi

if [ ! -f "src/components/ui/alert.tsx" ]; then
    MISSING_FILES+=("src/components/ui/alert.tsx")
fi

if [ ! -f "src/lib/actions.ts" ]; then
    MISSING_FILES+=("src/lib/actions.ts")
fi

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Todos los archivos necesarios existen${NC}"
else
    echo -e "${RED}❌ Archivos faltantes:${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo -e "${RED}  - $file${NC}"
    done
fi

# 2. Verificar tsconfig.json
echo ""
echo -e "${BLUE}⚙️  Verificando configuración TypeScript...${NC}"

if [ -f "tsconfig.json" ]; then
    echo -e "${GREEN}✅ tsconfig.json existe${NC}"
    
    # Verificar path mapping
    if grep -q '"@/\*"' tsconfig.json; then
        echo -e "${GREEN}✅ Path mapping configurado${NC}"
    else
        echo -e "${RED}❌ Path mapping no configurado${NC}"
    fi
else
    echo -e "${RED}❌ tsconfig.json no existe${NC}"
fi

# 3. Verificar dependencias
echo ""
echo -e "${BLUE}📦 Verificando dependencias...${NC}"

# Verificar node_modules
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules existe${NC}"
    
    # Verificar dependencias específicas
    DEPS=("react" "next" "typescript" "@types/react" "lucide-react")
    for dep in "${DEPS[@]}"; do
        if [ -d "node_modules/$dep" ]; then
            echo -e "${GREEN}✅ $dep instalado${NC}"
        else
            echo -e "${RED}❌ $dep no encontrado${NC}"
        fi
    done
else
    echo -e "${RED}❌ node_modules no existe - ejecuta npm install${NC}"
fi

# 4. Verificar sintaxis de archivos problemáticos
echo ""
echo -e "${BLUE}🔍 Verificando sintaxis de archivos...${NC}"

# Verificar archivos que causan problemas
PROBLEM_FILES=(
    "src/app/(dashboard)/ai-query/page.tsx"
    "src/lib/actions.ts"
    "src/components/ui/button.tsx"
    "src/components/ui/textarea.tsx"
)

for file in "${PROBLEM_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -n "Verificando $file... "
        if npx tsc --noEmit --skipLibCheck "$file" 2>/dev/null; then
            echo -e "${GREEN}✅${NC}"
        else
            echo -e "${RED}❌ Error de sintaxis${NC}"
            echo "Errores en $file:"
            npx tsc --noEmit --skipLibCheck "$file" 2>&1 | head -5
        fi
    else
        echo -e "${RED}❌ $file no existe${NC}"
    fi
done

# 5. Verificar imports específicos
echo ""
echo -e "${BLUE}🔗 Verificando imports problemáticos...${NC}"

# Buscar imports que fallan
echo "Buscando imports de @/lib/actions..."
grep -r "@/lib/actions" src/ 2>/dev/null | head -3

echo ""
echo "Buscando imports de @/components/ui..."
grep -r "@/components/ui" src/ 2>/dev/null | head -3

# 6. Intentar build con más información
echo ""
echo -e "${BLUE}🏗️  Intentando build con información detallada...${NC}"

echo "Ejecutando: npx next build --debug"
if npx next build --debug 2>&1 | head -20; then
    echo -e "${GREEN}✅ Build exitoso${NC}"
else
    echo -e "${RED}❌ Build falló - ver errores arriba${NC}"
fi

echo ""
echo "============================================="
echo -e "${BLUE}📋 RESUMEN DEL DIAGNÓSTICO${NC}"
echo "============================================="

# Sugerencias
echo ""
echo -e "${YELLOW}💡 POSIBLES SOLUCIONES:${NC}"
echo ""
echo "1. Reinstalar dependencias:"
echo "   rm -rf node_modules package-lock.json"
echo "   npm install"
echo ""
echo "2. Limpiar cache de Next.js:"
echo "   rm -rf .next"
echo "   npm run build"
echo ""
echo "3. Verificar configuración de TypeScript:"
echo "   npx tsc --noEmit"
echo ""
echo "4. Verificar que todos los archivos UI existan:"
echo "   ls -la src/components/ui/"
echo ""
echo "5. Si persisten los errores, revisar manualmente:"
echo "   - src/app/(dashboard)/ai-query/page.tsx"
echo "   - src/lib/actions.ts"
echo "   - tsconfig.json"