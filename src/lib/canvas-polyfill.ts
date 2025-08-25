// ================================================
// CANVAS POLYFILL FOR SSR
// ================================================

// Polyfill for DOMMatrix in SSR environment
if (typeof window === 'undefined') {
  // Server-side polyfills
  (global as any).DOMMatrix = class DOMMatrix {
    constructor() {
      // Mock implementation for SSR
    }
    
    static fromFloat32Array() {
      return new DOMMatrix();
    }
    
    static fromFloat64Array() {
      return new DOMMatrix();
    }
    
    static fromMatrix() {
      return new DOMMatrix();
    }
  };
  
  (global as any).OffscreenCanvas = class OffscreenCanvas {
    constructor() {
      // Mock implementation for SSR
    }
  };
}

export {};
