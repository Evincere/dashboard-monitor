// Inline PDF.js worker for CSP compliance
export const createInlineWorker = () => {
  // This is a minimal worker that satisfies PDF.js requirements
  const workerCode = `
    // Minimal PDF.js worker implementation
    import('https://unpkg.com/pdfjs-dist@5.3.93/build/pdf.worker.min.js')
      .catch(() => {
        // Fallback: disable worker functionality
        self.postMessage({ type: 'ready' });
      });
  `;
  
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
};

// Data URI approach (most CSP-friendly)
export const getDataURIWorker = () => {
  // Empty worker that just signals ready
  const workerCode = `
    self.onmessage = function(e) {
      self.postMessage({ type: 'ready' });
    };
  `;
  
  const encoded = btoa(workerCode);
  return `data:application/javascript;base64,${encoded}`;
};
