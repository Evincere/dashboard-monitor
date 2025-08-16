/** @type {import('jest').Config} */
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // if using TypeScript with a baseUrl set to the root directory then you need the below for alias' to work
  moduleDirectories: ['node_modules', '<rootDir>/'],
  
  // Handle module aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@api/(.*)$': '<rootDir>/src/app/api/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
  },
  
  testEnvironment: 'jest-environment-jsdom',
  
  // Ignore patterns
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Test patterns - exclude files that use Vitest for now
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/tests/**/*.{js,jsx,ts,tsx}',
  ],
  
  // Ignore tests that use Vitest imports
  testPathIgnorePatterns: [
    '<rootDir>/.next/', 
    '<rootDir>/node_modules/',
    '<rootDir>/src/__tests__/backups-api.test.ts',
    '<rootDir>/src/__tests__/dashboard-metrics-api.test.ts',
    '<rootDir>/src/__tests__/intelligent-query-router.test.ts',
    '<rootDir>/src/__tests__/embeddings-integration.test.ts',
    '<rootDir>/src/__tests__/persistent-memory-unit.test.ts',
    '<rootDir>/src/__tests__/user-management-api.test.ts',
    '<rootDir>/src/__tests__/persistent-memory.test.ts',
    '<rootDir>/src/__tests__/documents-download-api.test.ts',
    '<rootDir>/src/__tests__/specialized-prompting.test.ts',
    '<rootDir>/src/__tests__/schema-introspection.test.ts',
    '<rootDir>/src/__tests__/backups-integration.test.ts',
    '<rootDir>/src/__tests__/contextual-learning.test.ts',
    '<rootDir>/src/__tests__/security.test.ts',
    '<rootDir>/src/__tests__/user-api-integration.test.ts',
    '<rootDir>/src/__tests__/documents-api.test.ts',
    '<rootDir>/src/__tests__/contextual-learning-unit.test.ts',
    '<rootDir>/src/__tests__/performance-optimizations.test.ts',
    '<rootDir>/src/__tests__/embeddings.test.ts',
    '<rootDir>/src/__tests__/embeddings-basic.test.ts',
    '<rootDir>/src/__tests__/cache-utils.test.ts'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(lucide-react|.*\\.(mjs|jsx?|tsx?)$))',
  ],
  
  // Module paths
  modulePaths: ['<rootDir>/src'],
  
  // Module file extensions for importing
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Global test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Disable projects temporarily to fix module resolution
  // projects: [
  //   {
  //     displayName: 'jsdom',
  //     testEnvironment: 'jsdom',
  //     testMatch: [
  //       '<rootDir>/__tests__/components/**/*.test.{js,jsx,ts,tsx}',
  //       '<rootDir>/__tests__/pages/**/*.test.{js,jsx,ts,tsx}',
  //       '<rootDir>/__tests__/hooks/**/*.test.{js,jsx,ts,tsx}',
  //     ],
  //   },
  //   {
  //     displayName: 'node',
  //     testEnvironment: 'node',
  //     testMatch: [
  //       '<rootDir>/__tests__/api/**/*.test.{js,jsx,ts,tsx}',
  //       '<rootDir>/__tests__/utils/**/*.test.{js,jsx,ts,tsx}',
  //       '<rootDir>/__tests__/validations/**/*.test.{js,jsx,ts,tsx}',
  //       '<rootDir>/__tests__/integration/**/*.test.{js,jsx,ts,tsx}',
  //     ],
  //   },
  // ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
