#!/usr/bin/env node

/**
 * Script para probar datos de documentos y verificar si el modal se debería abrir
 */

const testDocumentStates = [
  // Escenario 1: Todos los documentos obligatorios aprobados
  {
    name: "Todos obligatorios aprobados",
    documents: [
      { id: "1", documentType: "DNI Frontal", isRequired: true, validationStatus: "APPROVED" },
      { id: "2", documentType: "DNI Dorso", isRequired: true, validationStatus: "APPROVED" },
      { id: "3", documentType: "Título Universitario", isRequired: true, validationStatus: "APPROVED" },
      { id: "4", documentType: "Documento Adicional", isRequired: false, validationStatus: "PENDING" }
    ]
  },
  // Escenario 2: Algunos obligatorios pendientes
  {
    name: "Algunos obligatorios pendientes",
    documents: [
      { id: "1", documentType: "DNI Frontal", isRequired: true, validationStatus: "APPROVED" },
      { id: "2", documentType: "DNI Dorso", isRequired: true, validationStatus: "PENDING" },
      { id: "3", documentType: "Título Universitario", isRequired: true, validationStatus: "APPROVED" },
      { id: "4", documentType: "Documento Adicional", isRequired: false, validationStatus: "PENDING" }
    ]
  },
  // Escenario 3: Algunos obligatorios rechazados
  {
    name: "Algunos obligatorios rechazados",
    documents: [
      { id: "1", documentType: "DNI Frontal", isRequired: true, validationStatus: "APPROVED" },
      { id: "2", documentType: "DNI Dorso", isRequired: true, validationStatus: "REJECTED" },
      { id: "3", documentType: "Título Universitario", isRequired: true, validationStatus: "APPROVED" },
      { id: "4", documentType: "Documento Adicional", isRequired: false, validationStatus: "PENDING" }
    ]
  },
  // Escenario 4: Mixto (algunos aprobados, algunos rechazados)
  {
    name: "Mixto - algunos aprobados, algunos rechazados",
    documents: [
      { id: "1", documentType: "DNI Frontal", isRequired: true, validationStatus: "APPROVED" },
      { id: "2", documentType: "DNI Dorso", isRequired: true, validationStatus: "REJECTED" },
      { id: "3", documentType: "Título Universitario", isRequired: true, validationStatus: "APPROVED" },
      { id: "4", documentType: "Certificado Analítico", isRequired: true, validationStatus: "REJECTED" },
      { id: "5", documentType: "Documento Adicional", isRequired: false, validationStatus: "PENDING" }
    ]
  }
];

function checkShouldShowModal(documents) {
  const requiredDocs = documents.filter(doc => doc.isRequired);
  const allRequiredValidated = requiredDocs.length > 0 && requiredDocs.every(doc => doc.validationStatus !== "PENDING");
  
  return {
    requiredDocs: requiredDocs.length,
    allRequiredValidated,
    shouldShowModal: allRequiredValidated,
    approvedRequired: requiredDocs.filter(doc => doc.validationStatus === "APPROVED").length,
    rejectedRequired: requiredDocs.filter(doc => doc.validationStatus === "REJECTED").length,
    pendingRequired: requiredDocs.filter(doc => doc.validationStatus === "PENDING").length
  };
}

function main() {
  console.log('🧪 Testing Document Modal Logic');
  console.log('================================\n');

  testDocumentStates.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.name}`);
    console.log('   Documents:');
    scenario.documents.forEach(doc => {
      const icon = doc.validationStatus === 'APPROVED' ? '✅' : 
                   doc.validationStatus === 'REJECTED' ? '❌' : '⏳';
      const required = doc.isRequired ? '[OBLIGATORIO]' : '[OPCIONAL]';
      console.log(`   ${icon} ${doc.documentType} ${required} - ${doc.validationStatus}`);
    });
    
    const result = checkShouldShowModal(scenario.documents);
    console.log('\n   Analysis:');
    console.log(`   - Documentos obligatorios: ${result.requiredDocs}`);
    console.log(`   - Aprobados: ${result.approvedRequired}`);
    console.log(`   - Rechazados: ${result.rejectedRequired}`);
    console.log(`   - Pendientes: ${result.pendingRequired}`);
    console.log(`   - Todos obligatorios validados: ${result.allRequiredValidated}`);
    console.log(`   - 🎯 MODAL DEBE APARECER: ${result.shouldShowModal ? '✅ SÍ' : '❌ NO'}`);
    
    console.log('\n' + '-'.repeat(60) + '\n');
  });

  console.log('💡 Conclusión:');
  console.log('El modal debe aparecer cuando todos los documentos obligatorios');
  console.log('han sido validados (APPROVED o REJECTED), sin importar el estado');
  console.log('de los documentos opcionales.');
}

main();
