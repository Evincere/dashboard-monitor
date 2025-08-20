import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { dni: string } }
) {
  try {
    const { dni } = params;
    
    // Get authorization header from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header missing' },
        { status: 401 }
      );
    }

    console.log('🔄 Getting documents for DNI:', dni);

    const backendUrl = process.env.BACKEND_API_URL || 'https://vps-4778464-x.dattaweb.com/api';
    
    // First, get all inscriptions to find the one with matching DNI
    console.log('📋 Fetching all inscriptions...');
    const inscriptionsResponse = await fetch(`${backendUrl}/admin/inscriptions?size=1000`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!inscriptionsResponse.ok) {
      console.error('❌ Failed to fetch inscriptions:', inscriptionsResponse.status);
      return NextResponse.json(
        { error: `Failed to fetch inscriptions: ${inscriptionsResponse.status}` },
        { status: inscriptionsResponse.status }
      );
    }

    const inscriptionsData = await inscriptionsResponse.json();
    console.log('📋 Total inscriptions:', inscriptionsData.content?.length || 0);

    // Find inscription with matching DNI
    const inscription = inscriptionsData.content?.find((insc: any) => 
      insc.userInfo?.dni === dni
    );

    if (!inscription) {
      console.log('❌ No inscription found for DNI:', dni);
      return NextResponse.json(
        { error: `No se encontró inscripción para DNI: ${dni}` },
        { status: 404 }
      );
    }

    console.log('✅ Found inscription:', { 
      id: inscription.id, 
      fullName: inscription.userInfo?.fullName 
    });

    // Now get documents for this inscription
    console.log('📄 Fetching documents for inscription:', inscription.id);
    const documentsResponse = await fetch(`${backendUrl}/admin/documentos?inscriptionId=${inscription.id}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!documentsResponse.ok) {
      console.error('❌ Failed to fetch documents:', documentsResponse.status);
      return NextResponse.json(
        { error: `Failed to fetch documents: ${documentsResponse.status}` },
        { status: documentsResponse.status }
      );
    }

    const documentsData = await documentsResponse.json();
    console.log('📄 Total documents:', documentsData.content?.length || 0);

    // Transform data to match expected frontend format
    const transformedDocuments = documentsData.content?.map((doc: any) => ({
      id: doc.id,
      documentType: doc.tipoDocumento?.code || 'UNKNOWN',
      fileName: doc.nombreArchivo,
      validationStatus: doc.estado, // APPROVED, PENDING, REJECTED
      uploadDate: doc.fechaCarga,
      validatedBy: doc.validadoPor,
      validationDate: doc.fechaValidacion,
      comments: doc.comentarios || '',
      isRequired: doc.tipoDocumento?.requerido || false,
      userName: doc.nombreUsuario,
      userEmail: doc.emailUsuario,
      userDni: doc.dniUsuario
    })) || [];

    // Also include postulant info from inscription
    const postulantInfo = {
      id: inscription.id,
      dni: inscription.userInfo?.dni,
      fullName: inscription.userInfo?.fullName,
      email: inscription.userInfo?.email,
      state: inscription.state,
      inscriptionDate: inscription.inscriptionDate,
      contestInfo: inscription.contestInfo
    };

    return NextResponse.json({
      success: true,
      data: {
        documents: transformedDocuments,
        postulant: postulantInfo,
        inscription: inscription
      }
    });

  } catch (error) {
    console.error('💥 Error getting documents for DNI:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
