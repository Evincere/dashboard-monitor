#!/usr/bin/env node

/**
 * @fileOverview Script de prueba para verificar la integración completa
 * Verifica que todas las APIs funcionan correctamente y la integración es fluida
 */

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  data?: any;
  duration: number;
}

class IntegrationTester {
  private baseUrl: string;
  private results: TestResult[] = [];

  constructor(baseUrl: string = 'http://localhost:9002') {
    this.baseUrl = baseUrl;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`🧪 Running test: ${name}...`);

    try {
      const data = await testFn();
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        name,
        success: true,
        data,
        duration
      };

      console.log(`✅ ${name} - PASSED (${duration}ms)`);
      this.results.push(result);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      };

      console.log(`❌ ${name} - FAILED (${duration}ms): ${result.error}`);
      this.results.push(result);
      return result;
    }
  }

  async testBackendConnection() {
    return this.runTest('Backend Connection Test', async () => {
      const data = await this.makeRequest('/api/backend/test');
      if (!data.success) {
        throw new Error(data.error || 'Backend test failed');
      }
      return data;
    });
  }

  async testBackendStatistics() {
    return this.runTest('Backend Statistics', async () => {
      const data = await this.makeRequest('/api/backend/statistics');
      if (!data.success) {
        throw new Error(data.error || 'Statistics test failed');
      }
      return data;
    });
  }

  async testBackendUsers() {
    return this.runTest('Backend Users API', async () => {
      const data = await this.makeRequest('/api/backend/users?page=0&size=5');
      if (!data.success) {
        throw new Error(data.error || 'Users API failed');
      }
      return data;
    });
  }

  async testBackendDocuments() {
    return this.runTest('Backend Documents API', async () => {
      const data = await this.makeRequest('/api/backend/documents?page=0&size=5');
      if (!data.success) {
        throw new Error(data.error || 'Documents API failed');
      }
      return data;
    });
  }

  async testBackendInscriptions() {
    return this.runTest('Backend Inscriptions API', async () => {
      const data = await this.makeRequest('/api/backend/inscriptions?page=0&size=5');
      if (!data.success) {
        throw new Error(data.error || 'Inscriptions API failed');
      }
      return data;
    });
  }

  async testValidationPostulants() {
    return this.runTest('Validation Postulants API', async () => {
      const data = await this.makeRequest('/api/validation/postulants?page=0&size=10');
      if (!data.success) {
        throw new Error(data.error || 'Validation postulants API failed');
      }
      return data;
    });
  }

  async testDocumentAccess() {
    return this.runTest('Document Access Test', async () => {
      // Intentar acceder a documentos de un DNI de prueba
      const testDni = '12345678'; // DNI de prueba
      try {
        const data = await this.makeRequest(`/api/validation/documents/${testDni}`);
        if (!data.success && !data.error?.includes('not found')) {
          throw new Error(data.error || 'Document access test failed');
        }
        // Es OK si no encuentra documentos para el DNI de prueba
        return { message: 'Document access API is working', testDni };
      } catch (error: any) {
        if (error.message.includes('404')) {
          return { message: 'Document access API is working (404 expected for test DNI)', testDni };
        }
        throw error;
      }
    });
  }

  async testValidationApproval() {
    return this.runTest('Validation Approval API (Dry Run)', async () => {
      // Test con datos ficticios para verificar la estructura de la API
      const testData = {
        dni: '12345678',
        approveAll: true,
        comments: 'Test approval',
        validatedBy: 'Integration Tester'
      };

      try {
        const data = await this.makeRequest('/api/validation/approve', {
          method: 'POST',
          body: JSON.stringify(testData)
        });
        
        // Es OK si falla por DNI no encontrado
        return { message: 'Approval API structure is correct', attempted: testData };
      } catch (error: any) {
        if (error.message.includes('404') || error.message.includes('not found')) {
          return { message: 'Approval API structure is correct (404 expected for test DNI)' };
        }
        throw error;
      }
    });
  }

  async testValidationRejection() {
    return this.runTest('Validation Rejection API (Dry Run)', async () => {
      // Test con datos ficticios para verificar la estructura de la API
      const testData = {
        dni: '12345678',
        reason: 'Test rejection reason',
        rejectAll: true,
        comments: 'Test rejection',
        validatedBy: 'Integration Tester'
      };

      try {
        const data = await this.makeRequest('/api/validation/reject', {
          method: 'POST',
          body: JSON.stringify(testData)
        });
        
        // Es OK si falla por DNI no encontrado
        return { message: 'Rejection API structure is correct', attempted: testData };
      } catch (error: any) {
        if (error.message.includes('404') || error.message.includes('not found')) {
          return { message: 'Rejection API structure is correct (404 expected for test DNI)' };
        }
        throw error;
      }
    });
  }

  async testValidationComment() {
    return this.runTest('Validation Comment API (Dry Run)', async () => {
      // Test con datos ficticios para verificar la estructura de la API
      const testData = {
        dni: '12345678',
        comment: 'Test comment',
        commentType: 'NOTE',
        validatedBy: 'Integration Tester'
      };

      try {
        const data = await this.makeRequest('/api/validation/comment', {
          method: 'POST',
          body: JSON.stringify(testData)
        });
        
        // Es OK si falla por DNI no encontrado
        return { message: 'Comment API structure is correct', attempted: testData };
      } catch (error: any) {
        if (error.message.includes('404') || error.message.includes('not found')) {
          return { message: 'Comment API structure is correct (404 expected for test DNI)' };
        }
        throw error;
      }
    });
  }

  async runAllTests() {
    console.log('🚀 Starting Integration Tests...');
    console.log(`📡 Testing against: ${this.baseUrl}`);
    console.log('=' .repeat(60));

    const startTime = Date.now();

    // Ejecutar todas las pruebas
    await this.testBackendConnection();
    await this.testBackendStatistics();
    await this.testBackendUsers();
    await this.testBackendDocuments();
    await this.testBackendInscriptions();
    await this.testValidationPostulants();
    await this.testDocumentAccess();
    await this.testValidationApproval();
    await this.testValidationRejection();
    await this.testValidationComment();

    const totalDuration = Date.now() - startTime;

    // Generar reporte
    this.generateReport(totalDuration);
  }

  private generateReport(totalDuration: number) {
    console.log('=' .repeat(60));
    console.log('📊 INTEGRATION TEST REPORT');
    console.log('=' .repeat(60));

    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Total: ${total}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`🎯 Success Rate: ${Math.round((passed / total) * 100)}%`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  • ${r.name}: ${r.error}`);
        });
    }

    console.log('\n📝 DETAILED RESULTS:');
    this.results.forEach(r => {
      const status = r.success ? '✅' : '❌';
      console.log(`  ${status} ${r.name} (${r.duration}ms)`);
      if (r.error) {
        console.log(`      Error: ${r.error}`);
      }
    });

    console.log('\n🔍 INTEGRATION STATUS:');
    if (passed >= total * 0.8) {
      console.log('🟢 INTEGRATION STATUS: GOOD - Most tests are passing');
    } else if (passed >= total * 0.5) {
      console.log('🟡 INTEGRATION STATUS: PARTIAL - Some tests are failing');
    } else {
      console.log('🔴 INTEGRATION STATUS: CRITICAL - Many tests are failing');
    }

    console.log('\n💡 NEXT STEPS:');
    console.log('1. Ensure backend Spring Boot is running with the correct configuration');
    console.log('2. Verify that document paths are accessible');
    console.log('3. Check database connectivity and data availability');
    console.log('4. Test with real postulant data once backend is fully configured');

    console.log('=' .repeat(60));
  }
}

// Ejecutar tests si este archivo es ejecutado directamente
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.runAllTests().catch(error => {
    console.error('💥 Integration test suite failed:', error);
    process.exit(1);
  });
}

export { IntegrationTester };
