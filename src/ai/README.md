# Sistema Agnóstico de Proveedores de IA

Este sistema proporciona una abstracción unificada para trabajar con múltiples proveedores de IA (Gemini, OpenAI, Claude) de manera intercambiable.

## Características

- **Múltiples proveedores**: Soporte para Gemini, OpenAI y Claude
- **Configuración flexible**: Configuración a través de variables de entorno
- **Interfaz unificada**: API consistente independientemente del proveedor
- **Fallback automático**: Cambio automático a proveedores disponibles
- **Validación de configuración**: Verificación automática de claves de API
- **Compatibilidad con Genkit**: Migración transparente desde Genkit

## Configuración

### Variables de Entorno

```bash
# Proveedor por defecto (opcional)
AI_PROVIDER=gemini|openai|claude

# Google Gemini
GOOGLE_GENAI_API_KEY=tu_clave_de_gemini
GEMINI_MODEL=gemini-2.0-flash  # opcional

# OpenAI
OPENAI_API_KEY=tu_clave_de_openai
OPENAI_MODEL=gpt-4o-mini  # opcional

# Claude (Anthropic)
ANTHROPIC_API_KEY=tu_clave_de_claude
CLAUDE_MODEL=claude-3-5-sonnet-20241022  # opcional
```

### Uso Básico

```typescript
import { ai } from '@/ai/unified';

// Generar texto simple
const response = await ai.generate('¿Cuál es la capital de España?');

// Generar con esquema estructurado
const result = await ai.generateWithSchema(
  'Analiza este texto y extrae información',
  z.object({
    sentiment: z.string(),
    keywords: z.array(z.string())
  })
);

// Usar un proveedor específico
const response = await ai.generate('Pregunta', { 
  provider: 'openai',
  temperature: 0.7 
});
```

### Definir Prompts Reutilizables

```typescript
const translatePrompt = ai.definePrompt({
  name: 'translateText',
  input: { schema: z.object({ text: z.string(), language: z.string() }) },
  output: { schema: z.object({ translation: z.string() }) },
  prompt: 'Traduce el siguiente texto a {{{language}}}: {{{text}}}',
  config: { temperature: 0.3 }
});

const { output } = await translatePrompt({ 
  text: 'Hello world', 
  language: 'español' 
});
```

### Definir Flujos

```typescript
const processQuery = ai.defineFlow(
  {
    name: 'processQuery',
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.object({ result: z.string() })
  },
  async ({ query }) => {
    // Lógica de procesamiento
    const result = await ai.generate(`Procesa esta consulta: ${query}`);
    return { result };
  }
);
```

## Gestión de Proveedores

### Información de Estado

```typescript
import { getProviderStatus, validateAIConfig } from '@/ai/config';

// Obtener estado de proveedores
const status = getProviderStatus();
console.log('Proveedor por defecto:', status.defaultProvider);
console.log('Proveedores disponibles:', status.availableProviders);

// Validar configuración
const validation = validateAIConfig();
if (!validation.valid) {
  console.error('Errores:', validation.errors);
}
```

### Cambiar Proveedor por Defecto

```typescript
import { ai } from '@/ai/unified';

// Cambiar proveedor por defecto
ai.setDefaultProvider('openai');

// Obtener información de proveedores
const info = ai.getProviderInfo();
```

## Migración desde Genkit

El sistema es compatible con la API de Genkit existente:

### Antes (Genkit)
```typescript
import { ai } from '@/ai/genkit';

const response = await ai.generate({
  prompt: 'Mi pregunta',
  config: { temperature: 0.7 }
});
```

### Después (Unificado)
```typescript
import { ai } from '@/ai/unified';

const response = await ai.generate('Mi pregunta', {
  temperature: 0.7
});
```

## API Reference

### UnifiedAI

#### `generate(prompt: string, options?: UnifiedAIOptions): Promise<string>`
Genera texto usando el proveedor por defecto o especificado.

#### `generateWithSchema<T>(prompt: string, schema: ZodSchema<T>, options?: UnifiedAIOptions): Promise<T>`
Genera respuesta estructurada que cumple con el esquema Zod proporcionado.

#### `definePrompt(config): Function`
Define un prompt reutilizable con validación de entrada y salida.

#### `defineFlow(config, handler): Function`
Define un flujo de procesamiento con validación de esquemas.

#### `getProviderInfo(): ProviderInfo`
Obtiene información sobre proveedores disponibles y configuración actual.

#### `setDefaultProvider(provider: SupportedProvider): void`
Cambia el proveedor por defecto.

### Opciones

```typescript
interface UnifiedAIOptions {
  provider?: 'gemini' | 'openai' | 'claude';
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}
```

## Proveedores Soportados

### Gemini (Google AI)
- **Modelos**: gemini-2.0-flash, gemini-1.5-pro
- **Características**: Respuestas rápidas, soporte JSON nativo
- **Configuración**: `GOOGLE_GENAI_API_KEY`

### OpenAI
- **Modelos**: gpt-4o-mini, gpt-4o, gpt-3.5-turbo
- **Características**: Amplio conocimiento, buena calidad
- **Configuración**: `OPENAI_API_KEY`

### Claude (Anthropic)
- **Modelos**: claude-3-5-sonnet-20241022, claude-3-haiku
- **Características**: Análisis detallado, respuestas largas
- **Configuración**: `ANTHROPIC_API_KEY`

## Manejo de Errores

```typescript
try {
  const response = await ai.generate('Mi pregunta');
} catch (error) {
  if (error.message.includes('not configured')) {
    // Proveedor no configurado
  } else if (error.message.includes('API error')) {
    // Error de API del proveedor
  }
}
```

## Mejores Prácticas

1. **Configurar múltiples proveedores** para redundancia
2. **Usar variables de entorno** para claves de API
3. **Validar configuración** al inicio de la aplicación
4. **Manejar errores** apropiadamente
5. **Usar esquemas Zod** para respuestas estructuradas
6. **Configurar temperatura** según el caso de uso

## Troubleshooting

### Error: "No AI providers are configured"
- Verificar que al menos una clave de API esté configurada
- Revisar nombres de variables de entorno

### Error: "Provider 'X' is not configured"
- Verificar que la clave de API del proveedor esté configurada
- Verificar que el proveedor esté habilitado

### Error: "Failed to parse response as valid JSON"
- Verificar que el esquema Zod sea apropiado
- Reducir la temperatura para respuestas más consistentes
- Verificar que el prompt sea claro sobre el formato esperado