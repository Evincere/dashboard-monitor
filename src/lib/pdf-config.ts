// PDF.js configuration for CSP compliance
import { pdfjs } from 'react-pdf';

// Configure PDF.js to work without workers (CSP-safe)
export function configurePDFWithoutWorkers() {
  if (typeof window !== 'undefined') {
    // Disable workers completely for CSP compliance
    pdfjs.GlobalWorkerOptions.workerSrc = '';
    
    // Alternative: use inline worker
    pdfjs.GlobalWorkerOptions.workerPort = null;
    
    console.log('📄 PDF.js configured in no-worker mode for CSP compliance');
  }
}
