import { apiUrl } from './utils';

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

export class FetchTimeoutError extends Error {
  constructor(message = 'La petición excedió el tiempo límite') {
    super(message);
    this.name = 'FetchTimeoutError';
  }
}

export class FetchRetryError extends Error {
  constructor(message = 'Se agotaron los reintentos') {
    super(message);
    this.name = 'FetchRetryError';
  }
}

export const fetchWithTimeout = async (
  url: string,
  options: FetchOptions = {}
): Promise<Response> => {
  const { timeout = 15000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchTimeoutError();
    }
    throw error;
  }
};

export const fetchWithRetry = async (
  url: string,
  options: FetchOptions = {}
): Promise<Response> => {
  const { retries = 3, ...fetchOptions } = options;
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      return await fetchWithTimeout(url, fetchOptions);
    } catch (error) {
      lastError = error as Error;
      if (i === retries - 1) break;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }

  throw new FetchRetryError(lastError?.message);
};

export const fetchValidationData = async (dni: string) => {
  console.log(`🔍 Iniciando fetchValidationData para DNI: ${dni}`);
  
  try {
    const response = await fetchWithRetry(apiUrl(`postulations/${dni}/documents`), {
      timeout: 15000,
      retries: 3,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'API returned success: false');
    }

    return result.data;
  } catch (error) {
    console.error('Error en fetchValidationData:', error);
    throw error;
  }
};
