// ================================================
// STABLE ID GENERATOR - SERVIDOR/CLIENTE CONSISTENTE
// ================================================

let counter = 0;

/**
 * Genera un ID único que es consistente entre servidor y cliente
 * basado en un timestamp y un contador secuencial
 */
export function generateStableId(prefix: string = 'id'): string {
    const timestamp = Date.now();
    counter = (counter + 1) % 1000000;
    return `${prefix}-${timestamp}-${counter.toString().padStart(6, '0')}`;
}

/**
 * Genera un UUID v4 de forma segura, usando crypto.randomUUID() cuando está disponible
 */
export function generateUUID(): string {
    if (typeof window !== 'undefined' && window.crypto) {
        return window.crypto.randomUUID();
    }

    // Fallback usando timestamp y número aleatorio
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `${timestamp}-${random}-${counter++}`;
}
