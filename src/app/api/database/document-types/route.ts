import { NextRequest, NextResponse } from 'next/server';

/**
 * Document types endpoint with complete information
 * Returns document types with their requirements and document counts
 */

export async function GET(request: NextRequest) {
  try {
    // Return document types based on database analysis
    const documentTypes = [
      {
        id: "9A1230C71E4E431380D4BD4F21CD8C7F",
        code: "DNI_FRONTAL",
        name: "DNI (Frontal)",
        description: "Documento Nacional de Identidad - Lado frontal",
        required: true,
        order: 1,
        totalCount: 306,
        activeCount: 270,
        archivedCount: 36
      },
      {
        id: "2980B7A784E643F68D7C47AF4ACAF64B",
        code: "DNI_DORSO", 
        name: "DNI (Dorso)",
        description: "Documento Nacional de Identidad - Lado posterior",
        required: true,
        order: 2,
        totalCount: 326,
        activeCount: 270,
        archivedCount: 56
      },
      {
        id: "99EECC88ABCA4086B9E5CE6F63EECAB7",
        code: "CONSTANCIA_CUIL",
        name: "Constancia de CUIL", 
        description: "Constancia de Código Único de Identificación Laboral",
        required: true,
        order: 3,
        totalCount: 298,
        activeCount: 271,
        archivedCount: 27
      },
      {
        id: "9FA271051CDE476989CB08587C92E930",
        code: "ANTECEDENTES_PENALES",
        name: "Certificado de Antecedentes Penales",
        description: "Certificado de Antecedentes Penales vigente (antigüedad no mayor a 90 días)",
        required: true,
        order: 4,
        totalCount: 307,
        activeCount: 263,
        archivedCount: 44
      },
      {
        id: "8C5FE4A7982D429081332CA24881A3B1", 
        code: "CERTIFICADO_PROFESIONAL_ANTIGUEDAD",
        name: "Certificado de Antigüedad Profesional",
        description: "Certificado de antigüedad en el ejercicio profesional",
        required: true,
        order: 5,
        totalCount: 306,
        activeCount: 262,
        archivedCount: 44
      },
      {
        id: "E0022DE6F70D44A5930666F7059959D8",
        code: "CERTIFICADO_SIN_SANCIONES", 
        name: "Certificado Sin Sanciones Disciplinarias",
        description: "Certificado que acredite no registrar sanciones disciplinarias",
        required: true,
        order: 6,
        totalCount: 295,
        activeCount: 261,
        archivedCount: 34
      },
      {
        id: "EF5DEB6BAB24471CAF6DADBC4971DA29",
        code: "TITULO_UNIVERSITARIO_Y_CERTIFICADO_ANALITICO",
        name: "Título Universitario y Certificado Analítico",
        description: "Título universitario y certificado analítico unificados en un solo archivo PDF",
        required: true,
        order: 7,
        totalCount: 342,
        activeCount: 266,
        archivedCount: 76
      },
      {
        id: "E089FA5DE81F4892862C0F3F08931451",
        code: "CERTIFICADO_LEY_MICAELA",
        name: "Certificado Ley Micaela",
        description: "Certificado de capacitación en Ley Micaela (opcional)",
        required: false,
        order: 8,
        totalCount: 178,
        activeCount: 161,
        archivedCount: 17
      },
      {
        id: "9A67E09E0FB64D108FCE99587974504B",
        code: "DOCUMENTO_ADICIONAL",
        name: "Documento Adicional", 
        description: "Cualquier documento adicional requerido específicamente",
        required: false,
        order: 99,
        totalCount: 131,
        activeCount: 109,
        archivedCount: 22
      }
    ];

    const response = {
      success: true,
      data: {
        documentTypes: documentTypes,
        summary: {
          required: documentTypes.filter(dt => dt.required).length,
          optional: documentTypes.filter(dt => !dt.required).length,
          total: documentTypes.length
        }
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Document types error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch document types',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
