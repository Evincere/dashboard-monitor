#!/usr/bin/env node

/**
 * Script para ejecutar todos los tests del proyecto con informes detallados
 * Este script ejecuta diferentes tipos de tests y genera un informe completo
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = {
      validations: { passed: 0, failed: 0, skipped: 0 },
      api: { passed: 0, failed: 0, skipped: 0 },
      components: { passed: 0, failed: 0, skipped: 0 },
      integration: { passed: 0, failed: 0, skipped: 0 },
      total: { passed: 0, failed: 0, skipped: 0 }
    };
    this.startTime = Date.now();
  }

  async runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      console.log(`🔄 Ejecutando: ${command} ${args.join(' ')}`);
      
      const process = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data); // Mostrar output en tiempo real
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          resolve({ stdout, stderr, code }); // No rechazar para continuar con otros tests
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  parseJestOutput(output) {
    const stats = {
      passed: 0,
      failed: 0,
      skipped: 0
    };

    // Parsear resultados de Jest
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);

    if (passedMatch) stats.passed = parseInt(passedMatch[1]);
    if (failedMatch) stats.failed = parseInt(failedMatch[1]);
    if (skippedMatch) stats.skipped = parseInt(skippedMatch[1]);

    return stats;
  }

  async runValidationTests() {
    console.log('\n📋 === EJECUTANDO TESTS DE VALIDACIONES ===\n');
    
    try {
      const result = await this.runCommand('npm', ['run', 'test:jest', '--', '__tests__/validations/', '--verbose']);
      const stats = this.parseJestOutput(result.stdout);
      this.results.validations = stats;
      
      console.log(`\n✅ Tests de validaciones completados:`);
      console.log(`   Passed: ${stats.passed}`);
      console.log(`   Failed: ${stats.failed}`);
      console.log(`   Skipped: ${stats.skipped}`);
      
      return result.code === 0;
    } catch (error) {
      console.error('❌ Error ejecutando tests de validaciones:', error.message);
      return false;
    }
  }

  async runApiTests() {
    console.log('\n🔌 === EJECUTANDO TESTS DE API ===\n');
    
    try {
      const result = await this.runCommand('npm', ['run', 'test:jest', '--', '__tests__/api/', '--verbose']);
      const stats = this.parseJestOutput(result.stdout);
      this.results.api = stats;
      
      console.log(`\n✅ Tests de API completados:`);
      console.log(`   Passed: ${stats.passed}`);
      console.log(`   Failed: ${stats.failed}`);
      console.log(`   Skipped: ${stats.skipped}`);
      
      return result.code === 0;
    } catch (error) {
      console.error('❌ Error ejecutando tests de API:', error.message);
      return false;
    }
  }

  async runComponentTests() {
    console.log('\n🧩 === EJECUTANDO TESTS DE COMPONENTES ===\n');
    
    try {
      const result = await this.runCommand('npm', ['run', 'test:jest', '--', '__tests__/components/', '--verbose']);
      const stats = this.parseJestOutput(result.stdout);
      this.results.components = stats;
      
      console.log(`\n✅ Tests de componentes completados:`);
      console.log(`   Passed: ${stats.passed}`);
      console.log(`   Failed: ${stats.failed}`);
      console.log(`   Skipped: ${stats.skipped}`);
      
      return result.code === 0;
    } catch (error) {
      console.error('❌ Error ejecutando tests de componentes:', error.message);
      return false;
    }
  }

  async runIntegrationTests() {
    console.log('\n🔄 === EJECUTANDO TESTS DE INTEGRACIÓN E2E ===\n');
    
    try {
      const result = await this.runCommand('npm', ['run', 'test:jest', '--', '__tests__/integration/', '--verbose']);
      const stats = this.parseJestOutput(result.stdout);
      this.results.integration = stats;
      
      console.log(`\n✅ Tests de integración completados:`);
      console.log(`   Passed: ${stats.passed}`);
      console.log(`   Failed: ${stats.failed}`);
      console.log(`   Skipped: ${stats.skipped}`);
      
      return result.code === 0;
    } catch (error) {
      console.error('❌ Error ejecutando tests de integración:', error.message);
      return false;
    }
  }

  async runCoverageReport() {
    console.log('\n📊 === GENERANDO REPORTE DE COBERTURA ===\n');
    
    try {
      const result = await this.runCommand('npm', ['run', 'test:jest:coverage']);
      
      if (result.code === 0) {
        console.log('✅ Reporte de cobertura generado exitosamente');
        console.log('📁 Reporte disponible en: ./coverage/lcov-report/index.html');
      } else {
        console.log('⚠️  Reporte de cobertura completado con advertencias');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error generando reporte de cobertura:', error.message);
      return false;
    }
  }

  calculateTotals() {
    const categories = ['validations', 'api', 'components', 'integration'];
    
    categories.forEach(category => {
      this.results.total.passed += this.results[category].passed;
      this.results.total.failed += this.results[category].failed;
      this.results.total.skipped += this.results[category].skipped;
    });
  }

  generateReport() {
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);
    
    this.calculateTotals();
    
    const report = `
    
🧪 === REPORTE COMPLETO DE PRUEBAS ===

⏱️  Tiempo total de ejecución: ${duration} segundos

📋 RESUMEN POR CATEGORÍA:
╭─────────────────┬─────────┬─────────┬──────────╮
│ Categoría       │ Passed  │ Failed  │ Skipped  │
├─────────────────┼─────────┼─────────┼──────────┤
│ Validaciones    │ ${String(this.results.validations.passed).padEnd(7)} │ ${String(this.results.validations.failed).padEnd(7)} │ ${String(this.results.validations.skipped).padEnd(8)} │
│ API             │ ${String(this.results.api.passed).padEnd(7)} │ ${String(this.results.api.failed).padEnd(7)} │ ${String(this.results.api.skipped).padEnd(8)} │
│ Componentes     │ ${String(this.results.components.passed).padEnd(7)} │ ${String(this.results.components.failed).padEnd(7)} │ ${String(this.results.components.skipped).padEnd(8)} │
│ Integración     │ ${String(this.results.integration.passed).padEnd(7)} │ ${String(this.results.integration.failed).padEnd(7)} │ ${String(this.results.integration.skipped).padEnd(8)} │
├─────────────────┼─────────┼─────────┼──────────┤
│ TOTAL           │ ${String(this.results.total.passed).padEnd(7)} │ ${String(this.results.total.failed).padEnd(7)} │ ${String(this.results.total.skipped).padEnd(8)} │
╰─────────────────┴─────────┴─────────┴──────────╯

🎯 RESULTADO GENERAL:
${this.results.total.failed === 0 ? '✅ TODOS LOS TESTS PASARON' : '❌ ALGUNOS TESTS FALLARON'}

📈 ESTADÍSTICAS:
• Tests ejecutados: ${this.results.total.passed + this.results.total.failed + this.results.total.skipped}
• Tasa de éxito: ${this.results.total.passed + this.results.total.failed > 0 ? 
  ((this.results.total.passed / (this.results.total.passed + this.results.total.failed)) * 100).toFixed(1) : 0}%
• Cobertura: Consulta ./coverage/lcov-report/index.html

🛠️  SIGUIENTES PASOS:
${this.results.total.failed > 0 ? 
  '• Revisar tests fallidos y corregir problemas\n• Re-ejecutar tests específicos: npm run test:jest -- <archivo-de-test>' : 
  '• Sistema listo para deployment\n• Considerar agregar más tests para nuevas funcionalidades'}

📝 ARCHIVOS DE REPORTE:
• Reporte HTML: ./test-report/report.html
• Cobertura HTML: ./coverage/lcov-report/index.html
• Logs detallados: Salida de consola arriba

`;

    console.log(report);

    // Guardar reporte en archivo
    const reportPath = path.join(process.cwd(), 'test-results.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`💾 Reporte guardado en: ${reportPath}`);

    return this.results.total.failed === 0;
  }

  async run() {
    console.log('🚀 === INICIANDO SUITE COMPLETA DE PRUEBAS ===\n');
    console.log('Este proceso ejecutará todos los tests del sistema de concursos:');
    console.log('• Tests de validaciones (frontend y backend)');
    console.log('• Tests de API (CRUD y manejo de errores)');
    console.log('• Tests de componentes React');
    console.log('• Tests de integración E2E');
    console.log('• Reporte de cobertura de código\n');

    // Ejecutar cada categoría de tests
    await this.runValidationTests();
    await this.runApiTests();
    await this.runComponentTests();
    await this.runIntegrationTests();
    
    // Generar reporte de cobertura
    await this.runCoverageReport();
    
    // Generar reporte final
    const success = this.generateReport();
    
    process.exit(success ? 0 : 1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const runner = new TestRunner();
  runner.run().catch(error => {
    console.error('💥 Error fatal ejecutando tests:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;
