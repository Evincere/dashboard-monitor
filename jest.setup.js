// Optional: configure or set up a testing framework before each test.
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...props} />
  },
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  __esModule: true,
  AlertCircle: (props) => <svg {...props} data-testid="alert-circle-icon" />,
  CheckCircle: (props) => <svg {...props} data-testid="check-circle-icon" />,
  Info: (props) => <svg {...props} data-testid="info-icon" />,
  AlertTriangle: (props) => <svg {...props} data-testid="alert-triangle-icon" />,
  ChevronDown: (props) => <svg {...props} data-testid="chevron-down-icon" />,
  Check: (props) => <svg {...props} data-testid="check-icon" />,
  Users: (props) => <svg {...props} data-testid="users-icon" />,
  FileText: (props) => <svg {...props} data-testid="file-text-icon" />,
  Calendar: (props) => <svg {...props} data-testid="calendar-icon" />,
  TrendingUp: (props) => <svg {...props} data-testid="trending-up-icon" />,
  Activity: (props) => <svg {...props} data-testid="activity-icon" />,
}))

// Mock class-variance-authority
jest.mock('class-variance-authority', () => ({
  __esModule: true,
  cva: jest.fn((base, config) => {
    return jest.fn((props = {}) => {
      // Simple mock that returns base classes plus variant classes
      const { type } = props;
      if (type === 'error') return 'flex items-center gap-2 text-sm font-medium animate-fade-in text-red-600';
      if (type === 'success') return 'flex items-center gap-2 text-sm font-medium animate-fade-in text-green-600';
      if (type === 'warning') return 'flex items-center gap-2 text-sm font-medium animate-fade-in text-yellow-600';
      if (type === 'info') return 'flex items-center gap-2 text-sm font-medium animate-fade-in text-blue-600';
      return base || 'flex items-center gap-2 text-sm font-medium animate-fade-in text-red-600';
    });
  }),
  type: jest.fn(),
}));

// Mock para iconVariants específicamente
jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));

// Mock fetch globally
global.fetch = jest.fn(() => {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  });
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock window.matchMedia (only in jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock de FileReader para tests de archivos
global.FileReader = class FileReader {
  constructor() {
    this.readyState = 0;
    this.result = null;
    this.error = null;
    this.onload = null;
    this.onerror = null;
    this.onabort = null;
    this.onloadstart = null;
    this.onloadend = null;
    this.onprogress = null;
  }

  readAsDataURL(file) {
    this.readyState = 2;
    this.result = `data:${file.type};base64,fake-base64-data`;
    if (this.onload) {
      this.onload({ target: this });
    }
  }

  readAsText(file) {
    this.readyState = 2;
    this.result = 'fake-file-content';
    if (this.onload) {
      this.onload({ target: this });
    }
  }

  abort() {
    this.readyState = 2;
    if (this.onabort) {
      this.onabort({ target: this });
    }
  }
};

// Mock de FormData
global.FormData = class FormData {
  constructor() {
    this.data = {};
  }

  append(key, value, filename) {
    if (!this.data[key]) {
      this.data[key] = [];
    }
    this.data[key].push({ value, filename });
  }

  get(key) {
    const entries = this.data[key];
    return entries ? entries[0].value : null;
  }

  getAll(key) {
    const entries = this.data[key];
    return entries ? entries.map(entry => entry.value) : [];
  }

  has(key) {
    return key in this.data;
  }

  set(key, value, filename) {
    this.data[key] = [{ value, filename }];
  }

  delete(key) {
    delete this.data[key];
  }

  keys() {
    return Object.keys(this.data);
  }

  values() {
    return Object.keys(this.data).map(key => this.data[key][0].value);
  }

  entries() {
    return Object.keys(this.data).map(key => [key, this.data[key][0].value]);
  }

  forEach(callback) {
    Object.keys(this.data).forEach(key => {
      callback(this.data[key][0].value, key, this);
    });
  }
};

// Mock de Blob
global.Blob = class Blob {
  constructor(parts = [], options = {}) {
    this.parts = parts;
    this.type = options.type || '';
    this.size = parts.reduce((size, part) => size + (part.length || 0), 0);
  }

  slice(start = 0, end = this.size, contentType = '') {
    return new Blob(this.parts.slice(start, end), { type: contentType });
  }

  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size));
  }

  text() {
    return Promise.resolve(this.parts.join(''));
  }
};

// Mock de URL.createObjectURL y URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock de sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Cleanup después de cada test
afterEach(() => {
  jest.clearAllMocks();
  
  // Limpiar fetch mock
  if (global.fetch.mockClear) {
    global.fetch.mockClear();
  }
  
  // Limpiar localStorage mock
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  // Limpiar sessionStorage mock
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
});
