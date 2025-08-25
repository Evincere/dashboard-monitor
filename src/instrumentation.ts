// ================================================
// NEXT.JS INSTRUMENTATION - SSR POLYFILLS
// ================================================

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import the polyfill for server-side rendering
    await import('./lib/canvas-polyfill');
  }
}
